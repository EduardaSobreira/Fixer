// Tipos e regras compartilhadas entre o app, os painéis e as Edge Functions.
// Os nomes seguem as tabelas e enums de supabase/migrations.

export type TipoUsuario = 'cliente' | 'prestador' | 'loja' | 'admin';
export type Modalidade = 'cpf' | 'mei';
export type StatusAprovacao = 'pendente' | 'aprovado' | 'recusado';
export type TipoDocumento = 'rg' | 'cnh' | 'ccmei';
export type TipoPedido = 'frete' | 'montagem' | 'frete_montagem';
export type StatusPedido =
  | 'aberto'
  | 'com_propostas'
  | 'aceito'
  | 'em_andamento'
  | 'aguardando_confirmacao'
  | 'concluido'
  | 'cancelado'
  | 'em_contestacao';
export type Veiculo = 'carro' | 'utilitario' | 'van' | 'caminhao_pequeno';
export type StatusProposta = 'enviada' | 'aceita' | 'recusada' | 'retirada';
export type MomentoFoto = 'pedido' | 'antes' | 'depois';
export type Periodo = 'manha' | 'tarde' | 'noite';

export interface Perfil {
  id: string;
  nome: string;
  telefone: string | null;
  tipo: TipoUsuario;
  foto_url: string | null;
}

export interface Prestador {
  id: string;
  modalidade: Modalidade;
  cnpj: string | null;
  status_aprovacao: StatusAprovacao;
  categorias: TipoPedido[];
  cidade: string | null;
  raio_km: number;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  prestador_id: string | null;
  tipo: TipoPedido;
  descricao: string;
  cidade: string | null; // o endereço completo só sai por dados_privados_do_pedido
  data_desejada: string; // AAAA-MM-DD
  periodo: Periodo;
  status: StatusPedido;
  valor_aceito: number | null;
  prazo_confirmacao: string | null;
  criado_em: string;
}

/** Parte pública do frete (origem e destino só saem por dados_privados_do_pedido). */
export interface DetalhesFrete {
  pedido_id: string;
  distancia_km: number | null;
  veiculo: Veiculo;
  ajudantes: number;
  andares_sem_elevador: number;
  preco_sugerido: number | null;
}

/** Endereços e contatos, liberados só para o cliente e o prestador escolhido. */
export interface DadosPrivadosPedido {
  endereco: string;
  origem: string | null;
  destino: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  prestador_nome: string | null;
  prestador_telefone: string | null;
}

export interface DetalhesMontagem {
  pedido_id: string;
  tipo_movel: string;
  quantidade: number;
  loja_compra: string | null;
}

export interface Proposta {
  id: string;
  pedido_id: string;
  prestador_id: string;
  valor: number;
  mensagem: string | null;
  status: StatusProposta;
  criado_em: string;
}

// ------------------------------------------------------------
// Textos para a interface
// ------------------------------------------------------------
export const NOME_TIPO_PEDIDO: Record<TipoPedido, string> = {
  frete: 'Frete',
  montagem: 'Montagem',
  frete_montagem: 'Frete + montagem',
};

export const NOME_STATUS_PEDIDO: Record<StatusPedido, string> = {
  aberto: 'Aguardando propostas',
  com_propostas: 'Propostas recebidas',
  aceito: 'Confirmado',
  em_andamento: 'Em andamento',
  aguardando_confirmacao: 'Revise o serviço',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  em_contestacao: 'Em análise',
};

export const NOME_VEICULO: Record<Veiculo, string> = {
  carro: 'Carro',
  utilitario: 'Utilitário (Fiorino, Saveiro)',
  van: 'Van',
  caminhao_pequeno: 'Caminhão pequeno (3/4)',
};

export const NOME_PERIODO: Record<Periodo, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

export const PRAZO_REVISAO_HORAS = 6;

// ------------------------------------------------------------
// Estimativa de frete
// ATENÇÃO: valores PROVISÓRIOS. A regra de preço do frete é uma decisão
// pendente (ver documento do projeto). Ajuste a tabela abaixo quando decidir.
// ------------------------------------------------------------
export const TABELA_FRETE = {
  taxaBase: { carro: 40, utilitario: 70, van: 110, caminhao_pequeno: 180 } as Record<Veiculo, number>,
  porKm: { carro: 2.5, utilitario: 3.5, van: 4.5, caminhao_pequeno: 6 } as Record<Veiculo, number>,
  porAjudante: 60,
  porAndarSemElevador: 15,
};

export interface EntradaFrete {
  distanciaKm: number;
  veiculo: Veiculo;
  ajudantes: number;
  andaresSemElevador: number;
}

/** Faixa de preço sugerida (em reais) para mostrar ao cliente e ao prestador. */
export function estimarFrete(e: EntradaFrete): { minimo: number; maximo: number } {
  const t = TABELA_FRETE;
  const base =
    t.taxaBase[e.veiculo] +
    t.porKm[e.veiculo] * Math.max(0, e.distanciaKm) +
    t.porAjudante * e.ajudantes +
    t.porAndarSemElevador * e.andaresSemElevador;
  const arredondar = (v: number) => Math.round(v / 5) * 5;
  return { minimo: arredondar(base * 0.9), maximo: arredondar(base * 1.15) };
}

/** Distância em linha reta (km) entre dois pontos. A rota real vem do Google Maps na fase 2. */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Ponto no formato que o PostGIS aceita (longitude primeiro). */
export function pontoPostgis(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`;
}
