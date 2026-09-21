import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/authcontext';
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { IconSettings } from '../components/icons';

interface CampoDef {
  key: string;
  label: string;
  required?: boolean;
  tipo?: 'text' | 'select';
  opciones?: { value: string; label: string }[];
  opcionesDinamicas?: 'colegios';
}

interface TabDef {
  key: string;
  label: string;
  campos: CampoDef[];
  etiqueta: (item: any) => string;
  secundaria?: (item: any) => string;
}

const TABS: TabDef[] = [
  {
    key: 'colegios',
    label: 'Colegios',
    campos: [
      { key: 'nombre', label: 'Nombre', required: true },
      { key: 'localidad', label: 'Localidad' },
      { key: 'sede', label: 'Sede' },
    ],
    etiqueta: (i) => i.nombre,
    secundaria: (i) => [i.localidad, i.sede].filter(Boolean).join(' · '),
  },
  {
    key: 'orientadores',
    label: 'Orientadores',
    campos: [
      { key: 'colegioId', label: 'Colegio', required: true, tipo: 'select', opcionesDinamicas: 'colegios' },
      { key: 'nombre', label: 'Nombre', required: true },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'correo', label: 'Correo' },
    ],
    etiqueta: (i) => i.nombre,
    secundaria: (i) => i.colegio?.nombre ?? '',
  },
  {
    key: 'eps',
    label: 'EPS',
    campos: [
      { key: 'nombre', label: 'Nombre', required: true },
      { key: 'regimen', label: 'Régimen', tipo: 'select', opciones: [{ value: 'CONTRIBUTIVO', label: 'Contributivo' }, { value: 'SUBSIDIADO', label: 'Subsidiado' }, { value: 'ESPECIAL', label: 'Especial' }] },
    ],
    etiqueta: (i) => i.nombre,
    secundaria: (i) => i.regimen ?? '',
  },
  {
    key: 'monitores',
    label: 'Monitores',
    campos: [
      { key: 'codigo', label: 'Código', required: true },
      { key: 'nombre', label: 'Nombre', required: true },
    ],
    etiqueta: (i) => i.codigo + ' · ' + i.nombre,
    secundaria: (item: any) => item.profesional ? 'Profesional: ' + item.profesional.nombres + ' ' + item.profesional.apellidos : '',
  },
  {
    key: 'defensorias',
    label: 'Defensorías',
    campos: [
      { key: 'nombre', label: 'Nombre', required: true },
      { key: 'centroZonal', label: 'Centro zonal' },
    ],
    etiqueta: (i) => i.nombre,
    secundaria: (i) => i.centroZonal ?? '',
  },
  {
    key: 'estados-afiliacion',
    label: 'Estados de afiliación',
    campos: [
      { key: 'nombre', label: 'Nombre', required: true },
      { key: 'descripcion', label: 'Descripción' },
    ],
    etiqueta: (i) => i.nombre,
    secundaria: (i) => i.descripcion ?? '',
  },
  {
    key: 'estados-escolares',
    label: 'Estados escolares',
    campos: [
      { key: 'nombre', label: 'Nombre', required: true },
      { key: 'descripcion', label: 'Descripción' },
    ],
    etiqueta: (i) => i.nombre,
    secundaria: (i) => i.descripcion ?? '',
  },
];

export default function Catalogos() {
  const { usuario } = useAuth();
  const puedeGestionar = ['ADMIN', 'GESTOR', 'COORDINADOR'].includes(usuario?.rol ?? '');

  const [tabKey, setTabKey] = useState(TABS[0].key);
  const tab = TABS.find((t) => t.key === tabKey)!;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const [colegios, setColegios] = useState<any[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ total: number; items: any[] }>('/catalogos/' + tab.key);
      setItems(res.items ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar el catálogo');
    } finally {
      setLoading(false);
    }
  }, [tab.key]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (tab.key !== 'orientadores') return;
    (async () => {
      try {
        const res = await api.get<{ items: any[] }>('/catalogos/colegios');
        setColegios(res.items ?? []);
      } catch {
        setColegios([]);
      }
    })();
  }, [tab.key]);

  function abrirCrear() {
    const inicial: Record<string, string> = {};
    for (const campo of tab.campos) {
      inicial[campo.key] = campo.tipo === 'select' && campo.opciones ? campo.opciones[0]?.value ?? '' : '';
    }
    setForm(inicial);
    setEditando(null);
    setModalAbierto(true);
    setError(null);
  }

  function abrirEditar(item: any) {
    const inicial: Record<string, string> = {};
    for (const campo of tab.campos) {
      const v = item[campo.key];
      inicial[campo.key] = v === null || v === undefined ? '' : String(v);
    }
    setForm(inicial);
    setEditando(item);
    setModalAbierto(true);
    setError(null);
  }

  const [eliminando, setEliminando] = useState<number | null>(null);

  async function eliminar(item: any) {
    if (!window.confirm('\u00bfEliminar "' + tab.etiqueta(item) + '"? Esta acci\u00f3n no se puede deshacer.')) return;
    setEliminando(item.id);
    setError(null);
    setAviso(null);
    try {
      await api.del('/catalogos/' + tab.key + '/' + item.id);
      setAviso('Registro eliminado.');
      cargar();
    } catch (err: any) {
      setError(err.message ?? 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      for (const campo of tab.campos) {
        const v = form[campo.key] ?? '';
        if (campo.key === 'colegioId') body[campo.key] = v ? Number(v) : null;
        else body[campo.key] = v.trim() || null;
        if (campo.required && !v) throw new Error(campo.label + ' es obligatorio');
      }
      if (editando) await api.put('/catalogos/' + tab.key + '/' + editando.id, body);
      else await api.post('/catalogos/' + tab.key, body);
      setModalAbierto(false);
      setAviso(editando ? 'Registro actualizado.' : 'Registro creado.');
      cargar();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Catálogos"
        subtitle="Instituciones, EPS, monitores y estados que alimentan las fichas de los beneficiarios"
        actions={
          puedeGestionar ? (
            <Button onClick={abrirCrear}>
              <IconSettings size={15} /> Agregar {tab.label.toLowerCase()}
            </Button>
          ) : undefined
        }
      />

      {!puedeGestionar && (
        <Card className="mb-4 p-3 text-sm text-amber-700">
          Tu rol puede consultar los catálogos, pero solo ADMIN, GESTOR y COORDINADOR pueden editarlos.
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTabKey(t.key)}
            className={
              'rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ' +
              (t.key === tabKey ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className="mb-4 p-3 text-sm text-emerald-700">{aviso}</Card>}

      <Card>
        {loading ? (
          <Spinner label="Cargando catálogo…" />
        ) : items.length === 0 ? (
          <EmptyState
            title={'Sin registros en ' + tab.label.toLowerCase()}
            description={puedeGestionar ? 'Crea el primer registro con el botón de arriba.' : 'Pide a un Gestor o Coordinador que agregue registros.'}
            action={puedeGestionar ? <Button onClick={abrirCrear}>+ Agregar</Button> : undefined}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{tab.etiqueta(item)}</p>
                  {tab.secundaria && tab.secundaria(item) && <p className="text-xs text-slate-400">{tab.secundaria(item)}</p>}
                </div>
                {puedeGestionar && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => abrirEditar(item)}>Editar</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => eliminar(item)}
                      loading={eliminando === item.id}
                      disabled={eliminando !== null && eliminando !== item.id}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {modalAbierto && (
        <Modal title={(editando ? 'Editar ' : 'Nuevo en ') + tab.label.toLowerCase()} onClose={() => setModalAbierto(false)} wide>
          <form onSubmit={guardar} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tab.campos.map((campo) => (
                <div key={campo.key} className={campo.key === 'colegioId' ? 'sm:col-span-2' : ''}>
                  <Field label={campo.label} required={campo.required}>
                    {campo.tipo === 'select' && campo.opciones ? (
                      <Select value={form[campo.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [campo.key]: e.target.value }))}>
                        <option value="">—</option>
                        {campo.opciones.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    ) : campo.opcionesDinamicas === 'colegios' ? (
                      <Select value={form[campo.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [campo.key]: e.target.value }))}>
                        <option value="">Selecciona…</option>
                        {colegios.map((co) => (
                          <option key={co.id} value={co.id}>{co.nombre}</option>
                        ))}
                      </Select>
                    ) : (
                      <TextInput value={form[campo.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [campo.key]: e.target.value }))} />
                    )}
                  </Field>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalAbierto(false)}>Cancelar</Button>
              <Button type="submit" loading={guardando}>Guardar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}