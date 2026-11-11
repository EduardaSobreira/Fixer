import { Tabs } from 'expo-router';
import { iconeAba, opcoesAbas } from '@/components/navegacao';

export default function AbasCliente() {
  return (
    <Tabs screenOptions={opcoesAbas}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: iconeAba('home-outline') }} />
      <Tabs.Screen name="pedidos" options={{ title: 'Pedidos', tabBarIcon: iconeAba('file-tray-outline') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: iconeAba('person-outline') }} />
    </Tabs>
  );
}
