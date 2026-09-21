/**
 * Rutas de actividades — línea base V4.1.1.
 * Estados: PENDIENTE, REALIZADA, ATRASADA, CANCELADA, NO_APLICA.
 * El estado ATRASADA se calcula si fecha_programada < hoy y no está realizada.
 * Profesional: solo sus asignaciones (alcance ASSIGNED/OWN).
 */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { autenticar } from '../middleware/auth';
import { addDays, addMonths, esDiaHabil, normDate } from '../lib/calendario';

export const actividadesRouter = Router();

actividadesRouter.use(autenticar);

function calcularEstado(fechaProgramada: Date, fechaRealizacion: Date | null, estado: string): string {
  if (fechaRealizacion) return 'REALIZADA';
  if (estado === 'CANCELADA' || estado === 'NO_APLICA') return estado;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fp = new Date(fechaProgramada);
  fp.setHours(0, 0, 0, 0);
  if (fp < hoy) return 'ATRASADA';
  return estado; // PENDIENTE
}

/**
 * POST /api/actividades — crea una actividad MANUAL (el usuario elige tipo y fecha).
 * Requiere asignación activa a la que pertenece la actividad.
 * RBAC: GESTOR/COORDINADOR, o el PROFESIONAL de esa asignación.
 */

const crearActividadSchema = z.object({
  asignacionCasoId: z.number().int(),
  tipoActividadId: z.number().int(),
  fechaProgramada: z.string().min(1),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  observaciones: z.string().optional().nullable(),
});

actividadesRouter.post('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const body = crearActividadSchema.parse(req.body);
    const asignacion = await prisma.asignacionCaso.findUnique({
      where: { id: body.asignacionCasoId },
      include: { caso: { select: { estado: true } } },
    });
    if (!asignacion) return res.status(404).json({ error: 'Asignación no encontrada' });
    if (asignacion.estado !== 'ACTIVA') return res.status(409).json({ error: 'La asignación no está activa' });
    if (asignacion.caso.estado !== 'ACTIVO') return res.status(409).json({ error: 'El caso no está activo' });

    const rol = req.user.rol;
    const esGestion = ['GESTOR', 'COORDINADOR', 'SECRETARIA'].includes(rol);
    const esSuAsignacion = req.user.profesionalId === asignacion.profesionalId;
    if (!esGestion && !esSuAsignacion) {
      return res.status(403).json({ error: 'Prohibido: solo gestión o el profesional asignado' });
    }

    const tipo = await prisma.tipoActividad.findUnique({ where: { id: body.tipoActividadId } });
    if (!tipo || !tipo.activa) return res.status(400).json({ error: 'Tipo de actividad inválido' });

    const creada = await prisma.actividad.create({
      data: {
        asignacionCasoId: body.asignacionCasoId,
        tipoActividadId: tipo.id,
        fechaProgramada: new Date(body.fechaProgramada),
        estado: 'PENDIENTE',
        prioridad: body.prioridad ?? 'MEDIA',
        esEmergente: false,
        observaciones: body.observaciones?.trim() || 'Actividad creada manualmente',
      },
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'ACTIVIDAD',
        registroId: creada.id,
        valorNuevo: { tipo: tipo.nombre, fecha: creada.fechaProgramada },
        observacion: 'Actividad creada manualmente',
      },
    });

    res.status(201).json(creada);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al crear la actividad' });
  }
});

/**
 * GET /api/actividades?estado=ATRASADA&soloAsignadas=true
 * Lista actividades con estado calculado.
 */
actividadesRouter.get('/', async (req, res) => {
  try {
    const estadoFiltro = (req.query.estado as string) || '';
    const soloAsignadas = req.query.soloAsignadas !== 'false';
    const esProfesional = req.user!.rol === 'PROFESIONAL';

    const where: any = {};
    if (esProfesional && soloAsignadas && req.user!.profesionalId) {
      where.asignacionCaso = { profesionalId: req.user!.profesionalId, estado: 'ACTIVA' };
    }

    const items = await prisma.actividad.findMany({
      where,
      orderBy: { fechaProgramada: 'asc' },
      take: 200,
      include: {
        asignacionCaso: {
          include: {
            caso: { include: { beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } } } },
            profesional: { select: { id: true, nombres: true, apellidos: true } },
            area: { select: { codigo: true, nombre: true } },
          },
        },
        tipoActividad: true,
      },
    });

    const conEstado = items.map((a) => ({
      ...a,
      estadoCalculado: calcularEstado(a.fechaProgramada, a.fechaRealizacion, a.estado),
    }));

    const filtradas = estadoFiltro ? conEstado.filter((a) => a.estadoCalculado === estadoFiltro) : conEstado;

    const resumen: Record<string, number> = {};
    for (const a of conEstado) {
      resumen[a.estadoCalculado] = (resumen[a.estadoCalculado] ?? 0) + 1;
    }

    res.json({ total: filtradas.length, resumen, actividades: filtradas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar actividades' });
  }
});

/**
 * PATCH /api/actividades/:id/marcar-realizada
 * Marca actividad como realizada.
 * RBAC V4.1.1: Profesional solo sus propias actividades (alcance OWN);
 * Gestor y Coordinador pueden registrar; Secretaría solo lectura.
 */
actividadesRouter.patch('/:id/marcar-realizada', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const actividad = await prisma.actividad.findUnique({
      where: { id },
      include: { asignacionCaso: true },
    });
    if (!actividad) {
      res.status(404).json({ error: 'Actividad no encontrada' });
      return;
    }

    if (req.user!.rol === 'SECRETARIA') {
      res.status(403).json({ error: 'La secretaría no modifica actividades' });
      return;
    }
    if (req.user!.rol === 'PROFESIONAL') {
      if (!req.user!.profesionalId || actividad.asignacionCaso.profesionalId !== req.user!.profesionalId) {
        res.status(403).json({ error: 'RI-001: solo puede marcar sus propias actividades' });
        return;
      }
    }
    if (req.user!.rol === 'ADMIN') {
      res.status(403).json({ error: 'El administrador no ejecuta actividades de atención' });
      return;
    }

    const actualizada = await prisma.actividad.update({
      where: { id },
      data: { estado: 'REALIZADA', fechaRealizacion: new Date() },
    });
    // Auto-cadena de seguimientos trimestrales (R005/R006): al realizar un
    // seguimiento, se genera el siguiente a +3 meses (corregido a día hábil)
    // mientras el caso del beneficiario siga ACTIVO.
    const tipo = await prisma.tipoActividad.findUnique({ where: { id: actualizada.tipoActividadId } });
    if (tipo && tipo.codigo.startsWith('SEGUIMIENTO_')) {
      const asignacion = await prisma.asignacionCaso.findUnique({
        where: { id: actualizada.asignacionCasoId },
        include: { caso: true },
      });
      if (asignacion && asignacion.caso.estado === 'ACTIVO') {
        let fechaSiguiente = addMonths(normDate(actualizada.fechaRealizacion ?? new Date()), 3);
        while (!(await esDiaHabil(fechaSiguiente))) fechaSiguiente = addDays(fechaSiguiente, -1);
        await prisma.actividad.create({
          data: {
            asignacionCasoId: actualizada.asignacionCasoId,
            tipoActividadId: actualizada.tipoActividadId,
            fechaProgramada: fechaSiguiente,
            estado: 'PENDIENTE',
            prioridad: 'MEDIA',
            esEmergente: false,
            observaciones: 'Generada automáticamente: siguiente seguimiento trimestral (R005/R006)',
          },
        });
      }
    }
    res.json({ mensaje: 'Actividad marcada como realizada', actividad: actualizada });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al marcar actividad' });
  }
});
