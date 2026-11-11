// Blocos de tela reaproveitados pelo cliente e pelo prestador.
import {
  formatarReais,
  NOME_PERIODO,
  NOME_TIPO_PEDIDO,
  NOME_VEICULO,
  type DadosPrivadosPedido,
  type Pedido,
} from '@fixer/shared';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { Cartao, Etiqueta, Texto } from '@/components/ui';
import { formatarData, nomeStatus, tomDoStatus, urlsDasFotos, type PedidoCompleto } from '@/lib/pedidos';
import { cores, fontes, raio } from '@/theme';

export function CartaoPedido({ pedido, onPress, extra }: { pedido: Pick<Pedido, 'tipo' | 'descricao' | 'status' | 'data_desejada'> & { cidade?: string | null }; onPress?: () => void; extra?: string }) {
  return (
    <Cartao onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontFamily: fontes.semibold, fontSize: 16, color: cores.azulEscuro }}>{NOME_TIPO_PEDIDO[pedido.tipo]}</Text>
        <Etiqueta texto={nomeStatus(pedido.status)} tom={tomDoStatus(pedido.status)} />
      </View>
      <Texto numberOfLines={2}>{pedido.descricao}</Texto>
      <Texto secundario>
        {[formatarData(pedido.data_desejada), pedido.cidade, extra].filter(Boolean).join(' · ')}
      </Texto>
    </Cartao>
  );
}

export function ResumoPedido({ dados, privados }: { dados: PedidoCompleto; privados: DadosPrivadosPedido | null }) {
  const { pedido, frete, montagem } = dados;
  return (
    <>
      <View style={{ gap: 8 }}>
        <Etiqueta texto={nomeStatus(pedido.status)} tom={tomDoStatus(pedido.status)} />
        <Text style={{ fontFamily: fontes.negrito, fontSize: 24, color: cores.azulEscuro }}>{NOME_TIPO_PEDIDO[pedido.tipo]}</Text>
        <Texto secundario>
          {`${formatarData(pedido.data_desejada)} · ${NOME_PERIODO[pedido.periodo]}${pedido.cidade ? ` · ${pedido.cidade}` : ''}`}
        </Texto>
        {pedido.valor_aceito ? <Texto negrito>{`Valor combinado: ${formatarReais(pedido.valor_aceito)}`}</Texto> : null}
      </View>
      <Cartao>
        <Texto negrito>Descrição</Texto>
        <Texto>{pedido.descricao}</Texto>
      </Cartao>
      {frete ? (
        <Cartao>
          <Texto negrito>Frete</Texto>
          {privados?.origem ? <Linha rotulo="Retirar em" valor={privados.origem} /> : null}
          {privados?.destino ? <Linha rotulo="Entregar em" valor={privados.destino} /> : null}
          {frete.distancia_km != null ? <Linha rotulo="Distância" valor={`${frete.distancia_km} km (aproximada)`} /> : null}
          <Linha rotulo="Veículo" valor={NOME_VEICULO[frete.veiculo]} />
          <Linha rotulo="Ajudantes" valor={String(frete.ajudantes)} />
          <Linha rotulo="Andares sem elevador" valor={String(frete.andares_sem_elevador)} />
          {frete.preco_sugerido ? <Linha rotulo="Preço de referência" valor={formatarReais(frete.preco_sugerido)} /> : null}
        </Cartao>
      ) : null}
      {montagem ? (
        <Cartao>
          <Texto negrito>Montagem</Texto>
          <Linha rotulo="Móvel" valor={montagem.tipo_movel} />
          <Linha rotulo="Quantidade" valor={String(montagem.quantidade)} />
          {montagem.loja_compra ? <Linha rotulo="Comprado em" valor={montagem.loja_compra} /> : null}
        </Cartao>
      ) : null}
      {privados && !frete ? (
        <Cartao>
          <Texto negrito>Endereço</Texto>
          <Texto>{privados.endereco}</Texto>
        </Cartao>
      ) : null}
      <Fotos pedidoId={pedido.id} atualizar={pedido.status} />
    </>
  );
}

export function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Texto secundario>{rotulo}</Texto>
      <Texto style={{ flexShrink: 1, textAlign: 'right' }}>{valor}</Texto>
    </View>
  );
}

const NOME_MOMENTO = { pedido: 'Fotos do pedido', antes: 'Antes do serviço', depois: 'Depois do serviço' } as const;

export function Fotos({ pedidoId, atualizar }: { pedidoId: string; atualizar?: unknown }) {
  const [fotos, setFotos] = useState<{ momento: keyof typeof NOME_MOMENTO; url: string }[]>([]);
  useEffect(() => {
    urlsDasFotos(pedidoId).then(setFotos).catch(() => setFotos([]));
  }, [pedidoId, atualizar]);
  if (!fotos.length) return null;
  const grupos = (Object.keys(NOME_MOMENTO) as (keyof typeof NOME_MOMENTO)[]).filter((m) => fotos.some((f) => f.momento === m));
  return (
    <>
      {grupos.map((m) => (
        <View key={m} style={{ gap: 8 }}>
          <Texto negrito>{NOME_MOMENTO[m]}</Texto>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {fotos.filter((f) => f.momento === m).map((f) => (
              <Image key={f.url} source={{ uri: f.url }} style={{ width: 120, height: 120, borderRadius: raio.md, backgroundColor: cores.azulClaro }} />
            ))}
          </ScrollView>
        </View>
      ))}
    </>
  );
}
