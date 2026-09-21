import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, TextInput } from './ui';
import { IconAlert } from './icons';

export interface CondicionItem {
  id: number;
  fechaDeteccion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: string;
  descripcion: string | null;
  tipoCondicion: { id: number; nombre: string; categoria: string | null };
  registradoPorUsuario?: { id: number; nombre: string; apellido: string } | null;
}

const ESTADOS_COND = ['ACTIVA', 'RESUELTA', 'CERRADA'];
const ESTADO_META: Record<string, { label: string; tone: string }> = {
  ACTIVA: { label: 'Activa', tone: 'amber' },
  RESUELTA: { label: 'Resuelta', tone: 'green' },
  CERRADA: { label: 'Cerrada', tone: 'slate' },
};

function estadoMeta(e?: string | null) {
  return ESTADO_META[e ?? ''] ?? { label: e ?? '—', tone: 'slate' };
}

export function CondicionBadge({ estado }: { estado?: string | null }) {
  const meta = estadoMeta(estado);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ── Modal crear/editar condición ──────────────────────────────────────
export function ModalCondicion({
  beneficiarioId,
  existente,
  onClose,
  onGuardado,
}: {
  beneficiarioId: number;
  existente?: CondicionItem;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [tipos, setTipos] = useState<{ id: number; nombre: string; categoria: string | null }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({
    tipoCondicionId: existente?.tipoCondicion.id ? String(existente.tipoCondicion.id) : '',
    fechaDeteccion: existente?.fechaDeteccion?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    fechaInicio: existente?.fechaInicio?.slice(0, 10) ?? '',
    estado: existente?.estado ?? 'ACTIVA',
    descripcion: existente?.descripcion ?? '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ total: number; tipos: any[] }>('/condiciones/tipos');
        setTipos(res.tipos ?? []);
      } catch {
        setTipos([]);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.tipoCondicionId) {
      setError('Selecciona el tipo de condición.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const body = {
        tipoCondicionId: Number(form.tipoCondicionId),
        fechaDeteccion: form.fechaDeteccion,
        fechaInicio: form.fechaInicio || null,
        estado: form.estado,
        descripcion: form.descripcion.trim() || null,
      };
      if (existente) await api.patch(`/condiciones/${existente.id}`, body);
      else await api.post('/condiciones', { ...body, beneficiarioId });
      onGuardado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar la condición');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={existente ? 'Editar condición' : 'Registrar condición'} onClose={onClose} wide>
      {cargando ? (
        <Spinner label="Cargando tipos…" />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <AlertBanner kind="error">{error}</AlertBanner>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo de condición" required>
              <Select value={form.tipoCondicionId} onChange={(e) => setForm((f) => ({ ...f, tipoCondicionId: e.target.value }))}>
                <option value="">Selecciona…</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}{t.categoria ? ` (${t.categoria})` : ''}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha de detección" required>
              <TextInput type="date" value={form.fechaDeteccion} onChange={(e) => setForm((f) => ({ ...f, fechaDeteccion: e.target.value }))} />
            </Field>
            <Field label="Fecha de inicio">
              <TextInput type="date" value={form.fechaInicio} onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} />
            </Field>
            <Field label="Estado">
              <Select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
                {ESTADOS_COND.map((s) => (
                  <option key={s} value={s}>{estadoMeta(s).label}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descripción">
                <TextInput value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: diagnóstico del especialista" />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={enviando}>Guardar</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Sección reutilizable: condiciones de un beneficiario (ficha) ──────
export function SeccionCondiciones({ beneficiarioId }: { beneficiarioId: number }) {
  const { usuario } = useAuth();
  const puedeEditar = ['GESTOR', 'COORDINADOR', 'SECRETARIA'].includes(usuario?.rol ?? '');

  const [items, setItems] = useState<CondicionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [editar, setEditar] = useState<CondicionItem | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; condiciones: CondicionItem[] }>(`/condiciones?beneficiarioId=${beneficiarioId}`);
      setItems(res.condiciones ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar condiciones');
    } finally {
      setLoading(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const eliminar = async (id: number) => {
    setError(null);
    try {
      await api.del(`/condiciones/${id}`);
      setAviso('Condición eliminada.');
      cargar();
    } catch (e: any) {
      setError(e.message ?? 'Error al eliminar');
    }
  };

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <IconAlert size={16} className="text-amber-500" /> Condiciones del beneficiario
        </h2>
        <div className="flex items-center gap-2">
          <Badge tone="slate">{items.length} registro(s)</Badge>
          {puedeEditar && (
            <Button size="sm" variant="secondary" onClick={() => { setCrearAbierto(true); setError(null); }}>
              + Condición
            </Button>
          )}
        </div>
      </div>

      {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}
      {aviso && <div className="px-4 py-2 text-sm text-emerald-700">{aviso}</div>}

      {loading ? (
        <Spinner label="Cargando condiciones…" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin condiciones registradas" description="Registra condiciones de salud, escolares o particulares del beneficiario." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((c) => {
            const meta = estadoMeta(c.estado);
            return (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{c.tipoCondicion.nombre}</p>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {c.tipoCondicion.categoria && <span className="text-xs text-slate-400">{c.tipoCondicion.categoria}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Detectada: {fmtFecha(c.fechaDeteccion)}
                    {c.fechaInicio ? ` · Inicio: ${fmtFecha(c.fechaInicio)}` : ''}
                    {c.fechaFin ? ` · Fin: ${fmtFecha(c.fechaFin)}` : ''}
                  </p>
                  {c.descripcion && <p className="mt-0.5 text-xs text-slate-400">{c.descripcion}</p>}
                </div>
                {puedeEditar && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => { setEditar(c); setAviso(null); }}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => eliminar(c.id)}>Eliminar</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {crearAbierto && (
        <ModalCondicion beneficiarioId={beneficiarioId} onClose={() => setCrearAbierto(false)} onGuardado={() => { setAviso('Condición registrada.'); cargar(); }} />
      )}
      {editar && (
        <ModalCondicion beneficiarioId={beneficiarioId} existente={editar} onClose={() => setEditar(null)} onGuardado={() => { setAviso('Condición actualizada.'); cargar(); }} />
      )}
    </Card>
  );
}