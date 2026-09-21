import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { AREAS, fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, TextInput } from './ui';
import { IconAlert, IconCalendarPlus, IconHeartPulse } from './icons';

export interface AtencionItem {
  id: number;
  beneficiarioId: number;
  areaCodigo: string;
  tipo: string;
  fechaProgramada: string;
  fechaRealizacion: string | null;
  estado: string;
  estadoCalculado?: string;
  riesgoEmergente: string | null;
  observaciones: string | null;
  beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string };
}

export const AREAS_ROTACION = AREAS;

const RIESGOS = [
  { value: 'BAJO', label: 'Bajo — seguimiento mensual' },
  { value: 'MEDIO', label: 'Medio — cada 15 días' },
  { value: 'ALTO', label: 'Alto — semanal' },
];

const UBICACIONES = ['CLUB', 'CASA', 'COLEGIO', 'OTRO'];

// ── Modal: plan de rotación por áreas ─────────────────────────────────
export function ModalRotacion({
  beneficiarioId,
  onClose,
  onCreado,
}: {
  beneficiarioId: number;
  onClose: () => void;
  onCreado: () => void;
}) {
  const [pasos, setPasos] = useState([
    { areaCodigo: 'PS', fechaInicial: new Date().toISOString().slice(0, 10) },
  ]);
  const [periodicidadMeses, setPeriodicidad] = useState('3');
  const [rondas, setRondas] = useState('4');
  const [nombre, setNombre] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);


  function agregarPaso() {
    setPasos((p) => [...p, { areaCodigo: 'TS', fechaInicial: new Date().toISOString().slice(0, 10) }]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pasos.some((p) => !p.areaCodigo || !p.fechaInicial)) {
      setError('Cada paso necesita área y fecha inicial.');
      return;
    }
    setEnviando(true);
    try {
      await api.post('/atenciones/rotacion', {
        beneficiarioId,
        nombre: nombre.trim() || null,
        pasos,
        periodicidadMeses: Number(periodicidadMeses),
        rondas: Number(rondas),
        observaciones: observaciones.trim() || null,
      });
      onCreado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al crear el plan');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Plan de rotación por áreas" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <p className="text-xs text-slate-500">
          Asigna la fecha inicial de atención de cada área. El sistema renovará automáticamente cada ronda cada{' '}
          <strong>{periodicidadMeses} mes(es)</strong> durante {rondas} rondas, corrigiendo las fechas a días hábiles.
        </p>
        <Field label="Nombre del plan (opcional)">
          <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Rotación trimestral PS→TS→PD" />
        </Field>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Secuencia de áreas y fechas iniciales <span className="text-red-500">*</span></p>
          <div className="space-y-2">
            {pasos.map((paso, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 text-center text-xs font-semibold text-slate-400">{idx + 1}</span>
                <div className="flex-1">
                  <Select value={paso.areaCodigo} onChange={(e) => setPasos((ps) => ps.map((p, i) => (i === idx ? { ...p, areaCodigo: e.target.value } : p)))}>
                    {AREAS_ROTACION.map((a) => (
                      <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1">
                  <TextInput type="date" value={paso.fechaInicial} onChange={(e) => setPasos((ps) => ps.map((p, i) => (i === idx ? { ...p, fechaInicial: e.target.value } : p)))} />
                </div>
                {pasos.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPasos((ps) => ps.filter((_, i) => i !== idx))}>✕</Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={agregarPaso}>+ Agregar área</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Renovación cada">
            <Select value={periodicidadMeses} onChange={(e) => setPeriodicidad(e.target.value)}>
              {[1, 2, 3, 6].map((m) => (
                <option key={m} value={m}>{m} mes(es)</option>
              ))}
            </Select>
          </Field>
          <Field label="Rondas a programar">
            <Select value={rondas} onChange={(e) => setRondas(e.target.value)}>
              {[1, 2, 3, 4, 6, 8].map((m) => (
                <option key={m} value={m}>{m} ronda(s)</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Observaciones">
          <TextInput value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Crear plan</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal: registrar hecho emergente ──────────────────────────────────
export function ModalHechoEmergente({
  beneficiarioId,
  onClose,
  onCreado,
}: {
  beneficiarioId: number;
  onClose: () => void;
  onCreado: () => void;
}) {
  const [fechaHecho, setFechaHecho] = useState(new Date().toISOString().slice(0, 10));
  const [ubicacion, setUbicacion] = useState('COLEGIO');
  const [descripcion, setDescripcion] = useState('');
  const [acta, setActa] = useState('');
  const [riesgo, setRiesgo] = useState('MEDIO');
  const [pasos, setPasos] = useState([
    { areaCodigo: 'PS', fechaInicial: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10) },
  ]);
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diasRiesgo: Record<string, number> = { BAJO: 30, MEDIO: 15, ALTO: 7 };

  function agregarPaso() {
    const dias = diasRiesgo[riesgo] ?? 15;
    const ultima = pasos.length ? new Date(pasos[pasos.length - 1].fechaInicial) : new Date();
    ultima.setDate(ultima.getDate() + dias);
    setPasos((p) => [...p, { areaCodigo: 'PD', fechaInicial: ultima.toISOString().slice(0, 10) }]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post('/atenciones/hechos', {
        beneficiarioId,
        fechaHecho,
        ubicacion,
        descripcion: descripcion.trim() || null,
        actaReferencia: acta.trim() || null,
        nivelRiesgo: riesgo,
        pasos,
        observaciones: observaciones.trim() || null,
      });
      onCreado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al registrar el hecho');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Registrar hecho emergente" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha del hecho" required>
            <TextInput type="date" value={fechaHecho} onChange={(e) => setFechaHecho(e.target.value)} />
          </Field>
          <Field label="Dónde ocurrió" required>
            <Select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}>
              {UBICACIONES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descripción del hecho">
              <TextInput value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: agresión a un compañero en el aula" />
            </Field>
          </div>
          <Field label="Acta / referencia">
            <TextInput value={acta} onChange={(e) => setActa(e.target.value)} placeholder="Ej: ACTA-2026-014" />
          </Field>
          <Field label="Nivel de riesgo" required hint="Define la periodicidad de los seguimientos">
            <Select value={riesgo} onChange={(e) => setRiesgo(e.target.value)}>
              {RIESGOS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Secuencia de seguimientos (área y fecha de la primera atención) <span className="text-red-500">*</span></p>
          <div className="space-y-2">
            {pasos.map((paso, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 text-center text-xs font-semibold text-slate-400">{idx + 1}</span>
                <div className="flex-1">
                  <Select value={paso.areaCodigo} onChange={(e) => setPasos((ps) => ps.map((p, i) => (i === idx ? { ...p, areaCodigo: e.target.value } : p)))}>
                    {AREAS_ROTACION.map((a) => (
                      <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex-1">
                  <TextInput type="date" value={paso.fechaInicial} onChange={(e) => setPasos((ps) => ps.map((p, i) => (i === idx ? { ...p, fechaInicial: e.target.value } : p)))} />
                </div>
                {pasos.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPasos((ps) => ps.filter((_, i) => i !== idx))}>✕</Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={agregarPaso}>+ Agregar área</Button>
        </div>
        <Field label="Observaciones">
          <TextInput value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Sección reutilizable: atenciones de un beneficiario (ficha) ───────
export function SeccionAtenciones({ beneficiarioId }: { beneficiarioId: number }) {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedePlanificar = ['GESTOR', 'COORDINADOR'].includes(rol);
  const puedeAtender = puedePlanificar || rol === 'PROFESIONAL';

  const [items, setItems] = useState<AtencionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rotacionAbierta, setRotacionAbierta] = useState(false);
  const [hechoAbierto, setHechoAbierto] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; atenciones: AtencionItem[] }>(`/atenciones?beneficiarioId=${beneficiarioId}`);
      setItems(res.atenciones ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar atenciones');
    } finally {
      setLoading(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function realizar(id: number) {
    setError(null);
    try {
      await api.patch(`/atenciones/${id}`, { estado: 'REALIZADA' });
      setAviso('Atención realizada.');
      cargar();
    } catch (e: any) {
      setError(e.message ?? 'Error al marcar la atención');
    }
  }

  async function continuar(id: number) {
    setError(null);
    try {
      const res = await api.post<{ mensaje: string }>(`/atenciones/${id}/continuar`, {});
      setAviso(res.mensaje);
      cargar();
    } catch (e: any) {
      setError(e.message ?? 'Error al continuar');
    }
  }

  const estadoTone: Record<string, string> = {
    PENDIENTE: 'amber',
    REALIZADA: 'green',
    ATRASADA: 'red',
    CANCELADA: 'slate',
  };

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Atenciones y seguimientos por área</h2>
        <div className="flex items-center gap-2">
          <Badge tone="slate">{items.length} atención(es)</Badge>
          {puedePlanificar && (
            <>
              <Button size="sm" variant="secondary" onClick={() => { setRotacionAbierta(true); setError(null); }}>
                <IconCalendarPlus size={14} /> Plan de rotación
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setHechoAbierto(true); setError(null); }}>
                <IconAlert size={14} /> Hecho emergente
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}
      {aviso && <div className="px-4 py-2 text-sm text-emerald-700">{aviso}</div>}

      {loading ? (
        <Spinner label="Cargando atenciones…" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin atenciones programadas" description={puedePlanificar ? 'Crea un plan de rotación o registra un hecho emergente.' : 'El Gestor asignará las fechas de atención por área.'} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => {
            const tone = estadoTone[a.estado] ?? 'slate';
            return (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="teal">{a.areaCodigo}</Badge>
                    <p className="text-sm font-medium text-slate-800">
                      {a.tipo === 'ROTACION' ? 'Atención rotativa' : a.tipo === 'EMERGENTE' ? 'Seguimiento de hecho emergente' : a.tipo}
                    </p>
                    <Badge tone={tone}>{a.estado}</Badge>
                    {a.riesgoEmergente && <Badge tone="red">Riesgo {a.riesgoEmergente}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Programada: {fmtFecha(a.fechaProgramada)}
                    {a.fechaRealizacion ? ` · Realizada: ${fmtFecha(a.fechaRealizacion)}` : ''}
                  </p>
                  {a.observaciones && <p className="mt-0.5 text-xs text-slate-400">{a.observaciones}</p>}
                </div>
                {puedeAtender && a.estado === 'PENDIENTE' && (
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" onClick={() => realizar(a.id)}>Marcar realizada</Button>
                    {puedePlanificar && a.tipo === 'EMERGENTE' && (
                      <Button size="sm" variant="secondary" onClick={() => continuar(a.id)}>
                        Riesgo continúa
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {rotacionAbierta && (
        <ModalRotacion beneficiarioId={beneficiarioId} onClose={() => setRotacionAbierta(false)} onCreado={() => { setAviso('Plan de rotación creado con sus atenciones.'); cargar(); }} />
      )}
      {hechoAbierto && (
        <ModalHechoEmergente beneficiarioId={beneficiarioId} onClose={() => setHechoAbierto(false)} onCreado={() => { setAviso('Hecho emergente registrado con sus seguimientos.'); cargar(); }} />
      )}
    </Card>
  );
}

// Re-exports para no romper imports existentes en otras páginas
export { IconHeartPulse };