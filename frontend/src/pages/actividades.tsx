import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ActividadesResponse } from '../lib/types';
import { can, estadoActividadMeta, fmtFecha, nombreArea } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, Spinner } from '../components/ui';
import { IconCheckCircle } from '../components/icons';

const FILTROS = [
  { value: '', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'ATRASADA', label: 'Atrasadas' },
  { value: 'REALIZADA', label: 'Realizadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: 'NO_APLICA', label: 'No aplica' },
];

export default function Actividades() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const profesionalId = usuario?.profesional?.id ?? null;

  const [estado, setEstado] = useState('');
  const [data, setData] = useState<ActividadesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (estado) params.set('estado', estado);
      const qs = params.toString();
      const res = await api.get<ActividadesResponse>(`/actividades${qs ? `?${qs}` : ''}`);
      setData(res);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar actividades');
    } finally {
      setLoading(false);
    }
  }, [estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const puedeMarcar = (asignacionProfesionalId?: number) => {
    if (!can.marcarActividad(rol)) return false;
    if (rol === 'PROFESIONAL') return !!profesionalId && asignacionProfesionalId === profesionalId;
    return true;
  };

  const marcar = async (id: number) => {
    setAviso(null);
    try {
      await api.patch(`/actividades/${id}/marcar-realizada`);
      setAviso('Actividad marcada como realizada.');
      cargar();
    } catch (e: any) {
      setAviso(e.message ?? 'Error al marcar la actividad');
    }
  };

  const resumen = data?.resumen ?? {};

  return (
    <div>
      <PageHeader
        title="Actividades"
        subtitle={
          data ? `${data.total} actividad${data.total === 1 ? '' : 'es'} en esta vista` : 'Plan de actividades de los casos'
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-56">
            <Field label="Filtrar por estado">
              <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
                {FILTROS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1 text-xs">
            {Object.entries(resumen).map(([k, v]) => {
              const meta = estadoActividadMeta(k);
              return (
                <Badge key={k} tone={meta.tone}>
                  {meta.label}: {v}
                </Badge>
              );
            })}
          </div>
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className={`mb-4 p-3 text-sm ${aviso.startsWith('Error') || aviso.includes('Prohibido') ? 'text-red-600' : 'text-emerald-700'}`}>{aviso}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Consultando actividades…" />
        ) : !data || data.actividades.length === 0 ? (
          <EmptyState title="Sin actividades en esta vista" description="Cambia el filtro o registra beneficiarios para generar actividades." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Actividad</th>
                  <th className="px-4 py-3 font-medium">Beneficiario</th>
                  <th className="px-4 py-3 font-medium">Área</th>
                  <th className="px-4 py-3 font-medium">Profesional</th>
                  <th className="px-4 py-3 font-medium">Programada</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.actividades.map((a) => {
                  const meta = estadoActividadMeta(a.estadoCalculado ?? a.estado);
                  const ben = a.asignacionCaso?.caso.beneficiario;
                  const profId = a.asignacionCaso?.profesional?.id;
                  return (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{a.tipoActividad.nombre}</p>
                        {a.prioridad != null && <p className="text-xs text-slate-400">Prioridad {a.prioridad}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {ben ? `${ben.nombres} ${ben.apellidos}` : '—'}
                        {ben?.numeroHistoria && <p className="text-xs text-slate-400">{ben.numeroHistoria}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{nombreArea(a.asignacionCaso?.area.codigo)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.asignacionCaso?.profesional
                          ? `${a.asignacionCaso.profesional.nombres} ${a.asignacionCaso.profesional.apellidos}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtFecha(a.fechaProgramada)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {puedeMarcar(profId) && a.estadoCalculado !== 'REALIZADA' && a.estado !== 'CANCELADA' && a.estado !== 'NO_APLICA' && (
                          <Button size="sm" variant="secondary" onClick={() => marcar(a.id)}>
                            <IconCheckCircle size={13} /> Realizada
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}