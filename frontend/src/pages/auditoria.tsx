import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fmtFechaHora } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconClipboard } from '../components/icons';

interface RegistroAuditoria {
  id: number;
  accion: string;
  recurso: string;
  registroId: number | null;
  fechaHora: string;
  observacion: string | null;
  valorNuevo: unknown;
  usuario: { id: number; username: string; nombre: string; apellido: string } | null;
}

const ACCION_TONE: Record<string, string> = {
  CREAR: 'green',
  ACTUALIZAR: 'amber',
  ELIMINAR: 'red',
  SUBIR: 'blue',
  CERRAR: 'slate',
  ESCANEAR: 'violet',
  LOGIN: 'slate',
};

export default function Auditoria() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMIN';

  const [items, setItems] = useState<RegistroAuditoria[]>([]);
  const [resumenAcciones, setResumenAcciones] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);

  const [filtros, setFiltros] = useState({ recurso: '', accion: '', desde: '', hasta: '', q: '' });

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtros.recurso) params.set('recurso', filtros.recurso);
      if (filtros.accion) params.set('accion', filtros.accion);
      if (filtros.desde) params.set('desde', filtros.desde);
      if (filtros.hasta) params.set('hasta', filtros.hasta);
      if (filtros.q.trim()) params.set('q', filtros.q.trim());
      const qs = params.toString();
      const [lista, res] = await Promise.all([
        api.get<{ total: number; registros: RegistroAuditoria[] }>(`/auditoria${qs ? `?${qs}` : ''}`),
        api.get<{ acciones: Record<string, number> }>('/auditoria/resumen'),
      ]);
      setItems(lista.registros ?? []);
      setTotal(lista.total);
      setResumenAcciones(res.acciones ?? {});
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar auditoría');
    } finally {
      setLoading(false);
    }
  }, [filtros.recurso, filtros.accion, filtros.desde, filtros.hasta, filtros.q]);

  useEffect(() => {
    const t = setTimeout(() => {
      cargar();
    }, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  if (!esAdmin) {
    return (
      <div>
        <PageHeader title="Auditoría" />
        <Card className="p-6">
          <EmptyState title="Acceso restringido" description="Solo el rol Administrador puede consultar el registro de auditoría." />
        </Card>
      </div>
    );
  }

  const acciones = Object.keys(resumenAcciones).sort();

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle={`${total} registro(s) — trazabilidad de acciones del sistema`}
      />

      {/* KPIs por acción */}
      <div className="mb-4 flex flex-wrap gap-2">
        {acciones.map((a) => (
          <Card key={a} className="px-3 py-1.5">
            <span className="text-xs font-medium text-slate-500">{a}</span>{' '}
            <span className="text-sm font-semibold text-slate-900">{resumenAcciones[a]}</span>
          </Card>
        ))}
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Recurso">
            <TextInput value={filtros.recurso} onChange={(e) => setFiltros((f) => ({ ...f, recurso: e.target.value }))} placeholder="Ej: BENEFICIARIO" />
          </Field>
          <Field label="Acción">
            <Select value={filtros.accion} onChange={(e) => setFiltros((f) => ({ ...f, accion: e.target.value }))}>
              <option value="">Todas</option>
              {['CREAR', 'ACTUALIZAR', 'ELIMINAR', 'SUBIR', 'CERRAR', 'ESCANEAR'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="Desde">
            <TextInput type="date" value={filtros.desde} onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value }))} />
          </Field>
          <Field label="Hasta">
            <TextInput type="date" value={filtros.hasta} onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value }))} />
          </Field>
          <Field label="Buscar">
            <TextInput value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} placeholder="Observación, recurso…" />
          </Field>
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Consultando auditoría…" />
        ) : items.length === 0 ? (
          <EmptyState title="Sin registros" description="Ajusta los filtros para ver la actividad del sistema." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setExpandido(expandido === r.id ? null : r.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge tone={ACCION_TONE[r.accion] ?? 'slate'}>{r.accion}</Badge>
                    <Badge tone="teal">{r.recurso}</Badge>
                    {r.registroId && <span className="text-xs text-slate-400">#{r.registroId}</span>}
                    <span className="truncate text-sm text-slate-600">{r.observacion ?? '—'}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    <span>{r.usuario ? `${r.usuario.nombre} ${r.usuario.apellido}` : 'sistema'}</span>
                    <span>{fmtFechaHora(r.fechaHora)}</span>
                    {!!r.valorNuevo && <span className="text-slate-400">▾</span>}
                  </div>
                </button>
                {expandido === r.id && !!r.valorNuevo && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">Detalle (valor nuevo)</p>
                    <pre className="overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
                      {JSON.stringify(r.valorNuevo, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}