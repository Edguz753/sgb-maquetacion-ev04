import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { Badge, Button, Select, TextInput } from './ui';

export interface AlertaItem {
  id: number;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  prioridad: string;
  estado: string;
  fechaGeneracion: string;
  fechaLimite: string | null;
  fechaAtencion: string | null;
  fechaCierre: string | null;
  observaciones: string | null;
  responsableId: number | null;
  responsableUsuario: { id: number; nombre: string; apellido: string; username: string } | null;
  beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string };
  documento: { id: number; estado: string; tipoDocumento: { nombre: string } } | null;
  actividad: { id: number; fechaProgramada: string; tipoActividad: { nombre: string } } | null;
}

export const ESTADOS_ALERTA = ['NUEVA', 'ASIGNADA', 'EN_PROCESO', 'ATENDIDA', 'CERRADA', 'REABIERTA'];

export const ESTADO_ALERTA_META: Record<string, { label: string; tone: string }> = {
  NUEVA: { label: 'Nueva', tone: 'amber' },
  ASIGNADA: { label: 'Asignada', tone: 'blue' },
  EN_PROCESO: { label: 'En proceso', tone: 'teal' },
  ATENDIDA: { label: 'Atendida', tone: 'green' },
  CERRADA: { label: 'Cerrada', tone: 'slate' },
  CANCELADA: { label: 'Cancelada', tone: 'slate' },
  REABIERTA: { label: 'Reabierta', tone: 'red' },
};

export const TIPO_ALERTA_META: Record<string, { label: string; tone: string }> = {
  DOCUMENTO: { label: 'Documento', tone: 'teal' },
  ACTIVIDAD: { label: 'Actividad', tone: 'blue' },
  SALUD: { label: 'Salud', tone: 'red' },
  NUTRICION: { label: 'Nutrición', tone: 'green' },
  ESCOLARIZACION: { label: 'Escolaridad', tone: 'violet' },
  RED_APOYO: { label: 'Red de apoyo', tone: 'blue' },
  VENCIMIENTO: { label: 'Vencimiento', tone: 'amber' },
  ARCHIVO: { label: 'Archivo', tone: 'slate' },
  EDAD: { label: 'Edad', tone: 'slate' },
  SISTEMA: { label: 'Sistema', tone: 'slate' },
};

export const PRIORIDAD_META: Record<string, { label: string; tone: string }> = {
  ALTA: { label: 'Alta', tone: 'red' },
  MEDIA: { label: 'Media', tone: 'amber' },
  BAJA: { label: 'Baja', tone: 'slate' },
};

export function PrioridadBadge({ prioridad }: { prioridad?: string }) {
  const meta = PRIORIDAD_META[prioridad ?? ''] ?? { label: prioridad ?? '—', tone: 'slate' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function TipoAlertaBadge({ tipo }: { tipo?: string }) {
  const meta = TIPO_ALERTA_META[tipo ?? ''] ?? { label: tipo ?? '—', tone: 'slate' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// ── Modal: crear alerta manual ────────────────────────────────────────
export function ModalNuevaAlerta({
  beneficiarios,
  onClose,
  onCreada,
}: {
  beneficiarios: { id: number; nombres: string; apellidos: string; numeroHistoria: string }[];
  onClose: () => void;
  onCreada: () => void;
}) {
  const [form, setForm] = useState({ beneficiarioId: '', tipo: 'SISTEMA', titulo: '', descripcion: '', prioridad: 'MEDIA', fechaLimite: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.beneficiarioId || form.titulo.trim().length < 3) return;
    setEnviando(true);
    setError(null);
    try {
      await api.post('/alertas', {
        beneficiarioId: Number(form.beneficiarioId),
        tipo: form.tipo,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        prioridad: form.prioridad,
        fechaLimite: form.fechaLimite || null,
      });
      onCreada();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al crear la alerta');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Crear alerta manual</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Beneficiario <span className="text-red-500">*</span></span>
              <Select value={form.beneficiarioId} onChange={(e) => setForm((f) => ({ ...f, beneficiarioId: e.target.value }))}>
                <option value="">Selecciona…</option>
                {beneficiarios.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombres} {b.apellidos}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tipo</span>
              <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_ALERTA_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </label>
            <div className="sm:col-span-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Título <span className="text-red-500">*</span></span>
                <TextInput value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Resumen de la alerta" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Prioridad</span>
              <Select value={form.prioridad} onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}>
                {Object.entries(PRIORIDAD_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Fecha límite</span>
              <TextInput type="date" value={form.fechaLimite} onChange={(e) => setForm((f) => ({ ...f, fechaLimite: e.target.value }))} />
            </label>
            <div className="sm:col-span-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Descripción</span>
                <TextInput value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={enviando} disabled={!form.beneficiarioId || form.titulo.trim().length < 3}>Crear</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

