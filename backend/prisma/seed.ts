/**
 * Seed inicial SGB — Sprint 0 (línea base V4.1.1)
 * Roles, permisos (RBAC V4.1.1), usuarios demo, profesionales, áreas,
 * tipos de actividad, tipos de documento, condiciones, controles de salud,
 * redes de apoyo, reglas del motor, festivos Colombia 2026.
 */
import { PrismaClient, AlcancePermiso, PrioridadActividad } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ------------------------------------------------------------------
// Festivos Colombia 2026 (Ley Emiliani)
// ------------------------------------------------------------------
const FESTIVOS_2026: Array<[string, string]> = [
  ['2026-01-01', 'Año Nuevo'],
  ['2026-01-12', 'Reyes Magos'],
  ['2026-03-23', 'San José'],
  ['2026-04-02', 'Jueves Santo'],
  ['2026-04-03', 'Viernes Santo'],
  ['2026-05-01', 'Día del Trabajo'],
  ['2026-05-18', 'Ascensión del Señor'],
  ['2026-06-08', 'Corpus Christi'],
  ['2026-06-15', 'Sagrado Corazón'],
  ['2026-06-29', 'San Pedro y San Pablo'],
  ['2026-07-20', 'Independencia'],
  ['2026-08-07', 'Batalla de Boyacá'],
  ['2026-08-17', 'Asunción de la Virgen'],
  ['2026-10-12', 'Día de la Raza'],
  ['2026-11-02', 'Todos los Santos'],
  ['2026-11-16', 'Independencia de Cartagena'],
  ['2026-12-08', 'Inmaculada Concepción'],
  ['2026-12-25', 'Navidad'],
];

/** Matriz RBAC V4.1.1: recurso → acciones por rol. C=Crear R=Consultar U=Modificar D=Eliminar A=Asignar X=Ejecutar */
const MATRIZ_RBAC: Record<string, Record<string, string>> = {
  USUARIO:        { ADMIN: 'CRUD', GESTOR: '', PROFESIONAL: '', COORDINADOR: '', SECRETARIA: '' },
  BENEFICIARIO:   { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'R', COORDINADOR: 'CRU', SECRETARIA: 'CRU' },
  CASO:           { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'R', COORDINADOR: 'CRU', SECRETARIA: 'R' },
  ASIGNACION:     { ADMIN: '', GESTOR: 'RU', PROFESIONAL: '', COORDINADOR: 'RU', SECRETARIA: 'RU' },
  PROFESIONAL:    { ADMIN: 'CRUD', GESTOR: 'R', PROFESIONAL: 'R', COORDINADOR: 'R', SECRETARIA: 'R' },
  CARGA:          { ADMIN: 'R', GESTOR: 'R', PROFESIONAL: 'R', COORDINADOR: 'R', SECRETARIA: 'R' },
  ACTIVIDAD:      { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'RU', COORDINADOR: 'R', SECRETARIA: 'R' },
  DOCUMENTO:      { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'RU', COORDINADOR: 'R', SECRETARIA: 'R' },
  ARCHIVO:        { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'R', COORDINADOR: 'R', SECRETARIA: '' },
  CONDICION:      { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'RU', COORDINADOR: 'R', SECRETARIA: '' },
  CONTROL_SALUD:  { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'RU', COORDINADOR: 'R', SECRETARIA: '' },
  CONTROL_NUTRICIONAL: { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'RU', COORDINADOR: 'R', SECRETARIA: '' },
  RED_APOYO:      { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'RU', COORDINADOR: 'R', SECRETARIA: '' },
  ESCOLARIZACION: { ADMIN: 'R', GESTOR: 'CRU', PROFESIONAL: 'RU', COORDINADOR: 'R', SECRETARIA: '' },
  REGLA:          { ADMIN: 'CRUD', GESTOR: 'R', PROFESIONAL: '', COORDINADOR: 'R', SECRETARIA: '' },
  ALERTA:         { ADMIN: 'R', GESTOR: 'RU', PROFESIONAL: 'RU', COORDINADOR: 'RU', SECRETARIA: 'R' },
  REPORTE:        { ADMIN: 'R', GESTOR: 'R', PROFESIONAL: 'R', COORDINADOR: 'R', SECRETARIA: 'R' },
  FESTIVO:        { ADMIN: 'CRUD', GESTOR: 'R', PROFESIONAL: 'R', COORDINADOR: 'R', SECRETARIA: '' },
  AUDITORIA:      { ADMIN: 'R', GESTOR: 'R', PROFESIONAL: '', COORDINADOR: 'R', SECRETARIA: '' },
  CONFIGURACION:  { ADMIN: 'CRUD', GESTOR: '', PROFESIONAL: '', COORDINADOR: 'R', SECRETARIA: '' },
};

const MAPA_ACCION: Record<string, string> = { C: 'CREAR', R: 'CONSULTAR', U: 'MODIFICAR', D: 'ELIMINAR', A: 'ASIGNAR', X: 'EJECUTAR' };

async function sembrarRbac() {
  const rolesData = [
    { nombre: 'ADMIN', descripcion: 'Administrador del sistema' },
    { nombre: 'GESTOR', descripcion: 'Gestor de caso' },
    { nombre: 'PROFESIONAL', descripcion: 'Profesional de atención' },
    { nombre: 'COORDINADOR', descripcion: 'Coordinador de área' },
    { nombre: 'SECRETARIA', descripcion: 'Secretaría — carga de datos' },
  ];
  const roles = new Map<string, number>();
  for (const r of rolesData) {
    const row = await prisma.rol.upsert({ where: { nombre: r.nombre }, update: { descripcion: r.descripcion }, create: r });
    roles.set(r.nombre, row.id);
  }

  // Permisos granulares: para cada recurso, para cada rol, para cada acción, alcance según rol
  for (const [recurso, porRol] of Object.entries(MATRIZ_RBAC)) {
    for (const [rolNombre, acciones] of Object.entries(porRol)) {
      const rolId = roles.get(rolNombre)!;
      for (const acc of acciones) {
        if (!acc) continue;
        const accion = MAPA_ACCION[acc];
        let alcance: AlcancePermiso = 'ALL';
        if (rolNombre === 'PROFESIONAL' && acc === 'U') alcance = 'OWN';
        if (rolNombre === 'PROFESIONAL' && acc === 'R' && ['ACTIVIDAD', 'DOCUMENTO', 'CONDICION', 'CONTROL_SALUD', 'CONTROL_NUTRICIONAL', 'RED_APOYO', 'ESCOLARIZACION', 'ALERTA', 'REPORTE'].includes(recurso)) alcance = 'ASSIGNED';

        const permiso = await prisma.permiso.upsert({
          where: { recurso_accion_alcance: { recurso, accion, alcance } },
          update: {},
          create: { recurso, accion, alcance, descripcion: `${accion} ${recurso} (${alcance})` },
        });
        // Vincular rol↔permiso
        const existe = await prisma.rolPermiso.findUnique({
          where: { rolId_permisoId: { rolId, permisoId: permiso.id } },
        });
        if (!existe) {
          await prisma.rolPermiso.create({ data: { rolId, permisoId: permiso.id } });
        }
      }
    }
  }
  console.log('  ✓ 5 roles + permisos RBAC V4.1.1');
  return roles;
}

async function main() {
  console.log('▶ Sembrando SGB (línea base V4.1.1)...');
  const roles = await sembrarRbac();

  // Áreas ------------------------------------------------------------
  const areasData = [
    { codigo: 'PS', nombre: 'Psicología', descripcion: 'Área de psicología' },
    { codigo: 'TS', nombre: 'Trabajo Social', descripcion: 'Área de trabajo social' },
    { codigo: 'PD', nombre: 'Pedagogía', descripcion: 'Área de pedagogía' },
    { codigo: 'NT', nombre: 'Nutrición', descripcion: 'Área de nutrición' },
  ];
  const areas = new Map<string, number>();
  for (const a of areasData) {
    const row = await prisma.area.upsert({ where: { codigo: a.codigo }, update: { nombre: a.nombre }, create: a });
    areas.set(a.codigo, row.id);
  }
  console.log('  ✓ 4 áreas (PS, TS, PD, NT)');

  // Tipos de actividad (ERD V4.1.1) -----------------------------------
  const tiposActividadData = [
    { codigo: 'VALORACION_PRELIMINAR', nombre: 'Valoración preliminar', areaId: null, periodicidadDias: null, requiereArchivo: false },
    { codigo: 'VALORACION_INTEGRADORA', nombre: 'Valoración integradora', areaId: null, periodicidadDias: null, requiereArchivo: false },
    { codigo: 'ANALISIS_CASO', nombre: 'Análisis de caso', areaId: null, periodicidadDias: null, requiereArchivo: false },
    { codigo: 'SEGUIMIENTO_ANALISIS_CASO', nombre: 'Seguimiento de análisis de caso', areaId: null, periodicidadDias: 90, requiereArchivo: false },
    { codigo: 'PLAN_CASO', nombre: 'Plan de caso', areaId: null, periodicidadDias: null, requiereArchivo: false },
    { codigo: 'SEGUIMIENTO_PLAN_CASO', nombre: 'Seguimiento de plan de caso', areaId: null, periodicidadDias: 90, requiereArchivo: false },
    { codigo: 'SEGUIMIENTO_PROYECTO_VIDA', nombre: 'Seguimiento de proyecto de vida', areaId: null, periodicidadDias: null, requiereArchivo: false },
    { codigo: 'ATENCION', nombre: 'Atención', areaId: null, periodicidadDias: null, requiereArchivo: false },
    { codigo: 'EMERGENTE', nombre: 'Emergente', areaId: null, periodicidadDias: null, requiereArchivo: false },
  ];
  for (const t of tiposActividadData) {
    await prisma.tipoActividad.upsert({ where: { codigo: t.codigo }, update: t, create: t });
  }
  console.log('  ✓ 9 tipos de actividad');

  // Tipos de documento (ERD V4.1.1) -----------------------------------
  const tiposDocData = [
    { codigo: 'REGISTRO_CIVIL', nombre: 'Registro civil de nacimiento', categoria: 'IDENTIDAD', obligatorio: true, edadInicio: 0, edadFin: null },
    { codigo: 'TARJETA_IDENTIDAD', nombre: 'Tarjeta de identidad', categoria: 'IDENTIDAD', obligatorio: true, edadInicio: 7, edadFin: null },
    { codigo: 'CEDULA_ACUDIENTE', nombre: 'Cédula del acudiente', categoria: 'IDENTIDAD', obligatorio: true, edadInicio: null, edadFin: null },
    { codigo: 'RECIBO_SERVICIO', nombre: 'Recibo de servicio público', categoria: 'DOMICILIO', obligatorio: true, edadInicio: null, edadFin: null },
    { codigo: 'CERTIFICADO_AFILIACION', nombre: 'Certificado de afiliación a salud', categoria: 'SALUD', obligatorio: true, edadInicio: null, edadFin: null },
    { codigo: 'BOLETIN', nombre: 'Boletín escolar', categoria: 'ESCOLAR', obligatorio: false, edadInicio: null, edadFin: null },
    { codigo: 'CERTIFICADO_ESTUDIO', nombre: 'Certificado de estudio', categoria: 'ESCOLAR', obligatorio: false, edadInicio: null, edadFin: null },
    { codigo: 'SOPORTE_RED', nombre: 'Soporte de red de apoyo', categoria: 'RED', obligatorio: false, edadInicio: null, edadFin: null },
    { codigo: 'SOPORTE_ATENCION', nombre: 'Soporte de atención', categoria: 'ATENCION', obligatorio: false, edadInicio: null, edadFin: null },
    { codigo: 'AUTORIZACION_DATOS', nombre: 'Autorización de datos', categoria: 'AUTORIZACION', obligatorio: true, edadInicio: null, edadFin: null },
    { codigo: 'OTRO', nombre: 'Otro documento', categoria: 'OTRO', obligatorio: false, edadInicio: null, edadFin: null },
  ];
  for (const t of tiposDocData) {
    await prisma.tipoDocumento.upsert({ where: { codigo: t.codigo }, update: t, create: t });
  }
  console.log('  ✓ 10 tipos de documento');

  // Tipos de condición -------------------------------------------------
  const tiposCondicionData = [
    { nombre: 'Riesgo nutricional', categoria: 'SALUD' },
    { nombre: 'Enfermedad base', categoria: 'SALUD' },
    { nombre: 'Condición particular', categoria: 'GENERAL' },
    { nombre: 'Necesidad de especialista', categoria: 'SALUD' },
    { nombre: 'Seguimiento médico', categoria: 'SALUD' },
    { nombre: 'Condición escolar', categoria: 'ESCOLAR' },
    { nombre: 'Otro', categoria: 'GENERAL' },
  ];
  for (const t of tiposCondicionData) {
    await prisma.tipoCondicion.upsert({ where: { nombre: t.nombre }, update: t, create: t });
  }
  console.log('  ✓ 7 tipos de condición');

  // Tipos de control de salud ------------------------------------------
  const tiposControlData = [
    { codigo: 'MEDICINA_GENERAL', nombre: 'Medicina general', periodicidadMeses: 12, aplicaPorDefecto: true },
    { codigo: 'PEDIATRIA', nombre: 'Pediatría', periodicidadMeses: 6, aplicaPorDefecto: true },
    { codigo: 'OPTOMETRIA', nombre: 'Optometría', periodicidadMeses: 12, aplicaPorDefecto: false },
    { codigo: 'ODONTOLOGIA', nombre: 'Odontología', periodicidadMeses: 6, aplicaPorDefecto: true },
    { codigo: 'VACUNACION', nombre: 'Vacunación', periodicidadMeses: null, aplicaPorDefecto: true },
    { codigo: 'ESPECIALIDAD', nombre: 'Especialidad', periodicidadMeses: null, aplicaPorDefecto: false },
    { codigo: 'OTRO', nombre: 'Otro control', periodicidadMeses: null, aplicaPorDefecto: false },
  ];
  for (const t of tiposControlData) {
    await prisma.tipoControlSalud.upsert({ where: { codigo: t.codigo }, update: t, create: t });
  }
  console.log('  ✓ 7 tipos de control de salud');

  // Tipos de red de apoyo ------------------------------------------------
  const tiposRedData = [
    { nombre: 'ICBF', descripcion: 'Instituto Colombiano de Bienestar Familiar' },
    { nombre: 'Comisaría de familia', descripcion: 'Comisaría de familia' },
    { nombre: 'Secretaría de Salud', descripcion: 'Secretaría de salud municipal' },
    { nombre: 'Secretaría de Educación', descripcion: 'Secretaría de educación' },
    { nombre: 'EPS', descripcion: 'Entidad promotora de salud' },
    { nombre: 'ONG', descripcion: 'Organización no gubernamental' },
    { nombre: 'Juzgado', descripcion: 'Rama judicial' },
    { nombre: 'Otra', descripcion: 'Otra institución' },
  ];
  for (const t of tiposRedData) {
    await prisma.tipoRedApoyo.upsert({ where: { nombre: t.nombre }, update: t, create: t });
  }
  console.log('  ✓ 8 tipos de red de apoyo');

  // Catálogos del ERD: EPS, defensorías, estado de afiliación, estado escolar, monitores, colegios y orientadores
  const epsData = [
    { nombre: 'Nueva EPS', regimen: 'CONTRIBUTIVO' },
    { nombre: 'Sanitas', regimen: 'CONTRIBUTIVO' },
    { nombre: 'Salud Total', regimen: 'CONTRIBUTIVO' },
    { nombre: 'Compensar', regimen: 'SUBSIDIADO' },
    { nombre: 'Mutual Ser', regimen: 'SUBSIDIADO' },
    { nombre: 'SIN EPS', regimen: null },
  ];
  for (const e of epsData) {
    await prisma.eps.upsert({ where: { nombre: e.nombre }, update: e, create: e });
  }
  console.log('  ✓ EPS sembradas');

  const defensoriaData = [
    { nombre: 'Defensoría de Familia - Centro Zonal 1', centroZonal: 'CZ1' },
    { nombre: 'Defensoría de Familia - Centro Zonal 2', centroZonal: 'CZ2' },
    { nombre: 'Defensoría de Familia - Centro Zonal 3', centroZonal: 'CZ3' },
  ];
  for (const d of defensoriaData) {
    await prisma.defensoria.upsert({ where: { nombre: d.nombre }, update: d, create: d });
  }
  console.log('  ✓ defensorías sembradas');

  const estadoAfiliacionData = [
    { nombre: 'AFILIADO', descripcion: 'Afiliación activa a EPS' },
    { nombre: 'NO_AFILIADO', descripcion: 'Sin afiliación a EPS' },
    { nombre: 'EN_TRAMITE', descripcion: 'Afiliación en trámite' },
  ];
  for (const e of estadoAfiliacionData) {
    await prisma.estadoAfiliacion.upsert({ where: { nombre: e.nombre }, update: e, create: e });
  }
  console.log('  ✓ estados de afiliación sembrados');

  const estadoEscolarData = [
    { nombre: 'MATRICULADO', descripcion: 'Matriculado en institución educativa' },
    { nombre: 'SIN_ESCOLARIZAR', descripcion: 'Fuera del sistema escolar' },
    { nombre: 'RETIRADO', descripcion: 'Retirado de la institución' },
    { nombre: 'TRASLADADO', descripcion: 'Trasladado a otra institución' },
    { nombre: 'EN_VERIFICACION', descripcion: 'Situación en verificación' },
    { nombre: 'GRADUADO', descripcion: 'Graduado' },
  ];
  for (const e of estadoEscolarData) {
    await prisma.estadoEscolar.upsert({ where: { nombre: e.nombre }, update: e, create: e });
  }
  console.log('  ✓ estados escolares sembrados');

  const monitoresData = [
    { codigo: 'MON-001', nombre: 'Monitor de club - Sede Norte' },
    { codigo: 'MON-002', nombre: 'Monitor de club - Sede Sur' },
    { codigo: 'MON-003', nombre: 'Monitor de club - Sede Centro' },
  ];
  for (const mo of monitoresData) {
    await prisma.monitor.upsert({ where: { codigo: mo.codigo }, update: mo, create: mo });
  }
  console.log('  ✓ monitores sembrados');

  const colegiosData = [
    { nombre: 'IED San Gabriel', localidad: 'Localidad 1', sede: 'PRINCIPAL' },
    { nombre: 'Colegio Distrital Nueva Esperanza', localidad: 'Localidad 4', sede: 'PRINCIPAL' },
    { nombre: 'IED La Esperanza', localidad: 'Localidad 7', sede: 'SEDE A' },
  ];
  for (const co of colegiosData) {
    await prisma.colegio.upsert({ where: { nombre: co.nombre }, update: co, create: co });
  }
  const colegioSanGabriel = await prisma.colegio.findUnique({ where: { nombre: 'IED San Gabriel' } });
  if (colegioSanGabriel) {
    await prisma.orientador.upsert({
      where: { id: 1 },
      update: { colegioId: colegioSanGabriel.id },
      create: { colegioId: colegioSanGabriel.id, nombre: 'Orientador escolar de San Gabriel', telefono: null, correo: null },
    }).catch(() => {});
  }
  console.log('  ✓ colegios y orientador demo sembrados');

  // Reglas del motor (V4.1.1) -------------------------------------------
  const reglasData = [
    { codigo: 'R001', nombre: 'Valoración preliminar', tipo: 'FECHA', condicion: 'dias_naturales_desde_ingreso = 5', accion: 'GENERAR_ACTIVIDAD:VALORACION_PRELIMINAR', prioridad: 10 },
    { codigo: 'R002', nombre: 'Valoración integradora', tipo: 'FECHA', condicion: 'dias_naturales_desde_ingreso = 15', accion: 'GENERAR_ACTIVIDAD:VALORACION_INTEGRADORA', prioridad: 20 },
    { codigo: 'R003', nombre: 'Análisis de caso', tipo: 'FECHA', condicion: 'dias_naturales_desde_ingreso = 20', accion: 'GENERAR_ACTIVIDAD:ANALISIS_CASO', prioridad: 30 },
    { codigo: 'R004', nombre: 'Plan de caso', tipo: 'FECHA', condicion: 'dias_naturales_desde_ingreso = 30', accion: 'GENERAR_ACTIVIDAD:PLAN_CASO', prioridad: 40 },
    { codigo: 'R005', nombre: 'Seguimiento de análisis +3m', tipo: 'PERIODICIDAD', condicion: 'desde_analisis + 3 meses', accion: 'GENERAR_ACTIVIDAD:SEGUIMIENTO_ANALISIS_CASO', prioridad: 50 },
    { codigo: 'R006', nombre: 'Seguimiento de plan +3m', tipo: 'PERIODICIDAD', condicion: 'desde_radicacion_plan + 3 meses', accion: 'GENERAR_ACTIVIDAD:SEGUIMIENTO_PLAN_CASO', prioridad: 60 },
    { codigo: 'R007', nombre: 'Proyecto de vida PS', tipo: 'PERIODICIDAD', condicion: 'area=PS AND mes IN (1,7,13)', accion: 'GENERAR_ACTIVIDAD:SEGUIMIENTO_PROYECTO_VIDA', prioridad: 70 },
    { codigo: 'R008', nombre: 'Proyecto de vida TS', tipo: 'PERIODICIDAD', condicion: 'area=TS AND mes IN (4,10,15)', accion: 'GENERAR_ACTIVIDAD:SEGUIMIENTO_PROYECTO_VIDA', prioridad: 71 },
    { codigo: 'R009', nombre: 'Proyecto de vida PD', tipo: 'PERIODICIDAD', condicion: 'area=PD AND mes IN (6,12,17)', accion: 'GENERAR_ACTIVIDAD:SEGUIMIENTO_PROYECTO_VIDA', prioridad: 72 },
    { codigo: 'R010', nombre: 'Control nutricional por riesgo', tipo: 'RIESGO', condicion: 'nivel_riesgo=CON_RIESGO', accion: 'GENERAR_CONTROL_NUTRICIONAL:3', prioridad: 80 },
    { codigo: 'R011', nombre: 'Control nutricional sin riesgo', tipo: 'RIESGO', condicion: 'nivel_riesgo=SIN_RIESGO', accion: 'GENERAR_CONTROL_NUTRICIONAL:6', prioridad: 81 },
    { codigo: 'R012', nombre: 'Certificado de afiliación trimestral', tipo: 'DOCUMENTO', condicion: 'estado_caso=ACTIVO', accion: 'GENERAR_DOCUMENTO:CERTIFICADO_AFILIACION', prioridad: 90 },
    { codigo: 'R013', nombre: 'Tarjeta de identidad a los 7 años', tipo: 'EDAD', condicion: 'edad >= 7 AND sin_tarjeta', accion: 'GENERAR_ALERTA:DOCUMENTO', prioridad: 100 },
    { codigo: 'R014', nombre: 'Actividad atrasada', tipo: 'FECHA', condicion: 'fecha_programada < hoy AND estado=PENDIENTE', accion: 'GENERAR_ALERTA:ACTIVIDAD', prioridad: 110 },
  ];
  for (const r of reglasData) {
    await prisma.regla.upsert({ where: { codigo: r.codigo }, update: r, create: r });
  }
  console.log('  ✓ 14 reglas del motor');

  // Festivos 2026 --------------------------------------------------------
  const countFestivos = await prisma.festivo.count({ where: { fecha: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') } } });
  if (countFestivos === 0) {
    for (const [fecha, nombre] of FESTIVOS_2026) {
      await prisma.festivo.create({ data: { fecha: new Date(fecha), nombre, pais: 'CO' } });
    }
  }
  console.log(`  ✓ ${FESTIVOS_2026.length} festivos Colombia 2026`);

  // Profesionales + usuarios demo -----------------------------------------
  const password = async (p: string) => bcrypt.hash(p, 10);
  const profData = [
    { numeroDocumento: '1010101', nombres: 'María', apellidos: 'López', usuario: { username: 'ps.maria', password: 'Prof123!', nombre: 'María', apellido: 'López', email: 'maria.lopez@sgb.local' } },
    { numeroDocumento: '2020202', nombres: 'Carlos', apellidos: 'Ramírez', usuario: { username: 'ts.carlos', password: 'Prof123!', nombre: 'Carlos', apellido: 'Ramírez', email: 'carlos.ramirez@sgb.local' } },
    { numeroDocumento: '3030303', nombres: 'Ana', apellidos: 'Torres', usuario: { username: 'pd.ana', password: 'Prof123!', nombre: 'Ana', apellido: 'Torres', email: 'ana.torres@sgb.local' } },
    { numeroDocumento: '4040404', nombres: 'Luis', apellidos: 'Gómez', usuario: { username: 'nt.luis', password: 'Prof123!', nombre: 'Luis', apellido: 'Gómez', email: 'luis.gomez@sgb.local' } },
  ];

  const usuariosDemo = [
    { username: 'admin', password: 'Admin123!', nombre: 'Administrador', apellido: 'del Sistema', email: 'admin@sgb.local', rol: 'ADMIN' },
    { username: 'secretaria', password: 'Secre123!', nombre: 'Secretaría', apellido: 'General', email: 'secretaria@sgb.local', rol: 'SECRETARIA' },
    { username: 'gestor', password: 'Gestor123!', nombre: 'Gestor', apellido: 'de Casos', email: 'gestor@sgb.local', rol: 'GESTOR' },
    { username: 'coordinador', password: 'Coord123!', nombre: 'Coordinador', apellido: 'de Área', email: 'coordinador@sgb.local', rol: 'COORDINADOR' },
  ];

  for (const p of profData) {
    const hash = await password(p.usuario.password);
    const usuario = await prisma.usuario.upsert({
      where: { username: p.usuario.username },
      update: { rolId: roles.get('PROFESIONAL')! },
      create: {
        username: p.usuario.username,
        passwordHash: hash,
        nombre: p.usuario.nombre,
        apellido: p.usuario.apellido,
        email: p.usuario.email,
        rolId: roles.get('PROFESIONAL')!,
      },
    });
    await prisma.profesional.upsert({
      where: { numeroDocumento: p.numeroDocumento },
      update: { usuarioId: usuario.id, nombres: p.nombres, apellidos: p.apellidos },
      create: { tipoDocumento: 'CC', numeroDocumento: p.numeroDocumento, nombres: p.nombres, apellidos: p.apellidos, usuarioId: usuario.id },
    });
  }

  for (const u of usuariosDemo) {
    const hash = await password(u.password);
    await prisma.usuario.upsert({
      where: { username: u.username },
      update: { rolId: roles.get(u.rol)! },
      create: {
        username: u.username,
        passwordHash: hash,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        rolId: roles.get(u.rol)!,
      },
    });
  }
  console.log('  ✓ 8 usuarios demo');

  console.log('✔ Seed completado (V4.1.1).');
}

main()
  .catch((e) => {
    console.error('✖ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
