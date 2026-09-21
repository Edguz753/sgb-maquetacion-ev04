import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { fmtFecha } from '../lib/utils';
import { useAuth } from '../auth/authcontext';
import { AlertBanner, Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Select, Spinner, TextInput } from '../components/ui';
import { FormContrasena, FormMiContrasena } from '../components/usuario-contrasena-ui';
import { IconUserCog } from '../components/icons';

interface UsuarioItem {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string | null;
  rol: string;
  activo: boolean;
  ultimoAcceso: string | null;
  profesional: { id: number; nombres: string; apellidos: string } | null;
}

const ROLES = ['ADMIN', 'SECRETARIA', 'GESTOR', 'COORDINADOR', 'PROFESIONAL'];
const ROL_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SECRETARIA: 'Secretaría',
  GESTOR: 'Gestor',
  COORDINADOR: 'Coordinador',
  PROFESIONAL: 'Profesional',
};
const ROL_TONE: Record<string, string> = {
  ADMIN: 'violet',
  SECRETARIA: 'blue',
  GESTOR: 'teal',
  COORDINADOR: 'blue',
  PROFESIONAL: 'amber',
};

export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const esAdmin = yo?.rol === 'ADMIN';

  const [items, setItems] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [editar, setEditar] = useState<UsuarioItem | null>(null);
  const [contrasenaDe, setContrasenaDe] = useState<UsuarioItem | null>(null);
  const [miContrasenaAbierta, setMiContrasenaAbierta] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ total: number; usuarios: UsuarioItem[] }>('/usuarios');
      setItems(res.usuarios ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Error al consultar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  async function eliminarUsuario(id: number, nombre: string) {
    if (!window.confirm('¿Eliminar definitivamente el usuario "' + nombre + '"? Esta acción no se puede deshacer.')) return;
    setError(null);
    setAviso(null);
    try {
      await api.del('/usuarios/' + id);
      setAviso('Usuario eliminado.');
      cargar();
    } catch (err: any) {
      setError(err.message ?? 'Error al eliminar el usuario');
    }
  }

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function desactivar(u: UsuarioItem) {
    setError(null);
    try {
      await api.patch(`/usuarios/${u.id}`, { activo: !u.activo });
      setAviso(u.activo ? `Usuario ${u.username} desactivado.` : `Usuario ${u.username} activado.`);
      cargar();
    } catch (e: any) {
      setError(e.message ?? 'Error al cambiar el estado');
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle={`${items.length} usuario(s) del sistema`}
        actions={
          esAdmin ? (
            <Button onClick={() => setCrearAbierto(true)}>
              <IconUserCog size={15} /> + Usuario
            </Button>
          ) : undefined
        }
      />

      {error && <Card className="mb-4 p-3 text-sm text-red-600">{error}</Card>}
      {aviso && <Card className="mb-4 p-3 text-sm text-emerald-700">{aviso}</Card>}

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-600">Tu cuenta: <strong>{yo?.username}</strong> ({ROL_LABELS[yo?.rol ?? ''] ?? yo?.rol})</span>
          <Button size="sm" variant="secondary" onClick={() => setMiContrasenaAbierta(true)}>
            Cambiar mi contraseña
          </Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <Spinner label="Cargando usuarios…" />
        ) : items.length === 0 ? (
          <EmptyState title="Sin usuarios" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Último acceso</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  {esAdmin && <th className="px-4 py-3 font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {u.nombre} {u.apellido}
                        {u.id === yo?.id && <span className="ml-1 text-xs text-teal-600">(tú)</span>}
                      </p>
                      <p className="text-xs text-slate-400">{u.username}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email ?? '—'}</td>
                    <td className="px-4 py-3"><Badge tone={ROL_TONE[u.rol] ?? 'slate'}>{ROL_LABELS[u.rol] ?? u.rol}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{u.ultimoAcceso ? fmtFecha(u.ultimoAcceso) : 'nunca'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.activo ? 'green' : 'slate'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    {esAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => { setEditar(u); setAviso(null); setError(null); }}>Editar</Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => eliminarUsuario(u.id, u.nombre ?? u.username)}>Eliminar</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setContrasenaDe(u); setAviso(null); setError(null); }}>Contraseña</Button>
                          {u.id !== yo?.id && (
                            <Button size="sm" variant="ghost" onClick={() => desactivar(u)}>
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal crear/editar usuario */}
      {crearAbierto && (
        <ModalUsuario
          onClose={() => setCrearAbierto(false)}
          onGuardado={() => { setAviso('Usuario creado.'); cargar(); setCrearAbierto(false); }}
        />
      )}
      {editar && esAdmin && (
        <ModalUsuario
          existente={editar}
          onClose={() => setEditar(null)}
          onGuardado={() => { setAviso('Usuario actualizado.'); cargar(); setEditar(null); }}
        />
      )}

      {/* Modal reset de contraseña (ADMIN) */}
      {contrasenaDe && esAdmin && (
        <Modal
          title={`Restablecer contraseña · ${contrasenaDe.username}`}
          onClose={() => setContrasenaDe(null)}
        >
          <FormContrasena
            onSubmit={async (nueva) => {
              await api.patch(`/usuarios/${contrasenaDe.id}/contrasena`, { nuevaContrasena: nueva });
              setAviso(`Contraseña de ${contrasenaDe.username} actualizada.`);
              setContrasenaDe(null);
              return true;
            }}
            onCancel={() => setContrasenaDe(null)}
          />
        </Modal>
      )}

      {/* Modal cambiar mi contraseña */}
      {miContrasenaAbierta && (
        <Modal title="Cambiar mi contraseña" onClose={() => setMiContrasenaAbierta(false)}>
          <FormMiContrasena
            onGuardado={() => { setAviso('Tu contraseña fue actualizada.'); setMiContrasenaAbierta(false); }}
            onCancel={() => setMiContrasenaAbierta(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Modal crear/editar usuario ────────────────────────────────────────
function ModalUsuario({
  existente,
  onClose,
  onGuardado,
}: {
  existente?: UsuarioItem;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [form, setForm] = useState({
    username: existente?.username ?? '',
    nombre: existente?.nombre ?? '',
    apellido: existente?.apellido ?? '',
    email: existente?.email ?? '',
    rol: existente?.rol ?? 'PROFESIONAL',
    password: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (existente) {
        await api.patch(`/usuarios/${existente.id}`, {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          email: form.email.trim() || null,
          rolNombre: form.rol,
        });
      } else {
        if (form.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
        await api.post('/usuarios', {
          username: form.username.trim(),
          password: form.password,
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          email: form.email.trim() || null,
          rolNombre: form.rol,
          crearPerfilProfesional: form.rol === 'PROFESIONAL',
        });
      }
      onGuardado();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={existente ? `Editar usuario · ${existente.username}` : 'Nuevo usuario'} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <AlertBanner kind="error">{error}</AlertBanner>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username" required>
            <TextInput value={form.username} disabled={!!existente} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          </Field>
          <Field label="Rol" required>
            <Select value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROL_LABELS[r]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre" required>
            <TextInput value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          </Field>
          <Field label="Apellido" required>
            <TextInput value={form.apellido} onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          {!existente && (
            <Field label="Contraseña inicial" required hint="Mínimo 8 caracteres">
              <TextInput type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
          )}
          {form.rol === 'PROFESIONAL' && (
            <div className="sm:col-span-2 text-xs text-slate-500">
              Al guardar se creará también el perfil de profesional vinculado a esta cuenta.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={enviando}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Formularios de contraseña ─────────────────────────────────────────
