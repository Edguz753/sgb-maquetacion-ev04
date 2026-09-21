import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Beneficiario, BeneficiarioListResponse } from '../lib/types';
import { edad, estadoMeta, fmtFecha } from '../lib/utils';
import { Badge, Card, EmptyState, PageHeader, Spinner, TextInput } from '../components/ui';
import { IconSearch } from '../components/icons';

/**
 * Módulo de Egresados: listado exclusivo de beneficiarios con estado EGRESADO.
 * Los egresados no aparecen en el listado general ni en los reportes operativos;
 * solo se consultan desde aquí. Cada fila abre la ficha completa del beneficiario.
 */
export default function Egresados() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
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
      const params = new URLSearchParams({ estado: 'EGRESADO' });
      if (debounced.trim()) params.set('q', debounced.trim());
      setData(await api.get<BeneficiarioListResponse>(`/beneficiarios?${params.toString()}`));
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar egresados');
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = data?.total ?? data?.beneficiarios?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Egresados"
        subtitle="Beneficiarios retirados del programa: no aparecen en los módulos operativos, solo aquí"
      />

      <Card className="mb-4 p-3">
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, documento o número de historia…"
            className="pl-9"
          />
        </div>
      </Card>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Cargando egresados…" />
        ) : total === 0 ? (
          <EmptyState
            title="Sin egresados"
            description="Cuando un beneficiario sea marcado como egresado desde su ficha, aparecerá aquí."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Beneficiario</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Historia</th>
                  <th className="px-4 py-3 font-medium">Edad</th>
                  <th className="px-4 py-3 font-medium">Egreso</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data!.beneficiarios.map((b: Beneficiario) => {
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
                        {b.fechaIngreso && (
                          <p className="text-xs text-slate-400">Ingresó: {fmtFecha(b.fechaIngreso)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {b.tipoDocumento} · {b.numeroDocumento}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.numeroHistoria}</td>
                      <td className="px-4 py-3 text-slate-600">{edad(b.fechaNacimiento) ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtFecha(b.fechaEgreso ?? null)}</td>
                      <td className="max-w-[220px] px-4 py-3 text-slate-600">
                        <span className="line-clamp-2">{b.motivoEgreso || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
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