// Componentes básicos com o visual do Fixer.
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cores, espaco, fontes, raio } from '@/theme';

export function Tela({ children, rolar = true, rodape }: { children: ReactNode; rolar?: boolean; rodape?: ReactNode }) {
  return (
    <SafeAreaView style={estilos.tela} edges={['bottom']}>
      {rolar ? (
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[estilos.conteudo, { flex: 1 }]}>{children}</View>
      )}
      {rodape ? <View style={estilos.rodape}>{rodape}</View> : null}
    </SafeAreaView>
  );
}

export function Titulo({ children, subtitulo }: { children: ReactNode; subtitulo?: string }) {
  return (
    <View style={{ gap: espaco.xs, marginBottom: espaco.sm }}>
      <Text style={estilos.titulo}>{children}</Text>
      {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
    </View>
  );
}

export function Texto({ children, secundario, negrito, style, numberOfLines }: {
  children: ReactNode;
  secundario?: boolean;
  negrito?: boolean;
  style?: object;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        estilos.texto,
        secundario && { color: cores.textoSecundario, fontSize: 14 },
        negrito && { fontFamily: fontes.semibold },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  carregando,
  desabilitado,
}: {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'perigo';
  carregando?: boolean;
  desabilitado?: boolean;
}) {
  const primario = variante === 'primario';
  const inativo = desabilitado || carregando;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        estilos.botao,
        primario ? { backgroundColor: cores.azul } : { backgroundColor: cores.branco, borderWidth: 1.5, borderColor: variante === 'perigo' ? cores.erro : cores.azul },
        (pressed || inativo) && { opacity: 0.6 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={primario ? cores.branco : cores.azul} />
      ) : (
        <Text style={[estilos.botaoTexto, { color: primario ? cores.branco : variante === 'perigo' ? cores.erro : cores.azul }]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

export function Campo({ rotulo, erro, ajuda, ...props }: TextInputProps & { rotulo: string; erro?: string; ajuda?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[estilos.campo, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, erro && { borderColor: cores.erro }]}
      />
      {erro ? <Text style={estilos.erro}>{erro}</Text> : ajuda ? <Text style={estilos.ajuda}>{ajuda}</Text> : null}
    </View>
  );
}

export function Opcoes<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo?: string;
  opcoes: { valor: T; titulo: string; descricao?: string }[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityState={{ selected: ativo }}
            onPress={() => aoMudar(o.valor)}
            style={[estilos.opcao, ativo && { borderColor: cores.azul, backgroundColor: cores.azulClaro }]}
          >
            <View style={[estilos.radio, ativo && { borderColor: cores.azul }]}>{ativo ? <View style={estilos.radioPonto} /> : null}</View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[estilos.texto, { fontFamily: fontes.semibold }]}>{o.titulo}</Text>
              {o.descricao ? <Text style={estilos.ajuda}>{o.descricao}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Contador({ rotulo, valor, aoMudar, min = 0, max = 10 }: {
  rotulo: string;
  valor: number;
  aoMudar: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={estilos.contador}>
      <Text style={[estilos.texto, { flex: 1 }]}>{rotulo}</Text>
      <Pressable accessibilityLabel={`Diminuir ${rotulo}`} onPress={() => aoMudar(Math.max(min, valor - 1))} style={estilos.contadorBotao}>
        <Text style={estilos.contadorSinal}>−</Text>
      </Pressable>
      <Text style={[estilos.texto, { width: 28, textAlign: 'center', fontFamily: fontes.semibold }]}>{valor}</Text>
      <Pressable accessibilityLabel={`Aumentar ${rotulo}`} onPress={() => aoMudar(Math.min(max, valor + 1))} style={estilos.contadorBotao}>
        <Text style={estilos.contadorSinal}>+</Text>
      </Pressable>
    </View>
  );
}

export function Cartao({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [estilos.cartao, style, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function Etiqueta({ texto, tom = 'azul' }: { texto: string; tom?: 'azul' | 'sucesso' | 'alerta' | 'erro' | 'neutro' }) {
  const mapa = {
    azul: [cores.azulClaro, cores.azul],
    sucesso: [cores.sucessoFundo, cores.sucesso],
    alerta: [cores.alertaFundo, cores.alerta],
    erro: [cores.erroFundo, cores.erro],
    neutro: ['#EEF2F7', cores.textoSecundario],
  } as const;
  const [fundo, cor] = mapa[tom];
  return (
    <View style={[estilos.etiqueta, { backgroundColor: fundo }]}>
      <Text style={[estilos.etiquetaTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export function Aviso({ children, tom = 'azul' }: { children: ReactNode; tom?: 'azul' | 'alerta' | 'erro' }) {
  const fundo = tom === 'erro' ? cores.erroFundo : tom === 'alerta' ? cores.alertaFundo : cores.azulClaro;
  const cor = tom === 'erro' ? cores.erro : tom === 'alerta' ? cores.alerta : cores.azulEscuro;
  return (
    <View style={[estilos.aviso, { backgroundColor: fundo }]}>
      <Text style={[estilos.texto, { color: cor, fontSize: 14 }]}>{children}</Text>
    </View>
  );
}

export function Carregando() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
      <ActivityIndicator size="large" color={cores.azul} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, gap: espaco.md, paddingBottom: espaco.xl },
  rodape: { padding: espaco.md, paddingHorizontal: espaco.lg, gap: espaco.sm, backgroundColor: cores.fundo },
  titulo: { fontFamily: fontes.negrito, fontSize: 26, color: cores.azulEscuro, letterSpacing: -0.3 },
  subtitulo: { fontFamily: fontes.regular, fontSize: 15, color: cores.textoSecundario, lineHeight: 22 },
  texto: { fontFamily: fontes.regular, fontSize: 15, color: cores.texto, lineHeight: 22 },
  rotulo: { fontFamily: fontes.semibold, fontSize: 14, color: cores.azulEscuro },
  campo: {
    fontFamily: fontes.regular,
    fontSize: 15,
    color: cores.texto,
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  erro: { fontFamily: fontes.medio, fontSize: 13, color: cores.erro },
  ajuda: { fontFamily: fontes.regular, fontSize: 13, color: cores.textoSecundario, lineHeight: 18 },
  botao: { height: 52, borderRadius: raio.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: espaco.md },
  botaoTexto: { fontFamily: fontes.semibold, fontSize: 16 },
  opcao: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.branco,
    alignItems: 'flex-start',
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioPonto: { width: 10, height: 10, borderRadius: 5, backgroundColor: cores.azul },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cores.branco, borderRadius: raio.md, borderWidth: 1, borderColor: cores.borda, padding: 10 },
  contadorBotao: { width: 36, height: 36, borderRadius: 18, backgroundColor: cores.azulClaro, alignItems: 'center', justifyContent: 'center' },
  contadorSinal: { fontFamily: fontes.semibold, fontSize: 20, color: cores.azul },
  cartao: { backgroundColor: cores.branco, borderRadius: raio.lg, borderWidth: 1, borderColor: cores.borda, padding: espaco.md, gap: espaco.sm },
  etiqueta: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  etiquetaTexto: { fontFamily: fontes.semibold, fontSize: 12 },
  aviso: { borderRadius: raio.md, padding: 14 },
});
