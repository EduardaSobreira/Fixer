// Opções de cabeçalho e abas no visual do Fixer.
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { cores, fontes } from '@/theme';

export const opcoesCabecalho = {
  headerShadowVisible: false,
  headerStyle: { backgroundColor: cores.fundo },
  headerTitleStyle: { fontFamily: fontes.semibold, color: cores.azul, fontSize: 15 },
  headerTintColor: cores.azul,
  headerBackTitle: 'Voltar',
  contentStyle: { backgroundColor: cores.fundo },
} as const;

export const opcoesAbas = {
  headerShown: false,
  tabBarActiveTintColor: cores.azul,
  tabBarInactiveTintColor: '#64748B',
  tabBarLabelStyle: { fontFamily: fontes.medio, fontSize: 12 },
  tabBarStyle: { backgroundColor: cores.branco, borderTopColor: cores.borda },
  sceneStyle: { backgroundColor: cores.fundo },
} as const;

export function iconeAba(nome: ComponentProps<typeof Ionicons>['name']) {
  return ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={nome} color={typeof color === "number" ? undefined : (color ?? undefined)} size={size} />;
}
