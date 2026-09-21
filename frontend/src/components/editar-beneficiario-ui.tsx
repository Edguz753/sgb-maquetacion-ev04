import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { GENEROS, TIPOS_DOCUMENTO } from '../lib/utils';
import { AlertBanner, Button, Field, Modal, Select, TextArea, TextInput } from './ui';

/** Jornadas del club (misma lista que la sección de ingreso) */
const JORNADAS = ['MAÑANA', 'TARDE', 'JORNADA ÚNICA', 'FIN DE SEMANA'];

/**
 * Modal de edición de datos básicos del beneficiario (la U del CRUD).
 * Usa el PATCH /beneficiarios/:id existente (con auditoría automática).
 */
export function ModalEditarBeneficiario({
  beneficiario,
  onClose,
  onActualizado,
}: {
  beneficiario: any;
  onClose: () => void;
  onActualizado: () => void;
}) {
  const [cat, setCat] = useState<any>(null);
  const [form, setForm] = useState({
    tipoDocumento: beneficiario.tipoDocumento ?? 'CC',
    numeroDocumento: beneficiario.numeroDocumento ?? '',
    nombres: beneficiario.nombres ?? '',
    apellidos: beneficiario.apellidos ?? '',
    fechaNacimiento: (beneficiario.fechaNacimiento ?? '').slice(0, 10),
    genero: beneficiario.genero ?? '',
    telefono: beneficiario.telefono ?? '',
    correo: beneficiario.correo ?? '',
    direccion: beneficiario.direccion ?? '',
    fechaIngreso: (beneficiario.fechaIngreso ?? '').slice(0, 10),
    motivoIngreso: beneficiario.casos?.[0]?.motivoIngreso ?? '',
    sim: beneficiario.sim ?? '',
    jornadaClub: beneficiario.jornadaClub ?? '',
    taller: beneficiario.taller ?? '',
    barrio: beneficiario.barrio ?? '',
    epsId: beneficiario.eps?.id ? String(beneficiario.eps.id) : '',
    defensoriaId: beneficiario.defensoria?.id ? String(beneficiario.defensoria.id) : '',
    estadoAfiliacionId: beneficiario.estadoAfiliacion?.id ? String(beneficiario.estadoAfiliacion.id) : '',
    observaciones: beneficiario.observaciones ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCat(await api.get<any>('/catalogos/todos'));
      } catch {
        setCat(null);
      }
    })();
  }, []);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.numeroDocumento.trim() || !form.nombres.trim() || !form.apellidos.trim() || !form.fechaNacimiento) {
      setError('Documento, nombres, apellidos y fecha de nacimiento son obligatorios');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await api.patch(`/beneficiarios/${beneficiario.id}`, {
        tipoDocumento: form.tipoDocumento,
        numeroDocumento: form.numeroDocumento.trim(),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        fechaNacimiento: form.fechaNacimiento,
        genero: form.genero || null,
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        direccion: form.direccion.trim() || null,
        fechaIngreso: form.fechaIngreso || null,
        motivoIngreso: form.motivoIngreso.trim() || null,
        sim: form.sim.trim() || null,
        jornadaClub: form.jornadaClub || null,
        taller: form.taller.trim() || null,
        barrio: form.barrio.trim() || null,
        epsId: form.epsId ? Number(form.epsId) : null,
        defensoriaId: form.defensoriaId ? Number(form.defensoriaId) : null,
        estadoAfiliacionId: form.estadoAfiliacionId ? Number(form.estadoAfiliacionId) : null,
        observaciones: form.observaciones.trim() || null,
      });
      onActualizado();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal title={`Editar datos · ${beneficiario.nombres} ${beneficiario.apellidos}`} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo de documento" required>
            <Select value={form.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value)}>
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Número de documento" required>
            <TextInput value={form.numeroDocumento} onChange={(e) => set('numeroDocumento', e.target.value)} />
          </Field>
          <Field label="Nombres" required>
            <TextInput value={form.nombres} onChange={(e) => set('nombres', e.target.value)} />
          </Field>
          <Field label="Apellidos" required>
            <TextInput value={form.apellidos} onChange={(e) => set('apellidos', e.target.value)} />
          </Field>
          <Field label="Fecha de nacimiento" required hint="La edad y el baremo CDC se recalculan con esta fecha">
            <TextInput type="date" value={form.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} />
          </Field>
          <Field label="Género">
            <Select value={form.genero} onChange={(e) => set('genero', e.target.value)}>
              <option value="">—</option>
              {GENEROS.map((g) => (
                <option key={g.codigo} value={g.codigo}>{g.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Teléfono">
            <TextInput value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          </Field>
          <Field label="Correo">
            <TextInput type="email" value={form.correo} onChange={(e) => set('correo', e.target.value)} />
          </Field>
          <Field label="Fecha de ingreso" hint="Se sincroniza con la fecha de apertura del caso">
            <TextInput type="date" value={form.fechaIngreso} onChange={(e) => set('fechaIngreso', e.target.value)} />
          </Field>
          <Field label="Motivo de ingreso">
            <TextInput value={form.motivoIngreso} onChange={(e) => set('motivoIngreso', e.target.value)} />
          </Field>
          <Field label="SIM">
            <TextInput value={form.sim} onChange={(e) => set('sim', e.target.value)} />
          </Field>
          <Field label="Taller" hint="Regla: 6-8 Ingeniosos · 9-13 Ganadores · 14-18 Líderes — vacío = automático por edad">
            <TextInput value={form.taller} onChange={(e) => set('taller', e.target.value)} placeholder="Ej: Líderes, Ganadores" />
          </Field>
          <Field label="Barrio">
            <TextInput value={form.barrio} onChange={(e) => set('barrio', e.target.value)} placeholder="Ej: Centro" />
          </Field>
          <Field label="Jornada del club">
            <Select value={form.jornadaClub} onChange={(e) => set('jornadaClub', e.target.value)}>
              <option value="">—</option>
              {JORNADAS.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </Select>
          </Field>
          <Field label="EPS">
            <Select value={form.epsId} onChange={(e) => set('epsId', e.target.value)}>
              <option value="">—</option>
              {(cat?.eps ?? []).map((x: any) => (
                <option key={x.id} value={x.id}>{x.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Defensoría">
            <Select value={form.defensoriaId} onChange={(e) => set('defensoriaId', e.target.value)}>
              <option value="">—</option>
              {(cat?.defensorias ?? []).map((x: any) => (
                <option key={x.id} value={x.id}>{x.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Estado de afiliación">
            <Select value={form.estadoAfiliacionId} onChange={(e) => set('estadoAfiliacionId', e.target.value)}>
              <option value="">—</option>
              {(cat?.estadosAfiliacion ?? []).map((x: any) => (
                <option key={x.id} value={x.id}>{x.nombre}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección">
              <TextInput value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observaciones">
              <TextArea rows={2} value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={guardando}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  );
}