import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { fmtFecha } from '../lib/utils';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, TextInput } from './ui';
import { IconHeart } from './icons';

export interface NutricionControl {
  id: number;
  fechaControl: string;
  nivelRiesgo: 'SIN_RIESGO' | 'CON_RIESGO';
  peso: string | number | null;
  talla: string | number | null;
  imc: string | number | null;
  imcPercentil?: number | null;
  categoriaImc?: string | null;
  imcP95?: string | number | null;
  periodicidadMeses: number;
  fechaProximoControl: string | null;
  observaciones: string | null;
  proximoVencido?: boolean;
  beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string; fechaNacimiento: string; genero?: string | null };
  profesional: { id: number; nombres: string; apellidos: string };
}

export interface ClasificacionIMCViva {
  imc: number | null;
  percentil: number | null;
  categoria: string;
  imcP95: number | null;
  edadMeses: number;
  edadAnios: number;
  edadMesesRestantes: number;
  aplica: boolean;
  nivelRiesgoSugerido: 'SIN_RIESGO' | 'CON_RIESGO';
}

export const ETIQUETAS_CATEGORIA_IMC: Record<string, string> = {
  BAJO_PESO: 'Bajo peso',
  PESO_SALUDABLE: 'Peso saludable',
  SOBREPESO: 'Sobrepeso',
  OBESIDAD: 'Obesidad',
  OBESIDAD_SEVERA: 'Obesidad severa',
  MENOR_DE_2_ANIOS: 'Menor de 2 años (IMC CDC no aplica)',
  NO_APLICA: 'No aplica',
};

export const TONO_CATEGORIA_IMC: Record<string, 'red' | 'green' | 'amber' | 'orange' | 'slate'> = {
  BAJO_PESO: 'red',
  PESO_SALUDABLE: 'green',
  SOBREPESO: 'amber',
  OBESIDAD: 'orange',
  OBESIDAD_SEVERA: 'red',
  MENOR_DE_2_ANIOS: 'slate',
  NO_APLICA: 'slate',
};
function num(valor: string | number | null): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '—';
}

export function RiesgoBadge({ nivel }: { nivel: string }) {
  return nivel === 'CON_RIESGO'
    ? <Badge tone="red">Con riesgo</Badge>
    : <Badge tone="green">Sin riesgo</Badge>;
}

interface Catalogos {
  profesionales: { id: number; nombres: string; apellidos: string }[];
}

function useCatalogos(abierto: boolean) {
  const [cat, setCat] = useState<Catalogos>({ profesionales: [] });
  useEffect(() => {
    if (!abierto) return;
    (async () => {
      try {
        const [p] = await Promise.all([
          api.get<{ total: number; profesionales: any[] }>('/profesionales'),
        ]);
        setCat({ profesionales: p.profesionales });
      } catch {
        setCat({ profesionales: [] });
      }
    })();
  }, [abierto]);
  return cat;
}

// ── Modal: registrar control nutricional ──────────────────────────────
export function ModalNuevoNutricion({
  beneficiarios,
  onClose,
  onCreado,
  rol,
  miProfesionalId,
}: {
  beneficiarios: { id: number; nombres: string; apellidos: string; numeroHistoria: string; fechaNacimiento?: string | null; genero?: string | null }[];
  onClose: () => void;
  onCreado: () => void;
  rol: string;
  miProfesionalId: number | null;
}) {
  const cat = useCatalogos(true);
  const esProfesional = rol === 'PROFESIONAL';
  const [form, setForm] = useState({ beneficiarioId: '', profesionalId: esProfesional && miProfesionalId ? String(miProfesionalId) : '', fechaControl: new Date().toISOString().slice(0, 10), nivelRiesgo: 'SIN_RIESGO', peso: '', talla: '', periodicidadMeses: '', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clasif, setClasif] = useState<ClasificacionIMCViva | null>(null);
  const [clasificando, setClasificando] = useState(false);

  const periodicidadFinal = form.periodicidadMeses || (form.nivelRiesgo === 'CON_RIESGO' ? '3' : '6');

  // Clasificación CDC en vivo (debounce): edad + sexo + IMC -> percentil y categoría
  useEffect(() => {
    const idB = Number(form.beneficiarioId);
    const pesoN = Number(form.peso);
    const tallaN = Number(form.talla);
    if (!idB || !form.peso || !form.talla || !Number.isFinite(pesoN) || !Number.isFinite(tallaN) || !(tallaN > 0 && tallaN < 3) || !(pesoN > 0)) {
      setClasif(null);
      return;
    }
    setClasificando(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.get<ClasificacionIMCViva>(`/nutricion/clasificar?beneficiarioId=${idB}&peso=${pesoN}&talla=${tallaN}`);
        setClasif(r);
        // Auto-selección del riesgo según la categoría (editable por el usuario)
        setForm((f) => ({ ...f, nivelRiesgo: r.nivelRiesgoSugerido }));
      } catch {
        setClasif(null);
      } finally {
        setClasificando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [form.beneficiarioId, form.peso, form.talla]);

  const benefElegido = beneficiarios.find((b) => String(b.id) === form.beneficiarioId);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.post('/nutricion', {
        beneficiarioId: Number(form.beneficiarioId),
        profesionalId: form.profesionalId ? Number(form.profesionalId) : null,
        fechaControl: form.fechaControl,
        nivelRiesgo: form.nivelRiesgo,
        peso: form.peso || null,
        talla: form.talla || null,
        periodicidadMeses: Number(periodicidadFinal),
        observaciones: form.observaciones.trim() || null,
      });
      onCreado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al registrar el control');
    } finally {
      setEnviando(false);
    }
  }

  const imcVista = clasif?.imc ?? null;

  return (
    <Modal title="Registrar control nutricional" onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Beneficiario" required>
            <Select value={form.beneficiarioId} onChange={(e) => setForm((f) => ({ ...f, beneficiarioId: e.target.value }))}>
              <option value="">Selecciona…</option>
              {beneficiarios.map((b) => (
                <option key={b.id} value={b.id}>{b.nombres} {b.apellidos} · {b.numeroHistoria}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha del control" required>
            <TextInput type="date" value={form.fechaControl} onChange={(e) => setForm((f) => ({ ...f, fechaControl: e.target.value }))} />
          </Field>
          {benefElegido && (
            <Field label="Edad y sexo" hint="Usados por el baremo CDC">
              <TextInput readOnly disabled value={`${describirEdad(benefElegido.fechaNacimiento)} · Sexo: ${benefElegido.genero === 'F' ? 'Femenino' : 'Masculino'}`} />
            </Field>
          )}
          <Field label="Nutricionista responsable" required hint={esProfesional ? 'Eres el profesional responsable' : undefined}>
            <Select value={form.profesionalId} disabled={esProfesional} onChange={(e) => setForm((f) => ({ ...f, profesionalId: e.target.value }))}>
              <option value="">Selecciona…</option>
              {cat.profesionales.map((p) => (
                <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>
              ))}
            </Select>
          </Field>
          <Field label="Nivel de riesgo" required hint="Se sugiere automáticamente según la categoría del IMC">
            <Select value={form.nivelRiesgo} onChange={(e) => setForm((f) => ({ ...f, nivelRiesgo: e.target.value }))}>
              <option value="SIN_RIESGO">Sin riesgo (control cada 6 meses)</option>
              <option value="CON_RIESGO">Con riesgo (control cada 3 meses)</option>
            </Select>
          </Field>
          <Field label="Peso (kg)">
            <TextInput type="number" step="0.01" min="0" value={form.peso} onChange={(e) => setForm((f) => ({ ...f, peso: e.target.value }))} placeholder="Ej: 24.5" />
          </Field>
          <Field label="Talla (m)">
            <TextInput type="number" step="0.01" min="0" value={form.talla} onChange={(e) => setForm((f) => ({ ...f, talla: e.target.value }))} placeholder="Ej: 1.20" />
          </Field>
          <Field label="Periodicidad (meses)" hint={`Por defecto: ${form.nivelRiesgo === 'CON_RIESGO' ? 3 : 6}`}>
            <Select value={periodicidadFinal} onChange={(e) => setForm((f) => ({ ...f, periodicidadMeses: e.target.value }))}>
              {[3, 6].map((m) => (
                <option key={m} value={m}>{m} meses</option>
              ))}
            </Select>
          </Field>
          <Field label="IMC calculado">
            <TextInput value={imcVista != null ? String(imcVista) : '—'} readOnly disabled />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observaciones">
              <TextInput value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} />
            </Field>
          </div>
        </div>

        {clasificando && (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Calculando percentil CDC…</div>
        )}
        {clasif && !clasificando && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Clasificación CDC:</span>
              <Badge tone={TONO_CATEGORIA_IMC[clasif.categoria] ?? 'slate'}>
                {ETIQUETAS_CATEGORIA_IMC[clasif.categoria] ?? clasif.categoria}
              </Badge>
              {clasif.percentil != null && (
                <span className="text-xs text-slate-500">Percentil {clasif.percentil} para la edad</span>
              )}
            </div>
            {clasif.aplica && clasif.percentil != null && (
              <p className="mt-1 text-xs text-slate-500">
                IMC {num(clasif.imc)} kg/m² · percentil {clasif.percentil} · IMC del percentil 95: {num(clasif.imcP95)} kg/m²
              </p>
            )}
            <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
              {[
                ['BAJO_PESO', 'Bajo peso: por debajo del percentil 5'],
                ['PESO_SALUDABLE', 'Peso saludable: percentil 5 a menos de 85'],
                ['SOBREPESO', 'Sobrepeso: percentil 85 a menos de 95'],
                ['OBESIDAD', 'Obesidad: percentil 95 o más'],
                ['OBESIDAD_SEVERA', 'Obesidad severa: IMC ≥ 120% del percentil 95'],
              ].map(([c, txt]) => (
                <li key={c} className={clasif.categoria === c ? 'font-semibold text-slate-800' : ''}>
                  <span className={clasif.categoria === c ? 'mr-1' : 'mr-1 opacity-40'}>●</span>{txt}
                </li>
              ))}
            </ul>
            {clasif.categoria !== 'PESO_SALUDABLE' && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Al quedar en esta categoría, el nivel de riesgo se selecciona automáticamente como “Con riesgo” (control cada 3 meses). Puedes ajustarlo si el profesional lo indica.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando} disabled={!form.beneficiarioId || !form.profesionalId}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}

export function describirEdad(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return '—';
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return '—';
  const hoy = new Date();
  let meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
  if (hoy.getDate() < nac.getDate()) meses -= 1;
  if (meses < 0) meses = 0;
  const anios = Math.floor(meses / 12);
  const mRest = meses % 12;
  return `${anios} año${anios === 1 ? '' : 's'}, ${mRest} mes${mRest === 1 ? '' : 'es'}`;
}

// ── Modal: editar control nutricional ─────────────────────────────────
export function ModalEditarNutricion({ control, onClose, onActualizado }: { control: NutricionControl; onClose: () => void; onActualizado: () => void }) {
  const [fechaControl, setFechaControl] = useState(control.fechaControl?.slice(0, 10) ?? '');
  const [nivelRiesgo, setNivelRiesgo] = useState(control.nivelRiesgo);
  const [peso, setPeso] = useState(control.peso != null ? String(control.peso) : '');
  const [talla, setTalla] = useState(control.talla != null ? String(control.talla) : '');
  const [periodicidadMeses, setPeriodicidad] = useState(String(control.periodicidadMeses));
  const [observaciones, setObservaciones] = useState(control.observaciones ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clasif, setClasif] = useState<ClasificacionIMCViva | null>(null);
  const [clasificando, setClasificando] = useState(false);

  // Clasificación CDC en vivo al editar peso/talla
  useEffect(() => {
    const pesoN = Number(peso);
    const tallaN = Number(talla);
    if (!peso || !talla || !Number.isFinite(pesoN) || !Number.isFinite(tallaN) || !(tallaN > 0 && tallaN < 3) || !(pesoN > 0)) {
      setClasif(null);
      return;
    }
    setClasificando(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.get<ClasificacionIMCViva>(`/nutricion/clasificar?beneficiarioId=${control.beneficiario.id}&peso=${pesoN}&talla=${tallaN}`);
        setClasif(r);
        if (r.nivelRiesgoSugerido !== nivelRiesgo) setNivelRiesgo(r.nivelRiesgoSugerido);
      } catch {
        setClasif(null);
      } finally {
        setClasificando(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peso, talla]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.patch(`/nutricion/${control.id}`, {
        fechaControl,
        nivelRiesgo,
        peso: peso || null,
        talla: talla || null,
        periodicidadMeses: Number(periodicidadMeses),
        observaciones,
      });
      onActualizado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al actualizar');
    } finally {
      setEnviando(false);
    }
  }

  const benefEdad = describirEdad(control.beneficiario.fechaNacimiento);

  return (
    <Modal title={`Editar control · ${fmtFecha(control.fechaControl)}`} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha del control" required>
            <TextInput type="date" value={fechaControl} onChange={(e) => setFechaControl(e.target.value)} />
          </Field>
          <Field label="Nivel de riesgo" required>
            <Select value={nivelRiesgo} onChange={(e) => { const v = e.target.value as any; setNivelRiesgo(v); setPeriodicidad(v === 'CON_RIESGO' ? '3' : '6'); }}>
              <option value="SIN_RIESGO">Sin riesgo (6 meses)</option>
              <option value="CON_RIESGO">Con riesgo (3 meses)</option>
            </Select>
          </Field>
          <Field label="Peso (kg)">
            <TextInput type="number" step="0.01" min="0" value={peso} onChange={(e) => setPeso(e.target.value)} />
          </Field>
          <Field label="Talla (m)">
            <TextInput type="number" step="0.01" min="0" value={talla} onChange={(e) => setTalla(e.target.value)} />
          </Field>
          <Field label="Periodicidad (meses)">
            <Select value={periodicidadMeses} onChange={(e) => setPeriodicidad(e.target.value)}>
              {[3, 6].map((m) => (
                <option key={m} value={m}>{m} meses</option>
              ))}
            </Select>
          </Field>
          <Field label="Beneficiario" hint={`Edad: ${benefEdad}`}>
            <TextInput readOnly disabled value={`${control.beneficiario.nombres} ${control.beneficiario.apellidos}`} />
          </Field>
        </div>
        {clasificando && (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Calculando percentil CDC…</div>
        )}
        {clasif && !clasificando && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Clasificación CDC:</span>
              <Badge tone={TONO_CATEGORIA_IMC[clasif.categoria] ?? 'slate'}>
                {ETIQUETAS_CATEGORIA_IMC[clasif.categoria] ?? clasif.categoria}
              </Badge>
              {clasif.percentil != null && (
                <span className="text-xs text-slate-500">Percentil {clasif.percentil} para la edad</span>
              )}
            </div>
            {clasif.aplica && (
              <p className="mt-1 text-xs text-slate-500">
                IMC {num(clasif.imc)} kg/m² · IMC del percentil 95: {num(clasif.imcP95)} kg/m² · Riesgo sugerido: {clasif.nivelRiesgoSugerido === 'CON_RIESGO' ? 'Con riesgo (3 meses)' : 'Sin riesgo (6 meses)'}
              </p>
            )}
          </div>
        )}
        <Field label="Observaciones">
          <TextInput value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Sección reutilizable: controles nutricionales de un beneficiario ──
export function SeccionNutricion({ beneficiarioId }: { beneficiarioId: number }) {
  const [items, setItems] = useState<NutricionControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [editar, setEditar] = useState<NutricionControl | null>(null);
  const puedeEditar = ['GESTOR', 'PROFESIONAL'].includes(useRol());

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; controles: NutricionControl[] }>(`/nutricion?beneficiarioId=${beneficiarioId}`);
      setItems(res.controles);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Controles nutricionales</h2>
        <Badge tone="slate">{items.length} control(es)</Badge>
      </div>

      {loading ? (
        <Spinner label="Cargando controles…" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin controles nutricionales" description="Registra el primer control desde la página Nutrición." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{fmtFecha(n.fechaControl)}</p>
                  <RiesgoBadge nivel={n.nivelRiesgo} />
                  {n.proximoVencido && <Badge tone="red">Próximo vencido</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Peso: {num(n.peso)} kg · Talla: {num(n.talla)} m · IMC: {num(n.imc)}{n.imcPercentil != null ? ` · Percentil ${n.imcPercentil}` : ''}{n.categoriaImc ? ` · ${ETIQUETAS_CATEGORIA_IMC[n.categoriaImc] ?? n.categoriaImc}` : ''}
                  {n.fechaProximoControl ? ` · Próximo: ${fmtFecha(n.fechaProximoControl)}` : ''}
                  {` · ${n.profesional.nombres} ${n.profesional.apellidos}`}
                </p>
                {n.observaciones && <p className="mt-0.5 text-xs text-slate-400">{n.observaciones}</p>}
              </div>
              {puedeEditar && (
                <Button size="sm" variant="ghost" onClick={() => setEditar(n)}>Editar</Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editar && <ModalEditarNutricion control={editar} onClose={() => setEditar(null)} onActualizado={() => cargar()} />}
    </Card>
  );
}

import { useAuth } from '../auth/authcontext';
function useRol(): string {
  return useAuth().usuario?.rol ?? '';
}