import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, TextInput } from './ui';
import { IconBook } from './icons';

export interface MatriculaItem {
  id: number;
  jornada: string | null;
  grado: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  actual: boolean;
  observaciones: string | null;
  colegio: { id: number; nombre: string; localidad: string | null; sede: string | null } | null;
  estadoEscolar: { id: number; nombre: string; descripcion: string | null };
  beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string };
}

export interface EstadoEscolarCat {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface ColegioCat {
  id: number;
  nombre: string;
  localidad: string | null;
  sede: string | null;
  orientadores: { id: number; nombre: string; telefono: string | null; correo: string | null }[];
}

const JORNADAS = ['MAÑANA', 'TARDE', 'JORNADA ÚNICA', 'NOCTURNA', 'FIN DE SEMANA'];

export function EscolaridadBadge({ estado }: { estado?: { nombre: string; descripcion: string | null } | null }) {
  const nombre = estado?.nombre ?? '';
  const map: Record<string, string> = {
    MATRICULADO: 'green',
    SIN_ESCOLARIZAR: 'amber',
    RETIRADO: 'red',
    TRASLADADO: 'blue',
    EN_VERIFICACION: 'violet',
    GRADUADO: 'teal',
  };
  return <Badge tone={map[nombre] ?? 'slate'}>{nombre || 'Sin registro'}</Badge>;
}

interface FormState {
  beneficiarioId: string;
  colegioId: string;
  nuevoColegio: string;
  estadoEscolarId: string;
  jornada: string;
  grado: string;
  fechaInicio: string;
  fechaFin: string;
  actual: boolean;
  observaciones: string;
}

function FormMatricula({
  form,
  setForm,
  colegios,
  estados,
  onSubmit,
  enviando,
  error,
  onError,
  onCancel,
  textoBoton,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  colegios: ColegioCat[];
  estados: EstadoEscolarCat[];
  onSubmit: (e: FormEvent) => void;
  enviando: boolean;
  error: string | null;
  onError?: (mensaje: string) => void;
  onCancel: () => void;
  textoBoton: string;
}) {
  const [crearColegio, setCrearColegio] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaLocalidad, setNuevaLocalidad] = useState('');
  const [creandoColegio, setCreandoColegio] = useState(false);

  async function crearColegioRapido() {
    if (!nuevoNombre.trim()) return;
    setCreandoColegio(true);
    try {
      const creado = await api.post<ColegioCat>('/catalogos/colegios', { nombre: nuevoNombre.trim(), localidad: nuevaLocalidad.trim() || null });
      colegios.push({ ...creado, orientadores: [] });
      setForm({ ...form, colegioId: String(creado.id) });
      setNuevoNombre('');
      setNuevaLocalidad('');
      setCrearColegio(false);
    } catch (err: any) {
      onError?.(err.message ?? 'Error al crear colegio');
    } finally {
      setCreandoColegio(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <AlertBanner kind="error">{error}</AlertBanner>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Colegio" required={form.estadoEscolarId !== ''}>
          {!crearColegio ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={form.colegioId} onChange={(e) => setForm({ ...form, colegioId: e.target.value })}>
                  <option value="">Selecciona…</option>
                  {colegios.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.localidad ? ` · ${c.localidad}` : ''}</option>
                  ))}
                </Select>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCrearColegio(true)}>Nuevo</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <TextInput value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del colegio" />
              <TextInput value={nuevaLocalidad} onChange={(e) => setNuevaLocalidad(e.target.value)} placeholder="Localidad (opcional)" />
              <div className="flex gap-2">
                <Button type="button" size="sm" loading={creandoColegio} onClick={crearColegioRapido}>Crear</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setCrearColegio(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </Field>
        <Field label="Estado escolar" required>
          <Select value={form.estadoEscolarId} onChange={(e) => setForm({ ...form, estadoEscolarId: e.target.value })}>
            <option value="">Selecciona…</option>
            {estados.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </Select>
        </Field>
        <Field label="Jornada">
          <Select value={form.jornada} onChange={(e) => setForm({ ...form, jornada: e.target.value })}>
            <option value="">—</option>
            {JORNADAS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </Select>
        </Field>
        <Field label="Grado" hint="Ej: TRANSICIÓN, 1°, 4°, 10°">
          <TextInput value={form.grado} onChange={(e) => setForm({ ...form, grado: e.target.value })} />
        </Field>
        <Field label="Fecha de inicio" required>
          <TextInput type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
        </Field>
        <Field label="Fecha de fin">
          <TextInput type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />
          Es la matrícula actual
        </label>
        <div className="sm:col-span-2">
          <Field label="Observaciones">
            <TextInput value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={enviando}>{textoBoton}</Button>
      </div>
    </form>
  );
}

// ── Modal: nueva matrícula ────────────────────────────────────────────
export function ModalNuevaMatricula({
  beneficiarios,
  onClose,
  onCreada,
}: {
  beneficiarios: { id: number; nombres: string; apellidos: string; numeroHistoria: string }[];
  onClose: () => void;
  onCreada: () => void;
}) {
  const [colegios, setColegios] = useState<ColegioCat[]>([]);
  const [estados, setEstados] = useState<EstadoEscolarCat[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<FormState>({ beneficiarioId: '', colegioId: '', nuevoColegio: '', estadoEscolarId: '', jornada: 'MAÑANA', grado: '', fechaInicio: new Date().toISOString().slice(0, 10), fechaFin: '', actual: true, observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cat = await api.get<{ colegios: ColegioCat[]; estadosEscolares: EstadoEscolarCat[] }>('/catalogos/todos');
        setColegios(cat.colegios ?? []);
        setEstados(cat.estadosEscolares ?? []);
      } catch (e: any) {
        setError(e.message ?? 'Error al cargar catálogos');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.beneficiarioId) {
      setError?.('Selecciona un beneficiario.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await api.post('/escolaridad/matriculas', {
        beneficiarioId: Number(form.beneficiarioId),
        colegioId: form.colegioId ? Number(form.colegioId) : null,
        estadoEscolarId: Number(form.estadoEscolarId),
        jornada: form.jornada || null,
        grado: form.grado.trim() || null,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin || null,
        actual: form.actual,
        observaciones: form.observaciones.trim() || null,
      });
      onCreada();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al registrar la matrícula');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Registrar matrícula escolar" onClose={onClose} wide>
      <div className="mb-4">
        <Field label="Beneficiario" required>
          <Select value={form.beneficiarioId} onChange={(e) => setForm((f) => ({ ...f, beneficiarioId: e.target.value }))}>
            <option value="">Selecciona…</option>
            {beneficiarios.map((b) => (
              <option key={b.id} value={b.id}>{b.nombres} {b.apellidos} · {b.numeroHistoria}</option>
            ))}
          </Select>
        </Field>
      </div>
      {cargando ? (
        <Spinner label="Cargando catálogos…" />
      ) : (
        <FormMatricula
          form={form}
          setForm={setForm}
          colegios={colegios}
          estados={estados}
          onSubmit={onSubmit}
          enviando={enviando}
          error={error}
          onError={setError}
          onCancel={onClose}
          textoBoton="Registrar matrícula"
        />
      )}
    </Modal>
  );
}

// ── Modal: editar matrícula ───────────────────────────────────────────
export function ModalEditarMatricula({ matricula, onClose, onActualizada }: { matricula: MatriculaItem; onClose: () => void; onActualizada: () => void }) {
  const [colegios, setColegios] = useState<ColegioCat[]>([]);
  const [estados, setEstados] = useState<EstadoEscolarCat[]>([]);
  const [form, setForm] = useState<FormState>({ beneficiarioId: '',
    colegioId: matricula.colegio?.id ? String(matricula.colegio.id) : '',
    nuevoColegio: '',
    estadoEscolarId: String(matricula.estadoEscolar.id),
    jornada: matricula.jornada ?? '',
    grado: matricula.grado ?? '',
    fechaInicio: matricula.fechaInicio.slice(0, 10),
    fechaFin: matricula.fechaFin?.slice(0, 10) ?? '',
    actual: matricula.actual,
    observaciones: matricula.observaciones ?? '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cat = await api.get<{ colegios: ColegioCat[]; estadosEscolares: EstadoEscolarCat[] }>('/catalogos/todos');
        setColegios(cat.colegios ?? []);
        setEstados(cat.estadosEscolares ?? []);
      } catch {
        /* catálogos vacíos */
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.patch(`/escolaridad/matriculas/${matricula.id}`, {
        colegioId: form.colegioId ? Number(form.colegioId) : null,
        estadoEscolarId: Number(form.estadoEscolarId),
        jornada: form.jornada || null,
        grado: form.grado.trim() || null,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin || null,
        actual: form.actual,
        observaciones: form.observaciones.trim() || null,
      });
      onActualizada();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al actualizar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Editar matrícula · ${matricula.colegio?.nombre ?? 'Sin colegio'}`} onClose={onClose} wide>
      {error && <AlertBanner kind="error">{error}</AlertBanner>}
      <FormMatricula
        form={form}
        setForm={setForm}
        colegios={colegios}
        estados={estados}
        onSubmit={onSubmit}
        enviando={enviando}
        error={error}
        onError={setError}
        onCancel={onClose}
        textoBoton="Guardar"
      />
    </Modal>
  );
}

// ── Sección reutilizable: escolaridad de un beneficiario (ficha) ──────
export function SeccionEscolaridad({ beneficiarioId }: { beneficiarioId: number }) {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeEditar = ['GESTOR', 'PROFESIONAL'].includes(rol);

  const [items, setItems] = useState<MatriculaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editar, setEditar] = useState<MatriculaItem | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; matriculas: MatriculaItem[] }>(`/escolaridad/matriculas?beneficiarioId=${beneficiarioId}`);
      setItems(res.matriculas ?? []);
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
        <h2 className="text-sm font-semibold text-slate-900">Escolaridad (matrículas)</h2>
        <Badge tone="slate">{items.length} matrícula(s)</Badge>
      </div>

      {aviso && <div className="px-4 py-2 text-sm text-emerald-700">{aviso}</div>}

      {loading ? (
        <Spinner label="Cargando matrículas…" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin matrículas registradas" description="Registra la situación escolar desde la página Escolaridad." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((m) => (
            <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{m.colegio?.nombre ?? 'Sin institución'}</p>
                  <EscolaridadBadge estado={m.estadoEscolar} />
                  {m.actual && <Badge tone="violet">Actual</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {m.grado ? `Grado ${m.grado} · ` : ''}
                  {m.jornada ? `${m.jornada} · ` : ''}
                  Desde {fmtFecha(m.fechaInicio)}
                  {m.fechaFin ? ` hasta ${fmtFecha(m.fechaFin)}` : ''}
                </p>
                {m.observaciones && <p className="mt-0.5 text-xs text-slate-400">{m.observaciones}</p>}
              </div>
              {puedeEditar && (
                <Button size="sm" variant="ghost" onClick={() => { setEditar(m); setAviso(null); }}>Editar</Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editar && <ModalEditarMatricula matricula={editar} onClose={() => setEditar(null)} onActualizada={() => { setAviso('Matrícula actualizada.'); cargar(); }} />}
    </Card>
  );
}

// Icono re-exportado para no romper imports existentes
export { IconBook };