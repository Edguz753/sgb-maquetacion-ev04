/**
 * Rutas de casos — línea base V4.1.1.
 * ASIGNACION_CASO conserva el historial de profesionales (RI-003):
 * - Una sola asignación ACTIVA por caso + área (índice único parcial).
 * - Cambiar profesional no modifica actividades existentes (HU-PRO-002 CA-2).
 * - Caso/beneficiario EGRESADO no recibe nuevas actividades (RI-004).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { autenticar, ROLES_ASIGNAR_PROFESIONAL, ROLES_CREAR_CASO } from '../middleware/auth';
import { asegurarProyectoVida } from '../lib/proyecto-vida';

export const casosRouter = Router();

casosRouter.use(autenticar);

const asignarSchema = z.object({
  profesionalId: z.number().int(),
  areaId: z.number().int().optional(),
  motivoCambio: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

/**
 * GET /api/casos/:id — detalle del caso con historial de asignaciones.
 */
casosRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const caso = await prisma.caso.findUnique({
      where: { id },
      include: {
        beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true, numeroDocumento: true } },
        asignaciones: {
          orderBy: { fechaInicio: 'asc' },
          include: { profesional: { select: { id: true, nombres: true, apellidos: true } }, area: { select: { codigo: true, nombre: true } } },
        },
        documentos: { include: { tipoDocumento: true } },
      },
    });
    if (!caso) {
      res.status(404).json({ error: 'Caso no encontrado' });
      return;
    }
    res.json(caso);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar caso' });
  }
});

/**
 * POST /api/casos/:id/profesionales
 * Asigna un profesional al caso (GESTOR, COORDINADOR, SECRETARIA).
 * Conserva historial: la asignación previa pasa a FINALIZADA; se crea una nueva ACTIVA.
 * Si ya existe una ACTIVA para el caso+área, se finaliza y se crea la nueva (cambio de profesional).
 */
casosRouter.post('/:id/profesionales', async (req, res) => {
  if (!req.user || !ROLES_ASIGNAR_PROFESIONAL.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no puede asignar profesionales' });
    return;
  }
  try {
    const body = asignarSchema.parse(req.body);
    const casoId = parseInt(req.params.id, 10);

    const caso = await prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) {
      res.status(404).json({ error: 'Caso no encontrado' });
      return;
    }
    if (caso.estado !== 'ACTIVO') {
      res.status(409).json({ error: 'RI-004: solo casos ACTIVOS admiten asignaciones' });
      return;
    }

    const profesional = await prisma.profesional.findUnique({ where: { id: body.profesionalId } });
    if (!profesional || !profesional.activo) {
      res.status(400).json({ error: 'Profesional no existe o está inactivo' });
      return;
    }

    // Área: la de la asignación activa actual, o la indicada, o el primer área
    let areaId = body.areaId;
    if (!areaId) {
      const activa = await prisma.asignacionCaso.findFirst({ where: { casoId, estado: 'ACTIVA' } });
      areaId = activa?.areaId;
    }
    if (!areaId) {
      const primera = await prisma.area.findFirst({ where: { activa: true }, orderBy: { id: 'asc' } });
      areaId = primera?.id;
    }
    if (!areaId) {
      res.status(400).json({ error: 'No hay áreas configuradas' });
      return;
    }

    const hoy = new Date();
    let pvCount = 0;
    await prisma.$transaction(async (tx) => {
      // Finalizar asignación activa previa para el caso (+área)
      await tx.asignacionCaso.updateMany({
        where: { casoId, areaId, estado: 'ACTIVA' },
        data: { estado: 'FINALIZADA', fechaFin: hoy, motivoCambio: body.motivoCambio ?? 'Cambio de profesional' },
      });
      // Nueva asignación activa
      const nuevaAsignacion = await tx.asignacionCaso.create({
        data: {
          casoId,
          profesionalId: body.profesionalId,
          areaId,
          fechaInicio: hoy,
          observaciones: body.observaciones ?? null,
        },
      });

      // Proyecto de Vida: migra el cronograma del área a la nueva persona, o lo genera si es la primera asignación
      const areaCod = (await tx.area.findUnique({ where: { id: areaId } }))?.codigo ?? '';
      const casoConIngreso = await tx.caso.findUnique({ where: { id: casoId }, select: { beneficiario: { select: { fechaIngreso: true } } } });
      pvCount = await asegurarProyectoVida(tx, {
        casoId,
        nuevaAsignacionId: nuevaAsignacion.id,
        areaId,
        areaCodigo: areaCod,
        fechaIngreso: casoConIngreso?.beneficiario.fechaIngreso ?? hoy,
      });
      // Auditoría
      await tx.auditoria.create({
        data: {
          usuarioId: req.user!.userId,
          accion: 'ASIGNAR',
          recurso: 'ASIGNACION_CASO',
          registroId: casoId,
          valorNuevo: { profesionalId: body.profesionalId, areaId },
          observacion: body.motivoCambio ?? 'Asignación de profesional',
        },
      });
    });

    res.json({ mensaje: 'Profesional asignado al caso (historial conservado)', proyectoVida: pvCount });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al asignar profesional' });
  }
});

/**
 * POST /api/casos/:id/cerrar — cierre/egreso del caso (GESTOR, COORDINADOR).
 * Conserva el histórico (RI-004, RI-008).
 */
casosRouter.post('/:id/cerrar', async (req, res) => {
  if (!req.user || !ROLES_CREAR_CASO.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no puede cerrar casos' });
    return;
  }
  try {
    const casoId = parseInt(req.params.id, 10);
    const motivo = (req.body?.motivoEgreso as string) || 'Sin especificar';
    const hoy = new Date();

    const caso = await prisma.$transaction(async (tx) => {
      const c = await tx.caso.update({
        where: { id: casoId },
        data: { estado: 'CERRADO', fechaCierre: hoy, observaciones: motivo },
      });
      // Finalizar asignaciones activas y marcar beneficiario como egresado
      await tx.asignacionCaso.updateMany({
        where: { casoId, estado: 'ACTIVA' },
        data: { estado: 'FINALIZADA', fechaFin: hoy, motivoCambio: 'Cierre de caso' },
      });
      await tx.beneficiario.update({
        where: { id: c.beneficiarioId },
        data: { estado: 'EGRESADO', fechaEgreso: hoy, motivoEgreso: motivo },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: req.user!.userId,
          accion: 'CERRAR',
          recurso: 'CASO',
          registroId: casoId,
          valorNuevo: { estado: 'CERRADO' },
          observacion: 'Cierre de caso y egreso del beneficiario',
        },
      });
      return c;
    });

    res.json({ mensaje: 'Caso cerrado y beneficiario egresado', caso });
  } catch (e: any) {
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Caso no encontrado' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al cerrar caso' });
  }
});
