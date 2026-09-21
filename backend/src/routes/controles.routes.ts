/**
 * Rutas del módulo Controles de Salud — Sprint 2 (línea base V4.1.1).
 * ControlSalud: fecha programada / realización / próximo control, control especial,
 * estado (PENDIENTE/REALIZADO/ATRASADO/CANCELADO/NO_APLICA) y soporte documental.
 * El soporte se guarda como Documento (tipo SOPORTE_ATENCION) con su evidencia,
 * vinculado al control (soporteDocumentoId).
 * Al marcar REALIZADO se sugiere fechaProximoControl = fechaRealizacion + periodicidadMeses (tipo).
 * RBAC: lectura autenticados; escritura GESTOR, COORDINADOR, SECRETARIA, PROFESIONAL.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { EstadoControl } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';

export const controlesRouter = Router();

controlesRouter.use(autenticar);

const ROLES_CONTROL = ['GESTOR', 'COORDINADOR', 'SECRETARIA', 'PROFESIONAL'];

// ── Uploads de soporte (reutiliza carpeta de evidencias) ──────────────
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `soporte-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext));
  },
});

// ── Validación ────────────────────────────────────────────────────────
const ESTADOS = Object.values(EstadoControl) as [string, ...string[]];

const crearSchema = z.object({
  beneficiarioId: z.number().int(),
  tipoControlId: z.number().int(),
  fechaProgramada: z.string().optional().nullable(),
  fechaRealizacion: z.string().optional().nullable(),
  requiereControlEspecial: z.boolean().optional().default(false),
  especialidad: z.string().max(120).optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const actualizarSchema = z.object({
  estado: z.enum(ESTADOS).optional(),
  fechaProgramada: z.string().optional().nullable(),
  fechaRealizacion: z.string().optional().nullable(),
  fechaProximoControl: z.string().optional().nullable(),
  requiereControlEspecial: z.boolean().optional(),
  especialidad: z.string().max(120).optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const includeBase = {
  tipoControl: { select: { id: true, codigo: true, nombre: true, periodicidadMeses: true } },
  beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true, fechaNacimiento: true } },
  soporteDocumento: {
    select: { id: true, estado: true, tipoDocumento: { select: { nombre: true } }, evidencias: { select: { id: true, nombreArchivo: true, rutaReferencia: true }, orderBy: { fechaCarga: 'desc' as const }, take: 1 } },
  },
};

function calcularEstado(fechaProgramada: Date | null, fechaRealizacion: Date | null, estado: string): string {
  if (fechaRealizacion) return 'REALIZADO';
  if (estado === 'CANCELADO' || estado === 'NO_APLICA') return estado;
  if (fechaProgramada) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fp = new Date(fechaProgramada);
    fp.setHours(0, 0, 0, 0);
    if (fp < hoy) return 'ATRASADO';
  }
  return estado;
}

function sumarMeses(fecha: Date, meses: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + meses, fecha.getDate());
}

/** GET /api/controles?beneficiarioId=&estado=&q= — listado con estado calculado */
controlesRouter.get('/', async (req, res) => {
  try {
    const estadoFiltro = (req.query.estado as string) || '';
    const q = (req.query.q as string)?.trim() || '';
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;

    const where: any = {};
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

    const items = await prisma.controlSalud.findMany({ where, include: includeBase, orderBy: { fechaProgramada: 'desc' }, take: 200 });
    const conEstado = items.map((c) => ({ ...c, estadoCalculado: calcularEstado(c.fechaProgramada, c.fechaRealizacion, c.estado) }));
    const filtradas = estadoFiltro ? conEstado.filter((c) => c.estadoCalculado === estadoFiltro) : conEstado;

    const resumen: Record<string, number> = {};
    for (const c of conEstado) resumen[c.estadoCalculado] = (resumen[c.estadoCalculado] ?? 0) + 1;

    res.json({ total: filtradas.length, resumen, controles: filtradas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar controles' });
  }
});

/** GET /api/controles/tipos — catálogo de tipos de control activos */
controlesRouter.get('/tipos', async (_req, res) => {
  try {
    const tipos = await prisma.tipoControlSalud.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } });
    res.json({ total: tipos.length, tipos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar tipos de control' });
  }
});

/** POST /api/controles — registro de un control */
controlesRouter.post('/', async (req, res) => {
  if (!req.user || !ROLES_CONTROL.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no registra controles' });
    return;
  }
  try {
    const body = crearSchema.parse(req.body);
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) {
      res.status(404).json({ error: 'Beneficiario no encontrado' });
      return;
    }
    const tipo = await prisma.tipoControlSalud.findUnique({ where: { id: body.tipoControlId } });
    if (!tipo || !tipo.activa) {
      res.status(400).json({ error: 'Tipo de control inválido' });
      return;
    }
    if (body.requiereControlEspecial && !body.especialidad) {
      res.status(400).json({ error: 'Indique la especialidad para el control especial' });
      return;
    }

    const fechaRealizacion = body.fechaRealizacion ? new Date(body.fechaRealizacion) : null;
    const fechaProximoControl = fechaRealizacion && tipo.periodicidadMeses ? sumarMeses(fechaRealizacion, tipo.periodicidadMeses) : null;

    const creado = await prisma.controlSalud.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        tipoControlId: body.tipoControlId,
        fechaProgramada: body.fechaProgramada ? new Date(body.fechaProgramada) : null,
        fechaRealizacion,
        fechaProximoControl,
        requiereControlEspecial: body.requiereControlEspecial ?? false,
        especialidad: body.especialidad ?? null,
        estado: fechaRealizacion ? 'REALIZADO' : 'PENDIENTE',
        observaciones: body.observaciones ?? null,
      },
      include: includeBase,
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'CONTROL_SALUD',
        registroId: creado.id,
        valorNuevo: { tipoControlId: body.tipoControlId, beneficiarioId: body.beneficiarioId },
        observacion: 'Registro de control de salud',
      },
    });
    res.status(201).json(creado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al registrar control' });
  }
});

/** PATCH /api/controles/:id — actualiza estado / fechas / especialidad */
controlesRouter.patch('/:id', async (req, res) => {
  if (!req.user || !ROLES_CONTROL.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no modifica controles' });
    return;
  }
  try {
    const body = actualizarSchema.parse(req.body);
    const id = parseInt(req.params.id, 10);
    const actual = await prisma.controlSalud.findUnique({ where: { id }, include: { tipoControl: true } });
    if (!actual) {
      res.status(404).json({ error: 'Control no encontrado' });
      return;
    }

    const data: any = {};
    if (body.estado) data.estado = body.estado;
    if (body.fechaProgramada !== undefined) data.fechaProgramada = body.fechaProgramada ? new Date(body.fechaProgramada) : null;
    if (body.requiereControlEspecial !== undefined) data.requiereControlEspecial = body.requiereControlEspecial;
    if (body.especialidad !== undefined) data.especialidad = body.especialidad;
    if (body.observaciones !== undefined) data.observaciones = body.observaciones;

    // Al marcar REALIZADO se fija la fecha de realización (hoy si no viene) y se sugiere el próximo control
    if (body.estado === 'REALIZADO' && !actual.fechaRealizacion) {
      const hoy = new Date();
      data.fechaRealizacion = hoy;
      if (!body.fechaProximoControl && actual.tipoControl.periodicidadMeses) {
        data.fechaProximoControl = sumarMeses(hoy, actual.tipoControl.periodicidadMeses);
      }
    }
    if (body.fechaRealizacion !== undefined) data.fechaRealizacion = body.fechaRealizacion ? new Date(body.fechaRealizacion) : null;
    if (body.fechaProximoControl !== undefined) data.fechaProximoControl = body.fechaProximoControl ? new Date(body.fechaProximoControl) : null;

    const actualizado = await prisma.controlSalud.update({ where: { id }, data, include: includeBase });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'CONTROL_SALUD',
        registroId: id,
        valorNuevo: data,
        observacion: 'Actualización de control de salud',
      },
    });
    res.json(actualizado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Control no encontrado' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar control' });
  }
});

/** POST /api/controles/:id/soporte — sube el soporte documental del control */
controlesRouter.post('/:id/soporte', upload.single('archivo'), async (req, res) => {
  if (!req.user || !ROLES_CONTROL.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona soportes' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const control = await prisma.controlSalud.findUnique({ where: { id }, include: { tipoControl: true, beneficiario: { include: { casos: { where: { estado: 'ACTIVO' }, take: 1 } } } } });
    if (!control) {
      res.status(404).json({ error: 'Control no encontrado' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Archivo requerido. Formato permitido: pdf, jpg, jpeg o png (máx 10 MB).' });
      return;
    }

    const tipoSoporte = await prisma.tipoDocumento.findFirst({ where: { codigo: 'SOPORTE_ATENCION' } });
    const soporte = await prisma.documento.create({
      data: {
        beneficiarioId: control.beneficiarioId,
        casoId: control.beneficiario.casos[0]?.id ?? null,
        tipoDocumentoId: tipoSoporte?.id ?? 1,
        fechaRecepcion: new Date(),
        estado: 'RECIBIDO',
        observaciones: `Soporte de control: ${control.tipoControl.nombre}`,
      },
    });
    const evidencia = await prisma.evidencia.create({
      data: {
        documentoId: soporte.id,
        nombreArchivo: req.file.originalname,
        rutaReferencia: `/uploads/${req.file.filename}`,
        tipoMime: req.file.mimetype,
        cargadoPor: req.user.userId,
        observaciones: (req.body?.observaciones as string) || null,
      },
    });
    const actualizado = await prisma.controlSalud.update({ where: { id }, data: { soporteDocumentoId: soporte.id }, include: includeBase });

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'SUBIR',
        recurso: 'CONTROL_SALUD',
        registroId: id,
        valorNuevo: { soporteDocumentoId: soporte.id },
        observacion: 'Soporte documental cargado al control',
      },
    });

    res.status(201).json({ mensaje: 'Soporte cargado y vinculado al control', control: actualizado, evidencia });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al subir soporte' });
  }
});

/** GET /api/controles/:id — detalle */
controlesRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.controlSalud.findUnique({ where: { id }, include: includeBase });
    if (!item) {
      res.status(404).json({ error: 'Control no encontrado' });
      return;
    }
    res.json({ ...item, estadoCalculado: calcularEstado(item.fechaProgramada, item.fechaRealizacion, item.estado) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar control' });
  }
});

/** DELETE /api/controles/:id — elimina un control de salud (roles con escritura) */
controlesRouter.delete('/:id', async (req, res) => {
  if (!req.user || !ROLES_CONTROL.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no puede eliminar controles' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const control = await prisma.controlSalud.findUnique({ where: { id } });
    if (!control) {
      res.status(404).json({ error: 'Control de salud no encontrado' });
      return;
    }
    // Si tiene soporte documental vinculado, desvincularlo antes
    if (control.soporteDocumentoId) {
      await prisma.controlSalud.update({ where: { id }, data: { soporteDocumentoId: null } });
    }
    await prisma.controlSalud.delete({ where: { id } });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'CONTROL_SALUD',
        registroId: id,
        valorAnterior: { beneficiarioId: control.beneficiarioId, tipoControlId: control.tipoControlId },
        observacion: 'Control de salud eliminado',
      },
    });
    res.json({ mensaje: 'Control de salud eliminado exitosamente' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar control de salud' });
  }
});

