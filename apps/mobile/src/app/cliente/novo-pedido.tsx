import {
  distanciaKm,
  estimarFrete,
  formatarReais,
  NOME_PERIODO,
  NOME_VEICULO,
  type Periodo,
  type TipoPedido,
  type Veiculo,
} from '@fixer/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso, Botao, Campo, Cartao, Contador, Opcoes, Tela, Texto, Titulo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { coordenadasDoEndereco, criarPedido, escolherFotos } from '@/lib/pedidos';
import { mensagemDeErro } from '@/lib/supabase';
import { cores, fontes, raio } from '@/theme';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function proximosDias(qtd: number) {
  const hoje = new Date();
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i + 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, semana: DIAS_SEMANA[d.getDay()], dia: d.getDate() };
  });
}

export default function NovoPedido() {
  const { sessao } = useAuth();
  const params = useLocalSearchParams<{ tipo?: TipoPedido }>();
  const [tipo, setTipo] = useState<TipoPedido>(params.tipo ?? 'frete_montagem');
  const temFrete = tipo !== 'montagem';
  const temMontagem = tipo !== 'frete';

  const [descricao, setDescricao] = useState('');
  const [origem, setOrigem] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [veiculo, setVeiculo] = useState<Veiculo>('utilitario');
  const [ajudantes, setAjudantes] = useState(0);
  const [andares, setAndares] = useState(0);
  const [tipoMovel, setTipoMovel] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [lojaCompra, setLojaCompra] = useState('');
  const dias = useMemo(() => proximosDias(14), []);
  const [data, setData] = useState(dias[0].iso);
  const [periodo, setPeriodo] = useState<Periodo>('manha');
  const [fotos, setFotos] = useState<string[]>([]);

  const [distancia, setDistancia] = useState<number | null>(null);
  const [coordDestino, setCoordDestino] = useState<{ lat: number; lng: number } | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const faixa = temFrete && distancia != null ? estimarFrete({ distanciaKm: distancia, veiculo, ajudantes, andaresSemElevador: andares }) : null;

  async function calcularDistancia() {
    if (!origem.trim() || !endereco.trim()) {
      setErros((e) => ({ ...e, endereco: 'Preencha a origem e o destino.' }));
      return;
    }
    setCalculando(true);
    const sufixo = cidade.trim() ? `, ${cidade.trim()}` : '';
    const [a, b] = await Promise.all([coordenadasDoEndereco(origem + sufixo), coordenadasDoEndereco(endereco + sufixo)]);
    setCalculando(false);
    if (a && b) {
      setDistancia(distanciaKm(a, b));
      setCoordDestino(b);
    } else {
      setErroGeral('Não encontramos um dos endereços. Confira rua, número e cidade.');
    }
  }

  async function adicionarFotos(camera: boolean) {
    const novas = await escolherFotos(camera);
    setFotos((f) => [...f, ...novas].slice(0, 5));
  }

  function validar() {
    const e: Record<string, string> = {};
    if (descricao.trim().length < 10) e.descricao = 'Conte um pouco mais (pelo menos 10 letras).';
    if (!endereco.trim()) e.endereco = temFrete ? 'Digite o endereço de destino.' : 'Digite o endereço do serviço.';
    if (temFrete && !origem.trim()) e.origem = 'Digite de onde sai o móvel.';
    if (temMontagem && !tipoMovel.trim()) e.tipoMovel = 'Diga qual móvel vai ser montado.';
    if (fotos.length === 0) e.fotos = 'Adicione pelo menos uma foto. Ajuda o prestador a entender o serviço.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar() {
    setErroGeral(null);
    if (!sessao || !validar()) return;
    setEnviando(true);
    try {
      const coordenadas = coordDestino ?? (await coordenadasDoEndereco(cidade.trim() ? `${endereco}, ${cidade}` : endereco));
      const id = await criarPedido(
        {
          tipo,
          descricao,
          endereco,
          cidade,
          coordenadas,
          dataDesejada: data,
          periodo,
          frete: temFrete
            ? {
                origem: origem.trim(),
                destino: endereco.trim(),
                veiculo,
                ajudantes,
                andares_sem_elevador: andares,
                distancia_km: distancia,
                preco_sugerido: faixa ? Math.round((faixa.minimo + faixa.maximo) / 2) : null,
              }
            : undefined,
          montagem: temMontagem ? { tipo_movel: tipoMovel.trim(), quantidade, loja_compra: lojaCompra.trim() || null } : undefined,
          fotos,
        },
        sessao.user.id,
      );
      router.replace({ pathname: '/cliente/pedido/[id]', params: { id, novo: '1' } });
    } catch (e) {
      setErroGeral(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela rodape={<Botao titulo="Publicar pedido" onPress={enviar} carregando={enviando} />}>
      <Titulo subtitulo="Prestadores perto de você vão mandar propostas.">O que você precisa?</Titulo>
      <Opcoes<TipoPedido>
        valor={tipo}
        aoMudar={setTipo}
        opcoes={[
          { valor: 'frete_montagem', titulo: 'Frete + montagem', descricao: 'Levar o móvel e montar no destino' },
          { valor: 'frete', titulo: 'Só frete' },
          { valor: 'montagem', titulo: 'Só montagem' },
        ]}
      />

      <Campo rotulo="Descreva o serviço" value={descricao} onChangeText={setDescricao} erro={erros.descricao} multiline maxLength={1000}
        placeholder="Ex.: guarda-roupa de 6 portas comprado no marketplace, está desmontado nas caixas." />

      {temFrete ? (
        <Cartao>
          <Texto negrito>Frete</Texto>
          <Campo rotulo="Retirar em" value={origem} onChangeText={(t) => { setOrigem(t); setDistancia(null); }} erro={erros.origem} placeholder="Rua, número e bairro" />
          <Campo rotulo="Entregar em" value={endereco} onChangeText={(t) => { setEndereco(t); setDistancia(null); }} erro={erros.endereco} placeholder="Rua, número e bairro" />
          <Campo rotulo="Cidade" value={cidade} onChangeText={setCidade} placeholder="Porto Alegre" />
          <Opcoes<Veiculo> rotulo="Tamanho do veículo" valor={veiculo} aoMudar={setVeiculo}
            opcoes={(Object.keys(NOME_VEICULO) as Veiculo[]).map((v) => ({ valor: v, titulo: NOME_VEICULO[v] }))} />
          <Contador rotulo="Ajudantes" valor={ajudantes} aoMudar={setAjudantes} max={3} />
          <Contador rotulo="Andares sem elevador" valor={andares} aoMudar={setAndares} max={30} />
          {faixa ? (
            <Aviso>
              {`Distância aproximada: ${distancia} km. Faixa de preço estimada: ${formatarReais(faixa.minimo)} a ${formatarReais(faixa.maximo)}. O valor final vem das propostas.`}
            </Aviso>
          ) : (
            <Botao titulo="Calcular distância e preço" variante="secundario" onPress={calcularDistancia} carregando={calculando} />
          )}
        </Cartao>
      ) : (
        <>
          <Campo rotulo="Endereço do serviço" value={endereco} onChangeText={setEndereco} erro={erros.endereco} placeholder="Rua, número e bairro" />
          <Campo rotulo="Cidade" value={cidade} onChangeText={setCidade} placeholder="Porto Alegre" />
        </>
      )}

      {temMontagem ? (
        <Cartao>
          <Texto negrito>Montagem</Texto>
          <Campo rotulo="Qual móvel?" value={tipoMovel} onChangeText={setTipoMovel} erro={erros.tipoMovel} placeholder="Guarda-roupa, cama, rack..." />
          <Contador rotulo="Quantidade de móveis" valor={quantidade} aoMudar={setQuantidade} min={1} max={50} />
          <Campo rotulo="Onde comprou? (opcional)" value={lojaCompra} onChangeText={setLojaCompra} placeholder="Nome da loja" />
        </Cartao>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={estilos.rotulo}>Quando?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {dias.map((d) => {
            const ativo = d.iso === data;
            return (
              <Pressable key={d.iso} onPress={() => setData(d.iso)} style={[estilos.dia, ativo && estilos.diaAtivo]}
                accessibilityRole="button" accessibilityState={{ selected: ativo }}>
                <Text style={[estilos.diaSemana, ativo && { color: cores.branco }]}>{d.semana}</Text>
                <Text style={[estilos.diaNumero, ativo && { color: cores.branco }]}>{d.dia}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(Object.keys(NOME_PERIODO) as Periodo[]).map((p) => (
            <Pressable key={p} onPress={() => setPeriodo(p)} style={[estilos.periodo, p === periodo && estilos.diaAtivo]}>
              <Text style={[estilos.periodoTexto, p === periodo && { color: cores.branco }]}>{NOME_PERIODO[p]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={estilos.rotulo}>Fotos do móvel ou do local</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {fotos.map((uri) => (
            <Pressable key={uri} onLongPress={() => setFotos((f) => f.filter((x) => x !== uri))}>
              <Image source={{ uri }} style={estilos.foto} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Botao titulo="Galeria" variante="secundario" onPress={() => adicionarFotos(false)} /></View>
          <View style={{ flex: 1 }}><Botao titulo="Câmera" variante="secundario" onPress={() => adicionarFotos(true)} /></View>
        </View>
        {erros.fotos ? <Text style={estilos.erro}>{erros.fotos}</Text> : <Texto secundario>Até 5 fotos. Segure uma foto para remover.</Texto>}
      </View>

      {erroGeral ? <Aviso tom="erro">{erroGeral}</Aviso> : null}
      <Texto secundario>Seu endereço completo e telefone só aparecem para o prestador que você escolher.</Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  rotulo: { fontFamily: fontes.semibold, fontSize: 14, color: cores.azulEscuro },
  dia: { width: 56, paddingVertical: 10, borderRadius: raio.md, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.branco, alignItems: 'center' },
  diaAtivo: { backgroundColor: cores.azul, borderColor: cores.azul },
  diaSemana: { fontFamily: fontes.medio, fontSize: 12, color: cores.textoSecundario },
  diaNumero: { fontFamily: fontes.semibold, fontSize: 18, color: cores.azulEscuro },
  periodo: { flex: 1, paddingVertical: 10, borderRadius: raio.md, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.branco, alignItems: 'center' },
  periodoTexto: { fontFamily: fontes.semibold, fontSize: 14, color: cores.azulEscuro },
  foto: { width: 72, height: 72, borderRadius: raio.sm, backgroundColor: cores.azulClaro },
  erro: { fontFamily: fontes.medio, fontSize: 13, color: cores.erro },
});
