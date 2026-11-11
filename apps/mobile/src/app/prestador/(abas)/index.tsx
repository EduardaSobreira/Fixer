// Painel do prestador: pedidos abertos perto dele.
import { NOME_TIPO_PEDIDO, pontoPostgis, type TipoPedido } from '@fixer/shared';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartaoPedido } from '@/components/pedido';
import { Aviso, Botao, Cartao, Texto, Titulo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { pedidosProximos, type PedidoProximo } from '@/lib/pedidos';
import { mensagemDeErro, supabase } from '@/lib/supabase';
import { cores } from '@/theme';

const CATEGORIAS: TipoPedido[] = ['frete', 'montagem'];

export default function PainelPrestador() {
  const { prestador, recarregar } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoProximo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (prestador?.status_aprovacao !== 'aprovado') return;
    try {
      setErro(null);
      setPedidos(await pedidosProximos());
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, [prestador?.status_aprovacao]);

  useFocusEffect(useCallback(() => { recarregar(); carregar(); }, [carregar]));

  async function alternarCategoria(c: TipoPedido) {
    if (!prestador) return;
    const atual = prestador.categorias;
    const nova = atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c];
    if (!nova.length) return;
    await supabase.from('prestadores').update({ categorias: nova }).eq('id', prestador.id);
    await recarregar();
    carregar();
  }

  async function usarMinhaLocalizacao() {
    if (!prestador) return;
    setSalvando(true);
    try {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (!permissao.granted) throw new Error('Permita o acesso à localização para ver pedidos perto de você.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [lugar] = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
      await supabase
        .from('prestadores')
        .update({ localizacao: pontoPostgis(pos.coords.latitude, pos.coords.longitude), cidade: lugar?.city ?? lugar?.subregion ?? null })
        .eq('id', prestador.id);
      await recarregar();
      carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (prestador && prestador.status_aprovacao !== 'aprovado') {
    const recusado = prestador.status_aprovacao === 'recusado';
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <Titulo subtitulo={recusado ? 'Algum documento não foi aceito. Envie de novo para outra análise.' : 'Você só recebe pedidos depois que a equipe Fixer aprovar seus documentos.'}>
            {recusado ? 'Cadastro recusado' : 'Cadastro em análise'}
          </Titulo>
          <Botao titulo="Enviar documentos" onPress={() => router.push('/prestador/documentos')} />
          <Aviso>Mesmas regras de segurança para CPF e MEI: identidade obrigatória antes do primeiro serviço.</Aviso>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 12 }}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }} />}
      >
        <Titulo subtitulo={prestador?.cidade ? `Perto de ${prestador.cidade} · até ${prestador.raio_km} km` : undefined}>Pedidos perto de você</Titulo>
        <Cartao>
          <Texto negrito>Serviços que você faz</Texto>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CATEGORIAS.map((c) => (
              <View key={c} style={{ flex: 1 }}>
                <Botao titulo={NOME_TIPO_PEDIDO[c]} variante={prestador?.categorias.includes(c) ? 'primario' : 'secundario'} onPress={() => alternarCategoria(c)} />
              </View>
            ))}
          </View>
          {!prestador?.cidade ? <Botao titulo="Usar minha localização" variante="secundario" onPress={usarMinhaLocalizacao} carregando={salvando} /> : null}
        </Cartao>
        {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
        {pedidos?.length === 0 ? <Texto secundario>Nenhum pedido aberto perto de você agora. Puxe para atualizar.</Texto> : null}
        {pedidos?.map((p) => (
          <CartaoPedido
            key={p.id}
            pedido={p}
            extra={p.distancia_km != null ? `${p.distancia_km} km` : undefined}
            onPress={() => router.push({ pathname: '/prestador/pedido/[id]', params: { id: p.id } })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
