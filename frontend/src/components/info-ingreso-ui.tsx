import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, Field, Select, Spinner, TextInput } from './ui';

interface Catalogos {
  eps: { id: number; nombre: string; regimen: string | null }[];
  defensorias: { id: number; nombre: string; centroZonal: string | null }[];
  estadosAfiliacion: { id: number; nombre: string; descripcion: string | null }[];
}

interface InfoIngreso {
  id: number;
  sim: string | null;
  jornadaClub: string | null;
  taller: string | null;
  barrio: string | null;
  eps: { id: number; nombre: string; regimen: string | null } | null;
  defensoria: { id: number; nombre: string; centroZonal: string | null } | null;
  estadoAfiliacion: { id: number; nombre: string; descripcion: string | null } | null;
  casos?: any[];
}

const JORNADAS_CLUB = ['MAÑANA', 'TARDE', 'JORNADA ÚNICA', 'FIN DE SEMANA'];

// ── Sección reutilizable: información de ingreso / afiliación (ficha) ──
export function SeccionInfoIngreso({ beneficiarioId }: { beneficiarioId: number }) {
  const { usuario } = useAuth();
  const puedeEditar = ['GESTOR', 'COORDINADOR', 'SECRETARIA'].includes(usuario?.rol ?? '');

  const [info, setInfo] = useState<InfoIngreso | null>(null);
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ sim: '', jornadaClub: '', epsId: '', defensoriaId: '', estadoAfiliacionId: '' });
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [infoRes, catRes] = await Promise.all([
        api.get<InfoIngreso>(`/beneficiarios/${beneficiarioId}`),
        api.get<Catalogos>('/catalogos/todos'),
      ]);
      setInfo(infoRes);
      setCat(catRes);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar la información');
    } finally {
      setLoading(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function iniciarEdicion() {
    if (!info) return;
    setForm({
      sim: info.sim ?? '',
      jornadaClub: info.jornadaClub ?? '',
          epsId: info.eps?.id ? String(info.eps.id) : '',
      defensoriaId: info.defensoria?.id ? String(info.defensoria.id) : '',
      estadoAfiliacionId: info.estadoAfiliacion?.id ? String(info.estadoAfiliacion.id) : '',
    });
    setEditando(true);
    setAviso(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.patch(`/beneficiarios/${beneficiarioId}`, {
        sim: form.sim.trim() || null,
        jornadaClub: form.jornadaClub || null,
          epsId: form.epsId ? Number(form.epsId) : null,
        defensoriaId: form.defensoriaId ? Number(form.defensoriaId) : null,
        estadoAfiliacionId: form.estadoAfiliacionId ? Number(form.estadoAfiliacionId) : null,
      });
      setEditando(false);
      setAviso('Información actualizada.');
      cargar();
    } catch (err: any) {
      setError(err.message ?? 'Error al actualizar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Información de ingreso y afiliación</h2>
        {puedeEditar && !editando && (
          <Button size="sm" variant="secondary" onClick={iniciarEdicion}>Editar</Button>
        )}
      </div>

      {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}
      {aviso && <div className="px-4 py-2 text-sm text-emerald-700">{aviso}</div>}

      {loading ? (
        <Spinner label="Cargando información…" />
      ) : !info ? (
        <div className="px-4 py-4 text-sm text-slate-500">Sin información.</div>
      ) : editando && cat ? (
        <form onSubmit={onSubmit} className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="SIM">
              <TextInput value={form.sim} onChange={(e) => setForm((f) => ({ ...f, sim: e.target.value }))} />
            </Field>
            <Field label="Jornada del club">
              <Select value={form.jornadaClub} onChange={(e) => setForm((f) => ({ ...f, jornadaClub: e.target.value }))}>
                <option value="">—</option>
                {JORNADAS_CLUB.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </Select>
            </Field>
            <Field label="EPS">
              <Select value={form.epsId} onChange={(e) => setForm((f) => ({ ...f, epsId: e.target.value }))}>
                <option value="">—</option>
                {cat.eps.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}{e.regimen ? ` (${e.regimen})` : ''}</option>
                ))}
              </Select>
            </Field>
            <Field label="Estado de afiliación">
              <Select value={form.estadoAfiliacionId} onChange={(e) => setForm((f) => ({ ...f, estadoAfiliacionId: e.target.value }))}>
                <option value="">—</option>
                {cat.estadosAfiliacion.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Defensoría">
              <Select value={form.defensoriaId} onChange={(e) => setForm((f) => ({ ...f, defensoriaId: e.target.value }))}>
                <option value="">—</option>
                {cat.defensorias.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
            <Button type="submit" loading={enviando}>Guardar</Button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 gap-3 px-4 py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">SIM</dt>
            <dd className="mt-0.5 text-slate-800">{info.sim ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Jornada del club</dt>
            <dd className="mt-0.5 text-slate-800">{info.jornadaClub ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Taller</dt>
            <dd className="mt-0.5 text-slate-800">{info.taller ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Barrio</dt>
            <dd className="mt-0.5 text-slate-800">{info.barrio ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Área de seguimiento</dt>
            <dd className="mt-0.5 text-slate-800">
              {(() => {
                const activa = info.casos?.[0]?.asignaciones?.find((a: any) => a.estado === 'ACTIVA');
                return activa ? (
                  <Badge tone="teal">
                    {activa.area?.nombre ?? '—'}
                    {activa.profesional ? ' · ' + activa.profesional.nombres + ' ' + activa.profesional.apellidos : ' · sin profesional asignado'}
                  </Badge>
                ) : '—';
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">EPS</dt>
            <dd className="mt-0.5 text-slate-800">
              {info.eps ? <Badge tone="green">{info.eps.nombre}{info.eps.regimen ? ` · ${info.eps.regimen}` : ''}</Badge> : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Estado de afiliación</dt>
            <dd className="mt-0.5 text-slate-800">{info.estadoAfiliacion?.nombre ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Defensoría</dt>
            <dd className="mt-0.5 text-slate-800">
              {info.defensoria ? <Badge tone="blue">{info.defensoria.nombre}</Badge> : '—'}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}