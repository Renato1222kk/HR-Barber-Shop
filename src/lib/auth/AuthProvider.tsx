'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// -------------------------------------------------------------------
// Autenticacao de DEMONSTRACAO.
// Nao existe servidor nem banco: a sessao e apenas uma marca no
// localStorage para que a tela de login continue navegavel. Nenhuma rota
// do app fica bloqueada por falta de sessao.
// -------------------------------------------------------------------

/** Credenciais de demonstracao aceitas pela tela de login. */
export const DEMO_CREDENTIALS = {
  email: 'admin@hrbarbershop.com',
  password: '123456',
} as const;

const SESSION_KEY = 'hr-barber-shop:demo:session';

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

const DEMO_USER: AuthUser = {
  id: 'demo-admin',
  name: 'Henrique Rocha',
  email: DEMO_CREDENTIALS.email,
};

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsDemo: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    // Sem marca gravada, a demonstracao ja comeca com a sessao aberta.
    return window.localStorage.getItem(SESSION_KEY) === 'signed-out' ? null : DEMO_USER;
  } catch {
    return DEMO_USER;
  }
}

function writeSession(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_KEY, active ? 'signed-in' : 'signed-out');
  } catch {
    // Storage indisponivel: a sessao vale apenas para esta aba.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Le a sessao apenas no cliente para nao gerar diferenca de hidratacao.
  useEffect(() => {
    setUser(readSession());
    setLoading(false);
  }, []);

  const signInAsDemo = useCallback(() => {
    writeSession(true);
    setUser(DEMO_USER);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const emailOk = email.trim().toLowerCase() === DEMO_CREDENTIALS.email;
      const passwordOk = password === DEMO_CREDENTIALS.password;
      if (!emailOk || !passwordOk) {
        return { error: 'E-mail ou senha incorretos.' };
      }
      writeSession(true);
      setUser(DEMO_USER);
      return { error: null };
    },
    []
  );

  const signOut = useCallback(() => {
    writeSession(false);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signInAsDemo, signOut }),
    [user, loading, signIn, signInAsDemo, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
