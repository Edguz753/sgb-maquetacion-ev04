import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { CargaResponse } from '../lib/types';
import { estadoMeta } from '../lib/utils';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../components/ui';

export default function CargaOperativa() {
  const [data, setData] = useState<CargaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await api.get<CargaResponse>('/profesionales/carga');
        if (activo) setData(res);
      } catch (e: any) {
        if (activo) setError(e.message ?? 'Error al consultar la carga');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const umbrales = data?.profesionales?.[0]?.umbrales;

  return (
    <div>
      <PageHeader
        title="Carga operativa"
        subtitle={umbrales ? `Umbrales: óptima ${umbrales.optimaMin}–${umbrales.optimaMax} · alta > ${umbrales.altaMin}` : 'Distribución de beneficiarios por profesional'}
      />

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Consultando carga operativa…" />
        ) : !data || data.profesionales.length === 0 ? (
          <EmptyState title="Sin profesionales activos" description="No hay profesionales registrados para medir carga." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.profesionales.map((p) => {
              const meta = estadoMeta(p.nivel);
              const max = Math.max(p.umbrales.altaMin, p.beneficiariosAsignados, 1);
              const pct = Math.min(100, Math.round((p.beneficiariosAsignados / max) * 100));
              const barTone =
                p.nivel === 'ALTA' ? 'bg-red-500' : p.nivel === 'OPTIMA' ? 'bg-emerald-500' : p.nivel === 'DISPONIBLE' ? 'bg-amber-400' : 'bg-slate-300';
              return (
                <li key={p.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {p.nombres} {p.apellidos}
                      </p>
                      <p className="text-xs text-slate-500">{p.beneficiariosAsignados} beneficiarios asignados</p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${barTone}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}