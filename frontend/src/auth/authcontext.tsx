import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, clearSession, emitUnauthorized, getToken, setSession } from '../lib/api';
import type { LoginResponse, Usuario } from '../lib/types';

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  login: (username: string, password: string) => Promise<Usuario>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function leerUsuario(): Usuario | null {
  try {
    const raw = localStorage.getItem('sgb.user');
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuario);

  // Cierre de sesión automático ante 401 (token expirado / inválido)
  useEffect(() => {
    const handler = () => {
      clearSession();
      setUsuario(null);
      window.location.assign('/login');
    };
    window.addEventListener('sgb:unauthorized', handler);
    return () => window.removeEventListener('sgb:unauthorized', handler);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { username, password });
    setSession(res.token, res.usuario);
    setUsuario(res.usuario);
    return res.usuario;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ usuario, token: getToken(), login, logout }),
    [usuario, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}