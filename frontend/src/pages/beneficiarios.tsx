import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Beneficiario, BeneficiarioListResponse } from '../lib/types';
import { can, edad, estadoMeta, fmtFecha, nombreArea } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Spinner, TextInput } from '../components/ui';
import { IconSearch, IconUserPlus } from '../components/icons';

export default function Beneficiarios() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const rol = usuario?.rol ?? '';
  const esProfesional = rol === 'PROFESIONAL';

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [soloAsignados, setSoloAsignados] = useState(esProfesional);
  const [data, setData] = useState<BeneficiarioListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (esProfesional && soloAsignados) params.set('soloAsignados', 'true');
      const qs = params.toString();
      const res = await api.get<BeneficiarioListResponse>(`/beneficiarios${qs ? `?${qs}` : ''}`);
      setData(res);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar beneficiarios');
    } finally {
      setLoading(false);
    }
  }, [debounced, esProfesional, soloAsignados]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function areaActual(b: Beneficiario): string {
    const activa = b.casos?.[0]?.asignaciones?.find((a) => a.estado === 'ACTIVA');
    return activa?.area?.codigo ?? '—';
  }

  return (
    <div>
      <PageHeader
        title="Beneficiarios"
        subtitle={data ? `${data.total} resultado${data.total === 1 ? '' : 's'} · vista: ${data.vista}` : 'Consulta de beneficiarios'}
        actions={
          can.escribirBeneficiarios(rol) ? (
            <Link to="/beneficiarios/nuevo">
              <Button>+ Nuevo beneficiario</Button>
            </Link>
          ) : undefined
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Buscar">
              <div className="relative">
                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <TextInput
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nombre, documento o número de historia…"
                  className="pl-9"
                />
              </div>
            </Field>
          </div>
          {esProfesional && (
            <div className="flex items-center gap-2 pb-1">
              <button
                onClick={() => setSoloAsignados(false)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
                  !soloAsignados ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSoloAsignados(true)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
                  soloAsignados ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                Mis asignados
              </button>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>
      )}

      <Card>
        {loading ? (
          <Spinner label="Consultando beneficiarios…" />
        ) : !data || data.beneficiarios.length === 0 ? (
          <EmptyState
            title="No se encontraron beneficiarios"
            description={debounced ? 'Prueba con otro término de búsqueda.' : 'Registra el primer beneficiario para comenzar.'}
            action={
              can.escribirBeneficiarios(rol) ? (
                <Button onClick={() => navigate('/beneficiarios/nuevo')}>
                  <IconUserPlus size={16} /> Registrar
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Beneficiario</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Historia</th>
                  <th className="px-4 py-3 font-medium">Edad</th>
                  <th className="px-4 py-3 font-medium">Área</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {data.beneficiarios.map((b) => {
                  const meta = estadoMeta(b.estado);
                  return (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/beneficiarios/${b.id}`)}
                      className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-teal-50/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {b.nombres} {b.apellidos}
                        </p>
                        <p className="text-xs text-slate-400">{b.casos?.[0]?.numeroCaso ? `Caso ${b.casos[0].numeroCaso}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {b.tipoDocumento} · {b.numeroDocumento}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.numeroHistoria}</td>
                      <td className="px-4 py-3 text-slate-600">{edad(b.fechaNacimiento) ?? '—'} años</td>
                      <td className="px-4 py-3 text-slate-600">{nombreArea(areaActual(b))}</td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtFecha(b.fechaIngreso)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}