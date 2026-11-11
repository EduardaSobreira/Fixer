// Porta de entrada: manda cada pessoa para o lugar certo.
import { Redirect } from 'expo-router';
import { Aviso, Botao, Carregando, Tela, Titulo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabaseConfigurado } from '@/lib/supabase';

export default function Inicio() {
  const { carregando, sessao, perfil, sair } = useAuth();

  if (!supabaseConfigurado) {
    return (
      <Tela>
        <Titulo subtitulo="Falta ligar o app ao banco de dados.">Configuração pendente</Titulo>
        <Aviso tom="alerta">
          Crie o arquivo apps/mobile/.env.local com EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (veja o .env.example e o README) e reinicie o Expo.
        </Aviso>
      </Tela>
    );
  }

  if (carregando) return <Carregando />;
  if (!sessao) return <Redirect href="/entrar" />;
  if (!perfil) {
    return (
      <Tela>
        <Titulo subtitulo="Estamos carregando seus dados. Se demorar, saia e entre de novo.">Quase lá</Titulo>
        <Botao titulo="Sair" variante="secundario" onPress={sair} />
      </Tela>
    );
  }
  if (perfil.tipo === 'prestador') return <Redirect href="/prestador" />;
  return <Redirect href="/cliente" />;
}
