import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { cores, fontes } from '@/theme';

export default function AuthLayout() {
  const { sessao } = useAuth();
  if (sessao) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: cores.fundo },
        headerTitleStyle: { fontFamily: fontes.semibold, color: cores.azul, fontSize: 15 },
        headerTintColor: cores.azul,
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="entrar" options={{ headerShown: false }} />
      <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
    </Stack>
  );
}
