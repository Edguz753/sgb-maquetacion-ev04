/**
 * Rutas de catálogos del ERD — EPS, Defensoría, Monitor, Colegio, Orientador,
 * Estado escolar y Estado de afiliación.
 * Lectura: autenticados. Escritura (crear/editar): ADMIN, GESTOR, COORDINADOR.
 * No se ofrece eliminar (los catálogos se desactivan por diseño del programa).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { autenticar, ROLES_GESTION_CATALOGO } from '../middleware/auth';

export const catalogosRouter = Router();

catalogosRouter.use(autenticar);

/** GET /api/catalogos/todos — empaqueta todos los catálogos para la ficha y los selectores */
catalogosRouter.get('/todos', async (_req, res) => {
  try {
    const [eps, defensorias, monitores, colegios, estadosEscolares, estadosAfiliacion, orientadores, tiposActividad] = await Promise.all([
      prisma.eps.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.defensoria.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.monitor.findMany({ orderBy: { codigo: 'asc' }, include: { profesional: { select: { id: true, nombres: true, apellidos: true } } } }),
      prisma.colegio.findMany({ orderBy: { nombre: 'asc' }, include: { orientadores: true } }),
      prisma.estadoEscolar.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.estadoAfiliacion.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.orientador.findMany({ orderBy: { nombre: 'asc' }, include: { colegio: { select: { id: true, nombre: true } } } }),
      prisma.tipoActividad.findMany({ where: { activa: true }, include: { area: { select: { codigo: true, nombre: true } } }, orderBy: { nombre: 'asc' } }),
    ]);
    res.json({ eps, defensorias, monitores, colegios, estadosEscolares, estadosAfiliacion, orientadores, tiposActividad });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar catálogos' });
  }
});

/** Definición de cada catálogo: modelo Prisma, esquema de creación y de edición */
const DEFINICIONES: Record<string, { modelo: string; crear: z.ZodTypeAny; editar: z.ZodTypeAny }> = {
  eps: {
    modelo: 'eps',
    crear: z.object({ nombre: z.string().min(1).max(150), regimen: z.string().max(50).optional().nullable() }),
    editar: z.object({ nombre: z.string().min(1).max(150).optional(), regimen: z.string().max(50).optional().nullable() }),
  },
  defensorias: {
    modelo: 'defensoria',
    crear: z.object({ nombre: z.string().min(1).max(150), centroZonal: z.string().max(80).optional().nullable() }),
    editar: z.object({ nombre: z.string().min(1).max(150).optional(), centroZonal: z.string().max(80).optional().nullable() }),
  },
  monitores: {
    modelo: 'monitor',
    crear: z.object({ codigo: z.string().min(1).max(50), nombre: z.string().min(1).max(150) }),
    editar: z.object({ codigo: z.string().min(1).max(50).optional(), nombre: z.string().min(1).max(150).optional() }),
  },
  colegios: {
    modelo: 'colegio',
    crear: z.object({ nombre: z.string().min(1).max(200), localidad: z.string().max(120).optional().nullable(), sede: z.string().max(80).optional().nullable() }),
    editar: z.object({ nombre: z.string().min(1).max(200).optional(), localidad: z.string().max(120).optional().nullable(), sede: z.string().max(80).optional().nullable() }),
  },
  orientadores: {
    modelo: 'orientador',
    crear: z.object({ colegioId: z.number().int(), nombre: z.string().min(1).max(150), telefono: z.string().max(30).optional().nullable(), correo: z.string().max(255).optional().nullable() }),
    editar: z.object({ colegioId: z.number().int().optional(), nombre: z.string().min(1).max(150).optional(), telefono: z.string().max(30).optional().nullable(), correo: z.string().max(255).optional().nullable() }),
  },
  'estados-afiliacion': {
    modelo: 'estadoAfiliacion',
    crear: z.object({ nombre: z.string().min(1).max(80), descripcion: z.string().optional().nullable() }),
    editar: z.object({ nombre: z.string().min(1).max(80).optional(), descripcion: z.string().optional().nullable() }),
  },
  'estados-escolares': {
    modelo: 'estadoEscolar',
    crear: z.object({ nombre: z.string().min(1).max(80), descripcion: z.string().optional().nullable() }),
    editar: z.object({ nombre: z.string().min(1).max(80).optional(), descripcion: z.string().optional().nullable() }),
  },
};

function normalizarNombreCatalogo(nombre: string): string {
  return nombre.replace(/\s+/g, ' ').trim();
}

async function buscarDuplicadoCatalogo(modelo: any, nombre: string, excluirId?: number) {
  const candidato = normalizarNombreCatalogo(nombre);
  const existente = await modelo.findFirst({
    where: { nombre: { contains: candidato, mode: 'insensitive' }, ...(excluirId ? { id: { not: excluirId } } : {}) },
  });
  if (!existente) return null;
  const normalizadoExistente = normalizarNombreCatalogo(existente.nombre);
  return normalizadoExistente.toUpperCase() === candidato.toUpperCase() ? existente : null;
}

function catalogo(nombre: string) {
  const def = DEFINICIONES[nombre];
  if (!def) return null;
  // Prisma expone los modelos como propiedades del cliente
  return { def, modelo: (prisma as any)[def.modelo] };
}

/** GET /api/catalogos/:catalogo — listado de un catálogo */
catalogosRouter.get('/:catalogo', async (req, res) => {
  try {
    const c = catalogo(req.params.catalogo);
    if (!c) return res.status(404).json({ error: 'Catálogo no encontrado' });
    const ordenDefecto: Record<string, string> = { monitores: 'codigo', orientadores: 'nombre' };
    const items = await c.modelo.findMany({ orderBy: { [ordenDefecto[req.params.catalogo] ?? 'nombre']: 'asc' }, ...(req.params.catalogo === 'colegios' ? { include: { orientadores: true } } : {}), ...(req.params.catalogo === 'orientadores' ? { include: { colegio: { select: { id: true, nombre: true } } } } : {}) });
    res.json({ total: items.length, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar el catálogo' });
  }
});

/** POST /api/catalogos/:catalogo — crea un registro del catálogo */
catalogosRouter.post('/:catalogo', async (req, res) => {
  if (!req.user || !ROLES_GESTION_CATALOGO.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona catálogos' });
    return;
  }
  try {
    const c = catalogo(req.params.catalogo);
    if (!c) return res.status(404).json({ error: 'Catálogo no encontrado' });
    const body = c.def.crear.parse(req.body);
        if (typeof body.nombre === 'string') {
      const duplicado = await buscarDuplicadoCatalogo(c.modelo, body.nombre);
      if (duplicado) {
        res.status(409).json({ error: 'Ya existe un registro con ese nombre (normalizado): ' + duplicado.nombre, duplicado: duplicado.id, enUso: false });
        return;
      }
    }
const creado = await c.modelo.create({ data: body });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'CATALOGO_' + req.params.catalogo.toUpperCase(),
        registroId: creado.id,
        valorNuevo: body,
        observacion: 'Registro creado en catálogo',
      },
    });
    res.status(201).json(creado);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con ese nombre/código' });
    console.error(e);
    res.status(500).json({ error: 'Error al crear el registro' });
  }
});

/** PUT /api/catalogos/:catalogo/:id — edita un registro del catálogo */
catalogosRouter.put('/:catalogo/:id', async (req, res) => {
  if (!req.user || !ROLES_GESTION_CATALOGO.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona catálogos' });
    return;
  }
  try {
    const c = catalogo(req.params.catalogo);
    if (!c) return res.status(404).json({ error: 'Catálogo no encontrado' });
    const body = c.def.editar.parse(req.body);
    const id = parseInt(req.params.id, 10);
        if (typeof body.nombre === 'string') {
      const duplicado = await buscarDuplicadoCatalogo(c.modelo, body.nombre, Number(req.params.id));
      if (duplicado && duplicado.id !== Number(req.params.id)) {
        res.status(409).json({ error: 'Ya existe un registro con ese nombre (normalizado): ' + duplicado.nombre });
        return;
      }
    }
const actualizado = await c.modelo.update({ where: { id }, data: body });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'CATALOGO_' + req.params.catalogo.toUpperCase(),
        registroId: id,
        valorNuevo: body,
        observacion: 'Registro de catálogo actualizado',
      },
    });
    res.json(actualizado);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con ese nombre/código' });
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar el registro' });
  }
});

/** DELETE /api/catalogos/:catalogo/:id — elimina un registro si no está en uso */
catalogosRouter.delete('/:catalogo/:id', async (req, res) => {
  if (!req.user || !ROLES_GESTION_CATALOGO.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona catálogos' });
    return;
  }
  try {
    const c = catalogo(req.params.catalogo);
    if (!c) return res.status(404).json({ error: 'Catálogo no encontrado' });
    const id = parseInt(req.params.id, 10);

    // Verificar si el registro está en uso en alguna tabla
    let referencias = 0;
    const cat = req.params.catalogo;
    if (cat === 'eps') {
      referencias = await prisma.beneficiario.count({ where: { epsId: id } });
    } else if (cat === 'defensorias') {
      referencias = await prisma.beneficiario.count({ where: { defensoriaId: id } });
    } else if (cat === 'monitores') {
      referencias = await prisma.beneficiario.count({ where: { monitorId: id } });
    } else if (cat === 'colegios') {
      const mat = await prisma.colegioBeneficiario.count({ where: { colegioId: id } });
      const ori = await prisma.orientador.count({ where: { colegioId: id } });
      referencias = mat + ori;
    } else if (cat === 'estados-afiliacion') {
      referencias = await prisma.beneficiario.count({ where: { estadoAfiliacionId: id } });
    } else if (cat === 'estados-escolares') {
      referencias = await prisma.colegioBeneficiario.count({ where: { estadoEscolarId: id } });
    }

    if (referencias > 0) {
      res.status(409).json({
        error: `No se puede eliminar porque está asociado a ${referencias} registro(s) histórico(s). Puedes editarlo para desactivarlo.`,
        enUso: true,
        referencias,
      });
      return;
    }

    const eliminado = await c.modelo.delete({ where: { id } });

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'CATALOGO_' + req.params.catalogo.toUpperCase(),
        registroId: id,
        valorAnterior: eliminado,
        observacion: 'Registro de catálogo eliminado',
      },
    });

    res.json({ mensaje: 'Registro eliminado exitosamente' });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar el registro del catálogo' });
  }
});

