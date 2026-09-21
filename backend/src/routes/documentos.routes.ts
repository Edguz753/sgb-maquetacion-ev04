/**
 * Rutas del módulo Archivo Documental — Sprint 1 (línea base V4.1.1).
 * Ciclo de vida del documento: PENDIENTE -> RECIBIDO -> VIGENTE (o VENCIDO / FALTANTE / NO_APLICA).
 * Evidencias: adjuntos (pdf/jpg/png) vinculados al documento; al subir la primera evidencia,
 * el documento pasa automáticamente a RECIBIDO con fecha de recepción.
 * RBAC: lectura para todo usuario autenticado; escritura GESTOR, COORDINADOR, SECRETARIA.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { EstadoDocumento } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { autenticar, ROLES_ESCRITURA_BASE } from '../middleware/auth';

export const documentosRouter = Router();

documentosRouter.use(autenticar);

// ── Uploads de evidencias ─────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext);
    cb(null, ok); // multer omite el archivo si el formato no es permitido
  },
});

// ── Validación ────────────────────────────────────────────────────────
const ESTADOS = Object.values(EstadoDocumento) as [string, ...string[]];

const crearSchema = z.object({
  tipoDocumentoId: z.number().int(),
  beneficiarioId: z.number().int(),
  casoId: z.number().int().optional().nullable(),
  fechaDocumento: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const actualizarSchema = z.object({
  estado: z.enum(ESTADOS).optional(),
  fechaDocumento: z.string().optional().nullable(),
  fechaRecepcion: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const includeBase = {
  tipoDocumento: { select: { id: true, codigo: true, nombre: true, categoria: true } },
  beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true, numeroDocumento: true } },
  caso: { select: { id: true, numeroCaso: true, estado: true } },
  evidencias: {
    select: { id: true, nombreArchivo: true, rutaReferencia: true, tipoMime: true, fechaCarga: true, observaciones: true },
    orderBy: { fechaCarga: 'desc' as const },
  },
};

/** GET /api/documentos?estado=&q=&beneficiarioId= — listado con filtros */
documentosRouter.get('/', async (req, res) => {
  try {
    const estado = (req.query.estado as string) || '';
    const q = (req.query.q as string)?.trim() || '';
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;

    const where: any = {};
    if (estado) where.estado = estado;
    if (beneficiarioId) where.beneficiarioId = beneficiarioId;
    if (q) {
      where.beneficiario = {
        OR: [
          { nombres: { contains: q, mode: 'insensitive' } },
          { apellidos: { contains: q, mode: 'insensitive' } },
          { numeroHistoria: { contains: q, mode: 'insensitive' } },
          { numeroDocumento: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const items = await prisma.documento.findMany({ where, include: includeBase, orderBy: { createdAt: 'desc' }, take: 200 });
    // Exportación CSV (Excel) del listado
    if ((req.query.formato as string)?.toLowerCase() === 'csv') {
      const cab = ['Documento', 'Tipo', 'Estado', 'Beneficiario', 'Historia', 'Caso', 'Fecha documento', 'Recepción', 'Vencimiento', 'Evidencias'];
      const esc = (v: unknown) => `"${v === null || v === undefined ? '' : String(v).replace(/"/g, '""')}"`;
      const lineas = [cab.map(esc).join(';')];
      for (const it of items) {
        lineas.push([
          `Doc #${it.id}`,
          it.tipoDocumento.nombre,
          it.estado,
          `${it.beneficiario.nombres} ${it.beneficiario.apellidos}`,
          it.beneficiario.numeroHistoria,
          it.caso?.numeroCaso ?? '',
          it.fechaDocumento ? new Date(it.fechaDocumento).toISOString().slice(0, 10) : '',
          it.fechaRecepcion ? new Date(it.fechaRecepcion).toISOString().slice(0, 10) : '',
          it.fechaVencimiento ? new Date(it.fechaVencimiento).toISOString().slice(0, 10) : '',
          it.evidencias.length,
        ].map(esc).join(';'));
      }
      const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="documentos-${fecha}.csv"`);
      res.send('\ufeff' + lineas.join('\r\n'));
      return;
    }

    res.json({ total: items.length, documentos: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar documentos' });
  }
});

/** GET /api/documentos/resumen — conteos por estado (KPIs del archivo) */
documentosRouter.get('/resumen', async (_req, res) => {
  try {
    const agrupado = await prisma.documento.groupBy({ by: ['estado'], _count: { _all: true } });
    const porEstado: Record<string, number> = {};
    let total = 0;
    for (const g of agrupado) {
      porEstado[g.estado] = g._count._all;
      total += g._count._all;
    }
    res.json({ total, porEstado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar el resumen documental' });
  }
});

/** GET /api/documentos/tipos — catálogo de tipos de documento activos */
documentosRouter.get('/tipos', async (_req, res) => {
  try {
    const tipos = await prisma.tipoDocumento.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } });
    res.json({ total: tipos.length, tipos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar tipos de documento' });
  }
});

/** POST /api/documentos — registro manual de un documento requerido */
documentosRouter.post('/', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona documentos' });
    return;
  }
  try {
    const body = crearSchema.parse(req.body);
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) {
      res.status(404).json({ error: 'Beneficiario no encontrado' });
      return;
    }
    const tipo = await prisma.tipoDocumento.findUnique({ where: { id: body.tipoDocumentoId } });
    if (!tipo || !tipo.activa) {
      res.status(400).json({ error: 'Tipo de documento inválido' });
      return;
    }
    const creado = await prisma.documento.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        casoId: body.casoId ?? null,
        tipoDocumentoId: body.tipoDocumentoId,
        fechaDocumento: body.fechaDocumento ? new Date(body.fechaDocumento) : null,
        fechaVencimiento: body.fechaVencimiento ? new Date(body.fechaVencimiento) : null,
        estado: 'PENDIENTE',
        observaciones: body.observaciones ?? 'Registro manual de documento requerido',
      },
      include: includeBase,
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'DOCUMENTO',
        registroId: creado.id,
        valorNuevo: { tipoDocumentoId: body.tipoDocumentoId, beneficiarioId: body.beneficiarioId },
        observacion: 'Registro manual de documento en el archivo documental',
      },
    });
    res.status(201).json(creado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al registrar documento' });
  }
});

/** PATCH /api/documentos/:id — actualiza estado / fechas / observaciones */
documentosRouter.patch('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona documentos' });
    return;
  }
  try {
    const body = actualizarSchema.parse(req.body);
    const id = parseInt(req.params.id, 10);
    const data: any = {};
    if (body.estado) data.estado = body.estado;
    if (body.fechaDocumento !== undefined) data.fechaDocumento = body.fechaDocumento ? new Date(body.fechaDocumento) : null;
    if (body.fechaRecepcion !== undefined) data.fechaRecepcion = body.fechaRecepcion ? new Date(body.fechaRecepcion) : null;
    if (body.fechaVencimiento !== undefined) data.fechaVencimiento = body.fechaVencimiento ? new Date(body.fechaVencimiento) : null;
    if (body.observaciones !== undefined) data.observaciones = body.observaciones;

    const actualizado = await prisma.documento.update({ where: { id }, data, include: includeBase });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'DOCUMENTO',
        registroId: id,
        valorNuevo: data,
        observacion: 'Actualización del estado documental',
      },
    });
    res.json(actualizado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Documento no encontrado' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar documento' });
  }
});

/** POST /api/documentos/:id/evidencia — sube adjunto; marca RECIBIDO si estaba PENDIENTE */
documentosRouter.post('/:id/evidencia', upload.single('archivo'), async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona documentos' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const documento = await prisma.documento.findUnique({ where: { id } });
    if (!documento) {
      res.status(404).json({ error: 'Documento no encontrado' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Archivo requerido. Formato permitido: pdf, jpg, jpeg o png (máx 10 MB).' });
      return;
    }

    const evidencia = await prisma.evidencia.create({
      data: {
        documentoId: id,
        nombreArchivo: req.file.originalname,
        rutaReferencia: `/uploads/${req.file.filename}`,
        tipoMime: req.file.mimetype,
        cargadoPor: req.user.userId,
        observaciones: (req.body?.observaciones as string) || null,
      },
    });

    let documentoActualizado = documento;
    if (documento.estado === 'PENDIENTE') {
      documentoActualizado = await prisma.documento.update({
        where: { id },
        data: { estado: 'RECIBIDO', fechaRecepcion: new Date() },
      });
    }

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'SUBIR',
        recurso: 'EVIDENCIA',
        registroId: evidencia.id,
        valorNuevo: { documentoId: id, nombreArchivo: evidencia.nombreArchivo },
        observacion: 'Evidencia cargada al archivo documental',
      },
    });

    res.status(201).json({
      mensaje: documentoActualizado.estado === 'RECIBIDO' ? 'Evidencia cargada y documento marcado como RECIBIDO' : 'Evidencia cargada',
      evidencia,
      documento: { id: documentoActualizado.id, estado: documentoActualizado.estado, fechaRecepcion: documentoActualizado.fechaRecepcion },
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al subir evidencia' });
  }
});

/** GET /api/documentos/:id — detalle con evidencias */
documentosRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.documento.findUnique({ where: { id }, include: includeBase });
    if (!item) {
      res.status(404).json({ error: 'Documento no encontrado' });
      return;
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar documento' });
  }
});

/** DELETE /api/documentos/evidencias/:evidenciaId — elimina un archivo adjunto */
documentosRouter.delete('/evidencias/:evidenciaId', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona documentos' });
    return;
  }
  try {
    const evidenciaId = parseInt(req.params.evidenciaId, 10);
    const evidencia = await prisma.evidencia.findUnique({
      where: { id: evidenciaId },
      include: { documento: true },
    });

    if (!evidencia) {
      res.status(404).json({ error: 'Evidencia no encontrada' });
      return;
    }

    // Borrar registro en BD
    await prisma.evidencia.delete({ where: { id: evidenciaId } });

    // Borrar archivo de disco
    if (evidencia.rutaReferencia) {
      const nombreLimpio = evidencia.rutaReferencia.replace('/uploads/', '');
      const archivoDisco = path.join(UPLOADS_DIR, nombreLimpio);
      if (fs.existsSync(archivoDisco)) {
        try { fs.unlinkSync(archivoDisco); } catch (e) { console.warn(e); }
      }
    }

    // Si el documento ya no tiene evidencias y estaba RECIBIDO, volver a PENDIENTE
    if (evidencia.documentoId) {
      const restantes = await prisma.evidencia.count({ where: { documentoId: evidencia.documentoId } });
      if (restantes === 0 && evidencia.documento?.estado === 'RECIBIDO') {
        await prisma.documento.update({
          where: { id: evidencia.documentoId },
          data: { estado: 'PENDIENTE', fechaRecepcion: null },
        });
      }
    }

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'EVIDENCIA',
        registroId: evidenciaId,
        valorAnterior: { nombreArchivo: evidencia.nombreArchivo, documentoId: evidencia.documentoId },
        observacion: 'Evidencia adjunta eliminada',
      },
    });

    res.json({ mensaje: 'Evidencia eliminada exitosamente' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar evidencia' });
  }
});

/** DELETE /api/documentos/:id — elimina un documento y sus evidencias */
documentosRouter.delete('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona documentos' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const doc = await prisma.documento.findUnique({
      where: { id },
      include: { evidencias: true },
    });

    if (!doc) {
      res.status(404).json({ error: 'Documento no encontrado' });
      return;
    }

    // Borrar evidencias de BD y disco
    for (const ev of doc.evidencias) {
      if (ev.rutaReferencia) {
        const nombreLimpio = ev.rutaReferencia.replace('/uploads/', '');
        const archivoDisco = path.join(UPLOADS_DIR, nombreLimpio);
        if (fs.existsSync(archivoDisco)) {
          try { fs.unlinkSync(archivoDisco); } catch (e) { console.warn(e); }
        }
      }
    }

    await prisma.evidencia.deleteMany({ where: { documentoId: id } });
    await prisma.soporteRed.deleteMany({ where: { documentoId: id } });
    await prisma.alerta.deleteMany({ where: { documentoId: id } });
    await prisma.documento.delete({ where: { id } });

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'DOCUMENTO',
        registroId: id,
        valorAnterior: { tipoDocumentoId: doc.tipoDocumentoId, beneficiarioId: doc.beneficiarioId },
        observacion: 'Documento de expediente eliminado',
      },
    });

    res.json({ mensaje: 'Documento eliminado exitosamente' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

