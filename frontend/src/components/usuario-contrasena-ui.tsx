// Formularios de contraseña reutilizables (Sprint 10) — v2
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { AlertBanner, Button, Field, TextInput } from './ui';

/** Campos comunes con validación local. onSubmit recibe {actual, nueva} o solo nueva según pedirActual. */
function Campos({
  enviando,
  error,
  setError,
  onCancel,
  onSubmit,
  pedirActual,
}: {
  enviando: boolean;
  error: string | null;
  setError: (m: string | null) => void;
  onCancel: () => void;
  onSubmit: (valores: { actual: string; nueva: string }) => Promise<void>;
  pedirActual: boolean;
}) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== repetir) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError(null);
    onSubmit({ actual, nueva });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <AlertBanner kind="error">{error}</AlertBanner>}
      {pedirActual && (
        <Field label="Contraseña actual" required>
          <TextInput type="password" value={actual} onChange={(e) => setActual(e.target.value)} />
        </Field>
      )}
      <Field label="Nueva contraseña" required hint="Mínimo 8 caracteres">
        <TextInput type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      </Field>
      <Field label="Repetir nueva contraseña" required>
        <TextInput type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={enviando}>Guardar</Button>
      </div>
    </form>
  );
}

/** Cambiar la contraseña propia (exige la actual). */
export function FormMiContrasena({ onGuardado, onCancel }: { onGuardado: () => void; onCancel: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Campos
      enviando={enviando}
      error={error}
      setError={setError}
      onCancel={onCancel}
      pedirActual={true}
      onSubmit={async ({ actual, nueva }) => {
        setEnviando(true);
        try {
          await api.patch('/usuarios/mi-contrasena/cambiar', { actual, nueva });
          onGuardado();
        } catch (err: any) {
          setError(err.message ?? 'Error al cambiar la contraseña');
        } finally {
          setEnviando(false);
        }
      }}
    />
  );
}

/** Reset de contraseña por ADMIN (sin pedir la actual). */
export function FormContrasena({
  onSubmit,
  onCancel,
}: {
  onSubmit: (nueva: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Campos
      enviando={enviando}
      error={error}
      setError={setError}
      onCancel={onCancel}
      pedirActual={false}
      onSubmit={async ({ nueva }) => {
        setEnviando(true);
        try {
          const ok = await onSubmit(nueva);
          if (!ok) setError('No se pudo actualizar.');
        } catch (err: any) {
          setError(err.message ?? 'Error al actualizar');
        } finally {
          setEnviando(false);
        }
      }}
    />
  );
}