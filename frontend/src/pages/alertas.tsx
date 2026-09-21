import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { BeneficiarioListResponse } from '../lib/types';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconAlert } from '../components/icons';
import { ESTADOS_ALERTA, ModalNuevaAlerta, PrioridadBadge, TipoAlertaBadge } from '../components/alertas-ui';
import type { AlertaItem } from '../components/alertas-ui';

const ROLES_GESTION = ['ADMIN', 'GESTOR', 'COORDINADOR'];

export default function Alertas() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const miUserId = usuario?.id ?? null;
  const puedeGestionar = ROLES_GESTION.includes(rol);

  const [items, setItems] = useState<AlertaItem[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [soloMias, setSoloMias] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [escaneando, setEscaneando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [bens, setBens] = useState<BeneficiarioListResponse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (estadoFiltro) params.set('estado', estadoFiltro);
      if (tipoFiltro) params.set('tipo', tipoFiltro);
      if (soloMias) params.set('soloMias', 'true');
      if (debounced.trim()) params.set('q', debounced.trim());
      const qs = params.toString();
      const [lista, res] = await Promise.all([
        api.get<{ total: number; resumen: Record<string, number>; alertas: AlertaItem[] }>(`/alertas${qs ? `?${qs}` : ''}`),
        api.get<{ total: number; porEstado: Record<string, number> }>('/alertas/resumen-global'),
      ]);
      setItems(lista.alertas);
      setTotal(lista.total);
      setResumen(res.porEstado);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar alertas');
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, tipoFiltro, soloMias, debounced]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const escanear = useCallback(async () => {
    setEscaneando(true);
    setError(null);
    setAviso(null);
    try {
      const res = await api.post<{ candidatas: number; creadas: number; omitidas: number }>('/alertas/escanear');
      setAviso(`Escaneo completado: ${res.creadas} alerta(s) nueva(s) creada(s), ${res.omitidas} ya abiertas.`);
      cargar();
    } catch (e: any) {
      setError(e.message ?? 'Error al ejecutar el escaneo');
    } finally {
      setEscaneando(false);
    }
  }, [cargar]);

  const cambiarEstado = useCallback(async (id: number, estado: string, extra: Record<string, unknown> = {}) => {
    setError(null);
    try {
      await api.patch(`/alertas/${id}`, { estado, ...extra });
      cargar();
    } catch (e: any) {
      setError(e.message ?? 'Error al actualizar la alerta');
    }
  }, [cargar]);

  const abrirCrear = useCallback(async () => {
    setCrearAbierto(true);
    try {
      setBens(await api.get<BeneficiarioListResponse>('/beneficiarios'));
    } catch {
      setBens(null);
    }
  }, []);

  const transiciones = (a: AlertaItem): { label: string; estado: string; extra?: Record<string, unknown>; variant: 'primary' | 'secondary' | 'ghost' | 'danger' }[] => {
    const esMia = a.responsableId === miUserId;
    switch (a.estado) {
      case 'NUEVA':
        return puedeGestionar || !a.responsableId
          ? [{ label: 'Asignármela', estado: 'ASIGNADA', extra: { responsableId: miUserId }, variant: 'primary' }]
          : [];
      case 'ASIGNADA':
        return esMia || puedeGestionar
          ? [
              { label: 'En proceso', estado: 'EN_PROCESO', variant: 'primary' },
              { label: 'Atender', estado: 'ATENDIDA', variant: 'secondary' },
            ]
          : [];
      case 'EN_PROCESO':
        return esMia || puedeGestionar
          ? [
              { label: 'Atender', estado: 'ATENDIDA', variant: 'primary' },
              { label: 'Cancelar', estado: 'CANCELADA', variant: 'danger' },
            ]
          : [];
      case 'ATENDIDA':
        return puedeGestionar
          ? [
              { label: 'Cerrar', estado: 'CERRADA', variant: 'primary' },
              { label: 'Reabrir', estado: 'REABIERTA', variant: 'secondary' },
            ]
          : [];
      case 'REABIERTA':
        return [{ label: 'En proceso', estado: 'EN_PROCESO', variant: 'primary' }];
      default:
        return [];
    }
  };

  const kpis = ['NUEVA', 'ASIGNADA', 'EN_PROCESO', 'ATENDIDA', 'REABIERTA', 'CERRADA'];

  return (
    <div>
      <PageHeader
        title="Alertas"
        subtitle={`${total} alerta(s) en esta vista`}
        actions={
          <>
            {puedeGestionar && (
              <Button variant="secondary" loading={escaneando} onClick={escanear}>
                <IconAlert size={15} /> Escanear alertas
              </Button>
            )}
            {puedeGestionar && (
              <Button onClick={abrirCrear}>+ Alerta manual</Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((s) => (
          <Card key={s} className="p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{resumen[s] ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <Field label="Estado">
              <Select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_ALERTA.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="sm:w-44">
            <Field label="Solo asignadas a mí">
              <Select value={soloMias ? 'si' : ''} onChange={(e) => setSoloMias(e.target.value === 'si')}>
                <option value="">Todas</option>
                <option value="si">Solo mías</option>
              </Select>
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Buscar en el título">
              <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Palabra clave…" />
            </Field>
          </div>
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className="mb-4 p-3 text-sm text-emerald-700">{aviso}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Consultando alertas…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin alertas en esta vista"
            description={puedeGestionar ? 'Ejecuta "Escanear alertas" para detectar pendientes del sistema.' : 'Ajusta los filtros o espera el próximo escaneo.'}
            action={puedeGestionar ? <Button variant="secondary" loading={escaneando} onClick={escanear}><IconAlert size={15} /> Escanear alertas</Button> : undefined}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((a) => {
              const vencida = a.fechaLimite && new Date(a.fechaLimite) < new Date() && !['ATENDIDA', 'CERRADA', 'CANCELADA'].includes(a.estado);
              return (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PrioridadBadge prioridad={a.prioridad} />
                      <TipoAlertaBadge tipo={a.tipo} />
                      <Badge tone={resumen && (a.estado === 'NUEVA' ? 'amber' : a.estado === 'CERRADA' ? 'slate' : 'blue')}>{a.estado}</Badge>
                      {vencida && <Badge tone="red">Vencida</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-800">{a.titulo}</p>
                    {a.descripcion && <p className="text-xs text-slate-500">{a.descripcion}</p>}
                    <p className="mt-1 text-xs text-slate-400">
                      <Link to={`/beneficiarios/${a.beneficiario.id}`} className="text-teal-700 hover:text-teal-800">
                        {a.beneficiario.nombres} {a.beneficiario.apellidos}
                      </Link>
                      {' · '}Generada {fmtFecha(a.fechaGeneracion)}
                      {a.fechaLimite ? ` · Límite ${fmtFecha(a.fechaLimite)}` : ''}
                      {a.responsableUsuario ? ` · Responsable: ${a.responsableUsuario.nombre} ${a.responsableUsuario.apellido}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {transiciones(a).map((t) => (
                      <Button key={t.label} size="sm" variant={t.variant} onClick={() => cambiarEstado(a.id, t.estado, t.extra ?? {})}>
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {crearAbierto && (
        <ModalNuevaAlerta
          beneficiarios={bens?.beneficiarios ?? []}
          onClose={() => setCrearAbierto(false)}
          onCreada={() => { setAviso('Alerta creada.'); cargar(); }}
        />
      )}
    </div>
  );
}