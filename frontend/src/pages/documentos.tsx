import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, getToken } from '../lib/api';
import type { BeneficiarioListResponse } from '../lib/types';
import { can, estadoDocumentoMeta, fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconFile, IconUpload } from '../components/icons';
import { ESTADOS_DOC, ModalEditarDocumento, ModalSubirEvidencia } from '../components/documentos-ui';
import type { DocResumen } from '../components/documentos-ui';

interface Grupo {
  beneficiario: DocResumen['beneficiario'];
  docs: DocResumen[];
}

export default function Documentos() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeEditar = can.escribirBeneficiarios(rol);
  const location = useLocation();

  const [items, setItems] = useState<DocResumen[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [subir, setSubir] = useState<DocResumen | null>(null);
  const [editar, setEditar] = useState<DocResumen | null>(null);
  const [expandidos, setExpandidos] = useState<number[]>([]);

  // Si se llega desde la ficha ("ver documentos de este beneficiario"), abrir expandido
  useEffect(() => {
    const ben = (location.state as any)?.beneficiarioId;
    if (ben) setExpandidos([Number(ben)]);
  }, [location.state]);

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
      const [lista, res] = await Promise.all([
        api.get<{ total: number; documentos: DocResumen[] }>(`/documentos${qs ? `?${qs}` : ''}`),
        api.get<{ total: number; porEstado: Record<string, number> }>('/documentos/resumen'),
      ]);
      setItems(lista.documentos ?? []);
      setTotal(lista.total);
      setResumen(res.porEstado ?? {});
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar documentos');
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
    for (const d of items) {
      const key = d.beneficiario.id;
      if (!map.has(key)) map.set(key, { beneficiario: d.beneficiario, docs: [] });
      map.get(key)!.docs.push(d);
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
        api.get<{ total: number; tipos: any[] }>('/documentos/tipos'),
        api.get<BeneficiarioListResponse>('/beneficiarios'),
      ]);
      setTipos(t.tipos);
      setBens(b);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar catálogos');
    }
  }, []);

  const crearDocumento = async () => {
    if (!formNuevo.tipoDocumentoId || !formNuevo.beneficiarioId) return;
    setCreando(true);
    setError(null);
    try {
      await api.post('/documentos', {
        tipoDocumentoId: Number(formNuevo.tipoDocumentoId),
        beneficiarioId: Number(formNuevo.beneficiarioId),
        fechaDocumento: formNuevo.fechaDocumento || null,
        fechaVencimiento: formNuevo.fechaVencimiento || null,
        observaciones: formNuevo.observaciones.trim() || null,
      });
      setCrearAbierto(false);
      setFormNuevo({ tipoDocumentoId: '', beneficiarioId: '', fechaDocumento: '', fechaVencimiento: '', observaciones: '' });
      setAviso('Documento registrado (estado PENDIENTE).');
      cargar();
    } catch (e: any) {
      setError(e.message ?? 'Error al registrar documento');
    } finally {
      setCreando(false);
    }
  };

  const exportarCsv = useCallback(async () => {
    setDescargando(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (estado) params.set('estado', estado);
      if (debounced.trim()) params.set('q', debounced.trim());
      params.set('formato', 'csv');
      const token = getToken();
      const res = await fetch(`/api/documentos?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Error al generar el CSV');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? 'Error al descargar');
    } finally {
      setDescargando(false);
    }
  }, [estado, debounced]);

  const [tipos, setTipos] = useState<any[]>([]);
  const [bens, setBens] = useState<BeneficiarioListResponse | null>(null);
  const [formNuevo, setFormNuevo] = useState({ tipoDocumentoId: '', beneficiarioId: '', fechaDocumento: '', fechaVencimiento: '', observaciones: '' });
  const [creando, setCreando] = useState(false);

  const kpis = [
    { key: 'PENDIENTE', label: 'Pendientes', tone: 'amber' },
    { key: 'RECIBIDO', label: 'Recibidos', tone: 'blue' },
    { key: 'VIGENTE', label: 'Vigentes', tone: 'green' },
    { key: 'VENCIDO', label: 'Vencidos', tone: 'red' },
    { key: 'FALTANTE', label: 'Faltantes', tone: 'red' },
    { key: 'NO_APLICA', label: 'No aplica', tone: 'slate' },
  ];

  return (
    <div>
      <PageHeader
        title="Archivo documental"
        subtitle={`${grupos.length} beneficiario(s) · ${total} documento(s) en esta vista`}
        actions={
          <>
            <Button variant="secondary" loading={descargando} onClick={exportarCsv}>
              <IconFile size={15} /> Exportar CSV
            </Button>
            {puedeEditar ? (
              <Button onClick={abrirCrear}>
                <IconFile size={15} /> + Documento
              </Button>
            ) : undefined}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
                {ESTADOS_DOC.map((s) => (
                  <option key={s} value={s}>{estadoDocumentoMeta(s).label}</option>
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
        <Spinner label="Consultando documentos…" />
      ) : grupos.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin documentos en esta vista"
            description="Los documentos iniciales se generan al registrar beneficiarios. Ajusta los filtros o registra uno manualmente."
            action={puedeEditar ? <Button onClick={abrirCrear}><IconFile size={15} /> + Documento</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ beneficiario, docs }) => {
            const expandido = expandidos.includes(beneficiario.id);
            const pendientes = docs.filter((d) => d.estado === 'PENDIENTE').length;
            const vencidos = docs.filter((d) => d.estado === 'VENCIDO' || (d.fechaVencimiento && new Date(d.fechaVencimiento) < new Date() && d.estado !== 'RECIBIDO' && d.estado !== 'NO_APLICA')).length;
            const completos = docs.filter((d) => ['RECIBIDO', 'VIGENTE'].includes(d.estado)).length;

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
                    {pendientes > 0 && <Badge tone="amber">{pendientes} pendiente(s)</Badge>}
                    {vencidos > 0 && <Badge tone="red">{vencidos} vencido(s)</Badge>}
                    {completos > 0 && <Badge tone="green">{completos} al día</Badge>}
                    <Badge tone="slate">{docs.length} total</Badge>
                  </div>
                </button>

                {/* Documentos del beneficiario (desplegable) */}
                {expandido && (
                  <div className="border-t border-slate-100 bg-slate-50/40">
                    <ul className="divide-y divide-slate-100">
                      {docs.map((d) => {
                        const meta = estadoDocumentoMeta(d.estado);
                        const vencido = d.estado === 'VENCIDO' || (d.fechaVencimiento && new Date(d.fechaVencimiento) < new Date() && !['RECIBIDO', 'VIGENTE', 'NO_APLICA'].includes(d.estado));
                        return (
                          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 pl-10">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-slate-800">{d.tipoDocumento.nombre}</p>
                                <Badge tone={meta.tone}>{meta.label}</Badge>
                                {vencido && <Badge tone="red">Vencido</Badge>}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {d.caso ? `Caso ${d.caso.numeroCaso} · ` : ''}
                                {d.fechaDocumento ? `Emisión: ${fmtFecha(d.fechaDocumento)} · ` : ''}
                                {d.fechaRecepcion ? `Recepción: ${fmtFecha(d.fechaRecepcion)} · ` : ''}
                                {d.fechaVencimiento ? `Vence: ${fmtFecha(d.fechaVencimiento)}` : ''}
                                {d.evidencias.length > 0 && ` · ${d.evidencias.length} evidencia(s)`}
                              </p>
                              {d.observaciones && <p className="mt-0.5 text-xs text-slate-400">{d.observaciones}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {d.evidencias[0] && (
                                <a href={d.evidencias[0].rutaReferencia} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Ver evidencia">
                                  <IconFile size={16} />
                                </a>
                              )}
                              {puedeEditar && (
                                <>
                                  <Button size="sm" variant="secondary" onClick={() => { setSubir(d); setAviso(null); }}>
                                    <IconUpload size={13} /> Subir
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setEditar(d); setAviso(null); }}>
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
        <Modal title="Registrar documento manual" onClose={() => setCrearAbierto(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tipo de documento" required>
                <Select value={formNuevo.tipoDocumentoId} onChange={(e) => setFormNuevo((f) => ({ ...f, tipoDocumentoId: e.target.value }))}>
                  <option value="">Selecciona…</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}{t.categoria ? ` (${t.categoria})` : ''}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Beneficiario" required>
                <Select value={formNuevo.beneficiarioId} onChange={(e) => setFormNuevo((f) => ({ ...f, beneficiarioId: e.target.value }))}>
                  <option value="">Selecciona…</option>
                  {(bens?.beneficiarios ?? []).map((b) => (
                    <option key={b.id} value={b.id}>{b.nombres} {b.apellidos} · {b.numeroHistoria}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha del documento">
                <TextInput type="date" value={formNuevo.fechaDocumento} onChange={(e) => setFormNuevo((f) => ({ ...f, fechaDocumento: e.target.value }))} />
              </Field>
              <Field label="Fecha de vencimiento">
                <TextInput type="date" value={formNuevo.fechaVencimiento} onChange={(e) => setFormNuevo((f) => ({ ...f, fechaVencimiento: e.target.value }))} />
              </Field>
            </div>
            <Field label="Observaciones">
              <TextInput value={formNuevo.observaciones} onChange={(e) => setFormNuevo((f) => ({ ...f, observaciones: e.target.value }))} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCrearAbierto(false)}>Cancelar</Button>
              <Button loading={creando} disabled={!formNuevo.tipoDocumentoId || !formNuevo.beneficiarioId} onClick={crearDocumento}>
                Registrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {subir && <ModalSubirEvidencia documento={subir} onClose={() => setSubir(null)} onSubido={() => { setAviso('Evidencia cargada. El documento pasa a RECIBIDO.'); cargar(); }} />}
      {editar && <ModalEditarDocumento documento={editar} onClose={() => setEditar(null)} onActualizado={() => { setAviso('Documento actualizado.'); cargar(); }} />}
    </div>
  );
}