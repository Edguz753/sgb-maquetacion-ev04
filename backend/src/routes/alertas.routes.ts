/**
 * Rutas de Alertas — Sprint 6 (línea base V4.1.1).
 * Estados: NUEVA → ASIGNADA → EN_PROCESO → ATENDIDA → CERRADA (y REABIERTA).
 * Escaneo automático bajo demanda (POST /escanear) desde documentos, actividades,
 * controles de salud, nutrición, escolaridad y redes.
 * RBAC: lectura autenticados. Escritura ADMIN/GESTOR/COORDINADOR (todo) y
 * PROFESIONAL (solo alertas donde es responsable). Secretaría solo lectura.
 */
import { Router } from 'express';
import { z } from 'zod';
import { EstadoAlerta, PrioridadActividad, TipoAlerta } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';
import { ejecutarEscaneoAlertas } from '../lib/motor-alertas';

export const alertasRouter = Router();

alertasRouter.use(autenticar);

const ROLES_GESTION = ['ADMIN', 'GESTOR', 'COORDINADOR'];
const ESTADOS = Object.values(EstadoAlerta) as [string, ...string[]];
const TIPOS = Object.values(TipoAlerta) as [string, ...string[]];
const PRIORIDADES = Object.values(PrioridadActividad) as [string, ...string[]];

const actualizarSchema = z.object({
  estado: z.enum(ESTADOS).optional(),
  responsableId: z.number().int().optional().nullable(),
  prioridad: z.enum(PRIORIDADES).optional(),
  fechaLimite: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const crearSchema = z.object({
  beneficiarioId: z.number().int(),
  tipo: z.enum(TIPOS),
  titulo: z.string().min(3).max(200),
  descripcion: z.string().optional().nullable(),
  prioridad: z.enum(PRIORIDADES).optional(),
  fechaLimite: z.string().optional().nullable(),
});

const includeBase = {
  beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } },
  responsableUsuario: { select: { id: true, nombre: true, apellido: true, username: true } },
  documento: { select: { id: true, estado: true, tipoDocumento: { select: { nombre: true } } } },
  actividad: { select: { id: true, fechaProgramada: true, tipoActividad: { select: { nombre: true } } } },
};

/** POST /api/alertas/escanear — ejecuta el motor de alertas */
alertasRouter.post('/escanear', async (req, res) => {
  if (!req.user || !ROLES_GESTION.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no ejecuta el escaneo' });
    return;
  }
  const user = req.user!;
  try {
    const resultado = await ejecutarEscaneoAlertas();
    await prisma.auditoria.create({
      data: {
        usuarioId: user.userId,
        accion: 'ESCANEAR',
        recurso: 'ALERTA',
        valorNuevo: resultado,
        observacion: 'Escaneo del motor de alertas',
      },
    });
    res.json(resultado);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al ejecutar el escaneo de alertas' });
  }
});

/** GET /api/alertas?estado=&tipo=&prioridad=&responsableId=&beneficiarioId=&q= */
alertasRouter.get('/', async (req, res) => {
  try {
    const estado = (req.query.estado as string) || '';
    const tipo = (req.query.tipo as string) || '';
    const prioridad = (req.query.prioridad as string) || '';
    const q = (req.query.q as string)?.trim() || '';
    const responsableId = req.query.responsableId ? parseInt(req.query.responsableId as string, 10) : null;
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;
    const soloMias = req.query.soloMias === 'true';

    const where: any = {};
    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (prioridad) where.prioridad = prioridad;
    if (responsableId) where.responsableId = responsableId;
    if (beneficiarioId) where.beneficiarioId = beneficiarioId;
    if (soloMias && req.user) where.responsableId = req.user.userId;
    if (q) where.titulo = { contains: q, mode: 'insensitive' };

    const items = await prisma.alerta.findMany({ where, include: includeBase, orderBy: [{ prioridad: 'asc' }, { fechaGeneracion: 'desc' }], take: 200 });
    const resumen: Record<string, number> = {};
    for (const a of items) resumen[a.estado] = (resumen[a.estado] ?? 0) + 1;
    res.json({ total: items.length, resumen, alertas: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar alertas' });
  }
});

/** GET /api/alertas/resumen-global — conteos por estado sin filtros (KPIs) */
alertasRouter.get('/resumen-global', async (_req, res) => {
  try {
    const agrupado = await prisma.alerta.groupBy({ by: ['estado'], _count: { _all: true } });
    const porEstado: Record<string, number> = {};
    let total = 0;
    for (const g of agrupado) {
      porEstado[g.estado] = g._count._all;
      total += g._count._all;
    }
    res.json({ total, porEstado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar el resumen de alertas' });
  }
});

/** POST /api/alertas — crea una alerta manual */
alertasRouter.post('/', async (req, res) => {
  if (!req.user || !ROLES_GESTION.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no crea alertas' });
    return;
  }
  const user = req.user!;
  try {
    const body = crearSchema.parse(req.body);
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) {
      res.status(404).json({ error: 'Beneficiario no encontrado' });
      return;
    }
    const creada = await prisma.alerta.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        tipo: body.tipo as TipoAlerta,
        titulo: body.titulo,
        descripcion: body.descripcion ?? null,
        prioridad: (body.prioridad as PrioridadActividad) ?? 'MEDIA',
        estado: 'NUEVA',
        fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : null,
        creadaPor: user.userId,
      },
      include: includeBase,
    });
    res.status(201).json(creada);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al crear alerta' });
  }
});

/** PATCH /api/alertas/:id — transición de estado, asignación y edición */
alertasRouter.patch('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const id = parseInt(req.params.id, 10);
    const alerta = await prisma.alerta.findUnique({ where: { id } });
    if (!alerta) {
      res.status(404).json({ error: 'Alerta no encontrada' });
      return;
    }

    // Autorización: gestión total para ADMIN/GESTOR/COORDINADOR;
    // PROFESIONAL solo si la alerta ya le pertenece o se le va a asignar.
    const esGestion = req.user && ROLES_GESTION.includes(req.user.rol);
    const esSuya = req.user && alerta.responsableId === req.user.userId;
    const seAsignaASiMismo = req.user && req.body?.responsableId === req.user.userId;
    if (!esGestion && !(user.rol === 'PROFESIONAL' && (esSuya || (seAsignaASiMismo && !alerta.responsableId)))) {
      res.status(403).json({ error: 'Prohibido: no puedes modificar esta alerta' });
      return;
    }

    const body = actualizarSchema.parse(req.body);
    const data: any = {};
    if (body.estado) data.estado = body.estado;
    if (body.responsableId !== undefined) data.responsableId = body.responsableId;
    if (body.prioridad) data.prioridad = body.prioridad;
    if (body.fechaLimite !== undefined) data.fechaLimite = body.fechaLimite ? new Date(body.fechaLimite) : null;
    if (body.observaciones !== undefined) data.observaciones = body.observaciones;

    // Efectos de las transiciones
    if (body.estado === 'ASIGNADA' && !data.responsableId && !alerta.responsableId) {
      res.status(400).json({ error: 'Para pasar a ASIGNADA indica un responsable' });
      return;
    }
    if (body.estado === 'ATENDIDA') {
      data.fechaAtencion = new Date();
      if (!data.responsableId && !alerta.responsableId) data.responsableId = user.userId;
    }
    if (body.estado === 'CERRADA') {
      data.fechaCierre = new Date();
      if (!alerta.fechaAtencion && !data.fechaAtencion) data.fechaAtencion = new Date();
    }
    if (body.estado === 'REABIERTA') {
      data.fechaCierre = null;
    }

    const actualizada = await prisma.alerta.update({ where: { id }, data, include: includeBase });
    await prisma.auditoria.create({
      data: {
        usuarioId: user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'ALERTA',
        registroId: id,
        valorNuevo: { estado: actualizada.estado, responsableId: actualizada.responsableId },
        observacion: 'Actualización de alerta',
      },
    });
    res.json(actualizada);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar alerta' });
  }
});

/** GET /api/alertas/:id — detalle */
alertasRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.alerta.findUnique({ where: { id }, include: includeBase });
    if (!item) {
      res.status(404).json({ error: 'Alerta no encontrada' });
      return;
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar alerta' });
  }
});
