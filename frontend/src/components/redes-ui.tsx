import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, getToken } from '../lib/api';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, TextInput } from './ui';
import { IconFile, IconLink, IconUpload } from './icons';

export interface RedItem {
  id: number;
  estado: string;
  fechaActivacion: string | null;
  fechaRemision: string | null;
  fechaIngresoRed: string | null;
  fechaCierre: string | null;
  observaciones: string | null;
  tipoRed: { id: number; nombre: string; descripcion: string | null };
  beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string };
  profesional: { id: number; nombres: string; apellidos: string } | null;
  soportes: {
    id: number;
    documento: {
      id: number;
      tipoDocumento: { nombre: string };
      evidencias: { id: number; nombreArchivo: string; rutaReferencia: string }[];
    };
  }[];
}

export const ESTADOS_RED = ['IDENTIFICADA', 'REMISIONADA', 'ACTIVA', 'VERIFICACION_PENDIENTE', 'CERRADA'];

export const ESTADO_RED_META: Record<string, { label: string; tone: string }> = {
  IDENTIFICADA: { label: 'Identificada', tone: 'amber' },
  REMISIONADA: { label: 'Remitida', tone: 'blue' },
  ACTIVA: { label: 'Activa', tone: 'green' },
  VERIFICACION_PENDIENTE: { label: 'Verificación pendiente', tone: 'violet' },
  CERRADA: { label: 'Cerrada', tone: 'slate' },
};

export function estadoRedMeta(estado?: string) {
  return ESTADO_RED_META[estado ?? ''] ?? { label: estado ?? '—', tone: 'slate' };
}

export function RedBadge({ estado }: { estado?: string }) {
  const meta = estadoRedMeta(estado);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ── Modal: nueva red de apoyo ─────────────────────────────────────────
export function ModalNuevaRed({
  beneficiarios,
  tipos,
  onClose,
  onCreado,
  rol,
  miProfesionalId,
}: {
  beneficiarios: { id: number; nombres: string; apellidos: string; numeroHistoria: string }[];
  tipos: { id: number; nombre: string; descripcion: string | null }[];
  onClose: () => void;
  onCreado: () => void;
  rol: string;
  miProfesionalId: number | null;
}) {
  const esProfesional = rol === 'PROFESIONAL';
  const [form, setForm] = useState({ beneficiarioId: '', tipoRedId: '', fechaRemision: '', fechaIngresoRed: '', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.post('/redes', {
        beneficiarioId: Number(form.beneficiarioId),
        tipoRedId: Number(form.tipoRedId),
        profesionalId: esProfesional && miProfesionalId ? miProfesionalId : null,
        fechaRemision: form.fechaRemision || null,
        fechaIngresoRed: form.fechaIngresoRed || null,
        observaciones: form.observaciones.trim() || null,
      });
      onCreado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al registrar la red');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Vincular red de apoyo" onClose={onClose} wide>
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
          <Field label="Institución / red" required>
            <Select value={form.tipoRedId} onChange={(e) => setForm((f) => ({ ...f, tipoRedId: e.target.value }))}>
              <option value="">Selecciona…</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha de remisión">
            <TextInput type="date" value={form.fechaRemision} onChange={(e) => setForm((f) => ({ ...f, fechaRemision: e.target.value }))} />
          </Field>
          <Field label="Fecha de ingreso a la red">
            <TextInput type="date" value={form.fechaIngresoRed} onChange={(e) => setForm((f) => ({ ...f, fechaIngresoRed: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observaciones">
              <TextInput value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} placeholder="Ej: remisión por situación de protección" />
            </Field>
          </div>
        </div>
        <p className="text-xs text-slate-400">La red queda en estado IDENTIFICADA; luego puedes remitirla, activarla o cerrarla desde Acciones.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando} disabled={!form.beneficiarioId || !form.tipoRedId}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal: editar estado / fechas ─────────────────────────────────────
export function ModalEditarRed({ red, onClose, onActualizado }: { red: RedItem; onClose: () => void; onActualizado: () => void }) {
  const [estado, setEstado] = useState(red.estado);
  const [fechaRemision, setFechaRemision] = useState(red.fechaRemision?.slice(0, 10) ?? '');
  const [fechaActivacion, setFechaActivacion] = useState(red.fechaActivacion?.slice(0, 10) ?? '');
  const [fechaIngresoRed, setFechaIngresoRed] = useState(red.fechaIngresoRed?.slice(0, 10) ?? '');
  const [observaciones, setObservaciones] = useState(red.observaciones ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.patch(`/redes/${red.id}`, {
        estado,
        fechaRemision: fechaRemision || null,
        fechaActivacion: fechaActivacion || null,
        fechaIngresoRed: fechaIngresoRed || null,
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
    <Modal title={`Red · ${red.tipoRed.nombre}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <p className="text-sm text-slate-600">
          {red.beneficiario.nombres} {red.beneficiario.apellidos} · Estado actual: <RedBadge estado={red.estado} />
        </p>
        <Field label="Estado" required hint="ACTIVA fija la fecha de activación; CERRADA fija la fecha de cierre.">
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS_RED.map((s) => (
              <option key={s} value={s}>{estadoRedMeta(s).label}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Remisión">
            <TextInput type="date" value={fechaRemision} onChange={(e) => setFechaRemision(e.target.value)} />
          </Field>
          <Field label="Activación">
            <TextInput type="date" value={fechaActivacion} onChange={(e) => setFechaActivacion(e.target.value)} />
          </Field>
          <Field label="Ingreso a la red">
            <TextInput type="date" value={fechaIngresoRed} onChange={(e) => setFechaIngresoRed(e.target.value)} />
          </Field>
        </div>
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

// ── Modal: subir soporte ──────────────────────────────────────────────
export function ModalSoporteRed({ red, onClose, onSubido }: { red: RedItem; onClose: () => void; onSubido: () => void }) {
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
      const res = await fetch(`/api/redes/${red.id}/soporte`, {
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
    <Modal title={`Soporte · ${red.tipoRed.nombre}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <Field label="Archivo" required hint="PDF, JPG o PNG · máximo 10 MB. Queda en el expediente como Soporte de red.">
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

// ── Sección reutilizable: redes de un beneficiario (ficha) ────────────
export function SeccionRedes({ beneficiarioId }: { beneficiarioId: number }) {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeEditar = ['GESTOR', 'PROFESIONAL'].includes(rol);

  const [items, setItems] = useState<RedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editar, setEditar] = useState<RedItem | null>(null);
  const [soporte, setSoporte] = useState<RedItem | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; redes: RedItem[] }>(`/redes?beneficiarioId=${beneficiarioId}`);
      setItems(res.redes);
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
        <h2 className="text-sm font-semibold text-slate-900">Redes de apoyo</h2>
        <Badge tone="slate">{items.length} red(es)</Badge>
      </div>

      {loading ? (
        <Spinner label="Cargando redes…" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin redes de apoyo" description="Vincula instituciones (ICBF, Comisaría de familia, EPS, etc.) desde la página Redes." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((red) => (
            <li key={red.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{red.tipoRed.nombre}</p>
                  <RedBadge estado={red.estado} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {red.fechaRemision ? `Remisión: ${fmtFecha(red.fechaRemision)} · ` : ''}
                  {red.fechaActivacion ? `Activación: ${fmtFecha(red.fechaActivacion)} · ` : ''}
                  {red.fechaCierre ? `Cierre: ${fmtFecha(red.fechaCierre)} · ` : ''}
                  {red.profesional ? `Gestiona: ${red.profesional.nombres} ${red.profesional.apellidos}` : ''}
                </p>
                {red.observaciones && <p className="mt-0.5 text-xs text-slate-400">{red.observaciones}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {red.soportes[0]?.documento.evidencias[0] && (
                  <a href={red.soportes[0].documento.evidencias[0].rutaReferencia} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Ver soporte">
                    <IconFile size={16} />
                  </a>
                )}
                {puedeEditar && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setSoporte(red)}>
                      <IconUpload size={13} /> Soporte
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditar(red)}>
                      Estado
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editar && <ModalEditarRed red={editar} onClose={() => setEditar(null)} onActualizado={() => cargar()} />}
      {soporte && <ModalSoporteRed red={soporte} onClose={() => setSoporte(null)} onSubido={() => cargar()} />}
    </Card>
  );
}