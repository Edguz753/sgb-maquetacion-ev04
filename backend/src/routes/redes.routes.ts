/**
 * Rutas del módulo Redes de Apoyo — Sprint 4 (línea base V4.1.1).
 * RedApoyo: vinculación del beneficiario con instituciones (ICBF, Comisaría de familia,
 * Secretaría de Salud/Educación, EPS, ONG, Juzgado, Otra). Ciclo: IDENTIFICADA ->
 * REMISIONADA -> ACTIVA (o VERIFICACION_PENDIENTE) -> CERRADA.
 * Soportes: adjuntos (SoporteRed) que vinculan un Documento (tipo SOPORTE_RED) con evidencia.
 * RBAC (según seed): escritura GESTOR y PROFESIONAL; lectura el resto de autenticados.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { EstadoRed } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';

export const redesRouter = Router();

redesRouter.use(autenticar);

const ROLES_ESCRITURA = ['GESTOR', 'PROFESIONAL'];

// ── Uploads ───────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `red-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext));
  },
});

// ── Validación ────────────────────────────────────────────────────────
const ESTADOS = Object.values(EstadoRed) as [string, ...string[]];

const crearSchema = z.object({
  beneficiarioId: z.number().int(),
  tipoRedId: z.number().int(),
  profesionalId: z.number().int().optional().nullable(),
  fechaRemision: z.string().optional().nullable(),
  fechaActivacion: z.string().optional().nullable(),
  fechaIngresoRed: z.string().optional().nullable(),
  estado: z.enum(ESTADOS).optional(),
  observaciones: z.string().optional().nullable(),
});

const actualizarSchema = z.object({
  estado: z.enum(ESTADOS).optional(),
  tipoRedId: z.number().int().optional(),
  fechaRemision: z.string().optional().nullable(),
  fechaActivacion: z.string().optional().nullable(),
  fechaIngresoRed: z.string().optional().nullable(),
  fechaCierre: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const includeBase = {
  tipoRed: { select: { id: true, nombre: true, descripcion: true } },
  beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } },
  profesional: { select: { id: true, nombres: true, apellidos: true } },
  soportes: {
    include: { documento: { include: { tipoDocumento: { select: { nombre: true } }, evidencias: { select: { id: true, nombreArchivo: true, rutaReferencia: true }, orderBy: { fechaCarga: 'desc' as const }, take: 1 } } } },
    orderBy: { fechaSoporte: 'desc' as const },
  },
};

/** GET /api/redes?beneficiarioId=&estado=&q= */
redesRouter.get('/', async (req, res) => {
  try {
    const estadoFiltro = (req.query.estado as string) || '';
    const q = (req.query.q as string)?.trim() || '';
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;

    const where: any = {};
    if (estadoFiltro) where.estado = estadoFiltro;
    if (beneficiarioId) where.beneficiarioId = beneficiarioId;
    if (q) {
      where.beneficiario = {
        OR: [
          { nombres: { contains: q, mode: 'insensitive' } },
          { apellidos: { contains: q, mode: 'insensitive' } },
          { numeroHistoria: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const items = await prisma.redApoyo.findMany({ where, include: includeBase, orderBy: { id: 'desc' }, take: 200 });
    const resumen: Record<string, number> = {};
    for (const it of items) resumen[it.estado] = (resumen[it.estado] ?? 0) + 1;
    res.json({ total: items.length, resumen, redes: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar redes de apoyo' });
  }
});

/** GET /api/redes/tipos — catálogo de tipos de red activos */
redesRouter.get('/tipos', async (_req, res) => {
  try {
    const tipos = await prisma.tipoRedApoyo.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } });
    res.json({ total: tipos.length, tipos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar tipos de red' });
  }
});

/** POST /api/redes — identifica/vincula una red de apoyo al beneficiario */
redesRouter.post('/', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona redes de apoyo' });
    return;
  }
  try {
    const body = crearSchema.parse(req.body);
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) {
      res.status(404).json({ error: 'Beneficiario no encontrado' });
      return;
    }
    const tipoRed = await prisma.tipoRedApoyo.findUnique({ where: { id: body.tipoRedId } });
    if (!tipoRed || !tipoRed.activa) {
      res.status(400).json({ error: 'Tipo de red inválido' });
      return;
    }

    let profesionalId: number | null = body.profesionalId ?? null;
    if (req.user.rol === 'PROFESIONAL') {
      profesionalId = req.user.profesionalId;
      if (!profesionalId) {
        res.status(400).json({ error: 'El usuario profesional no tiene perfil de profesional asociado' });
        return;
      }
    }
    if (profesionalId) {
      const prof = await prisma.profesional.findUnique({ where: { id: profesionalId } });
      if (!prof) {
        res.status(400).json({ error: 'Profesional inválido' });
        return;
      }
    }

    const creado = await prisma.redApoyo.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        tipoRedId: body.tipoRedId,
        profesionalId,
        fechaRemision: body.fechaRemision ? new Date(body.fechaRemision) : null,
        fechaActivacion: body.fechaActivacion ? new Date(body.fechaActivacion) : null,
        fechaIngresoRed: body.fechaIngresoRed ? new Date(body.fechaIngresoRed) : null,
        estado: (body.estado as EstadoRed) ?? 'IDENTIFICADA',
        observaciones: body.observaciones ?? null,
      },
      include: includeBase,
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'RED_APOYO',
        registroId: creado.id,
        valorNuevo: { tipoRedId: body.tipoRedId, beneficiarioId: body.beneficiarioId },
        observacion: 'Red de apoyo vinculada al beneficiario',
      },
    });
    res.status(201).json(creado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al registrar red de apoyo' });
  }
});

/** PATCH /api/redes/:id — actualiza estado / fechas; ACTIVA fija activación, CERRADA fija cierre */
redesRouter.patch('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona redes de apoyo' });
    return;
  }
  try {
    const body = actualizarSchema.parse(req.body);
    const id = parseInt(req.params.id, 10);
    const actual = await prisma.redApoyo.findUnique({ where: { id } });
    if (!actual) {
      res.status(404).json({ error: 'Red de apoyo no encontrada' });
      return;
    }

    const data: any = {};
    if (body.estado) data.estado = body.estado;
    if (body.tipoRedId !== undefined) data.tipoRedId = body.tipoRedId;
    if (body.fechaRemision !== undefined) data.fechaRemision = body.fechaRemision ? new Date(body.fechaRemision) : null;
    if (body.fechaIngresoRed !== undefined) data.fechaIngresoRed = body.fechaIngresoRed ? new Date(body.fechaIngresoRed) : null;
    if (body.observaciones !== undefined) data.observaciones = body.observaciones;

    // Fechas automáticas según transición de estado
    if (body.estado === 'ACTIVA' && !actual.fechaActivacion && !body.fechaActivacion) {
      data.fechaActivacion = new Date();
    } else if (body.fechaActivacion !== undefined) {
      data.fechaActivacion = body.fechaActivacion ? new Date(body.fechaActivacion) : null;
    }
    if (body.estado === 'CERRADA' && !body.fechaCierre) {
      data.fechaCierre = new Date();
    } else if (body.estado === 'ACTIVA' && body.fechaCierre === undefined) {
      data.fechaCierre = null; // al reactivar, el cierre previo pierde vigencia
    } else if (body.fechaCierre !== undefined) {
      data.fechaCierre = body.fechaCierre ? new Date(body.fechaCierre) : null;
    }

    const actualizado = await prisma.redApoyo.update({ where: { id }, data, include: includeBase });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'RED_APOYO',
        registroId: id,
        valorNuevo: { estado: actualizado.estado },
        observacion: 'Actualización de red de apoyo',
      },
    });
    res.json(actualizado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Red de apoyo no encontrada' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar red de apoyo' });
  }
});

/** POST /api/redes/:id/soporte — sube adjunto y lo vincula como SoporteRed */
redesRouter.post('/:id/soporte', upload.single('archivo'), async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona soportes de red' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const red = await prisma.redApoyo.findUnique({ where: { id }, include: { tipoRed: true } });
    if (!red) {
      res.status(404).json({ error: 'Red de apoyo no encontrada' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Archivo requerido. Formato permitido: pdf, jpg, jpeg o png (máx 10 MB).' });
      return;
    }

    const tipoSoporte = await prisma.tipoDocumento.findFirst({ where: { codigo: 'SOPORTE_RED' } });
    const documento = await prisma.documento.create({
      data: {
        beneficiarioId: red.beneficiarioId,
        tipoDocumentoId: tipoSoporte?.id ?? 1,
        fechaRecepcion: new Date(),
        estado: 'RECIBIDO',
        observaciones: `Soporte de red: ${red.tipoRed.nombre}`,
      },
    });
    const evidencia = await prisma.evidencia.create({
      data: {
        documentoId: documento.id,
        nombreArchivo: req.file.originalname,
        rutaReferencia: `/uploads/${req.file.filename}`,
        tipoMime: req.file.mimetype,
        cargadoPor: req.user.userId,
        observaciones: (req.body?.observaciones as string) || null,
      },
    });
    const soporte = await prisma.soporteRed.create({
      data: { redApoyoId: id, documentoId: documento.id, observaciones: (req.body?.observaciones as string) || null },
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'SUBIR',
        recurso: 'RED_APOYO',
        registroId: id,
        valorNuevo: { soporteRedId: soporte.id, documentoId: documento.id },
        observacion: 'Soporte cargado a la red de apoyo',
      },
    });

    const actualizado = await prisma.redApoyo.findUnique({ where: { id }, include: includeBase });
    res.status(201).json({ mensaje: 'Soporte cargado y vinculado a la red', soporte, red: actualizado });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al subir soporte de red' });
  }
});

/** GET /api/redes/:id — detalle */
redesRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.redApoyo.findUnique({ where: { id }, include: includeBase });
    if (!item) {
      res.status(404).json({ error: 'Red de apoyo no encontrada' });
      return;
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar red de apoyo' });
  }
});
