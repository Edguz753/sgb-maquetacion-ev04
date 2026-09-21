import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { TIPOS_DOCUMENTO } from '../lib/utils';
import { IconCalendarPlus, IconSearch } from '../components/icons';

interface PreIngreso {
  id: number;
  nombre: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  acudiente: string | null;
  documentoAcudiente: string | null;
  ocupacionAcudiente: string | null;
  telefono: string | null;
  lugarResidencia: string | null;
  barrio: string | null;
  direccion: string | null;
  motivoAperturaCupo: string | null;
  antecedentesMedicos: string | null;
  fechaCitacion: string | null;
  horaCitacion: string | null;
  recordatorio: string | null;
  respuesta: string | null;
  observaciones: string | null;
  estado: 'PENDIENTE' | 'CITADO' | 'CONFIRMADO' | 'INGRESADO' | 'DESCARTADO';
}

const ESTADOS = ['PENDIENTE', 'CITADO', 'CONFIRMADO', 'INGRESADO', 'DESCARTADO'] as const;

const TONO: Record<string, 'amber' | 'blue' | 'green' | 'slate' | 'red'> = {
  PENDIENTE: 'amber',
  CITADO: 'blue',
  CONFIRMADO: 'green',
  INGRESADO: 'green',
  DESCARTADO: 'red',
};

const SIGUIENTES: Record<string, string[]> = {
  PENDIENTE: ['CITADO'],
  CITADO: ['CONFIRMADO', 'PENDIENTE'],
  CONFIRMADO: ['INGRESADO', 'PENDIENTE'],
  INGRESADO: [],
  DESCARTADO: ['PENDIENTE'],
};

export default function PreIngresos() {
  const { usuario } = useAuth();
  const puedeGestionar = ['GESTOR', 'COORDINADOR', 'SECRETARIA'].includes(usuario?.rol ?? '');

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [items, setItems] = useState<PreIngreso[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<PreIngreso | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: '', tipoDocumento: 'CC', numeroDocumento: '', acudiente: '', documentoAcudiente: '', ocupacionAcudiente: '', telefono: '', lugarResidencia: '', barrio: '', direccion: '', fechaCitacion: '', horaCitacion: '', recordatorio: '', respuesta: '', motivoAperturaCupo: '', antecedentesMedicos: '', observaciones: '' });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debounced.trim()) params.set('q', debounced.trim());
      if (estadoFiltro) params.set('estado', estadoFiltro);
      const d = await api.get<{ total: number; resumen: Record<string, number>; preingresos: PreIngreso[] }>(`/preingresos?${params.toString()}`);
      setItems(d.preingresos);
      setResumen(d.resumen ?? {});
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar pre-ingresos');
    } finally {
      setLoading(false);
    }
  }, [debounced, estadoFiltro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function tablaDefensora() {
    try {
      const res = await fetch('http://localhost:3000/api/preingresos/tabla?estados=PENDIENTE,CITADO,CONFIRMADO', { headers: { Authorization: 'Bearer ' + (getToken() ?? '') } });
      if (!res.ok) throw new Error('No se pudo generar la tabla');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      setError(err.message ?? 'Error al generar la tabla');
    }
  }

  function abrirCrear() {
    setForm({ nombre: '', tipoDocumento: 'CC', numeroDocumento: '', acudiente: '', documentoAcudiente: '', ocupacionAcudiente: '', telefono: '', lugarResidencia: '', barrio: '', direccion: '', fechaCitacion: '', horaCitacion: '', recordatorio: '', respuesta: '', motivoAperturaCupo: '', antecedentesMedicos: '', observaciones: '' });
    setEditando(null);
    setModalAbierto(true);
    setError(null);
  }

  function abrirEditar(x: PreIngreso) {
    setForm({
      nombre: x.nombre ?? '',
      tipoDocumento: x.tipoDocumento ?? 'CC',
      numeroDocumento: x.numeroDocumento ?? '',
      acudiente: x.acudiente ?? '',
      documentoAcudiente: x.documentoAcudiente ?? '',
      ocupacionAcudiente: x.ocupacionAcudiente ?? '',
      telefono: x.telefono ?? '',
      lugarResidencia: x.lugarResidencia ?? '',
      barrio: x.barrio ?? '',
      direccion: x.direccion ?? '',
      fechaCitacion: (x.fechaCitacion ?? '').slice(0, 10),
      horaCitacion: x.horaCitacion ?? '',
      recordatorio: x.recordatorio ?? '',
      respuesta: x.respuesta ?? '',
      motivoAperturaCupo: x.motivoAperturaCupo ?? '',
      antecedentesMedicos: x.antecedentesMedicos ?? '',
      observaciones: x.observaciones ?? '',
    });
    setEditando(x);
    setModalAbierto(true);
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const body = {
        nombre: form.nombre.trim(),
        tipoDocumento: form.tipoDocumento || null,
        numeroDocumento: form.numeroDocumento.trim() || null,
        acudiente: form.acudiente.trim() || null,
        documentoAcudiente: form.documentoAcudiente.trim() || null,
        ocupacionAcudiente: form.ocupacionAcudiente.trim() || null,
        telefono: form.telefono.trim() || null,
        lugarResidencia: form.lugarResidencia.trim() || null,
        barrio: form.barrio.trim() || null,
        direccion: form.direccion.trim() || null,
        motivoAperturaCupo: form.motivoAperturaCupo.trim() || null,
        antecedentesMedicos: form.antecedentesMedicos.trim() || null,
        fechaCitacion: form.fechaCitacion || null,
        horaCitacion: form.horaCitacion.trim() || null,
        recordatorio: form.recordatorio.trim() || null,
        respuesta: form.respuesta.trim() || null,
        observaciones: form.observaciones.trim() || null,
      };
      if (editando) await api.patch('/preingresos/' + editando.id, body);
      else await api.post('/preingresos', body);
      setModalAbierto(false);
      setAviso(editando ? 'Pre-ingreso actualizado.' : 'Pre-ingreso registrado.');
      cargar();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(x: PreIngreso, nuevo: string) {
    try {
      await api.patch('/preingresos/' + x.id, { estado: nuevo });
      setAviso(`${x.nombre}: estado ${nuevo}.`);
      if (nuevo === 'PENDIENTE') setEstadoFiltro('');
      cargar();
    } catch (err: any) {
      setError(err.message ?? 'Error al cambiar el estado');
    }
  }

  return (
    <div>
      <PageHeader
        title="Pre-ingresos"
        subtitle="Candidatos al programa en fase de citación: aquí se registra la gestión antes de crear el beneficiario"
        actions={
          <>
            <Button variant="secondary" onClick={tablaDefensora}>Tabla para la defensora</Button>
            {puedeGestionar && <Button onClick={abrirCrear}><IconCalendarPlus size={15} /> Registrar pre-ingreso</Button>}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setEstadoFiltro('')}
          className={'rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ' + (!estadoFiltro ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50')}
        >
          Todos
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => setEstadoFiltro(e)}
            className={'rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ' + (estadoFiltro === e ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50')}
          >
            {e} {resumen[e] != null ? `(${resumen[e]})` : ''}
          </button>
        ))}
      </div>

      <Card className="mb-4 p-3">
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, documento o acudiente…" className="pl-9" />
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className="mb-4 p-3 text-sm text-emerald-700">{aviso}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Cargando pre-ingresos…" />
        ) : items.length === 0 ? (
          <EmptyState title="Sin pre-ingresos" description={puedeGestionar ? 'Registra el primer candidato con el botón de arriba.' : 'Aún no hay candidatos en fase de citación.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Acudiente</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Barrio</th>
                  <th className="px-4 py-3 font-medium">Motivo cupo</th>
                  <th className="px-4 py-3 font-medium">Citación</th>
                  <th className="px-4 py-3 font-medium">Recordatorio</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  {puedeGestionar && <th className="px-4 py-3 font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((x) => (
                  <tr key={x.id} className="border-b border-slate-100 hover:bg-teal-50/40">
                    <td className="px-4 py-3 font-medium text-slate-800">{x.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{x.numeroDocumento || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{x.acudiente || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{x.telefono || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{x.barrio || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px]">{x.motivoAperturaCupo || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {x.fechaCitacion ? `${fmtFecha(x.fechaCitacion)}${x.horaCitacion ? ' · ' + x.horaCitacion : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{x.recordatorio || '—'}</td>
                    <td className="px-4 py-3"><Badge tone={TONO[x.estado] ?? 'slate'}>{x.estado}</Badge></td>
                    {puedeGestionar && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(SIGUIENTES[x.estado] ?? []).map((nuevo) => (
                            <Button key={nuevo} size="sm" variant="ghost" onClick={() => cambiarEstado(x, nuevo)}>
                              {nuevo === 'INGRESADO' ? '→ Ingresado' : nuevo === 'DESCARTADO' ? '→ Descartar' : '→ ' + nuevo}
                            </Button>
                          ))}
                          <Button size="sm" variant="ghost" onClick={() => abrirEditar(x)}>Editar</Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalAbierto && (
        <Modal title={editando ? 'Editar pre-ingreso' : 'Registrar pre-ingreso'} onClose={() => setModalAbierto(false)} wide>
          <form onSubmit={guardar} className="space-y-4">
            {error && <AlertBanner kind="error">{error}</AlertBanner>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre" required>
                <TextInput value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
              </Field>
              <Field label="Tipo de documento">
                <Select value={form.tipoDocumento} onChange={(e) => setForm((f) => ({ ...f, tipoDocumento: e.target.value }))}>
                  <option value="">—</option>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Número de documento">
                <TextInput value={form.numeroDocumento} onChange={(e) => setForm((f) => ({ ...f, numeroDocumento: e.target.value }))} />
              </Field>
              <Field label="Barrio">
                <TextInput value={form.barrio} onChange={(e) => setForm((f) => ({ ...f, barrio: e.target.value }))} />
              </Field>
              <Field label="Dirección">
                <TextInput value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))} />
              </Field>
              <Field label="Documento de la acudiente">
                <TextInput value={form.documentoAcudiente} onChange={(e) => setForm((f) => ({ ...f, documentoAcudiente: e.target.value }))} />
              </Field>
              <Field label="Ocupación de la acudiente">
                <TextInput value={form.ocupacionAcudiente} onChange={(e) => setForm((f) => ({ ...f, ocupacionAcudiente: e.target.value }))} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Motivo de apertura de cupo">
                  <TextInput value={form.motivoAperturaCupo} onChange={(e) => setForm((f) => ({ ...f, motivoAperturaCupo: e.target.value }))} placeholder="Ej: remisión de ICBF, solicitud de la acudiente…" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Antecedentes médicos">
                  <TextInput value={form.antecedentesMedicos} onChange={(e) => setForm((f) => ({ ...f, antecedentesMedicos: e.target.value }))} placeholder="Ej: diagnóstico médico, medicación, discapacidad o ninguno" />
                </Field>
              </div>
              <Field label="Acudiente">
                <TextInput value={form.acudiente} onChange={(e) => setForm((f) => ({ ...f, acudiente: e.target.value }))} />
              </Field>
              <Field label="Teléfono">
                <TextInput value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
              </Field>
              <Field label="Lugar de residencia">
                <TextInput value={form.lugarResidencia} onChange={(e) => setForm((f) => ({ ...f, lugarResidencia: e.target.value }))} />
              </Field>
              <Field label="Fecha de citación" hint="Si se indica, el pre-ingreso pasa a estado CITADO">
                <TextInput type="date" value={form.fechaCitacion} onChange={(e) => setForm((f) => ({ ...f, fechaCitacion: e.target.value }))} />
              </Field>
              <Field label="Hora de la cita">
                <TextInput value={form.horaCitacion} onChange={(e) => setForm((f) => ({ ...f, horaCitacion: e.target.value }))} placeholder="Ej: 09:00" />
              </Field>
              <Field label="Recordatorio">
                <Select value={form.recordatorio} onChange={(e) => setForm((f) => ({ ...f, recordatorio: e.target.value }))}>
                  <option value="">—</option>
                  <option value="WP enviado">WhatsApp enviado</option>
                  <option value="Llamada">Llamada</option>
                  <option value="Pendiente contactar">Pendiente contactar</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Respuesta">
                  <TextInput value={form.respuesta} onChange={(e) => setForm((f) => ({ ...f, respuesta: e.target.value }))} placeholder="Ej: ok, asistirá / no contesta" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Observaciones">
                  <TextInput value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>Cancelar</Button>
              <Button type="submit" loading={guardando}>{editando ? 'Guardar cambios' : 'Registrar'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}