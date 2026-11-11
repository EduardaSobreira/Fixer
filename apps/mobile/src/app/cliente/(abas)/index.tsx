import Ionicons from '@expo/vector-icons/Ionicons';
import type { TipoPedido } from '@fixer/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Tela } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { cores, fontes, raio } from '@/theme';

const SERVICOS: { tipo: TipoPedido; titulo: string; descricao: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { tipo: 'frete_montagem', titulo: 'Frete + montagem', descricao: 'Levamos o móvel e montamos no mesmo pedido', icone: 'cube-outline' },
  { tipo: 'frete', titulo: 'Frete', descricao: 'Pequenas mudanças e móveis de um lugar para outro', icone: 'car-outline' },
  { tipo: 'montagem', titulo: 'Montagem', descricao: 'Montar ou desmontar móveis', icone: 'construct-outline' },
];

export default function InicioCliente() {
  const { perfil } = useAuth();
  const primeiroNome = perfil?.nome.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <Tela>
        <View style={{ gap: 4, marginTop: 8 }}>
          <Text style={estilos.ola}>Olá, {primeiroNome}!</Text>
          <Text style={estilos.pergunta}>O que você precisa resolver hoje?</Text>
        </View>
        {SERVICOS.map((s) => (
          <Pressable
            key={s.tipo}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/cliente/novo-pedido', params: { tipo: s.tipo } })}
            style={({ pressed }) => [estilos.servico, s.tipo === 'frete_montagem' && estilos.destaque, pressed && { opacity: 0.7 }]}
          >
            <View style={estilos.icone}>
              <Ionicons name={s.icone} size={24} color={cores.azul} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={estilos.servicoTitulo}>{s.titulo}</Text>
              <Text style={estilos.servicoDescricao}>{s.descricao}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={cores.textoSecundario} />
          </Pressable>
        ))}
        <Aviso>Você descreve o que precisa, recebe propostas de prestadores aprovados e escolhe a melhor.</Aviso>
      </Tela>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  ola: { fontFamily: fontes.negrito, fontSize: 26, color: cores.azulEscuro },
  pergunta: { fontFamily: fontes.regular, fontSize: 15, color: cores.textoSecundario },
  servico: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: cores.branco, borderRadius: raio.lg, borderWidth: 1, borderColor: cores.borda, padding: 16 },
  destaque: { borderColor: cores.azul, borderWidth: 1.5 },
  icone: { width: 48, height: 48, borderRadius: 24, backgroundColor: cores.azulClaro, alignItems: 'center', justifyContent: 'center' },
  servicoTitulo: { fontFamily: fontes.semibold, fontSize: 16, color: cores.azulEscuro },
  servicoDescricao: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoSecundario, lineHeight: 18 },
});
