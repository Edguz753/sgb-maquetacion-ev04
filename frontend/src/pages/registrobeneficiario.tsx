import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { ProfesionalSimple, RegistroBeneficiarioPayload, RegistroResponse } from '../lib/types';
import { AREAS, GENEROS, TIPOS_DOCUMENTO, can, fmtFecha, hoyISO } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Button, Card, EmptyState, Field, PageHeader, Select, Spinner, TextArea, TextInput } from '../components/ui';

interface Catalogos {
  eps: { id: number; nombre: string; regimen: string | null }[];
  defensorias: { id: number; nombre: string; centroZonal: string | null }[];
  estadosAfiliacion: { id: number; nombre: string; descripcion: string | null }[];
}

const JORNADAS_CLUB = ['MAÑANA', 'TARDE', 'JORNADA ÚNICA', 'FIN DE SEMANA'];

export default function RegistroBeneficiario() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';

  const [form, setForm] = useState({
    tipoDocumento: 'CC',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    genero: 'F',
    telefono: '',
    correo: '',
    direccion: '',
    observaciones: '',
    fechaIngreso: hoyISO(),
    motivoIngreso: '',
    areaInicial: 'PS',
    profesionalId: '',
    // ERD: club y afiliación
    sim: '',
    jornadaClub: '',
    taller: '',
    barrio: '',
    epsId: '',
    defensoriaId: '',
    estadoAfiliacionId: '',
  });

  const [profesionales, setProfesionales] = useState<ProfesionalSimple[]>([]);
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [cargandoProf, setCargandoProf] = useState(true);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RegistroResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([
          api.get<{ total: number; profesionales: ProfesionalSimple[] }>('/profesionales'),
          api.get<Catalogos>('/catalogos/todos'),
        ]);
        setProfesionales(p.profesionales);
        setCat(c);
      } catch {
        setProfesionales([]);
      } finally {
        setCargandoProf(false);
      }
    })();
  }, []);

  if (!can.escribirBeneficiarios(rol)) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Sin permisos para registrar"
          description="El registro de beneficiarios está habilitado para Secretaría, Gestor y Coordinador."
        />
      </Card>
    );
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => ({ ...e, [k]: '' }));
  }

  function validar(): boolean {
    const e: Record<string, string> = {};
    if (form.numeroDocumento.trim().length < 3) e.numeroDocumento = 'Mínimo 3 caracteres';
    if (!form.nombres.trim()) e.nombres = 'Obligatorio';
    if (!form.apellidos.trim()) e.apellidos = 'Obligatorio';
    if (!form.fechaNacimiento) e.fechaNacimiento = 'Obligatorio';
    else if (new Date(form.fechaNacimiento) >= new Date()) e.fechaNacimiento = 'Debe ser anterior a hoy';
    if (!form.fechaIngreso) e.fechaIngreso = 'Obligatorio';
    if (form.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = 'Correo no válido';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setErrorGeneral(null);
    if (!validar()) return;

    const payload: RegistroBeneficiarioPayload & Record<string, unknown> = {
      tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      fechaNacimiento: form.fechaNacimiento,
      genero: form.genero,
      telefono: form.telefono.trim() || null,
      correo: form.correo.trim() || null,
      direccion: form.direccion.trim() || null,
      observaciones: form.observaciones.trim() || null,
      fechaIngreso: form.fechaIngreso,
      motivoIngreso: form.motivoIngreso.trim() || null,
      areaInicial: form.areaInicial,
      profesionalId: form.profesionalId ? Number(form.profesionalId) : null,
      sim: form.sim.trim() || null,
      jornadaClub: form.jornadaClub || null,
      taller: form.taller.trim() || null,
      barrio: form.barrio.trim() || null,
      epsId: form.epsId ? Number(form.epsId) : null,
      defensoriaId: form.defensoriaId ? Number(form.defensoriaId) : null,
      estadoAfiliacionId: form.estadoAfiliacionId ? Number(form.estadoAfiliacionId) : null,
    };

    setEnviando(true);
    try {
      const res = await api.post<RegistroResponse>('/beneficiarios', payload);
      setResultado(res);
    } catch (err: any) {
      setErrorGeneral(err.message ?? 'Error al registrar el beneficiario');
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <div className="mb-4">
            <AlertBanner kind="success">{resultado.mensaje}</AlertBanner>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {resultado.beneficiario.nombres} {resultado.beneficiario.apellidos}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Historia <strong className="text-slate-700">{resultado.numeroHistoria}</strong> · Caso{' '}
            <strong className="text-slate-700">{resultado.numeroCaso}</strong>
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Actividades generadas ({resultado.actividadesGeneradas.length})</h3>
              <ul className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
                {resultado.actividadesGeneradas.length === 0 && <li className="text-slate-500">Ninguna</li>}
                {resultado.actividadesGeneradas.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2 text-slate-700">
                    <span>Actividad #{a.id}</span>
                    <span className="text-slate-500">{fmtFecha(a.fechaProgramada)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Documentos iniciales</h3>
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {typeof resultado.documentosIniciales === 'number'
                  ? `Se generaron ${resultado.documentosIniciales} documento(s) requeridos según la edad del beneficiario.`
                  : 'La gestión documental se completa desde la ficha del beneficiario.'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={`/beneficiarios/${resultado.beneficiario.id}`}>
              <Button>Ver detalle del beneficiario</Button>
            </Link>
            <Link to={`/beneficiarios/${resultado.beneficiario.id}`}>
              <Button variant="secondary">Completar familia y afiliación en su ficha</Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setResultado(null);
                setForm((f) => ({ ...f, numeroDocumento: '', nombres: '', apellidos: '', telefono: '', correo: '', direccion: '', observaciones: '', sim: '' }));
              }}
            >
              Registrar otro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Registro de beneficiario"
        subtitle="El registro crea de forma automática el caso, la asignación inicial y las actividades del motor de planificación."
      />

      {errorGeneral && (
        <Card className="mb-4 p-3">
          <AlertBanner kind="error">{errorGeneral}</AlertBanner>
        </Card>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Card className="mb-4 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-800">1 · Datos de identificación</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo de documento" required>
              <Select value={form.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value)}>
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Número de documento" required error={errores.numeroDocumento}>
              <TextInput value={form.numeroDocumento} onChange={(e) => set('numeroDocumento', e.target.value)} placeholder="Sin puntos" />
            </Field>
            <Field label="Nombres" required error={errores.nombres}>
              <TextInput value={form.nombres} onChange={(e) => set('nombres', e.target.value)} placeholder="Nombres completos" />
            </Field>
            <Field label="Apellidos" required error={errores.apellidos}>
              <TextInput value={form.apellidos} onChange={(e) => set('apellidos', e.target.value)} placeholder="Apellidos completos" />
            </Field>
            <Field label="Fecha de nacimiento" required error={errores.fechaNacimiento}>
              <TextInput type="date" value={form.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} />
            </Field>
            <Field label="Género">
              <Select value={form.genero} onChange={(e) => set('genero', e.target.value)}>
                {GENEROS.map((g) => (
                  <option key={g.codigo} value={g.codigo}>{g.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Teléfono">
              <TextInput value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="Ej: 300 123 4567" />
            </Field>
            <Field label="Correo electrónico" error={errores.correo}>
              <TextInput type="email" value={form.correo} onChange={(e) => set('correo', e.target.value)} placeholder="correo@ejemplo.com" />
            </Field>
            <Field label="Dirección">
              <TextInput value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
            </Field>
            <Field label="Observaciones">
              <TextArea rows={2} value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="mb-4 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-800">2 · Caso y asignación inicial</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fecha de ingreso" required error={errores.fechaIngreso}>
              <TextInput type="date" value={form.fechaIngreso} onChange={(e) => set('fechaIngreso', e.target.value)} />
            </Field>
            <Field label="Área inicial" required hint="Las actividades R001–R004 se programan con base en esta fecha">
              <Select value={form.areaInicial} onChange={(e) => set('areaInicial', e.target.value)}>
                {AREAS.map((a) => (
                  <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Profesional asignado (opcional)" hint={cargandoProf ? 'Cargando profesionales…' : 'Si se omite, se asigna el primer profesional activo del área'}>
              <Select value={form.profesionalId} onChange={(e) => set('profesionalId', e.target.value)} disabled={cargandoProf}>
                <option value="">— Automático —</option>
                {profesionales.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>
                ))}
              </Select>
            </Field>
            <Field label="Motivo de ingreso">
              <TextArea rows={2} value={form.motivoIngreso} onChange={(e) => set('motivoIngreso', e.target.value)} placeholder="Breve descripción del motivo" />
            </Field>
          </div>
        </Card>

        <Card className="mb-4 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-800">3 · Club y afiliación (opcional)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="SIM">
              <TextInput value={form.sim} onChange={(e) => set('sim', e.target.value)} placeholder="Identificador SIM del beneficiario" />
            </Field>
            <Field label="Taller" hint="Regla: 6-8 Ingeniosos · 9-13 Ganadores · 14-18 Líderes — vacío = automático por edad">
              <TextInput value={form.taller} onChange={(e) => set('taller', e.target.value)} placeholder="Ej: Líderes, Ganadores" />
            </Field>
            <Field label="Barrio">
              <TextInput value={form.barrio} onChange={(e) => set('barrio', e.target.value)} placeholder="Ej: Centro" />
            </Field>
            <Field label="Jornada del club">
              <Select value={form.jornadaClub} onChange={(e) => set('jornadaClub', e.target.value)}>
                <option value="">—</option>
                {JORNADAS_CLUB.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </Select>
            </Field>
            <Field label="EPS">
              <Select value={form.epsId} onChange={(e) => set('epsId', e.target.value)} disabled={cargandoProf || !cat}>
                <option value="">—</option>
                {(cat?.eps ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}{e.regimen ? ` (${e.regimen})` : ''}</option>
                ))}
              </Select>
            </Field>
            <Field label="Estado de afiliación">
              <Select value={form.estadoAfiliacionId} onChange={(e) => set('estadoAfiliacionId', e.target.value)} disabled={cargandoProf || !cat}>
                <option value="">—</option>
                {(cat?.estadosAfiliacion ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Defensoría">
              <Select value={form.defensoriaId} onChange={(e) => set('defensoriaId', e.target.value)} disabled={cargandoProf || !cat}>
                <option value="">—</option>
                {(cat?.defensorias ?? []).map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={enviando}>Registrar beneficiario</Button>
          <Link to="/beneficiarios">
            <Button type="button" variant="secondary">Cancelar</Button>
          </Link>
        </div>

        {enviando && <Spinner label="Procesando registro atómico…" />}
      </form>
    </div>
  );
}