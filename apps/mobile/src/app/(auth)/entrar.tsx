import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Botao, Campo, Tela, Titulo } from '@/components/ui';
import { mensagemDeErro, supabase } from '@/lib/supabase';
import { cores, fontes } from '@/theme';

export default function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro(null);
    if (!email.includes('@') || senha.length < 6) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) setErro(mensagemDeErro(error));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <Tela>
        <View style={{ marginTop: 32, marginBottom: 16 }}>
          <Text style={{ fontFamily: fontes.negrito, fontSize: 40, color: cores.azul, letterSpacing: -1 }}>Fixer</Text>
          <Text style={{ fontFamily: fontes.medio, fontSize: 16, color: cores.azulEscuro }}>Seu serviço, a um clique.</Text>
        </View>
        <Titulo subtitulo="Frete e montagem de móveis com prestadores aprovados.">Entrar</Titulo>
        <Campo rotulo="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="voce@email.com" />
        <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="password" placeholder="Sua senha" />
        {erro ? <Aviso tom="erro">{erro}</Aviso> : null}
        <Botao titulo="Entrar" onPress={entrar} carregando={enviando} />
        <Link href="/cadastro" asChild>
          <Text style={{ fontFamily: fontes.semibold, color: cores.azul, textAlign: 'center', fontSize: 15, padding: 8 }}>
            Ainda não tem conta? Criar conta
          </Text>
        </Link>
      </Tela>
    </SafeAreaView>
  );
}
