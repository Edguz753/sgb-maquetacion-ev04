import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getToken } from '../lib/api';
import type { BeneficiarioListResponse } from '../lib/types';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconFile, IconLink, IconUpload } from '../components/icons';
import { ESTADOS_RED, ModalEditarRed, ModalNuevaRed, ModalSoporteRed, RedBadge, estadoRedMeta } from '../components/redes-ui';
import type { RedItem } from '../components/redes-ui';

interface Grupo {
  beneficiario: RedItem['beneficiario'];
  redes: RedItem[];
}

export default function Redes() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeCrear = ['GESTOR', 'PROFESIONAL'].includes(rol);

  const [items, setItems] = useState<RedItem[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [editar, setEditar] = useState<RedItem | null>(null);
  const [soporte, setSoporte] = useState<RedItem | null>(null);
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
      const res = await api.get<{ total: number; resumen: Record<string, number>; redes: RedItem[] }>(`/redes${qs ? `?${qs}` : ''}`);
      setItems(res.redes ?? []);
      setTotal(res.total);
      setResumen(res.resumen ?? {});
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar redes');
    } finally {
      setLoading(false);
    }
  }, [estado, debounced]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<number, Grupo>();
    for (const r of items) {
      const key = r.beneficiario.id;
      if (!map.has(key)) map.set(key, { beneficiario: r.beneficiario, redes: [] });
      map.get(key)!.redes.push(r);
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
        api.get<{ total: number; tipos: any[] }>('/redes/tipos'),
        api.get<BeneficiarioListResponse>('/beneficiarios'),
      ]);
      setTipos(t.tipos);
      setBens(b);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar catálogos');
    }
  }, []);

  return (
    <div>
      <PageHeader
        title="Redes de apoyo"
        subtitle={`${grupos.length} beneficiario(s) · ${total} red(es) en esta vista`}
        actions={
          puedeCrear ? (
            <Button onClick={abrirCrear}>
              <IconLink size={15} /> + Red
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ESTADOS_RED.map((s) => {
          const meta = estadoRedMeta(s);
          return (
            <Card key={s} className="p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{meta.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{resumen[s] ?? 0}</p>
            </Card>
          );
        })}
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-52">
            <Field label="Estado">
              <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_RED.map((s) => (
                  <option key={s} value={s}>{estadoRedMeta(s).label}</option>
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
        <Spinner label="Consultando redes…" />
      ) : grupos.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin redes de apoyo"
            description="Vincula al beneficiario con instituciones como ICBF, Comisaría de familia o EPS."
            action={puedeCrear ? <Button onClick={abrirCrear}><IconLink size={15} /> + Red</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ beneficiario, redes }) => {
            const expandido = expandidos.includes(beneficiario.id);
            const activas = redes.filter((r) => r.estado === 'ACTIVA').length;
            const identificadas = redes.filter((r) => r.estado === 'IDENTIFICADA' || r.estado === 'REMISIONADA').length;
            const cerradas = redes.filter((r) => r.estado === 'CERRADA').length;

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
                    {activas > 0 && <Badge tone="green">{activas} activa(s)</Badge>}
                    {identificadas > 0 && <Badge tone="amber">{identificadas} en gestión</Badge>}
                    {cerradas > 0 && <Badge tone="slate">{cerradas} cerrada(s)</Badge>}
                    <Badge tone="slate">{redes.length} total</Badge>
                  </div>
                </button>

                {/* Redes del beneficiario (desplegable) */}
                {expandido && (
                  <div className="border-t border-slate-100 bg-slate-50/40">
                    <ul className="divide-y divide-slate-100">
                      {redes.map((red) => (
                        <li key={red.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 pl-10">
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
                            {['GESTOR', 'PROFESIONAL'].includes(rol) && (
                              <>
                                <Button size="sm" variant="secondary" onClick={() => { setSoporte(red); setAviso(null); }}>
                                  <IconUpload size={13} /> Soporte
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditar(red); setAviso(null); }}>
                                  Estado
                                </Button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {crearAbierto && (
        <ModalNuevaRed
          beneficiarios={bens?.beneficiarios ?? []}
          tipos={tipos}
          rol={rol}
          miProfesionalId={usuario?.profesional?.id ?? null}
          onClose={() => setCrearAbierto(false)}
          onCreado={() => { setAviso('Red de apoyo vinculada (IDENTIFICADA).'); cargar(); }}
        />
      )}
      {editar && <ModalEditarRed red={editar} onClose={() => setEditar(null)} onActualizado={() => { setAviso('Red actualizada.'); cargar(); }} />}
      {soporte && <ModalSoporteRed red={soporte} onClose={() => setSoporte(null)} onSubido={() => { setAviso('Soporte cargado a la red.'); cargar(); }} />}
    </div>
  );
}