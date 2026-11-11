// Propostas enviadas e serviços aceitos do prestador.
import { formatarReais } from '@fixer/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartaoPedido } from '@/components/pedido';
import { Aviso, Texto, Titulo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { minhasPropostas } from '@/lib/pedidos';
import { mensagemDeErro } from '@/lib/supabase';
import { cores } from '@/theme';

const NOME_PROPOSTA = { enviada: 'aguardando o cliente', aceita: 'aceita', recusada: 'não escolhida', retirada: 'retirada' } as const;

export default function ServicosPrestador() {
  const { sessao } = useAuth();
  const [itens, setItens] = useState<Awaited<ReturnType<typeof minhasPropostas>> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    try {
      setErro(null);
      setItens(await minhasPropostas(sessao.user.id));
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, [sessao]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const visiveis = (itens ?? []).filter((i) => i.pedido && i.status !== 'retirada');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 12 }}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={async () => { setAtualizando(true); await carregar(); setAtualizando(false); }} />}
      >
        <Titulo>Meus serviços</Titulo>
        {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
        {itens && visiveis.length === 0 ? <Texto secundario>Você ainda não enviou propostas.</Texto> : null}
        {visiveis.map((i) => (
          <CartaoPedido
            key={i.id}
            pedido={i.pedido!}
            extra={`Proposta ${formatarReais(i.valor)}, ${NOME_PROPOSTA[i.status]}`}
            onPress={() => router.push({ pathname: '/prestador/pedido/[id]', params: { id: i.pedido_id } })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
