/**
 * Rutas de Escolaridad — Sprint 5 reestructurado sobre el ERD:
 * matrículas históricas (colegio_beneficiario) con colegio, estado escolar,
 * jornada, grado, fechas y flag "actual". Los registros se conservan como historial.
 * RBAC: escritura GESTOR y PROFESIONAL; lectura autenticados.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';

export const escolaridadRouter = Router();

escolaridadRouter.use(autenticar);

const ROLES_ESCRITURA = ['GESTOR', 'PROFESIONAL'];

const includeBase = {
  colegio: { select: { id: true, nombre: true, localidad: true, sede: true } },
  estadoEscolar: { select: { id: true, nombre: true, descripcion: true } },
  beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } },
};

/** GET /api/escolaridad/matriculas?beneficiarioId=&estadoEscolarId=&q= */
escolaridadRouter.get('/matriculas', async (req, res) => {
  try {
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;
    const estadoEscolarId = req.query.estadoEscolarId ? parseInt(req.query.estadoEscolarId as string, 10) : null;
    const q = (req.query.q as string)?.trim() || '';

    const where: any = {};
    if (beneficiarioId) where.beneficiarioId = beneficiarioId;
    if (estadoEscolarId) where.estadoEscolarId = estadoEscolarId;
    if (q) {
      where.beneficiario = {
        OR: [
          { nombres: { contains: q, mode: 'insensitive' } },
          { apellidos: { contains: q, mode: 'insensitive' } },
          { numeroHistoria: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const items = await prisma.colegioBeneficiario.findMany({ where, include: includeBase, orderBy: [{ actual: 'desc' }, { fechaInicio: 'desc' }], take: 200 });
    const resumen: Record<string, number> = {};
    for (const it of items) {
      const key = it.estadoEscolar.nombre;
      resumen[key] = (resumen[key] ?? 0) + 1;
    }
    res.json({ total: items.length, resumen, matriculas: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar matrículas' });
  }
});

/** POST /api/escolaridad/matriculas — registra matrícula; actual=true desmarca las demás */
escolaridadRouter.post('/matriculas', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no registra matrículas' });
    return;
  }
  try {
    const body = z.object({
      beneficiarioId: z.number().int(),
      colegioId: z.number().int().optional().nullable(),
      estadoEscolarId: z.number().int(),
      jornada: z.string().max(50).optional().nullable(),
      grado: z.string().max(50).optional().nullable(),
      fechaInicio: z.string(),
      fechaFin: z.string().optional().nullable(),
      actual: z.boolean().optional().default(false),
      observaciones: z.string().optional().nullable(),
    }).parse(req.body);

    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) return res.status(404).json({ error: 'Beneficiario no encontrado' });
    const estado = await prisma.estadoEscolar.findUnique({ where: { id: body.estadoEscolarId } });
    if (!estado) return res.status(400).json({ error: 'Estado escolar inválido' });
    if (body.colegioId) {
      const colegio = await prisma.colegio.findUnique({ where: { id: body.colegioId } });
      if (!colegio) return res.status(400).json({ error: 'Colegio inválido' });
    }

    const creada = await prisma.$transaction(async (tx) => {
      if (body.actual) {
        await tx.colegioBeneficiario.updateMany({
          where: { beneficiarioId: body.beneficiarioId, actual: true },
          data: { actual: false, fechaFin: new Date() },
        });
      }
      return tx.colegioBeneficiario.create({
        data: {
          beneficiarioId: body.beneficiarioId,
          colegioId: body.colegioId ?? null,
          estadoEscolarId: body.estadoEscolarId,
          jornada: body.jornada ?? null,
          grado: body.grado ?? null,
          fechaInicio: new Date(body.fechaInicio),
          fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
          actual: body.actual ?? false,
          observaciones: body.observaciones ?? null,
        },
        include: includeBase,
      });
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'ESCOLARIZACION',
        registroId: creada.id,
        valorNuevo: { beneficiarioId: body.beneficiarioId, colegioId: body.colegioId },
        observacion: 'Matrícula escolar registrada',
      },
    });
    res.status(201).json(creada);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al registrar matrícula' });
  }
});

/** PATCH /api/escolaridad/matriculas/:id */
escolaridadRouter.patch('/matriculas/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no modifica matrículas' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const actual = await prisma.colegioBeneficiario.findUnique({ where: { id } });
    if (!actual) return res.status(404).json({ error: 'Matrícula no encontrada' });

    const body = z.object({
      colegioId: z.number().int().optional().nullable(),
      estadoEscolarId: z.number().int().optional(),
      jornada: z.string().max(50).optional().nullable(),
      grado: z.string().max(50).optional().nullable(),
      fechaInicio: z.string().optional(),
      fechaFin: z.string().optional().nullable(),
      actual: z.boolean().optional(),
      observaciones: z.string().optional().nullable(),
    }).parse(req.body);

    const data: any = {};
    if (body.colegioId !== undefined) data.colegioId = body.colegioId;
    if (body.estadoEscolarId) data.estadoEscolarId = body.estadoEscolarId;
    if (body.jornada !== undefined) data.jornada = body.jornada;
    if (body.grado !== undefined) data.grado = body.grado;
    if (body.fechaInicio !== undefined) data.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
    if (body.fechaFin !== undefined) data.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;
    if (body.observaciones !== undefined) data.observaciones = body.observaciones;

    if (body.actual === true) {
      await prisma.colegioBeneficiario.updateMany({
        where: { beneficiarioId: actual.beneficiarioId, actual: true, id: { not: id } },
        data: { actual: false, fechaFin: new Date() },
      });
      data.actual = true;
      if (!data.fechaFin) data.fechaFin = null;
    } else if (body.actual === false) {
      data.actual = false;
    }

    const actualizada = await prisma.colegioBeneficiario.update({ where: { id }, data, include: includeBase });
    res.json(actualizada);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Matrícula no encontrada' });
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar matrícula' });
  }
});

/** GET /api/escolaridad/compat?beneficiarioId= — compat: listado plano estilo anterior */
escolaridadRouter.get('/compat', async (req, res) => {
  try {
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;
    const where: any = {};
    if (beneficiarioId) where.beneficiarioId = beneficiarioId;
    const items = await prisma.colegioBeneficiario.findMany({ where, include: includeBase, orderBy: [{ fechaInicio: 'desc' }] });
    res.json({
      total: items.length,
      registros: items.map((it) => ({
        id: it.id,
        institucion: it.colegio?.nombre ?? null,
        grado: it.grado,
        jornada: it.jornada,
        estadoEscolar: it.estadoEscolar.nombre,
        periodo: it.fechaInicio.toISOString().slice(0, 7),
        fechaRegistro: it.fechaInicio,
        observaciones: it.observaciones,
        beneficiario: it.beneficiario,
        profesional: null,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar escolaridad' });
  }
});
