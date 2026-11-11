// Acesso aos dados de pedidos, propostas e fotos.
import {
  NOME_STATUS_PEDIDO,
  type DadosPrivadosPedido,
  pontoPostgis,
  type DetalhesFrete,
  type DetalhesMontagem,
  type MomentoFoto,
  type Pedido,
  type Periodo,
  type Proposta,
  type StatusPedido,
  type TipoPedido,
  type Veiculo,
} from '@fixer/shared';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from './supabase';

export interface NovoPedido {
  tipo: TipoPedido;
  descricao: string;
  endereco: string;
  cidade: string;
  coordenadas: { lat: number; lng: number } | null;
  dataDesejada: string;
  periodo: Periodo;
  frete?: Omit<DetalhesFrete, 'pedido_id'> & { origem: string; destino: string };
  montagem?: Omit<DetalhesMontagem, 'pedido_id'>;
  fotos: string[]; // URIs locais
}

export async function criarPedido(dados: NovoPedido, usuarioId: string): Promise<string> {
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .insert({
      cliente_id: usuarioId,
      tipo: dados.tipo,
      descricao: dados.descricao.trim(),
      endereco: dados.endereco.trim(),
      cidade: dados.cidade.trim() || null,
      localizacao: dados.coordenadas ? pontoPostgis(dados.coordenadas.lat, dados.coordenadas.lng) : null,
      data_desejada: dados.dataDesejada,
      periodo: dados.periodo,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (dados.frete) {
    const { error: e } = await supabase.from('detalhes_frete').insert({ pedido_id: pedido.id, ...dados.frete });
    if (e) throw e;
  }
  if (dados.montagem) {
    const { error: e } = await supabase.from('detalhes_montagem').insert({ pedido_id: pedido.id, ...dados.montagem });
    if (e) throw e;
  }
  for (const uri of dados.fotos) {
    await enviarFoto(pedido.id, usuarioId, uri, 'pedido');
  }
  return pedido.id;
}

export async function enviarFoto(pedidoId: string, usuarioId: string, uri: string, momento: MomentoFoto) {
  const caminho = `${usuarioId}/${pedidoId}/${momento}-${Date.now()}.jpg`;
  const arquivo = await fetch(uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage.from('fotos').upload(caminho, arquivo, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { error: e } = await supabase.from('fotos').insert({ pedido_id: pedidoId, autor_id: usuarioId, momento, arquivo: caminho });
  if (e) throw e;
}

export async function urlsDasFotos(pedidoId: string): Promise<{ momento: MomentoFoto; url: string }[]> {
  const { data } = await supabase.from('fotos').select('momento, arquivo').eq('pedido_id', pedidoId).order('criado_em');
  if (!data?.length) return [];
  const { data: assinadas } = await supabase.storage.from('fotos').createSignedUrls(data.map((f) => f.arquivo), 3600);
  return data
    .map((f, i) => ({ momento: f.momento as MomentoFoto, url: assinadas?.[i]?.signedUrl ?? '' }))
    .filter((f) => f.url);
}

/** Abre a galeria (ou a câmera) e devolve as URIs das fotos, já comprimidas. */
export async function escolherFotos(usarCamera = false): Promise<string[]> {
  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: !usarCamera, selectionLimit: 5 };
  if (usarCamera) {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) return [];
  }
  const resultado = usarCamera ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
  return resultado.canceled ? [] : resultado.assets.map((a) => a.uri);
}

/** Converte um endereço em coordenadas usando o geocodificador do próprio celular (grátis). */
export async function coordenadasDoEndereco(endereco: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) return null;
    const [r] = await Location.geocodeAsync(endereco);
    return r ? { lat: r.latitude, lng: r.longitude } : null;
  } catch {
    return null;
  }
}

// Colunas liberadas para leitura direta (o endereço fica de fora; ver migração).
const COLUNAS_PEDIDO = 'id, cliente_id, prestador_id, tipo, descricao, cidade, data_desejada, periodo, status, valor_aceito, prazo_confirmacao, criado_em';
const COLUNAS_FRETE = 'pedido_id, distancia_km, veiculo, ajudantes, andares_sem_elevador, preco_sugerido';

export async function meusPedidos(usuarioId: string): Promise<Pedido[]> {
  const { data, error } = await supabase.from('pedidos').select(COLUNAS_PEDIDO).eq('cliente_id', usuarioId).order('criado_em', { ascending: false });
  if (error) throw error;
  return data as Pedido[];
}

export interface PedidoCompleto {
  pedido: Pedido;
  frete: DetalhesFrete | null;
  montagem: DetalhesMontagem | null;
}

export async function carregarPedido(id: string): Promise<PedidoCompleto> {
  const [p, f, m] = await Promise.all([
    supabase.from('pedidos').select(COLUNAS_PEDIDO).eq('id', id).single(),
    supabase.from('detalhes_frete').select(COLUNAS_FRETE).eq('pedido_id', id).maybeSingle(),
    supabase.from('detalhes_montagem').select('*').eq('pedido_id', id).maybeSingle(),
  ]);
  if (p.error) throw p.error;
  return { pedido: p.data as Pedido, frete: (f.data as DetalhesFrete) ?? null, montagem: (m.data as DetalhesMontagem) ?? null };
}

/** Endereços e telefones. Volta null para quem não é o cliente nem o prestador escolhido. */
export async function dadosPrivados(pedidoId: string): Promise<DadosPrivadosPedido | null> {
  const { data, error } = await supabase.rpc('dados_privados_do_pedido', { p_pedido: pedidoId });
  if (error) throw error;
  return ((data as DadosPrivadosPedido[] | null) ?? [])[0] ?? null;
}

export type PropostaComPrestador = Proposta & { nome: string };

export async function propostasDoPedido(pedidoId: string): Promise<PropostaComPrestador[]> {
  const { data, error } = await supabase.from('propostas').select('*').eq('pedido_id', pedidoId).order('valor');
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((p) => p.prestador_id))];
  const { data: nomes } = ids.length
    ? await supabase.from('perfis_publicos').select('id, nome').in('id', ids)
    : { data: [] as { id: string; nome: string }[] };
  const mapa = new Map((nomes ?? []).map((n) => [n.id, n.nome]));
  return (data as Proposta[]).map((p) => ({ ...p, nome: mapa.get(p.prestador_id) ?? 'Prestador' }));
}

export async function aceitarProposta(propostaId: string) {
  const { error } = await supabase.rpc('aceitar_proposta', { p_proposta: propostaId });
  if (error) throw error;
}

export async function cancelarPedido(pedidoId: string) {
  const { error } = await supabase.rpc('cancelar_pedido', { p_pedido: pedidoId });
  if (error) throw error;
}

export async function confirmarConclusao(pedidoId: string) {
  const { error } = await supabase.rpc('confirmar_conclusao', { p_pedido: pedidoId });
  if (error) throw error;
}

export async function contestarConclusao(pedidoId: string) {
  const { error } = await supabase.rpc('contestar_conclusao', { p_pedido: pedidoId });
  if (error) throw error;
}

// ---------------- Prestador ----------------
export interface PedidoProximo {
  id: string;
  tipo: TipoPedido;
  descricao: string;
  cidade: string | null;
  data_desejada: string;
  periodo: Periodo;
  status: StatusPedido;
  distancia_km: number | null;
}

export async function pedidosProximos(): Promise<PedidoProximo[]> {
  const { data, error } = await supabase.rpc('pedidos_proximos');
  if (error) throw error;
  return (data ?? []) as PedidoProximo[];
}

export async function enviarProposta(pedidoId: string, prestadorId: string, valor: number, mensagem: string) {
  const { error } = await supabase.from('propostas').insert({ pedido_id: pedidoId, prestador_id: prestadorId, valor, mensagem: mensagem.trim() || null });
  if (error) throw error;
}

export async function minhasPropostas(prestadorId: string): Promise<(Proposta & { pedido: Pick<Pedido, 'tipo' | 'descricao' | 'status' | 'data_desejada'> | null })[]> {
  const { data, error } = await supabase
    .from('propostas')
    .select('*, pedido:pedidos(tipo, descricao, status, data_desejada)')
    .eq('prestador_id', prestadorId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as never;
}

export async function iniciarServico(pedidoId: string) {
  const { error } = await supabase.rpc('iniciar_servico', { p_pedido: pedidoId });
  if (error) throw error;
}

export async function enviarConclusao(pedidoId: string) {
  const { error } = await supabase.rpc('enviar_conclusao', { p_pedido: pedidoId });
  if (error) throw error;
}

// ---------------- Textos ----------------
export function tomDoStatus(s: StatusPedido): 'azul' | 'sucesso' | 'alerta' | 'erro' | 'neutro' {
  if (s === 'concluido') return 'sucesso';
  if (s === 'aguardando_confirmacao' || s === 'com_propostas') return 'alerta';
  if (s === 'cancelado') return 'neutro';
  if (s === 'em_contestacao') return 'erro';
  return 'azul';
}

export const nomeStatus = (s: StatusPedido) => NOME_STATUS_PEDIDO[s];

export function formatarData(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export type { Veiculo };
