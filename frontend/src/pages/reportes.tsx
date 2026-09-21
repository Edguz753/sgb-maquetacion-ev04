import { useCallback, useEffect, useState } from 'react';
import { api, descargarReporte, getToken } from '../lib/api';
import { MODO_DEMO } from '../lib/demo-api';
import { Link } from 'react-router-dom';
import { AREAS } from '../lib/utils';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconPrinter } from '../components/icons';

interface Fila {
  id: number;
  historia: string;
  documento: string;
  nombres: string;
  apellidos: string;
  edad: number;
  genero: string;
  area: string;
  areaNombre: string;
  profesional: string;
  estado: string;
  fechaIngreso: string;
}

async function abrirAgendaFetch(mes: string, profesionalId: string) {
  if (MODO_DEMO) {
    const html = demoAgendaHtml(mes || new Date().toISOString().slice(0, 7), profesionalId);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const params = new URLSearchParams({ mes: mes || new Date().toISOString().slice(0, 7), formato: 'html' });
  if (profesionalId) params.set('profesionalId', profesionalId);
  const res = await fetch('http://localhost:3000/api/reportes/agenda?' + params.toString(), { headers: { Authorization: 'Bearer ' + (getToken() ?? '') } });
  if (!res.ok) throw new Error('No se pudo generar la agenda');
  const html = await res.text();
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function demoAgendaHtml(mes: string, profesionalId: string): string {
  const prof = profesionalId ? 'Profesional ' + profesionalId : 'Todo el equipo';
  const celdas = Array.from({ length: 28 }, (_, i) => {
    const dia = i + 1;
    const items = dia % 3 === 0 ? '<div style="background:#e2f5f0;border-left:3px solid #0f766e;margin:2px 0;padding:2px 4px;font-size:11px">Atención · 9:00</div>' : '';
    return '<td style="border:1px solid #ccc;vertical-align:top;width:70px;height:60px;font-size:11px"><b>' + dia + '</b>' + items + '</td>';
  });
  const filas: string[] = [];
  for (let i = 0; i < 28; i += 7) {
    filas.push('<tr>' + celdas.slice(i, i + 7).join('') + '</tr>');
  }
  return '<html><head><meta charset="utf-8"><title>Agenda ' + mes + '</title></head><body style="font-family:sans-serif;max-width:900px;margin:auto">'
    + '<h2 style="color:#0f766e">Agenda mensual — ' + mes + '</h2><p>' + prof + ' · <i>Demo con datos ficticios</i></p>'
    + '<table style="border-collapse:collapse">' + filas.join('') + '</table></body></html>';
}

export default function Reportes() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [filtrosTxt, setFiltrosTxt] = useState('');
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] = useState({ q: '', estado: '', area: '', desde: '', hasta: '' });
  const [debounced, setDebounced] = useState({ q: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [agendaMes, setAgendaMes] = useState(new Date().toISOString().slice(0, 7));
  const [agendaProf, setAgendaProf] = useState('');
  const [agendaProfesionales, setAgendaProfesionales] = useState<Array<{ id: number; nombres: string; apellidos: string }>>([]);
  const [agendaCargando, setAgendaCargando] = useState(false);

  useEffect(() => {
    api.get<{ total: number; profesionales: Array<{ id: number; nombres: string; apellidos: string }> }>('/profesionales').then((d) => {
      setAgendaProfesionales(d.profesionales ?? []);
    }).catch(() => {});
  }, []);

  async function abrirAgenda() {
    setAgendaCargando(true);
    try {
      await abrirAgendaFetch(agendaMes, agendaProf);
    } catch (err: any) {
      setError(err.message ?? 'Error al generar la agenda');
    } finally {
      setAgendaCargando(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ q: filtros.q }), 350);
    return () => clearTimeout(t);
  }, [filtros.q]);

  const construirQuery = (formato?: string) => {
    const params = new URLSearchParams();
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.area) params.set('area', filtros.area);
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    if (debounced.q.trim()) params.set('q', debounced.q.trim());
    if (formato) params.set('formato', formato);
    return params.toString();
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ total: number; filtros: string; filas: Fila[] }>(`/reportes/beneficiarios?${construirQuery('json')}`);
      setFilas(res.filas ?? []);
      setTotal(res.total);
      setFiltrosTxt(res.filtros);
    } catch (e: any) {
      setError(e.message ?? 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.estado, filtros.area, filtros.desde, filtros.hasta, debounced.q]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function descargarCsv() {
    setDescargando(true);
    setError(null);
    try {
      await descargarReporte('csv', construirQuery());
      setAviso('Excel (CSV) descargado.');
    } catch (e: any) {
      setError(e.message ?? 'Error al descargar');
    } finally {
      setDescargando(false);
    }
  }

  async function abrirPdf() {
    setError(null);
    try {
      await descargarReporte('html', construirQuery());
      setAviso('Vista de impresión abierta: usa "Imprimir / Guardar como PDF".');
    } catch (e: any) {
      setError(e.message ?? 'Error al abrir la vista de impresión');
    }
  }

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle={`Listado de beneficiarios · ${total} resultado(s) · ${filtrosTxt}`}
        actions={
          <>
            <Button variant="secondary" loading={descargando} onClick={descargarCsv}>
              Exportar Excel (CSV)
            </Button>
            <Button onClick={abrirPdf}>
              <IconPrinter size={15} /> PDF / Imprimir
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Agenda mensual por profesional</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Field label="Profesional">
              <Select value={agendaProf} onChange={(e) => setAgendaProf(e.target.value)}>
                <option value="">Todos (vista de gestión)</option>
                {agendaProfesionales.map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.nombres} {pr.apellidos}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-44">
            <Field label="Mes">
              <TextInput type="month" value={agendaMes} onChange={(e) => setAgendaMes(e.target.value)} />
            </Field>
          </div>
          <Button onClick={abrirAgenda} loading={agendaCargando}>Ver / Imprimir agenda</Button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Con profesional: atenciones, seguimientos, proyecto de vida, actas y planes del mes. Sin profesional: actas de caso y atenciones de todo el club.</p>
      </Card>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Buscar">
            <TextInput value={filtros.q} onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))} placeholder="Nombre, documento o historia…" />
          </Field>
          <Field label="Estado">
            <Select value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="EGRESADO">Egresados</option>
            </Select>
          </Field>
          <Field label="Área">
            <Select value={filtros.area} onChange={(e) => setFiltros((f) => ({ ...f, area: e.target.value }))}>
              <option value="">Todas</option>
              {AREAS.map((a) => (
                <option key={a.codigo} value={a.codigo}>{a.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ingreso desde">
            <TextInput type="date" value={filtros.desde} onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value }))} />
          </Field>
          <Field label="Ingreso hasta">
            <TextInput type="date" value={filtros.hasta} onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value }))} />
          </Field>
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className="mb-4 p-3 text-sm text-emerald-700">{aviso}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Generando reporte…" />
        ) : filas.length === 0 ? (
          <EmptyState title="Sin resultados" description="Ajusta los filtros para obtener resultados en el reporte." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Historia</th>
                  <th className="px-4 py-3 font-medium">Beneficiario</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Edad</th>
                  <th className="px-4 py-3 font-medium">Área</th>
                  <th className="px-4 py-3 font-medium">Profesional</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-600">{f.historia}</td>
                    <td className="px-4 py-3">
                      <Link to={`/beneficiarios/${f.id}`} className="font-medium text-teal-700 hover:text-teal-800">
                        {f.nombres} {f.apellidos}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.documento}</td>
                    <td className="px-4 py-3 text-slate-600">{f.edad} años</td>
                    <td className="px-4 py-3 text-slate-600">{f.areaNombre || f.area || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{f.profesional || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={f.estado === 'ACTIVO' ? 'green' : 'slate'}>{f.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.fechaIngreso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}