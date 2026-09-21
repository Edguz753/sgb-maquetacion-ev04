// SGB · Datos DEMO (ficticios) — evidencia GA5-220501095-AA1-EV04.
// Todos los nombres, documentos y datos de este archivo son INVENTADOS
// para fines academicos. No corresponden a personas reales.

export interface DemoUser {
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: string;
  profesional: { id: number; nombres: string; apellidos: string } | null;
}

export const DEMO_USERS: DemoUser[] = [
  { username: 'admin', password: 'Admin123!', nombre: 'Administrador', apellido: 'del Sistema', rol: 'ADMIN', profesional: null },
  { username: 'secretaria', password: 'Secre123!', nombre: 'Secretaria', apellido: 'General', rol: 'SECRETARIA', profesional: null },
  { username: 'gestor', password: 'Gestor123!', nombre: 'Gestor', apellido: 'de Casos', rol: 'GESTOR', profesional: null },
  { username: 'coordinador', password: 'Coord123!', nombre: 'Coordinador', apellido: 'de Area', rol: 'COORDINADOR', profesional: null },
  { username: 'ps.maria', password: 'Prof123!', nombre: 'Maria', apellido: 'Lopez', rol: 'PROFESIONAL', profesional: { id: 1, nombres: 'Maria', apellidos: 'Lopez' } },
  { username: 'ts.carlos', password: 'Prof123!', nombre: 'Carlos', apellido: 'Ramirez', rol: 'PROFESIONAL', profesional: { id: 2, nombres: 'Carlos', apellidos: 'Ramirez' } },
  { username: 'pd.ana', password: 'Prof123!', nombre: 'Ana', apellido: 'Torres', rol: 'PROFESIONAL', profesional: { id: 3, nombres: 'Ana', apellidos: 'Torres' } },
  { username: 'nt.luis', password: 'Prof123!', nombre: 'Luis', apellido: 'Gomez', rol: 'PROFESIONAL', profesional: { id: 4, nombres: 'Luis', apellidos: 'Gomez' } },
];

export const DEMO_AREAS = [
  { codigo: 'PS', nombre: 'Psicologia' },
  { codigo: 'TS', nombre: 'Trabajo Social' },
  { codigo: 'PD', nombre: 'Pedagogia' },
  { codigo: 'NT', nombre: 'Nutricion' },
];

export const DEMO_PROFESIONALES = [
  { id: 1, nombres: 'Maria', apellidos: 'Lopez', tipoDocumento: 'CC', numeroDocumento: '1010101', activo: true },
  { id: 2, nombres: 'Carlos', apellidos: 'Ramirez', tipoDocumento: 'CC', numeroDocumento: '2020202', activo: true },
  { id: 3, nombres: 'Ana', apellidos: 'Torres', tipoDocumento: 'CC', numeroDocumento: '3030303', activo: true },
  { id: 4, nombres: 'Luis', apellidos: 'Gomez', tipoDocumento: 'CC', numeroDocumento: '4040404', activo: true },
];

export const DEMO_TIPOS_ACTIVIDAD = [
  { id: 1, codigo: 'VALORACION_PRELIMINAR', nombre: 'Valoracion preliminar', areaCodigo: null, areaNombre: null },
  { id: 2, codigo: 'VALORACION_INTEGRADORA', nombre: 'Valoracion integradora', areaCodigo: null, areaNombre: null },
  { id: 3, codigo: 'ANALISIS_CASO', nombre: 'Analisis de caso', areaCodigo: null, areaNombre: null },
  { id: 4, codigo: 'PLAN_CASO', nombre: 'Plan de caso', areaCodigo: null, areaNombre: null },
  { id: 5, codigo: 'SEGUIMIENTO_ANALISIS_CASO', nombre: 'Seguimiento de analisis de caso', areaCodigo: null, areaNombre: null },
  { id: 6, codigo: 'SEGUIMIENTO_PLAN_CASO', nombre: 'Seguimiento de plan de caso', areaCodigo: null, areaNombre: null },
  { id: 7, codigo: 'SEGUIMIENTO_PROYECTO_VIDA', nombre: 'Seguimiento de proyecto de vida', areaCodigo: null, areaNombre: null },
  { id: 8, codigo: 'ATENCION', nombre: 'Atencion', areaCodigo: null, areaNombre: null },
  { id: 9, codigo: 'EMERGENTE', nombre: 'Emergente', areaCodigo: null, areaNombre: null },
];

export const DEMO_TIPOS_DOCUMENTO = [
  { id: 1, codigo: 'REGISTRO_CIVIL', nombre: 'Registro civil de nacimiento', categoria: 'IDENTIDAD', obligatorio: true },
  { id: 2, codigo: 'TARJETA_IDENTIDAD', nombre: 'Tarjeta de identidad', categoria: 'IDENTIDAD', obligatorio: true },
  { id: 3, codigo: 'CEDULA_ACUDIENTE', nombre: 'Cedula del acudiente', categoria: 'IDENTIDAD', obligatorio: false },
  { id: 4, codigo: 'RECIBO_SERVICIO', nombre: 'Recibo de servicio publico', categoria: 'DOMICILIO', obligatorio: true },
  { id: 5, codigo: 'CERTIFICADO_AFILIACION', nombre: 'Certificado de afiliacion a salud', categoria: 'SALUD', obligatorio: true },
  { id: 6, codigo: 'BOLETIN', nombre: 'Boletin escolar', categoria: 'ESCOLAR', obligatorio: false },
  { id: 7, codigo: 'SOPORTE_RED', nombre: 'Soporte de red de apoyo', categoria: 'RED', obligatorio: false },
  { id: 8, codigo: 'OTRO', nombre: 'Otro documento', categoria: 'OTRO', obligatorio: false },
];

export const DEMO_TIPOS_CONTROL = [
  { id: 1, codigo: 'MEDICINA_GENERAL', nombre: 'Medicina general', periodicidadMeses: 12 },
  { id: 2, codigo: 'PEDIATRIA', nombre: 'Pediatria', periodicidadMeses: 6 },
  { id: 3, codigo: 'OPTOMETRIA', nombre: 'Optometria', periodicidadMeses: 12 },
  { id: 4, codigo: 'ODONTOLOGIA', nombre: 'Odontologia', periodicidadMeses: 6 },
  { id: 5, codigo: 'VACUNACION', nombre: 'Vacunacion', periodicidadMeses: null },
  { id: 6, codigo: 'ESPECIALIDAD', nombre: 'Especialidad', periodicidadMeses: null },
  { id: 7, codigo: 'OTRO', nombre: 'Otro control', periodicidadMeses: null },
];

export const DEMO_TIPOS_CONDICION = [
  { id: 1, nombre: 'Riesgo nutricional', categoria: 'SALUD' },
  { id: 2, nombre: 'Enfermedad base', categoria: 'SALUD' },
  { id: 3, nombre: 'Condicion particular', categoria: 'GENERAL' },
  { id: 4, nombre: 'Necesidad de especialista', categoria: 'SALUD' },
  { id: 5, nombre: 'Seguimiento medico', categoria: 'SALUD' },
  { id: 6, nombre: 'Condicion escolar', categoria: 'ESCOLAR' },
  { id: 7, nombre: 'Otro', categoria: 'GENERAL' },
];

export const DEMO_TIPOS_RED = [
  { id: 1, nombre: 'ICBF', descripcion: 'Instituto Colombiano de Bienestar Familiar' },
  { id: 2, nombre: 'Comisaria de familia', descripcion: 'Comisaria de familia' },
  { id: 3, nombre: 'Secretaria de Salud', descripcion: 'Secretaria de salud municipal' },
  { id: 4, nombre: 'Secretaria de Educacion', descripcion: 'Secretaria de educacion' },
  { id: 5, nombre: 'EPS', descripcion: 'Entidad promotora de salud' },
  { id: 6, nombre: 'ONG', descripcion: 'Organizacion no gubernamental' },
  { id: 7, nombre: 'Juzgado', descripcion: 'Rama judicial' },
  { id: 8, nombre: 'Otra', descripcion: 'Otra institucion' },
];

export const DEMO_EPS = [
  { id: 1, nombre: 'Nueva EPS', regimen: 'CONTRIBUTIVO' },
  { id: 2, nombre: 'Sanitas', regimen: 'CONTRIBUTIVO' },
  { id: 3, nombre: 'Salud Total', regimen: 'CONTRIBUTIVO' },
  { id: 4, nombre: 'Compensar', regimen: 'SUBSIDIADO' },
  { id: 5, nombre: 'Mutual Ser', regimen: 'SUBSIDIADO' },
  { id: 6, nombre: 'SIN EPS', regimen: null },
];

export const DEMO_DEFENSORIAS = [
  { id: 1, nombre: 'Defensoria de Familia - Centro Zonal 1', centroZonal: 'CZ1' },
  { id: 2, nombre: 'Defensoria de Familia - Centro Zonal 2', centroZonal: 'CZ2' },
  { id: 3, nombre: 'Defensoria de Familia - Centro Zonal 3', centroZonal: 'CZ3' },
];

export const DEMO_ESTADOS_AFILIACION = [
  { id: 1, nombre: 'AFILIADO', descripcion: 'Afiliacion activa a EPS' },
  { id: 2, nombre: 'NO_AFILIADO', descripcion: 'Sin afiliacion a EPS' },
  { id: 3, nombre: 'EN_TRAMITE', descripcion: 'Afiliacion en tramite' },
];

export const DEMO_ESTADOS_ESCOLARES = [
  { id: 1, nombre: 'MATRICULADO', descripcion: 'Matriculado en institucion educativa' },
  { id: 2, nombre: 'SIN_ESCOLARIZAR', descripcion: 'Fuera del sistema escolar' },
  { id: 3, nombre: 'RETIRADO', descripcion: 'Retirado de la institucion' },
  { id: 4, nombre: 'TRASLADADO', descripcion: 'Trasladado a otra institucion' },
  { id: 5, nombre: 'EN_VERIFICACION', descripcion: 'Situacion en verificacion' },
  { id: 6, nombre: 'GRADUADO', descripcion: 'Graduado' },
];

export const DEMO_COLEGIOS = [
  { id: 1, nombre: 'IED San Gabriel', localidad: 'Localidad 1', sede: 'PRINCIPAL', orientadores: [] },
  { id: 2, nombre: 'Colegio Distrital Nueva Esperanza', localidad: 'Localidad 4', sede: 'PRINCIPAL', orientadores: [] },
  { id: 3, nombre: 'IED La Esperanza', localidad: 'Localidad 7', sede: 'SEDE A', orientadores: [{ id: 1, nombre: 'Orientador escolar de San Gabriel', telefono: null, correo: null }] },
];

export const DEMO_MONITORES = [
  { id: 1, codigo: 'MON-001', nombre: 'Monitor de club - Sede Norte', profesional: null },
  { id: 2, codigo: 'MON-002', nombre: 'Monitor de club - Sede Sur', profesional: null },
  { id: 3, codigo: 'MON-003', nombre: 'Monitor de club - Sede Centro', profesional: null },
];
