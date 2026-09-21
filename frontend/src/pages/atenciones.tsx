import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { AREAS, fmtFecha } from '../lib/utils';
import type { BeneficiarioListResponse } from '../lib/types';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconCalendarPlus } from '../components/icons';
import type { AtencionItem } from '../components/atenciones-ui';
import { ModalHechoEmergente, ModalRotacion } from '../components/atenciones-ui';

const ROLES_PLANIFICAR = ['GESTOR', 'COORDINADOR'];
const ESTADOS = ['PENDIENTE', 'REALIZADA', 'ATRASADA', 'CANCELADA'];
const TIPOS = [
  { value: 'ROTACION', label: 'Rotación' },
  { value: 'EMERGENTE', label: 'Emergente' },
];

function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

function sumarMes(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Atenciones() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedePlanificar = ROLES_PLANIFICAR.includes(rol);

  const [items, setItems] = useState<AtencionItem[]>([]);
  const [mes, setMes] = useState(mesActual());
  const [areaFiltro, setAreaFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [modalTipo, setModalTipo] = useState<'ROTACION' | 'HECHO'>('ROTACION');
  const [benElegido, setBenElegido] = useState<number | null>(null);
  const [busquedaBen, setBusquedaBen] = useState('');
  const [bens, setBens] = useState<BeneficiarioListResponse | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('mes', mes);
      if (areaFiltro) params.set('area', areaFiltro);
      if (estadoFiltro) params.set('estado', estadoFiltro);
      if (tipoFiltro) params.set('tipo', tipoFiltro);
      const res = await api.get<{ total: number; atenciones: AtencionItem[] }>(`/atenciones?${params.toString()}`);
      setItems(res.atenciones ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar atenciones');
    } finally {
      setLoading(false);
    }
  }, [mes, areaFiltro, estadoFiltro, tipoFiltro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirCrear = useCallback(async (tipo: 'ROTACION' | 'HECHO') => {
    setModalTipo(tipo);
    setBenElegido(null);
    setBusquedaBen('');
    setCrearAbierto(true);
    setError(null);
    try {
      setBens(await api.get<BeneficiarioListResponse>('/beneficiarios'));
    } catch {
      setBens(null);
    }
  }, []);

  const porFecha = useMemo(() => {
    const map = new Map<string, AtencionItem[]>();
    for (const a of items) {
      const key = a.fechaProgramada.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <div>
      <PageHeader
        title="Atenciones"
        subtitle="Atenciones y seguimientos por áreas — plan rotativo y hechos emergentes"
        actions={
          puedePlanificar ? (
            <>
              <Button variant="secondary" onClick={() => abrirCrear('HECHO')}>
                Hecho emergente
              </Button>
              <Button onClick={() => abrirCrear('ROTACION')}>
                <IconCalendarPlus size={15} /> Plan de rotación
              </Button>
            </>
          ) : undefined
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMes(sumarMes(mes, -1))}>←</Button>
            <div className="min-w-[150px]">
              <Field label="Mes">
                <TextInput type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
              </Field>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMes(sumarMes(mes, 1))}>→</Button>
          </div>
          <div className="sm:w-44">
            <Field label="Área">
              <Select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)}>
                <option value="">Todas</option>
                {AREAS.map((a) => (
                  <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="sm:w-40">
            <Field label="Tipo">
              <Select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
                <option value="">Todos</option>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="sm:w-40">
            <Field label="Estado">
              <Select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className={`mb-4 p-3 text-sm ${aviso.includes('Error') || aviso.includes('Prohibido') ? 'text-red-600' : 'text-emerald-700'}`}>{aviso}</Card>}

      {loading ? (
        <Spinner label="Consultando atenciones…" />
      ) : porFecha.length === 0 ? (
        <Card>
          <EmptyState
            title={`Sin atenciones en ${mes}`}
            description={puedePlanificar ? 'Crea un plan de rotación o registra un hecho emergente.' : 'El Gestor asignará las atenciones por área.'}
            action={puedePlanificar ? <Button onClick={() => abrirCrear('ROTACION')}><IconCalendarPlus size={15} /> Plan de rotación</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {porFecha.map(([fecha, atenciones]) => (
            <Card key={fecha}>
              <div className="border-b border-slate-100 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-slate-900">{fmtFecha(fecha)}</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {atenciones.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="teal">{a.areaCodigo}</Badge>
                        <p className="text-sm font-medium text-slate-800">
                          {a.tipo === 'ROTACION' ? 'Atención rotativa' : 'Seguimiento de hecho emergente'}
                        </p>
                        {a.riesgoEmergente && <Badge tone="red">Riesgo {a.riesgoEmergente}</Badge>}
                        <Badge tone={a.estado === 'PENDIENTE' ? 'amber' : a.estado === 'REALIZADA' ? 'green' : a.estado === 'CANCELADA' ? 'slate' : 'red'}>{a.estado}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <Link to={`/beneficiarios/${a.beneficiario.id}`} className="text-teal-700 hover:text-teal-800">
                          {a.beneficiario.nombres} {a.beneficiario.apellidos}
                        </Link>
                        {` · ${a.beneficiario.numeroHistoria}`}
                      </p>
                      {a.observaciones && <p className="mt-0.5 text-xs text-slate-400">{a.observaciones}</p>}
                    </div>
                    {['GESTOR', 'COORDINADOR', 'PROFESIONAL'].includes(rol) && a.estado === 'PENDIENTE' && (
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="sm" onClick={() => {
                          api.patch(`/atenciones/${a.id}`, { estado: 'REALIZADA' }).then(() => { setAviso('Atención realizada.'); cargar(); });
                        }}>Realizada</Button>
                        {puedePlanificar && a.tipo === 'EMERGENTE' && (
                          <Button size="sm" variant="secondary" onClick={() => {
                            api.post(`/atenciones/${a.id}/continuar`, {}).then((res: any) => { setAviso(res.mensaje ?? 'Seguimiento continuado.'); cargar(); });
                          }}>Riesgo continúa</Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* Paso 1: elegir beneficiario */}
      {crearAbierto && benElegido === null && (
        <Modal title="Seleccionar beneficiario" onClose={() => setCrearAbierto(false)} wide>
          <div className="space-y-3">
            <Field label="Buscar">
              <TextInput value={busquedaBen} onChange={(e) => setBusquedaBen(e.target.value)} placeholder="Nombre o historia…" />
            </Field>
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {(bens?.beneficiarios ?? []).map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => setBenElegido(b.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50"
                  >
                    <span className="font-medium text-slate-800">{b.nombres} {b.apellidos}</span>
                    <span className="text-xs text-slate-400">{b.numeroHistoria}</span>
                  </button>
                </li>
              ))}
              {(bens?.beneficiarios ?? []).length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Sin beneficiarios registrados.</li>}
            </ul>
          </div>
        </Modal>
      )}

      {/* Paso 2: modal del plan / hecho */}
      {crearAbierto && benElegido !== null && modalTipo === 'ROTACION' && (
        <ModalRotacion beneficiarioId={benElegido} onClose={() => setCrearAbierto(false)} onCreado={() => { setAviso('Plan de rotación creado.'); cargar(); }} />
      )}
      {crearAbierto && benElegido !== null && modalTipo === 'HECHO' && (
        <ModalHechoEmergente beneficiarioId={benElegido} onClose={() => setCrearAbierto(false)} onCreado={() => { setAviso('Hecho emergente registrado.'); cargar(); }} />
      )}
    </div>
  );
}