import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao, Cartao, Etiqueta, Tela, Texto, Titulo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { cores, fontes } from '@/theme';

const NOME_APROVACAO = { pendente: 'Em análise', aprovado: 'Aprovado', recusado: 'Recusado' } as const;

export function TelaPerfil() {
  const { perfil, prestador, sessao, sair } = useAuth();
  const iniciais = (perfil?.nome ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <Tela>
        <Titulo>Perfil</Titulo>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: cores.azulClaro, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fontes.semibold, fontSize: 18, color: cores.azul }}>{iniciais}</Text>
          </View>
          <View style={{ gap: 2, flex: 1 }}>
            <Texto negrito>{perfil?.nome}</Texto>
            <Texto secundario>{sessao?.user.email}</Texto>
          </View>
        </View>
        {prestador ? (
          <Cartao>
            <Texto negrito>Cadastro de prestador</Texto>
            <Etiqueta texto={NOME_APROVACAO[prestador.status_aprovacao]} tom={prestador.status_aprovacao === 'aprovado' ? 'sucesso' : prestador.status_aprovacao === 'recusado' ? 'erro' : 'alerta'} />
            <Texto secundario>{`Modalidade: ${prestador.modalidade === 'mei' ? 'MEI' : 'CPF'} · Raio de atendimento: ${prestador.raio_km} km`}</Texto>
          </Cartao>
        ) : null}
        <Botao titulo="Sair da conta" variante="secundario" onPress={sair} />
      </Tela>
    </SafeAreaView>
  );
}
