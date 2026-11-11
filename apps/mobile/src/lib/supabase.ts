import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'sem-chave', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renova o login só enquanto o app está aberto na tela.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Mensagem amigável para erros do Supabase. */
export function mensagemDeErro(erro: unknown): string {
  const texto = erro instanceof Error ? erro.message : String((erro as { message?: string })?.message ?? erro);
  if (texto.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (texto.includes('User already registered')) return 'Já existe uma conta com este e-mail.';
  if (texto.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (texto.includes('Cannot coerce') || texto.includes('0 rows')) return 'Este pedido não está mais disponível.';
  if (texto.includes('Network request failed')) return 'Sem conexão. Confira sua internet e tente de novo.';
  return texto;
}
