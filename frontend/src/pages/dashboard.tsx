import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { estadoMeta, fmtFecha, nombreArea } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Stat } from '../components/ui';
import { IconAlert, IconCheckCircle, IconClipboard, IconClock, IconHeartPulse, IconUsers } from '../components/icons';

interface DashBase {
  scope: 'me' | 'global';
  perfil: { nombre: string; rol: string };
}

interface DashMe extends DashBase {
  scope: 'me';
  sinPerfil?: string;
  misBeneficiarios: number;
  resumenActividades: { HOY: number; ATRASADAS: number; PROXIMAS: number; REALIZADAS: number };
  actividadesHoy: { id: number; tipo: string; fechaProgramada: string; beneficiario: { id: number; nombre: string } | null; area: string | null; estado: string }[];
  controlesPendientes: {
    salud: { id: number; tipo: string; beneficiario: string }[];
    saludTotal: number;
    nutricion: { id: number; beneficiario: string; proximo: string }[];
    nutricionTotal: number;
  };
  misAlertas: { id: number; titulo: string; prioridad: string; estado: string; beneficiario: string | null }[];
}

interface DashGlobal extends DashBase {
  scope: 'global';
  kpis: {
    beneficiariosActivos: number;
    casosActivos: number;
    ingresosMes: number;
    egresosMes: number;
    actividadesHoy: number;
    actividadesAtrasadas: number;
    alertasAbiertas: number;
    alertasAlta: number;
  };
  documentos: Record<string, number>;
  porArea: Record<string, { hoy: number; atrasadas: number }>;
  carga: { id: number; nombre: string; beneficiarios: number }[];
  ultimosBeneficiarios: { id: number; nombres: string; apellidos: string; numeroHistoria: string; fechaIngreso: string; estado: string }[];
  proximasActividades: { id: number; tipo: string; fechaProgramada: string; beneficiario: { id: number; nombre: string } | null; area: string | null; estado: string }[];
  alertasCriticas: { id: number; titulo: string; estado: string; beneficiario: string | null }[];
}

type DashboardData = DashMe | DashGlobal;

export default function Dashboard() {
  const { usuario } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<DashboardData>('/dashboard'));
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading) return <Spinner label="Cargando tu panel…" />;
  if (error)
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card className="p-4 text-sm text-red-600">{error}</Card>
      </div>
    );
  if (!data) return null;

  const esProfesional = data.scope === 'me';

  return (
    <div>
      <PageHeader
        title={`Hola, ${data.perfil.nombre.split(' ')[0] ?? ''}`}
        subtitle={
          esProfesional
            ? 'Tu panel profesional: solo lo relacionado con tus beneficiarios y actividades'
            : `Panel general · Rol: ${data.perfil.rol}`
        }
        actions={
          !esProfesional ? (
            <Link to="/beneficiarios/nuevo">
              <Button>+ Registrar beneficiario</Button>
            </Link>
          ) : undefined
        }
      />

      {esProfesional ? <VistaProfesional data={data as DashMe} /> : <VistaGlobal data={data as DashGlobal} />}
    </div>
  );
}

// ── Vista PROFESIONAL: solo su información ────────────────────────────
function VistaProfesional({ data }: { data: DashMe }) {
  if (data.sinPerfil) {
    return (
      <Card className="p-6">
        <EmptyState title="Sin perfil de profesional" description={data.sinPerfil} />
      </Card>
    );
  }

  const r = data.resumenActividades;
  const cp = data.controlesPendientes;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Mis beneficiarios" value={data.misBeneficiarios} hint="Asignados a mí" tone="teal" icon={<IconUsers />} />
        <Stat label="Actividades hoy" value={r.HOY} tone="blue" icon={<IconClock />} />
        <Stat label="Atrasadas" value={r.ATRASADAS} hint="Requieren mi atención" tone="red" icon={<IconAlert />} />
        <Stat label="Próximas" value={r.PROXIMAS} tone="amber" icon={<IconClipboard />} />
        <Stat label="Realizadas" value={r.REALIZADAS} tone="green" icon={<IconCheckCircle />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Mis próximas actividades</h2>
          </div>
          {data.actividadesHoy.length === 0 ? (
            <EmptyState title="Sin actividades próximas" description="Cuando tengas actividades programadas aparecerán aquí." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.actividadesHoy.map((a) => {
                const tone = a.estado === 'ATRASADA' ? 'red' : a.estado === 'REALIZADA' ? 'green' : 'amber';
                return (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{a.tipo}</p>
                      <p className="text-xs text-slate-500">
                        {a.beneficiario?.nombre ?? '—'}
                        {a.area ? ` · ${a.area}` : ''}
                      </p>
                    </div>
                    <Badge tone={tone}>{a.estado === 'ATRASADA' ? 'Atrasada' : fmtFecha(a.fechaProgramada)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-4 pb-3 pt-2">
            <Link to="/actividades" className="text-xs font-medium text-teal-700 hover:text-teal-800">Ver todas mis actividades →</Link>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Controles pendientes de mis beneficiarios</h2>
            </div>
            <div className="px-4 py-3 text-sm">
              <p className="text-slate-600">
                Salud: <strong>{cp.saludTotal}</strong> pendiente(s) · Nutrición: <strong>{cp.nutricionTotal}</strong> vencido(s)
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {cp.salud.slice(0, 3).map((c) => (
                  <li key={`s-${c.id}`}>• {c.tipo} — {c.beneficiario}</li>
                ))}
                {cp.nutricion.slice(0, 3).map((n) => (
                  <li key={`n-${n.id}`}>• Nutricional — {n.beneficiario} (venció {fmtFecha(n.proximo)})</li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Mis alertas</h2>
            </div>
            {data.misAlertas.length === 0 ? (
              <EmptyState title="Sin alertas asignadas a mí" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.misAlertas.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <p className="truncate text-sm text-slate-700">{a.titulo}</p>
                    <Badge tone={a.prioridad === 'ALTA' ? 'red' : 'amber'}>{a.estado}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Vista GLOBAL: Secretaría / Gestor / Coordinador / Admin ───────────
function VistaGlobal({ data }: { data: DashGlobal }) {
  const k = data.kpis;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Beneficiarios activos" value={k.beneficiariosActivos} tone="teal" icon={<IconUsers />} />
        <Stat label="Casos activos" value={k.casosActivos} tone="blue" icon={<IconClipboard />} />
        <Stat label="Ingresos del mes" value={k.ingresosMes} hint={`Egresos: ${k.egresosMes}`} tone="green" icon={<IconHeartPulse />} />
        <Stat label="Actividades atrasadas" value={k.actividadesAtrasadas} hint={`${k.actividadesHoy} programadas hoy`} tone="red" icon={<IconAlert />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Próximas actividades</h2>
            <Link to="/actividades" className="text-xs font-medium text-teal-700 hover:text-teal-800">Ver todas →</Link>
          </div>
          {data.proximasActividades.length === 0 ? (
            <EmptyState title="Sin actividades próximas" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.proximasActividades.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.tipo}</p>
                    <p className="text-xs text-slate-500">{a.beneficiario?.nombre ?? '—'}{a.area ? ` · ${a.area}` : ''}</p>
                  </div>
                  <Badge tone={a.estado === 'ATRASADA' ? 'red' : 'amber'}>{fmtFecha(a.fechaProgramada)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Alertas</h2>
              <Link to="/alertas" className="text-xs font-medium text-teal-700 hover:text-teal-800">Ver todas →</Link>
            </div>
            <div className="px-4 py-3 text-sm">
              <p className="text-slate-600">
                Abiertas: <strong>{k.alertasAbiertas}</strong> · Alta prioridad: <strong className="text-red-600">{k.alertasAlta}</strong>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {data.alertasCriticas.map((a) => (
                  <li key={a.id} className="truncate">• {a.titulo}</li>
                ))}
                {data.alertasCriticas.length === 0 && <li className="text-emerald-600">Sin alertas críticas abiertas</li>}
              </ul>
            </div>
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Documentos por estado</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm">
              {Object.entries(data.documentos).map(([estado, n]) => (
                <div key={estado} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                  <span className="text-slate-600">{estado}</span>
                  <span className="font-semibold text-slate-800">{n}</span>
                </div>
              ))}
              {Object.keys(data.documentos).length === 0 && <span className="text-slate-500">Sin documentos</span>}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Últimos beneficiarios registrados</h2>
            <Link to="/beneficiarios" className="text-xs font-medium text-teal-700 hover:text-teal-800">Ver todos →</Link>
          </div>
          {data.ultimosBeneficiarios.length === 0 ? (
            <EmptyState title="Sin beneficiarios" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.ultimosBeneficiarios.map((b) => {
                const meta = estadoMeta(b.estado);
                return (
                  <li key={b.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <Link to={`/beneficiarios/${b.id}`} className="text-sm font-medium text-teal-700 hover:text-teal-800">
                        {b.nombres} {b.apellidos}
                      </Link>
                      <p className="text-xs text-slate-400">{b.numeroHistoria} · ingresó {fmtFecha(b.fechaIngreso)}</p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Actividades por área</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 font-medium">Área</th>
                  <th className="px-2 py-2 text-right font-medium">Hoy</th>
                  <th className="px-4 py-2 text-right font-medium">Atrasadas</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.porArea).map(([cod, v]) => (
                  <tr key={cod} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-700">{nombreArea(cod)}</td>
                    <td className="px-2 py-2 text-right text-slate-600">{v.hoy}</td>
                    <td className="px-4 py-2 text-right">
                      {v.atrasadas > 0 ? <span className="font-semibold text-red-600">{v.atrasadas}</span> : <span className="text-slate-600">0</span>}
                    </td>
                  </tr>
                ))}
                {Object.keys(data.porArea).length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-4 text-center text-sm text-slate-500">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Carga operativa</h2>
              <Link to="/carga" className="text-xs font-medium text-teal-700 hover:text-teal-800">Detalle →</Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.carga.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 py-2">
                  <span className="truncate text-sm text-slate-700">{p.nombre}</span>
                  <span className="text-xs font-medium text-slate-600">{p.beneficiarios} ben.</span>
                </li>
              ))}
              {data.carga.length === 0 && <li className="px-4 py-4 text-center text-sm text-slate-500">Sin profesionales</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}