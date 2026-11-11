import type { Pedido } from '@fixer/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartaoPedido } from '@/components/pedido';
import { Aviso, Botao, Texto, Titulo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { meusPedidos } from '@/lib/pedidos';
import { mensagemDeErro } from '@/lib/supabase';
import { cores } from '@/theme';

export default function PedidosCliente() {
  const { sessao } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    try {
      setErro(null);
      setPedidos(await meusPedidos(sessao.user.id));
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, [sessao]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 12 }}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }} />}
      >
        <Titulo>Meus pedidos</Titulo>
        {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
        {pedidos?.length === 0 ? (
          <View style={{ gap: 12 }}>
            <Texto secundario>Você ainda não fez nenhum pedido.</Texto>
            <Botao titulo="Fazer um pedido" onPress={() => router.push('/cliente/novo-pedido')} />
          </View>
        ) : null}
        {pedidos?.map((p) => (
          <CartaoPedido key={p.id} pedido={p} onPress={() => router.push({ pathname: '/cliente/pedido/[id]', params: { id: p.id } })} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
