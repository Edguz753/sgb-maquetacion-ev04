// Cliente HTTP con manejo de token JWT.
// El token y el usuario se persisten en localStorage y se leen desde aquí,
// para que AuthContext y las páginas compartan siempre la misma sesión.

import { MODO_DEMO, demoApi } from './demo-api';

const TOKEN_KEY = 'sgb.token';
const USER_KEY = 'sgb.user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, usuario: unknown): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Evento que dispara AuthContext para cerrar sesión ante un 401. */
export function emitUnauthorized(): void {
  window.dispatchEvent(new Event('sgb:unauthorized'));
}

export class ApiError extends Error {
  status: number;
  detalle?: unknown;

  constructor(status: number, message: string, detalle?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detalle = detalle;
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = options;

  // Modo demo (GitHub Pages): responde con datos ficticios en memoria.
  if (MODO_DEMO) {
    if (method === 'GET') return demoApi.get<T>(path);
    if (method === 'POST') return demoApi.post<T>(path, body);
    if (method === 'PATCH') return demoApi.patch<T>(path, body);
    if (method === 'DELETE') return demoApi.del<T>(path);
    if (method === 'PUT') return demoApi.put<T>(path, body);
  }

  const headers: Record<string, string> = {};

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica que el backend esté activo.');
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      emitUnauthorized();
      throw new ApiError(401, 'Sesión expirada. Vuelve a iniciar sesión.');
    }
    const msg =
      data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).error)
        : `Error ${res.status}`;
    throw new ApiError(res.status, msg, (data as { detalle?: unknown } | null)?.detalle);
  }

  return data as T;
}

/** Descarga (CSV/PDF) con soporte demo: genera el contenido en el cliente. */
export async function descargarReporte(formato: 'csv' | 'html', qs: string): Promise<void> {
  if (MODO_DEMO) {
    const contenido = await demoApi.get<string>(`/reportes/beneficiarios?formato=${formato}${qs ? '&' + qs : ''}`);
    const mime = formato === 'csv' ? 'text/csv' : 'text/html; charset=utf-8';
    const blob = new Blob([contenido], { type: mime });
    const url = URL.createObjectURL(blob);
    if (formato === 'csv') {
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-beneficiarios-${hoyArchivo()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.open(url, '_blank');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  // Con backend real: fetch normal
  const token = getToken();
  const res = await fetch(`/api/reportes/beneficiarios?formato=${formato}${qs ? '&' + qs : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, 'Error al generar el reporte');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (formato === 'csv') {
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-beneficiarios-${hoyArchivo()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.open(url, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function hoyArchivo(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
};