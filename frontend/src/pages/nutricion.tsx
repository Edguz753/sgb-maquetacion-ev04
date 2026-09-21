import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { BeneficiarioListResponse } from '../lib/types';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconHeart } from '../components/icons';
import { ModalNuevoNutricion, ModalEditarNutricion, RiesgoBadge, ETIQUETAS_CATEGORIA_IMC } from '../components/nutricion-ui';
import type { NutricionControl } from '../components/nutricion-ui';

function num(valor: string | number | null): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '—';
}

export default function Nutricion() {
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? '';
  const puedeCrear = ['GESTOR', 'PROFESIONAL'].includes(rol);

  const [items, setItems] = useState<NutricionControl[]>([]);
  const [resumen, setResumen] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [nivelFiltro, setNivelFiltro] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [editar, setEditar] = useState<NutricionControl | null>(null);
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
      if (nivelFiltro) params.set('nivelRiesgo', nivelFiltro);
      if (debounced.trim()) params.set('q', debounced.trim());
      const qs = params.toString();
      const res = await api.get<{ total: number; resumen: Record<string, number>; controles: NutricionControl[] }>(`/nutricion${qs ? `?${qs}` : ''}`);
      setItems(res.controles);
      setTotal(res.total);
      setResumen(res.resumen);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar controles nutricionales');
    } finally {
      setLoading(false);
    }
  }, [nivelFiltro, debounced]);

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
        title="Controles nutricionales"
        subtitle={`${total} control(es) en esta vista`}
        actions={
          puedeCrear ? (
            <Button onClick={abrirCrear}>
              <IconHeart size={15} /> + Control nutricional
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sin riesgo</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{resumen.SIN_RIESGO ?? 0}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Con riesgo</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{resumen.CON_RIESGO ?? 0}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Próximos vencidos</p>
          <p className={`mt-1 text-2xl font-semibold ${(resumen.PROXIMO_VENCIDO ?? 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>{resumen.PROXIMO_VENCIDO ?? 0}</p>
        </Card>
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-52">
            <Field label="Riesgo">
              <Select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)}>
                <option value="">Todos</option>
                <option value="SIN_RIESGO">Sin riesgo</option>
                <option value="CON_RIESGO">Con riesgo</option>
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
          <Spinner label="Consultando controles…" />
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin controles nutricionales"
            description="Registra el primer control con peso, talla e IMC."
            action={puedeCrear ? <Button onClick={abrirCrear}><IconHeart size={15} /> + Control nutricional</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Beneficiario</th>
                  <th className="px-4 py-3 font-medium">Nutricionista</th>
                  <th className="px-4 py-3 font-medium">Riesgo</th>
                  <th className="px-4 py-3 font-medium">Peso</th>
                  <th className="px-4 py-3 font-medium">Talla</th>
                  <th className="px-4 py-3 font-medium">IMC · Baremo CDC</th>
                  <th className="px-4 py-3 font-medium">Próximo</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-800">{fmtFecha(n.fechaControl)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/beneficiarios/${n.beneficiario.id}`} className="font-medium text-teal-700 hover:text-teal-800">
                        {n.beneficiario.nombres} {n.beneficiario.apellidos}
                      </Link>
                      <p className="text-xs text-slate-400">{n.beneficiario.numeroHistoria}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{n.profesional.nombres} {n.profesional.apellidos}</td>
                    <td className="px-4 py-3"><RiesgoBadge nivel={n.nivelRiesgo} /></td>
                    <td className="px-4 py-3 text-slate-600">{num(n.peso)} kg</td>
                    <td className="px-4 py-3 text-slate-600">{num(n.talla)} m</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {num(n.imc)}
                      {(n.imcPercentil != null || n.categoriaImc) && (
                        <p className="text-xs font-normal text-slate-500">
                          {n.imcPercentil != null ? `P${n.imcPercentil}` : ''}
                          {n.categoriaImc ? `${n.imcPercentil != null ? ' · ' : ''}${ETIQUETAS_CATEGORIA_IMC[n.categoriaImc] ?? n.categoriaImc}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={n.proximoVencido ? 'font-semibold text-red-600' : 'text-slate-600'}>
                        {fmtFecha(n.fechaProximoControl)}
                        {n.proximoVencido && <Badge tone="red" >Vencido</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {['GESTOR', 'PROFESIONAL'].includes(rol) && (
                        <Button size="sm" variant="ghost" onClick={() => { setEditar(n); setAviso(null); }}>Editar</Button>
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
        <ModalNuevoNutricion
          beneficiarios={bens?.beneficiarios ?? []}
          rol={rol}
          miProfesionalId={usuario?.profesional?.id ?? null}
          onClose={() => setCrearAbierto(false)}
          onCreado={() => { setAviso('Control nutricional registrado.'); cargar(); }}
        />
      )}
      {editar && <ModalEditarNutricion control={editar} onClose={() => setEditar(null)} onActualizado={() => { setAviso('Control actualizado.'); cargar(); }} />}
    </div>
  );
}