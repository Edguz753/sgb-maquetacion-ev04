/**
 * Rutas de Gestión de Usuarios — Sprint 10 (línea base V4.1.1).
 * RBAC: ADMIN gestiona usuarios (crear, editar, desactivar, reset de contraseña).
 * Cualquier usuario autenticado puede cambiar SU PROPIA contraseña (exige la actual).
 * Al crear un usuario con rol PROFESIONAL se crea su perfil de profesional vinculado.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';

export const usuariosRouter = Router();

usuariosRouter.use(autenticar);

const contrasenaSchema = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres');

const crearSchema = z.object({
  username: z.string().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/, 'El username solo admite letras, números, punto, guion y guion bajo'),
  password: contrasenaSchema,
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  email: z.string().max(255).optional().nullable(),
  rolNombre: z.enum(['ADMIN', 'SECRETARIA', 'GESTOR', 'COORDINADOR', 'PROFESIONAL']),
  crearPerfilProfesional: z.boolean().optional().default(false),
});

const editarSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  apellido: z.string().min(1).max(100).optional(),
  email: z.string().max(255).optional().nullable(),
  rolNombre: z.enum(['ADMIN', 'SECRETARIA', 'GESTOR', 'COORDINADOR', 'PROFESIONAL']).optional(),
  activo: z.boolean().optional(),
});

const includeBase = {
  rol: { select: { id: true, nombre: true } },
  profesional: { select: { id: true, nombres: true, apellidos: true } },
};

/** GET /api/usuarios/roles — catálogo de roles activos (para el selector) */
usuariosRouter.get('/roles', async (_req, res) => {
  try {
    const roles = await prisma.rol.findMany({ where: { activo: true }, orderBy: { id: 'asc' } });
    res.json({ total: roles.length, roles });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar roles' });
  }
});

/** GET /api/usuarios — listado (ADMIN, GESTOR, COORDINADOR) */
usuariosRouter.get('/', async (req, res) => {
  if (!req.user || !['ADMIN', 'GESTOR', 'COORDINADOR'].includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: solo ADMIN, GESTOR y COORDINADOR consultan usuarios' });
    return;
  }
  try {
    const items = await prisma.usuario.findMany({
      include: includeBase,
      orderBy: [{ activo: 'desc' }, { apellido: 'asc' }],
    });
    res.json({
      total: items.length,
      usuarios: items.map((u) => ({
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        rol: u.rol.nombre,
        activo: u.activo,
        ultimoAcceso: u.ultimoAcceso,
        profesional: u.profesional ? { id: u.profesional.id, nombres: u.profesional.nombres, apellidos: u.profesional.apellidos } : null,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

/** POST /api/usuarios — crea un usuario (ADMIN) */
usuariosRouter.post('/', async (req, res) => {
  if (!req.user || req.user.rol !== 'ADMIN') {
    res.status(403).json({ error: 'Prohibido: solo ADMIN crea usuarios' });
    return;
  }
  try {
    const body = crearSchema.parse(req.body);

    const rol = await prisma.rol.findUnique({ where: { nombre: body.rolNombre } });
    if (!rol || !rol.activo) return res.status(400).json({ error: 'Rol inválido' });

    const creado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          username: body.username,
          passwordHash: await bcrypt.hash(body.password, 10),
          nombre: body.nombre,
          apellido: body.apellido,
          email: body.email ?? null,
          rolId: rol.id,
          activo: true,
        },
      });
      if (body.rolNombre === 'PROFESIONAL' && body.crearPerfilProfesional) {
        await tx.profesional.create({
          data: { usuarioId: usuario.id, nombres: body.nombre, apellidos: body.apellido, activo: true },
        });
      }
      return usuario;
    });

    const completo = await prisma.usuario.findUnique({ where: { id: creado.id }, include: includeBase });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'USUARIO',
        registroId: creado.id,
        valorNuevo: { username: body.username, rol: body.rolNombre },
        observacion: 'Usuario creado desde la gestión de usuarios',
      },
    });
    res.status(201).json(completo);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un usuario con ese username o email' });
    console.error(e);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

/** PATCH /api/usuarios/:id — edita datos, rol o estado (ADMIN) */
usuariosRouter.patch('/:id', async (req, res) => {
  if (!req.user || req.user.rol !== 'ADMIN') {
    res.status(403).json({ error: 'Prohibido: solo ADMIN edita usuarios' });
    return;
  }
  try {
    const body = editarSchema.parse(req.body);
    const id = parseInt(req.params.id, 10);
    const actual = await prisma.usuario.findUnique({ where: { id }, include: { rol: true } });
    if (!actual) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Protección: el ADMIN no puede desactivarse a sí mismo ni quitarse su rol ADMIN
    if (actual.id === req.user.userId) {
      if (body.activo === false) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
      if (body.rolNombre && body.rolNombre !== 'ADMIN') return res.status(400).json({ error: 'No puedes quitarte tu propio rol ADMIN' });
    }

    const data: any = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.apellido !== undefined) data.apellido = body.apellido;
    if (body.email !== undefined) data.email = body.email;
    if (body.activo !== undefined) data.activo = body.activo;
    if (body.rolNombre) {
      const rol = await prisma.rol.findUnique({ where: { nombre: body.rolNombre } });
      if (!rol || !rol.activo) return res.status(400).json({ error: 'Rol inválido' });
      data.rolId = rol.id;
    }

    const actualizado = await prisma.usuario.update({ where: { id }, data, include: includeBase });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'USUARIO',
        registroId: id,
        valorNuevo: body,
        observacion: 'Actualización de usuario',
      },
    });
    res.json(actualizado);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe un usuario con ese username o email' });
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

/** PATCH /api/usuarios/:id/contrasena — reset de contraseña (ADMIN) */
usuariosRouter.patch('/:id/contrasena', async (req, res) => {
  if (!req.user || req.user.rol !== 'ADMIN') {
    res.status(403).json({ error: 'Prohibido: solo ADMIN resetea contraseñas' });
    return;
  }
  try {
    const body = z.object({ nuevaContrasena: contrasenaSchema }).parse(req.body);
    const id = parseInt(req.params.id, 10);
    await prisma.usuario.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(body.nuevaContrasena, 10) },
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'USUARIO',
        registroId: id,
        observacion: 'Contraseña restablecida por ADMIN',
      },
    });
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
});

/** PATCH /api/usuarios/mi-contrasena — cambia la contraseña propia (exige la actual) */
usuariosRouter.patch('/mi-contrasena/cambiar', async (req, res) => {
  try {
    const body = z.object({ actual: z.string().min(1), nueva: contrasenaSchema }).parse(req.body);
    const usuario = await prisma.usuario.findUnique({ where: { id: req.user!.userId } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valida = await bcrypt.compare(body.actual, usuario.passwordHash);
    if (!valida) return res.status(401).json({ error: 'La contraseña actual no es correcta' });

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash: await bcrypt.hash(body.nueva, 10) },
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: usuario.id,
        accion: 'ACTUALIZAR',
        recurso: 'USUARIO',
        registroId: usuario.id,
        observacion: 'Cambio de contraseña propia',
      },
    });
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});
/**
 * DELETE /api/usuarios/:id — elimina físicamente un usuario (solo ADMIN).
 * Protecciones: no puedes eliminar tu propio usuario; si el usuario tiene
 * registros asociados (evidencias, revisiones…) la base lo impide (FK) y se
 * sugiere desactivarlo en su lugar.
 */
usuariosRouter.delete('/:id', async (req, res) => {
  if (!req.user || req.user.rol !== 'ADMIN') {
    res.status(403).json({ error: 'Prohibido: solo ADMIN puede eliminar usuarios' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.userId) {
      res.status(409).json({ error: 'No puedes eliminar tu propio usuario' });
      return;
    }
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    // si es el último administrador activo, impedirlo
    const rolUsuario = await prisma.rol.findUnique({ where: { id: usuario.rolId } });
    if (rolUsuario?.nombre?.toUpperCase() === 'ADMINISTRADOR' || rolUsuario?.nombre?.toUpperCase() === 'ADMIN') {
      const otrosAdmins = await prisma.usuario.count({
        where: { rolId: usuario.rolId, activo: true, id: { not: id } },
      });
      if (otrosAdmins === 0) {
        res.status(409).json({ error: 'No puedes eliminar al único administrador activo' });
        return;
      }
    }
    await prisma.usuario.delete({ where: { id } });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'USUARIO',
        registroId: id,
        observacion: 'Usuario eliminado: ' + usuario.username,
      },
    });
    res.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2003') {
      res.status(409).json({ error: 'El usuario tiene registros asociados: desactívalo en lugar de eliminarlo' });
      return;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});
