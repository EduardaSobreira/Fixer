import { Tabs } from 'expo-router';
import { iconeAba, opcoesAbas } from '@/components/navegacao';

export default function AbasPrestador() {
  return (
    <Tabs screenOptions={opcoesAbas}>
      <Tabs.Screen name="index" options={{ title: 'Pedidos', tabBarIcon: iconeAba('search-outline') }} />
      <Tabs.Screen name="servicos" options={{ title: 'Meus serviços', tabBarIcon: iconeAba('briefcase-outline') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: iconeAba('person-outline') }} />
    </Tabs>
  );
}
