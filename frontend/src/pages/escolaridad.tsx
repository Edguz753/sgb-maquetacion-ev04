import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { BeneficiarioListResponse } from '../lib/types';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconBook } from '../components/icons';
import { EscolaridadBadge, ModalNuevaMatricula, ModalEditarMatricula } from '../components/escolaridad-ui';
import type { MatriculaItem, EstadoEscolarCat } from '../components/escolaridad-ui';

export default function Escolaridad() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeCrear = ['GESTOR', 'PROFESIONAL'].includes(rol);

  const [items, setItems] = useState<MatriculaItem[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [estados, setEstados] = useState<EstadoEscolarCat[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [editar, setEditar] = useState<MatriculaItem | null>(null);
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
      if (estadoFiltro) params.set('estadoEscolarId', estadoFiltro);
      if (debounced.trim()) params.set('q', debounced.trim());
      const qs = params.toString();
      const [res, cat] = await Promise.all([
        api.get<{ total: number; resumen: Record<string, number>; matriculas: MatriculaItem[] }>(`/escolaridad/matriculas${qs ? `?${qs}` : ''}`),
        api.get<{ estadosEscolares: EstadoEscolarCat[] }>('/catalogos/estados-escolares'),
      ]);
      setItems(res.matriculas ?? []);
      setTotal(res.total);
      setResumen(res.resumen ?? {});
      setEstados(cat.estadosEscolares ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar matrículas');
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro, debounced]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirCrear = useCallback(async () => {
    setCrearAbierto(true);
    setError(null);
    try {
      setBens(await api.get<BeneficiarioListResponse>('/beneficiarios'));
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar beneficiarios');
    }
  }, []);

  return (
    <div>
      <PageHeader
        title="Escolaridad"
        subtitle={`${total} matrícula(s) en esta vista`}
        actions={
          puedeCrear ? (
            <Button onClick={abrirCrear}>
              <IconBook size={15} /> + Matrícula
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {estados.map((s) => (
          <Card key={s.id} className="p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.nombre}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{resumen[s.nombre] ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-52">
            <Field label="Estado escolar">
              <Select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                <option value="">Todos</option>
                {estados.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Buscar beneficiario">
              <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, documento o historia…" />
            </Field>
          </div>
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className={`mb-4 p-3 text-sm ${aviso.includes('Error') || aviso.includes('Prohibido') ? 'text-red-600' : 'text-emerald-700'}`}>{aviso}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Consultando matrículas…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin matrículas"
            description="Registra la matrícula escolar (colegio, grado, jornada, estado) para hacer seguimiento."
            action={puedeCrear ? <Button onClick={abrirCrear}><IconBook size={15} /> + Matrícula</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Colegio</th>
                  <th className="px-4 py-3 font-medium">Beneficiario</th>
                  <th className="px-4 py-3 font-medium">Grado</th>
                  <th className="px-4 py-3 font-medium">Jornada</th>
                  <th className="px-4 py-3 font-medium">Desde</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{m.colegio?.nombre ?? 'Sin institución'}</p>
                      {m.colegio?.localidad && <p className="text-xs text-slate-400">{m.colegio.localidad}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/beneficiarios/${m.beneficiario.id}`} className="font-medium text-teal-700 hover:text-teal-800">
                        {m.beneficiario.nombres} {m.beneficiario.apellidos}
                      </Link>
                      <p className="text-xs text-slate-400">{m.beneficiario.numeroHistoria}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.grado ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{m.jornada ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtFecha(m.fechaInicio)}</td>
                    <td className="px-4 py-3">
                      <EscolaridadBadge estado={m.estadoEscolar} />
                      {m.actual && <Badge tone="violet">Actual</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {['GESTOR', 'PROFESIONAL'].includes(rol) && (
                        <Button size="sm" variant="ghost" onClick={() => { setEditar(m); setAviso(null); }}>Editar</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {crearAbierto && (
        <ModalNuevaMatricula
          beneficiarios={bens?.beneficiarios ?? []}
          onClose={() => setCrearAbierto(false)}
          onCreada={() => { setAviso('Matrícula registrada.'); cargar(); }}
        />
      )}
      {editar && <ModalEditarMatricula matricula={editar} onClose={() => setEditar(null)} onActualizada={() => { setAviso('Matrícula actualizada.'); cargar(); }} />}
    </div>
  );
}