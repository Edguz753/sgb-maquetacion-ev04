/**
 * Motor de planificación SGB — línea base V4.1.1.
 * Al registrar beneficiario + caso + asignación, genera actividades iniciales
 * según las reglas del motor (tabla `regla`, codigos R001-R004):
 *  - VALORACION_PRELIMINAR: 5 días hábiles desde ingreso
 *  - VALORACION_INTEGRADORA: 15 días hábiles
 *  - ANALISIS_CASO: 20 días hábiles
 *  - PLAN_CASO: 30 días hábiles
 * Además genera documentos iniciales obligatorios según la edad
 * (registro civil <7, tarjeta de identidad >=7, cédula acudiente, recibo, afiliación).
 */
import { Prisma, EstadoActividad, EstadoDocumento, PrioridadActividad } from '@prisma/client';
import { prisma } from './prisma';
import { addDays, addMonths, esDiaHabil, fechaObjetivoNaturales, normDate } from './calendario';

type Tx = Prisma.TransactionClient;

export interface PlanificacionInput {
  beneficiarioId: number;
  casoId: number;
  asignacionCasoId: number;
  fechaIngreso: Date | string;
  fechaNacimiento: Date | string;
}

export async function generarActividadesIniciales(input: PlanificacionInput, tx: Tx = prisma) {
  const fechaIngreso = normDate(input.fechaIngreso);
  const actividades: Array<{ codigo: string; nombre: string; fechaProgramada: Date; prioridad: PrioridadActividad }> = [];

  // Reglas FECHA de días hábiles desde ingreso (R001-R004)
  const reglas = await tx.regla.findMany({
    where: { activa: true, tipo: 'FECHA' },
    orderBy: { prioridad: 'asc' },
  });
  const tipos = await tx.tipoActividad.findMany({ where: { activa: true } });
  const tipoPorCodigo = new Map(tipos.map((t) => [t.codigo, t]));

  for (const regla of reglas) {
    const m = regla.condicion.match(/dias_(?:habiles|naturales)_desde_ingreso\s*=\s*(\d+)/i);
    if (!m) continue;
    const dias = parseInt(m[1], 10);
    const accion = regla.accion.split(':');
    if (accion[0] !== 'GENERAR_ACTIVIDAD') continue;
    const codigoTipo = accion[1];
    const tipo = tipoPorCodigo.get(codigoTipo);
    if (!tipo) continue;
    const fechaProgramada = await fechaObjetivoNaturales(fechaIngreso, dias);
    actividades.push({ codigo: codigoTipo, nombre: tipo.nombre, fechaProgramada, prioridad: prioridadPorDias(dias) });
  }

  const creadas = [];
  for (const act of actividades) {
    const tipo = tipoPorCodigo.get(act.codigo)!;
    const creada = await tx.actividad.create({
      data: {
        asignacionCasoId: input.asignacionCasoId,
        tipoActividadId: tipo.id,
        fechaProgramada: act.fechaProgramada,
        estado: EstadoActividad.PENDIENTE,
        prioridad: act.prioridad,
        esEmergente: false,
        observaciones: `Generada por regla de planificación (días hábiles desde ingreso)`,
      },
    });
    creadas.push(creada);
  }

  // ── Seguimientos trimestrales (R005/R006): +3 meses del análisis de caso y del plan de caso ──
    // La fecha base es la fecha programada del análisis/plan; si el resultado cae en
    // fin de semana o festivo, se retrocede al día hábil anterior (ej: 25-dic -> 24-dic).
    const tipoSegAnalisis = tipoPorCodigo.get('SEGUIMIENTO_ANALISIS_CASO');
    const tipoSegPlan = tipoPorCodigo.get('SEGUIMIENTO_PLAN_CASO');
    const creadaAnalisis = creadas.find((a) => a.tipoActividadId === tipoPorCodigo.get('ANALISIS_CASO')?.id);
    const creadaPlan = creadas.find((a) => a.tipoActividadId === tipoPorCodigo.get('PLAN_CASO')?.id);
  
    async function fechaSeguimientoTrimestral(base: Date): Promise<Date> {
      let fecha = addMonths(normDate(base), 3);
      while (!(await esDiaHabil(fecha))) fecha = addDays(fecha, -1);
      return fecha;
    }
  
    if (creadaAnalisis && tipoSegAnalisis) {
      const fechaSeg = await fechaSeguimientoTrimestral(creadaAnalisis.fechaProgramada);
      creadas.push(
        await tx.actividad.create({
          data: {
            asignacionCasoId: input.asignacionCasoId,
            tipoActividadId: tipoSegAnalisis.id,
            fechaProgramada: fechaSeg,
            estado: EstadoActividad.PENDIENTE,
            prioridad: 'MEDIA',
            esEmergente: false,
            observaciones: 'Generada por regla R005: seguimiento trimestral del análisis de caso',
          },
        }),
      );
    }
    if (creadaPlan && tipoSegPlan) {
      const fechaSeg = await fechaSeguimientoTrimestral(creadaPlan.fechaProgramada);
      creadas.push(
        await tx.actividad.create({
          data: {
            asignacionCasoId: input.asignacionCasoId,
            tipoActividadId: tipoSegPlan.id,
            fechaProgramada: fechaSeg,
            estado: EstadoActividad.PENDIENTE,
            prioridad: 'MEDIA',
            esEmergente: false,
            observaciones: 'Generada por regla R006: seguimiento trimestral del plan de caso',
          },
        }),
      );
    }

    // Documentos iniciales obligatorios según edad (V4.1.1)
  const edad = calcularEdad(input.fechaNacimiento, fechaIngreso);
  const docsIniciales: string[] = [];
  // Registro civil: siempre obligatorio (todas las edades)
  docsIniciales.push('REGISTRO_CIVIL');
  // Tarjeta de identidad: obligatoria solo desde los 7 años
  if (edad >= 7) docsIniciales.push('TARJETA_IDENTIDAD');
  docsIniciales.push('CEDULA_ACUDIENTE', 'RECIBO_SERVICIO', 'CERTIFICADO_AFILIACION', 'AUTORIZACION_DATOS');

  const tiposDoc = await tx.tipoDocumento.findMany({ where: { activa: true } });
  const tipoDocPorCodigo = new Map(tiposDoc.map((t) => [t.codigo, t]));

  for (const codigo of docsIniciales) {
    const tipo = tipoDocPorCodigo.get(codigo);
    if (!tipo) continue;
    await tx.documento.create({
      data: {
        beneficiarioId: input.beneficiarioId,
        casoId: input.casoId,
        tipoDocumentoId: tipo.id,
        estado: EstadoDocumento.PENDIENTE,
        observaciones: `Documento inicial obligatorio (edad calculada: ${edad} años)`,
      },
    });
  }

  return { actividades: creadas, documentosGenerados: docsIniciales.length, edad };
}

function prioridadPorDias(dias: number): PrioridadActividad {
  if (dias <= 5) return 'ALTA';
  if (dias <= 15) return 'ALTA';
  if (dias <= 20) return 'MEDIA';
  return 'MEDIA';
}

export function calcularEdad(fechaNacimiento: Date | string, fechaRef: Date | string): number {
  const nac = normDate(fechaNacimiento);
  const ref = normDate(fechaRef);
  let edad = ref.getFullYear() - nac.getFullYear();
  const m = ref.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) edad -= 1;
  return edad;
}

/** Evalúa condiciones simples de edad tipo "edad < 7", "edad >= 18". */
export function evaluarCondicionEdad(condicion: string, edad: number): boolean {
  const m = condicion.match(/edad\s*(<=|>=|<|>|==|!=)\s*(\d+)/i);
  if (!m) return false;
  const op = m[1];
  const valor = parseInt(m[2], 10);
  switch (op) {
    case '<': return edad < valor;
    case '<=': return edad <= valor;
    case '>': return edad > valor;
    case '>=': return edad >= valor;
    case '==': return edad === valor;
    case '!=': return edad !== valor;
    default: return false;
  }
}
