import { formatarReais, PRAZO_REVISAO_HORAS, type DadosPrivadosPedido } from '@fixer/shared';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { ResumoPedido } from '@/components/pedido';
import { Aviso, Botao, Carregando, Cartao, Tela, Texto } from '@/components/ui';
import {
  aceitarProposta,
  cancelarPedido,
  carregarPedido,
  confirmarConclusao,
  contestarConclusao,
  dadosPrivados,
  propostasDoPedido,
  type PedidoCompleto,
  type PropostaComPrestador,
} from '@/lib/pedidos';
import { mensagemDeErro, supabase } from '@/lib/supabase';

export default function PedidoCliente() {
  const { id, novo } = useLocalSearchParams<{ id: string; novo?: string }>();
  const [dados, setDados] = useState<PedidoCompleto | null>(null);
  const [privados, setPrivados] = useState<DadosPrivadosPedido | null>(null);
  const [propostas, setPropostas] = useState<PropostaComPrestador[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [d, pv, ps] = await Promise.all([carregarPedido(id), dadosPrivados(id), propostasDoPedido(id)]);
      setDados(d);
      setPrivados(pv);
      setPropostas(ps);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, [id]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  // Atualiza a tela quando chega proposta nova ou o status muda (Supabase Realtime).
  useEffect(() => {
    const canal = supabase
      .channel(`pedido-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'propostas', filter: `pedido_id=eq.${id}` }, carregar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${id}` }, carregar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [id, carregar]);

  async function executar(nome: string, fn: () => Promise<void>) {
    setAcao(nome);
    setErro(null);
    try {
      await fn();
      await carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setAcao(null);
    }
  }

  function confirmarAceite(p: PropostaComPrestador) {
    Alert.alert('Aceitar proposta', `Aceitar ${p.nome} por ${formatarReais(p.valor)}? As outras propostas serão recusadas.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Aceitar', onPress: () => executar(p.id, () => aceitarProposta(p.id)) },
    ]);
  }

  if (!dados) return erro ? <Tela><Aviso tom="erro">{erro}</Aviso></Tela> : <Carregando />;
  const { pedido } = dados;
  const abertas = propostas.filter((p) => p.status === 'enviada');
  const podeEscolher = pedido.status === 'aberto' || pedido.status === 'com_propostas';

  return (
    <Tela>
      {novo ? <Aviso>Pedido publicado! Agora é só aguardar as propostas dos prestadores interessados.</Aviso> : null}
      <ResumoPedido dados={dados} privados={privados} />

      {podeEscolher ? (
        <View style={{ gap: 12 }}>
          <Texto negrito>{abertas.length ? `Propostas (${abertas.length})` : 'Propostas'}</Texto>
          {abertas.length === 0 ? <Texto secundario>Ainda não chegou nenhuma proposta. Avisamos quando chegar.</Texto> : null}
          {abertas.map((p) => (
            <Cartao key={p.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Texto negrito>{p.nome}</Texto>
                <Texto negrito>{formatarReais(p.valor)}</Texto>
              </View>
              {p.mensagem ? <Texto secundario>{p.mensagem}</Texto> : null}
              <Botao titulo="Aceitar proposta" onPress={() => confirmarAceite(p)} carregando={acao === p.id} />
            </Cartao>
          ))}
          <Botao titulo="Cancelar pedido" variante="perigo" carregando={acao === 'cancelar'}
            onPress={() => Alert.alert('Cancelar pedido', 'Tem certeza? As propostas serão recusadas.', [
              { text: 'Voltar', style: 'cancel' },
              { text: 'Cancelar pedido', style: 'destructive', onPress: () => executar('cancelar', () => cancelarPedido(pedido.id)) },
            ])} />
        </View>
      ) : null}

      {privados?.prestador_nome && pedido.status !== 'cancelado' ? (
        <Cartao>
          <Texto negrito>Seu prestador</Texto>
          <Texto>{privados.prestador_nome}</Texto>
          {privados.prestador_telefone ? (
            <Botao titulo="Chamar no WhatsApp" variante="secundario" onPress={() => Linking.openURL(`https://wa.me/55${privados.prestador_telefone}`)} />
          ) : null}
        </Cartao>
      ) : null}

      {pedido.status === 'aceito' ? (
        <Aviso>O pagamento com reserva no cartão entra na próxima fase. Por enquanto, o valor fica registrado no pedido.</Aviso>
      ) : null}

      {pedido.status === 'aguardando_confirmacao' ? (
        <Cartao>
          <Texto negrito>O prestador concluiu o serviço</Texto>
          <Texto secundario>
            {`Confira as fotos de antes e depois. Você tem ${PRAZO_REVISAO_HORAS}h para confirmar ou contestar${pedido.prazo_confirmacao ? ` (até ${new Date(pedido.prazo_confirmacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})` : ''}.`}
          </Texto>
          <Botao titulo="Confirmar conclusão" carregando={acao === 'confirmar'} onPress={() => executar('confirmar', () => confirmarConclusao(pedido.id))} />
          <Botao titulo="Contestar" variante="perigo" carregando={acao === 'contestar'}
            onPress={() => Alert.alert('Contestar serviço', 'A equipe Fixer vai analisar e falar com você e com o prestador.', [
              { text: 'Voltar', style: 'cancel' },
              { text: 'Contestar', style: 'destructive', onPress: () => executar('contestar', () => contestarConclusao(pedido.id)) },
            ])} />
        </Cartao>
      ) : null}

      {pedido.status === 'em_contestacao' ? <Aviso tom="alerta">Recebemos sua contestação. A equipe Fixer vai analisar e responder.</Aviso> : null}
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
    </Tela>
  );
}
