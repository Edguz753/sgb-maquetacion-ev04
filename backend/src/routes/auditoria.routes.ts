/**
 * Rutas de Auditoría — Sprint 12 (línea base V4.1.1).
 * Consulta del registro de acciones del sistema (quién hizo qué, cuándo y sobre qué).
 * Solo ADMIN. Filtros por recurso, acción, usuario y rango de fechas.
 */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';

export const auditoriaRouter = Router();

auditoriaRouter.use(autenticar);

/** GET /api/auditoria/resumen — conteos por acción y recurso (KPIs) */
auditoriaRouter.get('/resumen', async (req, res) => {
  if (!req.user || req.user.rol !== 'ADMIN') {
    res.status(403).json({ error: 'Prohibido: solo ADMIN consulta auditoría' });
    return;
  }
  try {
    const [porAccion, porRecurso] = await Promise.all([
      prisma.auditoria.groupBy({ by: ['accion'], _count: { _all: true } }),
      prisma.auditoria.groupBy({ by: ['recurso'], _count: { _all: true } }),
    ]);
    const acciones: Record<string, number> = {};
    for (const a of porAccion) acciones[a.accion] = a._count._all;
    const recursos: Record<string, number> = {};
    for (const r of porRecurso) recursos[r.recurso] = r._count._all;
    res.json({ acciones, recursos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar el resumen de auditoría' });
  }
});

/** GET /api/auditoria?recurso=&accion=&usuarioId=&desde=&hasta=&q= */
auditoriaRouter.get('/', async (req, res) => {
  if (!req.user || req.user.rol !== 'ADMIN') {
    res.status(403).json({ error: 'Prohibido: solo ADMIN consulta auditoría' });
    return;
  }
  try {
    const recurso = (req.query.recurso as string) || '';
    const accion = (req.query.accion as string) || '';
    const usuarioId = req.query.usuarioId ? parseInt(req.query.usuarioId as string, 10) : null;
    const desde = (req.query.desde as string) || '';
    const hasta = (req.query.hasta as string) || '';
    const q = (req.query.q as string)?.trim() || '';

    const where: any = {};
    if (recurso) where.recurso = recurso;
    if (accion) where.accion = accion;
    if (usuarioId) where.usuarioId = usuarioId;
    if (desde || hasta) {
      where.fechaHora = {
        ...(desde ? { gte: new Date(`${desde}T00:00:00`) } : {}),
        ...(hasta ? { lte: new Date(`${hasta}T23:59:59`) } : {}),
      };
    }
    if (q) {
      where.OR = [
        { observacion: { contains: q, mode: 'insensitive' } },
        { recurso: { contains: q, mode: 'insensitive' } },
        { accion: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.auditoria.findMany({
      where,
      include: { usuario: { select: { id: true, username: true, nombre: true, apellido: true } } },
      orderBy: { fechaHora: 'desc' },
      take: 500,
    });
    res.json({
      total: items.length,
      registros: items.map((a) => ({
        id: a.id,
        accion: a.accion,
        recurso: a.recurso,
        registroId: a.registroId,
        fechaHora: a.fechaHora,
        observacion: a.observacion,
        valorNuevo: a.valorNuevo,
        usuario: a.usuario ? { id: a.usuario.id, username: a.usuario.username, nombre: a.usuario.nombre, apellido: a.usuario.apellido } : null,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar auditoría' });
  }
});