import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, getToken } from '../lib/api';
import { can, estadoControlMeta, fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, TextInput } from './ui';
import { IconFile, IconHeartPulse, IconUpload } from './icons';

export interface ControlResumen {
  id: number;
  estado: string;
  estadoCalculado?: string;
  fechaProgramada: string | null;
  fechaRealizacion: string | null;
  fechaProximoControl: string | null;
  requiereControlEspecial: boolean;
  especialidad: string | null;
  observaciones: string | null;
  tipoControl: { id: number; codigo: string; nombre: string; periodicidadMeses: number | null };
  beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string; fechaNacimiento: string };
  soporteDocumento: {
    id: number;
    estado: string;
    tipoDocumento: { nombre: string };
    evidencias: { id: number; nombreArchivo: string; rutaReferencia: string }[];
  } | null;
}

export const ESTADOS_CONTROL = ['PENDIENTE', 'REALIZADO', 'ATRASADO', 'CANCELADO', 'NO_APLICA'];

export function ControlBadge({ estado }: { estado?: string }) {
  const meta = estadoControlMeta(estado);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ── Modal: nuevo control ──────────────────────────────────────────────
export function ModalNuevoControl({
  beneficiarios,
  tipos,
  onClose,
  onCreado,
}: {
  beneficiarios: { id: number; nombres: string; apellidos: string; numeroHistoria: string }[];
  tipos: { id: number; codigo: string; nombre: string; periodicidadMeses: number | null }[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [form, setForm] = useState({ beneficiarioId: '', tipoControlId: '', fechaProgramada: '', requiereControlEspecial: false, especialidad: '', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.beneficiarioId || !form.tipoControlId) return;
    if (form.requiereControlEspecial && !form.especialidad.trim()) {
      setError('Indica la especialidad para el control especial.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await api.post('/controles', {
        beneficiarioId: Number(form.beneficiarioId),
        tipoControlId: Number(form.tipoControlId),
        fechaProgramada: form.fechaProgramada || null,
        requiereControlEspecial: form.requiereControlEspecial,
        especialidad: form.especialidad.trim() || null,
        observaciones: form.observaciones.trim() || null,
      });
      onCreado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al registrar el control');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Registrar control de salud" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Beneficiario" required>
            <Select value={form.beneficiarioId} onChange={(e) => setForm((f) => ({ ...f, beneficiarioId: e.target.value }))}>
              <option value="">Selecciona…</option>
              {beneficiarios.map((b) => (
                <option key={b.id} value={b.id}>{b.nombres} {b.apellidos} · {b.numeroHistoria}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo de control" required>
            <Select value={form.tipoControlId} onChange={(e) => setForm((f) => ({ ...f, tipoControlId: e.target.value }))}>
              <option value="">Selecciona…</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}{t.periodicidadMeses ? ` (cada ${t.periodicidadMeses} meses)` : ''}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha programada">
            <TextInput type="date" value={form.fechaProgramada} onChange={(e) => setForm((f) => ({ ...f, fechaProgramada: e.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
            <input type="checkbox" checked={form.requiereControlEspecial} onChange={(e) => setForm((f) => ({ ...f, requiereControlEspecial: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />
            Requiere control especial
          </label>
          {form.requiereControlEspecial && (
            <Field label="Especialidad" required>
              <TextInput value={form.especialidad} onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))} placeholder="Ej: oftalmología pediátrica" />
            </Field>
          )}
          <Field label="Observaciones">
            <TextInput value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal: registrar realización / editar ─────────────────────────────
export function ModalEditarControl({ control, onClose, onActualizado }: { control: ControlResumen; onClose: () => void; onActualizado: () => void }) {
  const [estado, setEstado] = useState(control.estadoCalculado ?? control.estado);
  const [fechaRealizacion, setFechaRealizacion] = useState(control.fechaRealizacion?.slice(0, 10) ?? '');
  const [fechaProximo, setFechaProximo] = useState(control.fechaProximoControl?.slice(0, 10) ?? '');
  const [requiereEspecial, setRequiereEspecial] = useState(control.requiereControlEspecial);
  const [especialidad, setEspecialidad] = useState(control.especialidad ?? '');
  const [observaciones, setObservaciones] = useState(control.observaciones ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.patch(`/controles/${control.id}`, {
        estado,
        fechaRealizacion: fechaRealizacion || null,
        fechaProximoControl: fechaProximo || null,
        requiereControlEspecial: requiereEspecial,
        especialidad: especialidad.trim() || null,
        observaciones,
      });
      onActualizado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al actualizar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Control · ${control.tipoControl.nombre}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <p className="text-sm text-slate-600">
          {control.beneficiario.nombres} {control.beneficiario.apellidos}
          {control.fechaProgramada && <> · Programado: {fmtFecha(control.fechaProgramada)}</>}
        </p>
        <Field label="Estado" required hint="Al marcar REALIZADO se fija la fecha de hoy y se sugiere el próximo control según la periodicidad.">
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS_CONTROL.map((s) => (
              <option key={s} value={s}>{estadoControlMeta(s).label}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de realización">
            <TextInput type="date" value={fechaRealizacion} onChange={(e) => setFechaRealizacion(e.target.value)} />
          </Field>
          <Field label="Próximo control">
            <TextInput type="date" value={fechaProximo} onChange={(e) => setFechaProximo(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={requiereEspecial} onChange={(e) => setRequiereEspecial(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />
          Requiere control especial
        </label>
        {requiereEspecial && (
          <Field label="Especialidad">
            <TextInput value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
          </Field>
        )}
        <Field label="Observaciones">
          <TextInput value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal: subir soporte documental ───────────────────────────────────
export function ModalSoporteControl({ control, onClose, onSubido }: { control: ControlResumen; onClose: () => void; onSubido: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!archivo) {
      setError('Selecciona un archivo (pdf, jpg, jpeg o png).');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      if (observaciones.trim()) fd.append('observaciones', observaciones.trim());
      const token = getToken();
      const res = await fetch(`/api/controles/${control.id}/soporte`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al subir el soporte');
      onSubido();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al subir el soporte');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Soporte · ${control.tipoControl.nombre}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <Field label="Archivo" required hint="PDF, JPG o PNG · máximo 10 MB. Se vincula al expediente como documento de soporte.">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-800"
          />
        </Field>
        <Field label="Observaciones">
          <TextInput value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Subir</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Sección reutilizable: controles de un beneficiario (ficha) ────────
export function SeccionControles({ beneficiarioId }: { beneficiarioId: number }) {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeEditar = ['GESTOR', 'COORDINADOR', 'SECRETARIA', 'PROFESIONAL'].includes(rol);

  const [items, setItems] = useState<ControlResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editar, setEditar] = useState<ControlResumen | null>(null);
  const [soporte, setSoporte] = useState<ControlResumen | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; controles: ControlResumen[] }>(`/controles?beneficiarioId=${beneficiarioId}`);
      setItems(res.controles);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Controles de salud</h2>
        <Badge tone="slate">{items.length} control(es)</Badge>
      </div>

      {aviso && <div className={`px-4 py-2 text-sm ${aviso.includes('Error') || aviso.includes('Prohibido') ? 'text-red-600' : 'text-emerald-700'}`}>{aviso}</div>}

      {loading ? (
        <Spinner label="Cargando controles…" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin controles registrados" description="Registra el primer control de salud desde la página Controles." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{c.tipoControl.nombre}</p>
                  <ControlBadge estado={c.estadoCalculado ?? c.estado} />
                  {c.requiereControlEspecial && <Badge tone="violet">{c.especialidad ?? 'Control especial'}</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.fechaProgramada ? `Programado: ${fmtFecha(c.fechaProgramada)} · ` : ''}
                  {c.fechaRealizacion ? `Realizado: ${fmtFecha(c.fechaRealizacion)} · ` : ''}
                  {c.fechaProximoControl ? `Próximo: ${fmtFecha(c.fechaProximoControl)}` : ''}
                </p>
                {c.observaciones && <p className="mt-0.5 text-xs text-slate-400">{c.observaciones}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {c.soporteDocumento?.evidencias[0] && (
                  <a href={c.soporteDocumento.evidencias[0].rutaReferencia} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Ver soporte">
                    <IconFile size={16} />
                  </a>
                )}
                {puedeEditar && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => { setSoporte(c); setAviso(null); }}>
                      <IconUpload size={13} /> Soporte
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditar(c); setAviso(null); }}>
                      Estado
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editar && <ModalEditarControl control={editar} onClose={() => setEditar(null)} onActualizado={() => { setAviso('Control actualizado.'); cargar(); }} />}
      {soporte && <ModalSoporteControl control={soporte} onClose={() => setSoporte(null)} onSubido={() => { setAviso('Soporte cargado y vinculado al control.'); cargar(); }} />}
    </Card>
  );
}