import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authcontext';
import { ApiError } from '../lib/api';
import { MODO_DEMO } from '../lib/demo-api';
import { AlertBanner, Button, Field, TextInput } from '../components/ui';

const HINT_CREDENCIALES = [
  { u: 'secretaria', r: 'Secretaría' },
  { u: 'gestor', r: 'Gestor' },
  { u: 'coordinador', r: 'Coordinador' },
  { u: 'ps.maria', r: 'Profesional PS' },
  { u: 'ts.carlos', r: 'Profesional TS' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img
            src="logo-card.png"
            alt="SGB — Sistema de Gestión de Beneficiarios"
            className="mx-auto mb-4 h-28 w-auto drop-shadow-lg"
          />
          <h1 className="text-2xl font-semibold text-white">Sistema de Gestión de Beneficiarios</h1>
          <p className="mt-1 text-sm text-teal-200/70">SGB · Línea base V4.1.1</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-xl">
          {error && (
            <div className="mb-4">
              <AlertBanner kind="error">{error}</AlertBanner>
            </div>
          )}
          <div className="space-y-4">
            <Field label="Usuario" required>
              <TextInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre.usuario"
                autoComplete="username"
                autoFocus
                required
              />
            </Field>
            <Field label="Contraseña" required>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              Ingresar
            </Button>
          </div>
        </form>

        <div className="mt-5 rounded-xl bg-white/5 p-4 text-xs text-teal-100/80 ring-1 ring-white/10">
          <p className="mb-2 font-medium text-teal-100">{MODO_DEMO ? 'Credenciales de la demo (datos ficticios):' : 'Credenciales de prueba (seed):'}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {HINT_CREDENCIALES.map((c) => (
              <li key={c.u} className="flex justify-between">
                <span>{c.r}</span>
                <code className="text-teal-200">{c.u}</code>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-teal-200/60">Contraseñas: Secre123! / Gestor123! / Coord123! / Prof123! según el rol</p>
          {MODO_DEMO && (
            <p className="mt-2 text-teal-200/60">
              También puedes entrar como <code className="text-teal-200">admin</code> con <code className="text-teal-200">Admin123!</code>.
              En este modo demo todo se guarda en memoria: al recargar la página vuelve a empezar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
