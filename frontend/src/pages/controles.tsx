import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { BeneficiarioListResponse } from '../lib/types';
import { estadoControlMeta, fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconFile, IconHeartPulse, IconUpload } from '../components/icons';
import { ControlBadge, ESTADOS_CONTROL, ModalEditarControl, ModalNuevoControl, ModalSoporteControl } from '../components/controles-ui';
import type { ControlResumen } from '../components/controles-ui';

const ROLES_EDITAR = ['GESTOR', 'COORDINADOR', 'SECRETARIA', 'PROFESIONAL'];

interface Grupo {
  beneficiario: ControlResumen['beneficiario'];
  controles: ControlResumen[];
}

export default function Controles() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeEditar = ROLES_EDITAR.includes(rol);

  const [items, setItems] = useState<ControlResumen[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [editar, setEditar] = useState<ControlResumen | null>(null);
  const [soporte, setSoporte] = useState<ControlResumen | null>(null);
  const [expandidos, setExpandidos] = useState<number[]>([]);

  const [tipos, setTipos] = useState<any[]>([]);
  const [bens, setBens] = useState<BeneficiarioListResponse | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (estado) params.set('estado', estado);
      if (debounced.trim()) params.set('q', debounced.trim());
      const qs = params.toString();
      const res = await api.get<{ total: number; resumen: Record<string, number>; controles: ControlResumen[] }>(`/controles${qs ? `?${qs}` : ''}`);
      setItems(res.controles ?? []);
      setTotal(res.total);
      setResumen(res.resumen ?? {});
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar controles');
    } finally {
      setLoading(false);
    }
  }, [estado, debounced]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Agrupar por beneficiario (vista desplegable)
  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<number, Grupo>();
    for (const c of items) {
      const key = c.beneficiario.id;
      if (!map.has(key)) map.set(key, { beneficiario: c.beneficiario, controles: [] });
      map.get(key)!.controles.push(c);
    }
    return Array.from(map.values());
  }, [items]);

  const toggleExpandir = (benId: number) => {
    setExpandidos((prev) => (prev.includes(benId) ? prev.filter((i) => i !== benId) : [...prev, benId]));
  };

  const expandirTodos = () => {
    if (expandidos.length === grupos.length) setExpandidos([]);
    else setExpandidos(grupos.map((g) => g.beneficiario.id));
  };

  const abrirCrear = useCallback(async () => {
    setCrearAbierto(true);
    setError(null);
    try {
      const [t, b] = await Promise.all([
        api.get<{ total: number; tipos: any[] }>('/controles/tipos'),
        api.get<BeneficiarioListResponse>('/beneficiarios'),
      ]);
      setTipos(t.tipos);
      setBens(b);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar catálogos');
    }
  }, []);

  const kpis = [
    { key: 'PENDIENTE', label: 'Pendientes', tone: 'amber' },
    { key: 'REALIZADO', label: 'Realizados', tone: 'green' },
    { key: 'ATRASADO', label: 'Atrasados', tone: 'red' },
    { key: 'CANCELADO', label: 'Cancelados', tone: 'slate' },
    { key: 'NO_APLICA', label: 'No aplica', tone: 'slate' },
  ];

  return (
    <div>
      <PageHeader
        title="Controles de salud"
        subtitle={`${grupos.length} beneficiario(s) · ${total} control(es) en esta vista`}
        actions={
          puedeEditar ? (
            <Button onClick={abrirCrear}>
              <IconHeartPulse size={15} /> + Control
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.key} className="p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{resumen[k.key] ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-52">
            <Field label="Estado">
              <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_CONTROL.map((s) => (
                  <option key={s} value={s}>{estadoControlMeta(s).label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Buscar beneficiario">
              <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, documento o historia…" />
            </Field>
          </div>
          <div className="pb-1">
            <Button variant="ghost" size="sm" onClick={expandirTodos} disabled={grupos.length === 0}>
              {expandidos.length === grupos.length && grupos.length > 0 ? 'Contraer todo' : 'Expandir todo'}
            </Button>
          </div>
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className={`mb-4 p-3 text-sm ${aviso.includes('Error') || aviso.includes('Prohibido') ? 'text-red-600' : 'text-emerald-700'}`}>{aviso}</Card>}

      {loading ? (
        <Spinner label="Consultando controles…" />
      ) : grupos.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin controles en esta vista"
            description="Registra el primer control de salud (medicina general, pediatría, odontología, vacunación…)."
            action={puedeEditar ? <Button onClick={abrirCrear}><IconHeartPulse size={15} /> + Control</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ beneficiario, controles }) => {
            const expandido = expandidos.includes(beneficiario.id);
            const atrasados = controles.filter((c) => (c.estadoCalculado ?? c.estado) === 'ATRASADO').length;
            const pendientes = controles.filter((c) => (c.estadoCalculado ?? c.estado) === 'PENDIENTE').length;
            const realizados = controles.filter((c) => (c.estadoCalculado ?? c.estado) === 'REALIZADO').length;

            return (
              <Card key={beneficiario.id}>
                {/* Cabecera del beneficiario (clic para desplegar) */}
                <button
                  onClick={() => toggleExpandir(beneficiario.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  aria-expanded={expandido}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-transform ${expandido ? 'rotate-90 bg-teal-700 text-white' : 'bg-slate-100'}`}>
                      ▸
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/beneficiarios/${beneficiario.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                      >
                        {beneficiario.nombres} {beneficiario.apellidos}
                      </Link>
                      <p className="text-xs text-slate-400">{beneficiario.numeroHistoria}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {atrasados > 0 && <Badge tone="red">{atrasados} atrasado(s)</Badge>}
                    {pendientes > 0 && <Badge tone="amber">{pendientes} pendiente(s)</Badge>}
                    {realizados > 0 && <Badge tone="green">{realizados} realizado(s)</Badge>}
                    <Badge tone="slate">{controles.length} total</Badge>
                  </div>
                </button>

                {/* Controles del beneficiario (desplegable) */}
                {expandido && (
                  <div className="border-t border-slate-100 bg-slate-50/40">
                    <ul className="divide-y divide-slate-100">
                      {controles.map((c) => {
                        const meta = estadoControlMeta(c.estadoCalculado ?? c.estado);
                        return (
                          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 pl-10">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-slate-800">{c.tipoControl.nombre}</p>
                                <ControlBadge estado={c.estadoCalculado ?? c.estado} />
                                {c.requiereControlEspecial && <Badge tone="violet">{c.especialidad ?? 'Especial'}</Badge>}
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
                        );
                      })}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {crearAbierto && (
        <ModalNuevoControl
          beneficiarios={bens?.beneficiarios ?? []}
          tipos={tipos}
          onClose={() => setCrearAbierto(false)}
          onCreado={() => { setAviso('Control registrado.'); cargar(); }}
        />
      )}
      {editar && <ModalEditarControl control={editar} onClose={() => setEditar(null)} onActualizado={() => { setAviso('Control actualizado.'); cargar(); }} />}
      {soporte && <ModalSoporteControl control={soporte} onClose={() => setSoporte(null)} onSubido={() => { setAviso('Soporte cargado y vinculado al control.'); cargar(); }} />}
    </div>
  );
}