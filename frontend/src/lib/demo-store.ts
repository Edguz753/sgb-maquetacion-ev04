// SGB · Almacén DEMO (datos ficticios) — beneficiarios, casos, actividades…
// Parte de la evidencia GA5-220501095-AA1-EV04. Todos los datos son inventados.
import { DEMO_PROFESIONALES } from './demo-data';

// ── Utilidades de fecha (relativas a hoy para que el demo siempre luzca vivo) ──
export function dISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
export function dDT(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}
export function nac(anios: number, meses: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().slice(0, 10);
}

export interface DemoActividad {
  id: number;
  estado: string;
  estadoCalculado?: string;
  fechaProgramada: string;
  fechaRealizacion: string | null;
  prioridad: number | null;
  observaciones: string | null;
  tipoActividad: { id: number; codigo: string; nombre: string };
  asignacionCaso?: {
    id: number;
    profesional: { id: number; nombres: string; apellidos: string };
    area: { codigo: string; nombre: string };
    caso: { id: number; numeroCaso: string; estado: string; beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string } };
  };
}

export interface DemoAsignacion {
  id: number;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  motivoCambio: string | null;
  observaciones: string | null;
  profesional: { id: number; nombres: string; apellidos: string };
  area: { codigo: string; nombre: string };
  actividades?: DemoActividad[];
}

export interface DemoCaso {
  id: number;
  numeroCaso: string;
  estado: string;
  fechaApertura: string;
  fechaCierre: string | null;
  motivoIngreso: string | null;
  asignaciones: DemoAsignacion[];
  documentos?: any[];
}

export interface DemoBeneficiario {
  id: number;
  numeroHistoria: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  estado: string;
  fechaIngreso: string;
  taller?: string | null;
  barrio?: string | null;
  fechaEgreso?: string | null;
  motivoEgreso?: string | null;
  observaciones: string | null;
  sim?: string | null;
  jornadaClub?: string | null;
  epsId?: number | null;
  defensoriaId?: number | null;
  estadoAfiliacionId?: number | null;
  casos: DemoCaso[];
  condiciones: any[];
  controlesSalud: any[];
  controlesNutricionales: any[];
  redesApoyo: any[];
  alertas: any[];
}

const PRO = DEMO_PROFESIONALES;
const PRO_BY_ID = (id: number) => PRO.find((p) => p.id === id)!;
const AREA_PS = { codigo: 'PS', nombre: 'Psicología' };
const AREA_TS = { codigo: 'TS', nombre: 'Trabajo Social' };
const AREA_PD = { codigo: 'PD', nombre: 'Pedagogía' };
const AREA_NT = { codigo: 'NT', nombre: 'Nutrición' };

const TIPO_ACT: Record<string, { id: number; codigo: string; nombre: string }> = {
  PRELIMINAR: { id: 1, codigo: 'VALORACION_PRELIMINAR', nombre: 'Valoración preliminar' },
  INTEGRADORA: { id: 2, codigo: 'VALORACION_INTEGRADORA', nombre: 'Valoración integradora' },
  ANALISIS: { id: 3, codigo: 'ANALISIS_CASO', nombre: 'Análisis de caso' },
  PLAN: { id: 4, codigo: 'PLAN_CASO', nombre: 'Plan de caso' },
  SEG_ANALISIS: { id: 5, codigo: 'SEGUIMIENTO_ANALISIS_CASO', nombre: 'Seguimiento de análisis de caso' },
  SEG_PLAN: { id: 6, codigo: 'SEGUIMIENTO_PLAN_CASO', nombre: 'Seguimiento de plan de caso' },
  PROY_VIDA: { id: 7, codigo: 'SEGUIMIENTO_PROYECTO_VIDA', nombre: 'Seguimiento de proyecto de vida' },
  ATENCION: { id: 8, codigo: 'ATENCION', nombre: 'Atención' },
  EMERGENTE: { id: 9, codigo: 'EMERGENTE', nombre: 'Emergente' },
};

let actId = 1000;
function actividad(tipo: keyof typeof TIPO_ACT, offset: number, estado: string, prioridad = 20): DemoActividad {
  const realizada = estado === 'REALIZADA';
  return {
    id: actId++,
    estado,
    estadoCalculado: estado,
    fechaProgramada: dISO(offset),
    fechaRealizacion: realizada ? dDT(offset) : null,
    prioridad,
    observaciones: null,
    tipoActividad: TIPO_ACT[tipo],
  };
}

let asigId = 500;
function asignacion(
  profId: number,
  area: { codigo: string; nombre: string },
  inicioOffset: number,
  actividades: DemoActividad[],
  estado = 'ACTIVA',
): DemoAsignacion {
  return {
    id: asigId++,
    estado,
    fechaInicio: dISO(inicioOffset),
    fechaFin: estado === 'FINALIZADA' ? dISO(inicioOffset + 60) : null,
    motivoCambio: estado === 'FINALIZADA' ? 'Reasignación de carga' : null,
    observaciones: null,
    profesional: { id: PRO_BY_ID(profId).id, nombres: PRO_BY_ID(profId).nombres, apellidos: PRO_BY_ID(profId).apellidos },
    area,
    actividades,
  };
}

let casoId = 300;
let benId = 0;

interface BenDef {
  nombres: string;
  apellidos: string;
  doc: string;
  tipoDoc?: string;
  nacA: number;
  nacM: number;
  genero: string;
  ingresoHace: number; // días atrás
  motivo: string;
  barrio: string;
  taller: string;
  area: 'PS' | 'TS' | 'PD' | 'NT';
  profId: number;
  epsId?: number;
  planCompletado?: boolean; // valoraciones/plan ya hechos → queda seguimiento
  extras?: Partial<DemoBeneficiario>;
}

function ben(d: BenDef): DemoBeneficiario {
  benId += 1;
  const id = benId;
  const historia = String(100 + id);
  const casoNum = `C-2026-${String(id).padStart(3, '0')}`;

  // Actividades del motor de planificación (como el backend real):
  // preliminar +5, integradora +15, análisis +20, plan +30 días naturales.
  const off = (n: number) => n - d.ingresoHace;
  const acts: DemoActividad[] = [];
  const hecho = d.planCompletado !== false;
  acts.push(actividad('PRELIMINAR', off(5), 'REALIZADA', 10));
  acts.push(actividad('INTEGRADORA', off(15), hecho ? 'REALIZADA' : off(15) < 0 ? 'ATRASADA' : 'PENDIENTE', 20));
  acts.push(actividad('ANALISIS', off(20), hecho ? 'REALIZADA' : off(20) < 0 ? 'ATRASADA' : 'PENDIENTE', 30));
  acts.push(actividad('PLAN', off(30), hecho ? 'REALIZADA' : off(30) < 0 ? 'ATRASADA' : 'PENDIENTE', 40));
  if (hecho) acts.push(actividad('SEG_ANALISIS', off(110), off(110) < 0 ? 'REALIZADA' : 'PENDIENTE', 50));
  if (hecho) acts.push(actividad('SEG_PLAN', off(125), off(125) < 0 ? 'ATRASADA' : 'PENDIENTE', 60));
  acts.push(actividad('PROY_VIDA', 12 + (id % 5), 'PENDIENTE', 70));

  const areaMap: Record<string, { codigo: string; nombre: string }> = { PS: AREA_PS, TS: AREA_TS, PD: AREA_PD, NT: AREA_NT };
  const asigs: DemoAsignacion[] = [];
  // Una asignación previa finalizada (historial) para variedad
  if (id % 3 === 1) {
    asigs.push(asignacion(PRO[(id % 4) + 1 === 1 ? 2 : id % 4].id, areaMap[d.area], -(d.ingresoHace - 10), [], 'FINALIZADA'));
  }
  asigs.push(asignacion(d.profId, areaMap[d.area], -(d.ingresoHace - 3), acts));

  const caso: DemoCaso = {
    id: casoId++,
    numeroCaso: casoNum,
    estado: 'ACTIVO',
    fechaApertura: dISO(-d.ingresoHace),
    fechaCierre: null,
    motivoIngreso: d.motivo,
    asignaciones: asigs,
  };

  return {
    id,
    numeroHistoria: historia,
    tipoDocumento: d.tipoDoc ?? 'RC',
    numeroDocumento: d.doc,
    nombres: d.nombres,
    apellidos: d.apellidos,
    fechaNacimiento: nac(d.nacA, d.nacM),
    genero: d.genero,
    telefono: null,
    correo: null,
    direccion: `Calle ${10 + id} # ${20 + id}-${30 + id}`,
    estado: 'ACTIVO',
    fechaIngreso: dISO(-d.ingresoHace),
    taller: d.taller,
    barrio: d.barrio,
    fechaEgreso: null,
    motivoEgreso: null,
    observaciones: null,
    sim: `SIM-${1000 + id}`,
    jornadaClub: id % 2 === 0 ? 'Tarde' : 'Mañana',
    epsId: d.epsId ?? (id % 4) + 1,
    defensoriaId: (id % 3) + 1,
    estadoAfiliacionId: id % 3 === 0 ? 2 : 1,
    casos: [caso],
    condiciones: [],
    controlesSalud: [],
    controlesNutricionales: [],
    redesApoyo: [],
    alertas: [],
    ...d.extras,
  };
}

// ── Beneficiarios ACTIVOS (ficticios) ────────────────────────────────────────
export const demoBeneficiarios: DemoBeneficiario[] = [
  ben({ nombres: 'Sofía', apellidos: 'Martínez Ríos', doc: '1101234567', nacA: 9, nacM: 4, genero: 'F', ingresoHace: 40, motivo: 'Remisión escolar por bajo rendimiento', barrio: 'Barrio Los Almendros', taller: 'Refuerzo escolar', area: 'PD', profId: 3 }),
  ben({ nombres: 'Juan David', apellidos: 'Cárdenas Vera', doc: '1102345678', nacA: 12, nacM: 0, genero: 'M', ingresoHace: 18, motivo: 'Remisión por riesgo nutricional', barrio: 'Barrio Villa Sol', taller: 'Huerta urbana', area: 'NT', profId: 4, planCompletado: false }),
  ben({ nombres: 'Valentina', apellidos: 'Rojas Peña', doc: '1103456789', nacA: 7, nacM: 8, genero: 'F', ingresoHace: 12, motivo: 'Seguimiento por cambio de colegio', barrio: 'Barrio La Arboleda', taller: 'Ludoteca', area: 'TS', profId: 2 }),
  ben({ nombres: 'Mateo', apellidos: 'Florez Ortiz', doc: '1104567890', nacA: 10, nacM: 2, genero: 'M', ingresoHace: 60, motivo: 'Atención psicosocial familiar', barrio: 'Barrio El Prado', taller: 'Papel móvil', area: 'PS', profId: 1, planCompletado: true }),
  ben({ nombres: 'Camila', apellidos: 'Nieto Salas', doc: '1105678901', nacA: 8, nacM: 11, genero: 'F', ingresoHace: 25, motivo: 'Remisión ICBF por cuidado alternativo', barrio: 'Barrio Las Acacias', taller: 'Refuerzo escolar', area: 'TS', profId: 2 }),
  ben({ nombres: 'Andrés Felipe', apellidos: 'Quintero Lara', doc: '1106789012', nacA: 13, nacM: 5, genero: 'M', ingresoHace: 8, motivo: 'Ingreso directo de la comunidad', barrio: 'Barrio Los Cerros', taller: 'Papel móvil', area: 'PS', profId: 1, planCompletado: false }),
  ben({ nombres: 'Isabella', apellidos: 'Moreno Cabra', doc: '1107890123', nacA: 6, nacM: 3, genero: 'F', ingresoHace: 100, motivo: 'Valoración pedagógica inicial', barrio: 'Barrio La Arboleda', taller: 'Ludoteca', area: 'PD', profId: 3 }),
  ben({ nombres: 'Santiago', apellidos: 'Herrera Mora', doc: '1108901234', nacA: 11, nacM: 9, genero: 'M', ingresoHace: 55, motivo: 'Apoyo escolar multigrado', barrio: 'Barrio Villa Sol', taller: 'Refuerzo escolar', area: 'PD', profId: 3 }),
  ben({ nombres: 'Mariana', apellidos: 'Castro Niño', doc: '1109012345', nacA: 9, nacM: 10, genero: 'F', ingresoHace: 25, motivo: 'Riesgo nutricional detectado en jornada de salud', barrio: 'Barrio El Prado', taller: 'Huerta urbana', area: 'NT', profId: 4, planCompletado: false }),
  ben({ nombres: 'Nicolás', apellidos: 'Padilla Rey', doc: '1110123456', nacA: 14, nacM: 1, genero: 'M', ingresoHace: 70, motivo: 'Acompañamiento psicológico grupal', barrio: 'Barrio Los Almendros', taller: 'Papel móvil', area: 'PS', profId: 1 }),
  ben({ nombres: 'Laura Sofía', apellidos: 'Bernal Truji', doc: '1111234567', nacA: 7, nacM: 2, genero: 'F', ingresoHace: 33, motivo: 'Remisión por docente de aula', barrio: 'Barrio Las Acacias', taller: 'Ludoteca', area: 'PD', profId: 3 }),
  ben({ nombres: 'Samuel', apellidos: 'Ovalle Pinto', doc: '1112345678', tipoDoc: 'PPT', nacA: 10, nacM: 7, genero: 'M', ingresoHace: 5, motivo: 'Familia migrante recién llegada', barrio: 'Barrio Los Cerros', taller: 'Refuerzo escolar', area: 'TS', profId: 2, planCompletado: false }),
];

// ── Egresados (ficticios) ───────────────────────────────────────────────────
const e1 = ben({ nombres: 'Daniela', apellidos: 'Rincón Ballesteros', doc: '1090111222', nacA: 15, nacM: 0, genero: 'F', ingresoHace: 400, motivo: 'Acompañamiento pedagógico', barrio: 'Barrio La Arboleda', taller: 'Refuerzo escolar', area: 'PD', profId: 3 });
const e2 = ben({ nombres: 'Kevin', apellidos: 'Sandoval Ruiz', doc: '1090222333', nacA: 16, nacM: 2, genero: 'M', ingresoHace: 380, motivo: 'Riesgo nutricional', barrio: 'Barrio Villa Sol', taller: 'Huerta urbana', area: 'NT', profId: 4 });
const e3 = ben({ nombres: 'Paula Andrea', apellidos: 'Melo Cifuentes', doc: '1090333444', nacA: 14, nacM: 6, genero: 'F', ingresoHace: 350, motivo: 'Atención psicosocial', barrio: 'Barrio El Prado', taller: 'Papel móvil', area: 'PS', profId: 1 });
for (const [i, e] of [e1, e2, e3].entries()) {
  e.estado = 'EGRESADO';
  e.fechaEgreso = dISO(-(30 + i * 20));
  e.motivoEgreso = ['Cumplimiento del plan de caso', 'Cambio de domicilio', 'Retiro voluntario'][i];
  e.casos[0].estado = 'CERRADO';
  e.casos[0].fechaCierre = e.fechaEgreso;
  for (const a of e.casos[0].asignaciones) a.estado = 'FINALIZADA';
}
export const demoEgresados = [e1, e2, e3];
