import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, Select, Spinner, TextInput } from './ui';
import { IconUsers } from './icons';

export interface AcudienteVinculacion {
  id: number;
  parentezco: string;
  esPrincipal: boolean;
  convive: boolean;
  acudiente: {
    id: number;
    nombres: string;
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    telefono: string | null;
    direccion: string | null;
    correo: string | null;
    ocupacion: string | null;
  };
}

const PARENTEZCOS = ['MADRE', 'PADRE', 'ABUELO/A', 'HERMANO/A', 'TÍO/A', 'ACUDIENTE', 'OTRO'];
const TIPOS_DOC = ['CC', 'TI', 'CE', 'PA', 'NIT'];

function ModalAcudiente({
  beneficiarioId,
  existente,
  onClose,
  onGuardado,
}: {
  beneficiarioId: number;
  existente?: AcudienteVinculacion;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [form, setForm] = useState({
    nombres: existente?.acudiente.nombres ?? '',
    tipoDocumento: existente?.acudiente.tipoDocumento ?? 'CC',
    numeroDocumento: existente?.acudiente.numeroDocumento ?? '',
    telefono: existente?.acudiente.telefono ?? '',
    direccion: existente?.acudiente.direccion ?? '',
    correo: existente?.acudiente.correo ?? '',
    ocupacion: existente?.acudiente.ocupacion ?? '',
    parentezco: existente?.parentezco ?? 'MADRE',
    esPrincipal: existente?.esPrincipal ?? false,
    convive: existente?.convive ?? false,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const body = {
        nombres: form.nombres.trim(),
        tipoDocumento: form.tipoDocumento || null,
        numeroDocumento: form.numeroDocumento.trim() || null,
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        correo: form.correo.trim() || null,
        ocupacion: form.ocupacion.trim() || null,
        parentezco: form.parentezco,
        esPrincipal: form.esPrincipal,
        convive: form.convive,
      };
      if (existente) await api.patch(`/acudientes/${existente.id}`, body);
      else await api.post('/acudientes', { ...body, beneficiarioId });
      onGuardado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={existente ? `Editar acudiente · ${existente.acudiente.nombres}` : 'Agregar acudiente'} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        {!existente && (
          <p className="text-xs text-slate-400">Si el número de documento ya existe en el sistema (p. ej. acudiente de un hermano), se reutiliza su ficha.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nombres completos" required>
              <TextInput value={form.nombres} onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))} />
            </Field>
          </div>
          <Field label="Parentesco con el beneficiario" required>
            <Select value={form.parentezco} onChange={(e) => setForm((f) => ({ ...f, parentezco: e.target.value }))}>
              {PARENTEZCOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo de documento">
            <Select value={form.tipoDocumento} onChange={(e) => setForm((f) => ({ ...f, tipoDocumento: e.target.value }))}>
              {TIPOS_DOC.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Número de documento" hint="Si ya existe, se reutiliza su ficha">
            <TextInput value={form.numeroDocumento} onChange={(e) => setForm((f) => ({ ...f, numeroDocumento: e.target.value }))} />
          </Field>
          <Field label="Teléfono">
            <TextInput value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="Ej: 300 123 4567" />
          </Field>
          <Field label="Correo">
            <TextInput type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} />
          </Field>
          <Field label="Ocupación">
            <TextInput value={form.ocupacion} onChange={(e) => setForm((f) => ({ ...f, ocupacion: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección">
              <TextInput value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))} />
            </Field>
          </div>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.esPrincipal} onChange={(e) => setForm((f) => ({ ...f, esPrincipal: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />
              Acudiente principal
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.convive} onChange={(e) => setForm((f) => ({ ...f, convive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />
              Convive con el beneficiario
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Sección reutilizable: familia / acudientes (ficha del beneficiario) ──
export function SeccionFamilia({ beneficiarioId }: { beneficiarioId: number }) {
  const { usuario } = useAuth();
  const puedeEditar = ['GESTOR', 'COORDINADOR', 'SECRETARIA'].includes(usuario?.rol ?? '');

  const [items, setItems] = useState<AcudienteVinculacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [editar, setEditar] = useState<AcudienteVinculacion | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ total: number; vinculaciones: AcudienteVinculacion[] }>(`/acudientes?beneficiarioId=${beneficiarioId}`);
      setItems(res.vinculaciones);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar la familia');
    } finally {
      setLoading(false);
    }
  }, [beneficiarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const desvincular = async (id: number) => {
    setError(null);
    try {
      await api.del(`/acudientes/${id}`);
      setAviso('Acudiente desvinculado.');
      cargar();
    } catch (e: any) {
      setError(e.message ?? 'Error al desvincular');
    }
  };

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Familia / acudientes</h2>
        <div className="flex items-center gap-2">
          <Badge tone="slate">{items.length} acudiente(s)</Badge>
          {puedeEditar && (
            <Button size="sm" variant="secondary" onClick={() => { setCrearAbierto(true); setError(null); }}>
              <IconUsers size={14} /> + Acudiente
            </Button>
          )}
        </div>
      </div>

      {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}
      {aviso && <div className="px-4 py-2 text-sm text-emerald-700">{aviso}</div>}

      {loading ? (
        <Spinner label="Cargando familia…" />
      ) : items.length === 0 ? (
        <EmptyState title="Sin acudientes registrados" description="Agrega a los acudientes y familiares con su parentesco y datos de contacto." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((v) => (
            <li key={v.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{v.acudiente.nombres}</p>
                  <Badge tone="teal">{v.parentezco}</Badge>
                  {v.esPrincipal && <Badge tone="violet">Acudiente principal</Badge>}
                  {v.convive && <Badge tone="slate">Convive</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {v.acudiente.tipoDocumento ? `${v.acudiente.tipoDocumento} ${v.acudiente.numeroDocumento ?? ''} · ` : ''}
                  {v.acudiente.telefono ?? 'sin teléfono'}
                  {v.acudiente.correo ? ` · ${v.acudiente.correo}` : ''}
                  {v.acudiente.ocupacion ? ` · ${v.acudiente.ocupacion}` : ''}
                  {v.acudiente.direccion ? ` · ${v.acudiente.direccion}` : ''}
                </p>
              </div>
              {puedeEditar && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => { setEditar(v); setAviso(null); }}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => desvincular(v.id)}>Desvincular</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {crearAbierto && (
        <ModalAcudiente beneficiarioId={beneficiarioId} onClose={() => setCrearAbierto(false)} onGuardado={() => { setAviso('Acudiente vinculado.'); cargar(); }} />
      )}
      {editar && (
        <ModalAcudiente beneficiarioId={beneficiarioId} existente={editar} onClose={() => setEditar(null)} onGuardado={() => { setAviso('Acudiente actualizado.'); cargar(); }} />
      )}
    </Card>
  );
}