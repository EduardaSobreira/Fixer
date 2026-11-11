import { Redirect, Stack } from 'expo-router';
import { opcoesCabecalho } from '@/components/navegacao';
import { Carregando } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function PrestadorLayout() {
  const { carregando, sessao, perfil } = useAuth();
  if (carregando) return <Carregando />;
  if (!sessao) return <Redirect href="/entrar" />;
  if (perfil && perfil.tipo !== 'prestador') return <Redirect href="/" />;
  return (
    <Stack screenOptions={opcoesCabecalho}>
      <Stack.Screen name="(abas)" options={{ headerShown: false }} />
      <Stack.Screen name="pedido/[id]" options={{ title: 'Pedido' }} />
      <Stack.Screen name="documentos" options={{ title: 'Documentos' }} />
    </Stack>
  );
}
