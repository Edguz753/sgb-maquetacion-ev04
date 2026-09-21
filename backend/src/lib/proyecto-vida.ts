/**
 * Proyecto de Vida — cronogramas por área desde la fecha de ingreso del beneficiario
 * (hoja "Proyecto de Vida" del histórico Excel del club):
 *   Psicología:      ingreso +1 mes, seguimientos +7 y +13 meses
 *   Trabajo Social:  ingreso +4 meses, seguimientos +10 y +15 meses
 *   Pedagogía:       ingreso +6 meses, seguimientos +12 y +17 meses
 * Se generan al asignar un profesional de esa área al caso. Si cambia la persona,
 * el cronograma MIGRA a la nueva asignación (el taller/área persiste, la persona cambia).
 */
import { Prisma, EstadoActividad } from '@prisma/client';
import { addMonths } from './calendario';

type Tx = Prisma.TransactionClient;

const CRONOGRAMAS: Record<string, Array<{ codigo: string; meses: number }>> = {
  PS: [
    { codigo: 'PV_PS_1', meses: 1 },
    { codigo: 'PV_PS_7', meses: 7 },
    { codigo: 'PV_PS_13', meses: 13 },
  ],
  TS: [
    { codigo: 'PV_TS_4', meses: 4 },
    { codigo: 'PV_TS_10', meses: 10 },
    { codigo: 'PV_TS_15', meses: 15 },
  ],
  PD: [
    { codigo: 'PV_PD_6', meses: 6 },
    { codigo: 'PV_PD_12', meses: 12 },
    { codigo: 'PV_PD_17', meses: 17 },
  ],
};

/**
 * Genera (o migra) las actividades de Proyecto de Vida para la asignación indicada.
 * - Si el caso ya tenía actividades PV del mismo área en asignaciones previas, las
 *   MIGRA a la nueva asignación (no se duplican: el cronograma sobrevive al cambio de persona).
 * - Si no existían, las crea con fechas desde la fecha de ingreso del beneficiario.
 * Devuelve cuántas actividades quedaron activas para la asignación.
 */
export async function asegurarProyectoVida(
  tx: Tx,
  params: { casoId: number; nuevaAsignacionId: number; areaId: number; areaCodigo: string; fechaIngreso: Date | string },
): Promise<number> {
  const cronograma = CRONOGRAMAS[params.areaCodigo];
  if (!cronograma) return 0;

  const tipos = await tx.tipoActividad.findMany({
    where: { codigo: { in: cronograma.map((c) => c.codigo) }, activa: true },
  });
  if (tipos.length === 0) return 0;
  const tipoPorCodigo = new Map(tipos.map((t) => [t.codigo, t]));

  // Actividades PV previas del caso en este área (asignaciones finalizadas)
  const previas = await tx.actividad.findMany({
    where: {
      asignacionCaso: { casoId: params.casoId, areaId: params.areaId },
      tipoActividadId: { in: tipos.map((t) => t.id) },
    },
    select: { id: true, asignacionCasoId: true },
  });

  const previasOtras = previas.filter((a) => a.asignacionCasoId !== params.nuevaAsignacionId);
  if (previasOtras.length > 0) {
    // Migrar cronograma existente a la nueva asignación (cambio de persona)
    await tx.actividad.updateMany({
      where: { id: { in: previasOtras.map((a) => a.id) } },
      data: { asignacionCasoId: params.nuevaAsignacionId },
    });
    return previasOtras.length;
  }

  // No existían: generar por primera vez
  const fechaIngreso = new Date(params.fechaIngreso);
  let creadas = 0;
  for (const paso of cronograma) {
    const tipo = tipoPorCodigo.get(paso.codigo);
    if (!tipo) continue;
    await tx.actividad.create({
      data: {
        asignacionCasoId: params.nuevaAsignacionId,
        tipoActividadId: tipo.id,
        fechaProgramada: addMonths(fechaIngreso, paso.meses),
        estado: EstadoActividad.PENDIENTE,
        prioridad: 'MEDIA',
        esEmergente: false,
        observaciones: 'Proyecto de vida: generada al asignar el área (cronograma desde el ingreso)',
      },
    });
    creadas++;
  }
  return creadas;
}
