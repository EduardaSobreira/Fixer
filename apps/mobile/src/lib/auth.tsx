import type { Perfil, Prestador } from '@fixer/shared';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

interface EstadoAuth {
  carregando: boolean;
  sessao: Session | null;
  perfil: Perfil | null;
  prestador: Prestador | null;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<EstadoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [prestador, setPrestador] = useState<Prestador | null>(null);

  const carregarPerfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null);
      setPrestador(null);
      return;
    }
    const { data: p } = await supabase.from('perfis').select('*').eq('id', s.user.id).maybeSingle();
    setPerfil((p as Perfil) ?? null);
    if (p?.tipo === 'prestador') {
      const { data: pr } = await supabase.from('prestadores').select('*').eq('id', s.user.id).maybeSingle();
      setPrestador((pr as Prestador) ?? null);
    } else {
      setPrestador(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSessao(data.session);
      await carregarPerfil(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessao(s);
      // fora do callback para não travar o cliente do Supabase
      setTimeout(() => carregarPerfil(s), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [carregarPerfil]);

  const recarregar = useCallback(() => carregarPerfil(sessao), [carregarPerfil, sessao]);
  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ carregando, sessao, perfil, prestador, recarregar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
