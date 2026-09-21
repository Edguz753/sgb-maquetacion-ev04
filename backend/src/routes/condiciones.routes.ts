/**
 * Rutas de Condiciones del beneficiario — Sprint 11 (línea base V4.1.1).
 * Registro de condiciones (riesgo nutricional, enfermedad base, condición particular,
 * necesidad de especialista, seguimiento médico, condición escolar, otro) con fechas
 * de detección/inicio/fin y estado (ACTIVA/RESUELTA/CERRADA).
 * RBAC: lectura autenticados; escritura GESTOR, COORDINADOR, SECRETARIA.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { autenticar, ROLES_ESCRITURA_BASE } from '../middleware/auth';

export const condicionesRouter = Router();

condicionesRouter.use(autenticar);

const ESTADOS = ['ACTIVA', 'RESUELTA', 'CERRADA'];

const crearSchema = z.object({
  beneficiarioId: z.number().int(),
  tipoCondicionId: z.number().int(),
  fechaDeteccion: z.string(),
  fechaInicio: z.string().optional().nullable(),
  estado: z.enum(['ACTIVA', 'RESUELTA', 'CERRADA']).optional().default('ACTIVA'),
  descripcion: z.string().optional().nullable(),
});

const actualizarSchema = z.object({
  estado: z.enum(ESTADOS as [string, ...string[]]).optional(),
  fechaFin: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
});

const includeBase = {
  tipoCondicion: { select: { id: true, nombre: true, categoria: true } },
  beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } },
  registradoPorUsuario: { select: { id: true, nombre: true, apellido: true } },
};

/** GET /api/condiciones/tipos — catálogo de tipos activos */
condicionesRouter.get('/tipos', async (_req, res) => {
  try {
    const tipos = await prisma.tipoCondicion.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } });
    res.json({ total: tipos.length, tipos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar tipos de condición' });
  }
});

/** GET /api/condiciones?beneficiarioId=&estado= */
condicionesRouter.get('/', async (req, res) => {
  try {
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;
    const estadoFiltro = (req.query.estado as string) || '';

    const where: any = {};
    if (beneficiarioId) where.beneficiarioId = beneficiarioId;
    if (estadoFiltro) where.estado = estadoFiltro;

    const items = await prisma.condicion.findMany({ where, include: includeBase, orderBy: { fechaDeteccion: 'desc' }, take: 200 });
    res.json({ total: items.length, condiciones: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar condiciones' });
  }
});

/** POST /api/condiciones — registra una condición */
condicionesRouter.post('/', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no registra condiciones' });
    return;
  }
  try {
    const body = crearSchema.parse(req.body);
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) return res.status(404).json({ error: 'Beneficiario no encontrado' });
    const tipo = await prisma.tipoCondicion.findUnique({ where: { id: body.tipoCondicionId } });
    if (!tipo || !tipo.activa) return res.status(400).json({ error: 'Tipo de condición inválido' });

    const creada = await prisma.condicion.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        tipoCondicionId: body.tipoCondicionId,
        fechaDeteccion: new Date(body.fechaDeteccion),
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null,
        estado: body.estado ?? 'ACTIVA',
        descripcion: body.descripcion ?? null,
        registradoPor: req.user.userId,
      },
      include: includeBase,
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'CONDICION',
        registroId: creada.id,
        valorNuevo: { beneficiarioId: body.beneficiarioId, tipoCondicionId: body.tipoCondicionId },
        observacion: 'Condición registrada en la ficha',
      },
    });
    res.status(201).json(creada);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al registrar la condición' });
  }
});

/** PATCH /api/condiciones/:id — actualiza estado / fechas / descripción */
condicionesRouter.patch('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no modifica condiciones' });
    return;
  }
  try {
    const body = actualizarSchema.parse(req.body);
    const id = parseInt(req.params.id, 10);
    const data: any = {};
    if (body.estado) data.estado = body.estado;
    if (body.fechaFin !== undefined) data.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;
    if (body.descripcion !== undefined) data.descripcion = body.descripcion;

    const actualizada = await prisma.condicion.update({ where: { id }, data, include: includeBase });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'CONDICION',
        registroId: id,
        valorNuevo: { estado: actualizada.estado },
        observacion: 'Actualización de condición',
      },
    });
    res.json(actualizada);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Condición no encontrada' });
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar la condición' });
  }
});

/** DELETE /api/condiciones/:id — elimina la condición */
condicionesRouter.delete('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no elimina condiciones' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.condicion.delete({ where: { id } });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'CONDICION',
        registroId: id,
        observacion: 'Condición eliminada',
      },
    });
    res.json({ mensaje: 'Condición eliminada' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Condición no encontrada' });
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar la condición' });
  }
});