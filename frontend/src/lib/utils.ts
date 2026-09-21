// Utilidades de formato y catálogos (es-CO)

export function fmtFecha(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtFechaHora(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function edad(fechaNacimiento?: string | null): number | null {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

export function edadExacta(fechaNacimiento?: string | null): { anios: number; meses: number; texto: string } {
  if (!fechaNacimiento) return { anios: 0, meses: 0, texto: '—' };
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return { anios: 0, meses: 0, texto: '—' };
  const hoy = new Date();
  let meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
  if (hoy.getDate() < nac.getDate()) meses -= 1;
  if (meses < 0) meses = 0;
  const anios = Math.floor(meses / 12);
  const rest = meses % 12;
  return {
    anios,
    meses: rest,
    texto: `${anios} año${anios === 1 ? '' : 's'}, ${rest} mes${rest === 1 ? '' : 'es'}`,
  };
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SECRETARIA: 'Secretaría',
  GESTOR: 'Gestor',
  COORDINADOR: 'Coordinador',
  PROFESIONAL: 'Profesional',
};

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'slate',
  SECRETARIA: 'violet',
  GESTOR: 'teal',
  COORDINADOR: 'blue',
  PROFESIONAL: 'amber',
};

export const AREAS = [
  { codigo: 'PS', nombre: 'Psicología' },
  { codigo: 'TS', nombre: 'Trabajo Social' },
  { codigo: 'PD', nombre: 'Pedagogía' },
  { codigo: 'NT', nombre: 'Nutrición' },
];

export function nombreArea(codigo?: string): string {
  return AREAS.find((a) => a.codigo === codigo)?.nombre ?? (codigo || '—');
}

export const TIPOS_DOCUMENTO = [
  { codigo: 'RC', nombre: 'Registro civil' },
  { codigo: 'TI', nombre: 'Tarjeta de identidad' },
  { codigo: 'CC', nombre: 'Cédula de ciudadanía' },
  { codigo: 'CE', nombre: 'Cédula de extranjería' },
  { codigo: 'PA', nombre: 'Pasaporte' },
  { codigo: 'PPT', nombre: 'Permiso por Protección Temporal' },
  { codigo: 'DE', nombre: 'Documento de extranjería' },
  { codigo: 'SD', nombre: 'Sin documento' },
];

export function nombreTipoDocumento(codigo?: string): string {
  return TIPOS_DOCUMENTO.find((t) => t.codigo === codigo)?.nombre ?? (codigo || '—');
}

export const GENEROS = [
  { codigo: 'F', nombre: 'Femenino' },
  { codigo: 'M', nombre: 'Masculino' },
  { codigo: 'O', nombre: 'Otro' },
];

// Permisos por rol (RBAC V4.1.1) — espejo del backend
const ROLES_ESCRITURA_BASE = ['GESTOR', 'COORDINADOR', 'SECRETARIA'];
const ROLES_CERRAR_CASO = ['GESTOR', 'COORDINADOR'];
const ROLES_ASIGNAR = ['GESTOR', 'COORDINADOR', 'SECRETARIA'];
const ROLES_MARCAR_ACTIVIDAD = ['GESTOR', 'COORDINADOR', 'PROFESIONAL'];
const ROLES_VER_CARGA = ['ADMIN', 'GESTOR', 'COORDINADOR', 'SECRETARIA'];

export const can = {
  escribirBeneficiarios: (rol: string) => ROLES_ESCRITURA_BASE.includes(rol),
  cerrarCaso: (rol: string) => ROLES_CERRAR_CASO.includes(rol),
  asignarProfesional: (rol: string) => ROLES_ASIGNAR.includes(rol),
  marcarActividad: (rol: string) => ROLES_MARCAR_ACTIVIDAD.includes(rol),
  verCarga: (rol: string) => ROLES_VER_CARGA.includes(rol),
};

export const ESTADO_ACTIVIDAD_META: Record<string, { label: string; tone: string }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'amber' },
  REALIZADA: { label: 'Realizada', tone: 'green' },
  ATRASADA: { label: 'Atrasada', tone: 'red' },
  CANCELADA: { label: 'Cancelada', tone: 'slate' },
  NO_APLICA: { label: 'No aplica', tone: 'slate' },
};

export function estadoActividadMeta(estado?: string) {
  return ESTADO_ACTIVIDAD_META[estado ?? ''] ?? { label: estado ?? '—', tone: 'slate' };
}

export const ESTADO_GENERICO_META: Record<string, { label: string; tone: string }> = {
  ACTIVO: { label: 'Activo', tone: 'green' },
  EGRESADO: { label: 'Egresado', tone: 'slate' },
  ACTIVA: { label: 'Activa', tone: 'green' },
  FINALIZADA: { label: 'Finalizada', tone: 'slate' },
  CERRADO: { label: 'Cerrado', tone: 'slate' },
  OPTIMA: { label: 'Óptima', tone: 'green' },
  ALTA: { label: 'Alta', tone: 'red' },
  DISPONIBLE: { label: 'Disponible', tone: 'amber' },
  SIN_CARGA: { label: 'Sin carga', tone: 'slate' },
};

export function estadoMeta(estado?: string) {
  return ESTADO_GENERICO_META[estado ?? ''] ?? { label: estado ?? '—', tone: 'slate' };
}

export const ESTADO_DOCUMENTO_META: Record<string, { label: string; tone: string }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'amber' },
  RECIBIDO: { label: 'Recibido', tone: 'blue' },
  VIGENTE: { label: 'Vigente', tone: 'green' },
  VENCIDO: { label: 'Vencido', tone: 'red' },
  FALTANTE: { label: 'Faltante', tone: 'red' },
  NO_APLICA: { label: 'No aplica', tone: 'slate' },
};

export function estadoDocumentoMeta(estado?: string) {
  return ESTADO_DOCUMENTO_META[estado ?? ''] ?? { label: estado ?? '—', tone: 'slate' };
}

export const ESTADO_CONTROL_META: Record<string, { label: string; tone: string }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'amber' },
  REALIZADO: { label: 'Realizado', tone: 'green' },
  ATRASADO: { label: 'Atrasado', tone: 'red' },
  CANCELADO: { label: 'Cancelado', tone: 'slate' },
  NO_APLICA: { label: 'No aplica', tone: 'slate' },
};

export function estadoControlMeta(estado?: string) {
  return ESTADO_CONTROL_META[estado ?? ''] ?? { label: estado ?? '—', tone: 'slate' };
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}