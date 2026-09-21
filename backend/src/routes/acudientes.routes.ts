/**
 * Rutas del módulo Familia — acudientes N:M con beneficiarios (ERD reestructurado).
 * POST reutiliza un acudiente existente si coincide el número de documento.
 * Un solo ACUDIENTE PRINCIPAL por beneficiario (se desmarca el previo).
 * RBAC: lectura autenticados; escritura GESTOR, COORDINADOR, SECRETARIA.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { autenticar, ROLES_ESCRITURA_BASE } from '../middleware/auth';

export const acudientesRouter = Router();

acudientesRouter.use(autenticar);

const PARENTEZCOS = ['MADRE', 'PADRE', 'ABUELO/A', 'HERMANO/A', 'TÍO/A', 'ACUDIENTE', 'OTRO'];

acudientesRouter.get('/parentezcos', async (_req, res) => {
  res.json({ parentezcos: PARENTEZCOS });
});

/** GET /api/acudientes?beneficiarioId= — vinculaciones con datos del acudiente */
acudientesRouter.get('/', async (req, res) => {
  try {
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;
    const where: any = {};
    if (beneficiarioId) where.beneficiarioId = beneficiarioId;
    const items = await prisma.beneficiarioAcudiente.findMany({
      where,
      include: { acudiente: true, beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } } },
      orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
    });
    res.json({ total: items.length, vinculaciones: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar acudientes' });
  }
});

/** POST /api/acudientes — crea (o reutiliza) el acudiente y lo vincula */
acudientesRouter.post('/', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona la ficha familiar' });
    return;
  }
  try {
    const body = z.object({
      beneficiarioId: z.number().int(),
      nombres: z.string().min(1).max(150),
      tipoDocumento: z.string().max(30).optional().nullable(),
      numeroDocumento: z.string().max(50).optional().nullable(),
      telefono: z.string().max(30).optional().nullable(),
      direccion: z.string().optional().nullable(),
      correo: z.string().max(255).optional().nullable(),
      ocupacion: z.string().max(120).optional().nullable(),
      parentezco: z.string().min(1).max(50),
      esPrincipal: z.boolean().optional().default(false),
      convive: z.boolean().optional().default(false),
    }).parse(req.body);

    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) return res.status(404).json({ error: 'Beneficiario no encontrado' });

    // Reutilizar acudiente por número de documento (familias: hermanos comparten acudiente)
    let acudiente = body.numeroDocumento
      ? await prisma.acudiente.findFirst({ where: { numeroDocumento: body.numeroDocumento } })
      : null;
    if (!acudiente) {
      acudiente = await prisma.acudiente.create({
        data: {
          nombres: body.nombres,
          tipoDocumento: body.tipoDocumento ?? null,
          numeroDocumento: body.numeroDocumento ?? null,
          telefono: body.telefono ?? null,
          direccion: body.direccion ?? null,
          correo: body.correo ?? null,
          ocupacion: body.ocupacion ?? null,
        },
      });
    }

    const existente = await prisma.beneficiarioAcudiente.findUnique({
      where: { beneficiarioId_acudienteId: { beneficiarioId: body.beneficiarioId, acudienteId: acudiente.id } },
    });
    if (existente) return res.status(409).json({ error: 'El acudiente ya está vinculado a este beneficiario', vinculacion: existente });

    const vinculacion = await prisma.$transaction(async (tx) => {
      if (body.esPrincipal) {
        await tx.beneficiarioAcudiente.updateMany({
          where: { beneficiarioId: body.beneficiarioId, esPrincipal: true },
          data: { esPrincipal: false },
        });
      }
      return tx.beneficiarioAcudiente.create({
        data: {
          beneficiarioId: body.beneficiarioId,
          acudienteId: acudiente.id,
          parentezco: body.parentezco,
          esPrincipal: body.esPrincipal,
          convive: body.convive,
        },
      });
    });

    const completa = await prisma.beneficiarioAcudiente.findUnique({
      where: { id: vinculacion.id },
      include: { acudiente: true },
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'ACUDIENTE',
        registroId: vinculacion.id,
        valorNuevo: { acudienteId: acudiente.id, parentezco: body.parentezco },
        observacion: 'Acudiente vinculado al beneficiario',
      },
    });
    res.status(201).json(completa);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al vincular acudiente' });
  }
});

/** PATCH /api/acudientes/:vinculacionId — actualiza vínculo y datos del acudiente */
acudientesRouter.patch('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona la ficha familiar' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const vinculacion = await prisma.beneficiarioAcudiente.findUnique({ where: { id } });
    if (!vinculacion) return res.status(404).json({ error: 'Vinculación no encontrada' });

    const body = z.object({
      nombres: z.string().min(1).max(150).optional(),
      tipoDocumento: z.string().max(30).optional().nullable(),
      numeroDocumento: z.string().max(50).optional().nullable(),
      telefono: z.string().max(30).optional().nullable(),
      direccion: z.string().optional().nullable(),
      correo: z.string().max(255).optional().nullable(),
      ocupacion: z.string().max(120).optional().nullable(),
      parentezco: z.string().min(1).max(50).optional(),
      esPrincipal: z.boolean().optional(),
      convive: z.boolean().optional(),
      observaciones: z.string().optional().nullable(),
    }).parse(req.body);

    const resultado = await prisma.$transaction(async (tx) => {
      const acudienteData: any = {};
      for (const k of ['nombres', 'tipoDocumento', 'numeroDocumento', 'telefono', 'direccion', 'correo', 'ocupacion'] as const) {
        if (body[k] !== undefined) acudienteData[k] = body[k];
      }
      if (Object.keys(acudienteData).length > 0) {
        await tx.acudiente.update({ where: { id: vinculacion.acudienteId }, data: acudienteData });
      }
      const vincData: any = {};
      if (body.parentezco !== undefined) vincData.parentezco = body.parentezco;
      if (body.convive !== undefined) vincData.convive = body.convive;
      if (body.observaciones !== undefined) vincData.observaciones = body.observaciones;
      if (body.esPrincipal !== undefined) vincData.esPrincipal = body.esPrincipal;
      if (body.esPrincipal) {
        await tx.beneficiarioAcudiente.updateMany({
          where: { beneficiarioId: vinculacion.beneficiarioId, esPrincipal: true, id: { not: id } },
          data: { esPrincipal: false },
        });
      }
      if (Object.keys(vincData).length > 0) {
        await tx.beneficiarioAcudiente.update({ where: { id }, data: vincData });
      }
      return tx.beneficiarioAcudiente.findUnique({ where: { id }, include: { acudiente: true } });
    });

    res.json(resultado);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar acudiente' });
  }
});

/** DELETE /api/acudientes/:vinculacionId — desvincula (borra acudiente si queda sin beneficiarios) */
acudientesRouter.delete('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona la ficha familiar' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const vinculacion = await prisma.beneficiarioAcudiente.findUnique({ where: { id } });
    if (!vinculacion) return res.status(404).json({ error: 'Vinculación no encontrada' });

    await prisma.beneficiarioAcudiente.delete({ where: { id } });
    const restantes = await prisma.beneficiarioAcudiente.count({ where: { acudienteId: vinculacion.acudienteId } });
    if (restantes === 0) {
      await prisma.acudiente.delete({ where: { id: vinculacion.acudienteId } });
      return res.json({ mensaje: 'Vinculación eliminada (acudiente sin vínculos también eliminado)' });
    }
    res.json({ mensaje: 'Vinculación eliminada' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Vinculación no encontrada' });
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar vinculación' });
  }
});
