// Prestador: ver o pedido, mandar proposta e, se escolhido, executar com fotos.
import { formatarReais, type DadosPrivadosPedido, type Proposta } from '@fixer/shared';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { ResumoPedido } from '@/components/pedido';
import { Aviso, Botao, Campo, Carregando, Cartao, Tela, Texto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  carregarPedido,
  dadosPrivados,
  enviarConclusao,
  enviarFoto,
  enviarProposta,
  escolherFotos,
  iniciarServico,
  type PedidoCompleto,
} from '@/lib/pedidos';
import { mensagemDeErro, supabase } from '@/lib/supabase';

export default function PedidoPrestador() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessao } = useAuth();
  const [dados, setDados] = useState<PedidoCompleto | null>(null);
  const [privados, setPrivados] = useState<DadosPrivadosPedido | null>(null);
  const [minha, setMinha] = useState<Proposta | null>(null);
  const [valor, setValor] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [acao, setAcao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    try {
      const [d, pv, p] = await Promise.all([
        carregarPedido(id),
        dadosPrivados(id),
        supabase.from('propostas').select('*').eq('pedido_id', id).eq('prestador_id', sessao.user.id).maybeSingle(),
      ]);
      setDados(d);
      setPrivados(pv);
      setMinha((p.data as Proposta) ?? null);
      if (!valor && d.frete?.preco_sugerido) setValor(String(d.frete.preco_sugerido));
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, [id, sessao]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

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

  async function mandarProposta() {
    const numero = Number(valor.replace(/\./g, '').replace(',', '.'));
    if (!numero || numero <= 0) return setErro('Digite um valor válido.');
    await executar('proposta', () => enviarProposta(id, sessao!.user.id, numero, mensagem));
  }

  async function adicionarFotos(momento: 'antes' | 'depois') {
    const uris = await escolherFotos(true);
    if (!uris.length) return;
    await executar(momento, async () => {
      for (const uri of uris) await enviarFoto(id, sessao!.user.id, uri, momento);
    });
  }

  if (!dados) return erro ? <Tela><Aviso tom="erro">{erro}</Aviso></Tela> : <Carregando />;
  const { pedido } = dados;
  const souEscolhido = pedido.prestador_id === sessao?.user.id;
  const aberto = pedido.status === 'aberto' || pedido.status === 'com_propostas';

  return (
    <Tela>
      <ResumoPedido dados={dados} privados={privados} />

      {aberto && !minha ? (
        <Cartao>
          <Texto negrito>Enviar proposta</Texto>
          <Campo rotulo="Seu valor (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="180" />
          <Campo rotulo="Mensagem para o cliente (opcional)" value={mensagem} onChangeText={setMensagem} multiline maxLength={500}
            placeholder="Ex.: levo ferramentas e faço no mesmo dia." />
          <Botao titulo="Enviar proposta" onPress={mandarProposta} carregando={acao === 'proposta'} />
          <Texto secundario>O endereço completo e o telefone do cliente aparecem se ele escolher você.</Texto>
        </Cartao>
      ) : null}

      {minha && !souEscolhido ? (
        <Aviso tom={minha.status === 'recusada' ? 'alerta' : 'azul'}>
          {minha.status === 'enviada'
            ? `Sua proposta de ${formatarReais(minha.valor)} foi enviada. Avisamos quando o cliente responder.`
            : `O cliente escolheu outra proposta desta vez.`}
        </Aviso>
      ) : null}

      {souEscolhido && privados ? (
        <Cartao>
          <Texto negrito>Cliente</Texto>
          <Texto>{privados.cliente_nome}</Texto>
          {privados.cliente_telefone ? (
            <Botao titulo="Chamar no WhatsApp" variante="secundario" onPress={() => Linking.openURL(`https://wa.me/55${privados.cliente_telefone}`)} />
          ) : null}
        </Cartao>
      ) : null}

      {souEscolhido && pedido.status === 'aceito' ? (
        <Cartao>
          <Texto negrito>No dia do serviço</Texto>
          <Texto secundario>Tire fotos de antes. Elas protegem você e o cliente.</Texto>
          <Botao titulo="Fotografar antes" variante="secundario" onPress={() => adicionarFotos('antes')} carregando={acao === 'antes'} />
          <Botao titulo="Iniciar serviço" onPress={() => executar('iniciar', () => iniciarServico(id))} carregando={acao === 'iniciar'} />
        </Cartao>
      ) : null}

      {souEscolhido && pedido.status === 'em_andamento' ? (
        <Cartao>
          <Texto negrito>Terminou?</Texto>
          <Texto secundario>Envie pelo menos uma foto de depois. O cliente terá 6h para confirmar.</Texto>
          <Botao titulo="Fotografar depois" variante="secundario" onPress={() => adicionarFotos('depois')} carregando={acao === 'depois'} />
          <Botao titulo="Enviar conclusão" onPress={() => executar('concluir', () => enviarConclusao(id))} carregando={acao === 'concluir'} />
        </Cartao>
      ) : null}

      {souEscolhido && pedido.status === 'aguardando_confirmacao' ? <Aviso>Conclusão enviada. Aguardando o cliente confirmar.</Aviso> : null}
      {souEscolhido && pedido.status === 'concluido' ? <Aviso>Serviço concluído. O repasse entra na fase de pagamentos.</Aviso> : null}
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
    </Tela>
  );
}
