import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { firmarToken } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({
      where: { username: body.username },
      include: { rol: true, profesional: true },
    });

    if (!usuario) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }
    if (!usuario.activo) {
      res.status(403).json({ error: 'Usuario inactivo' });
      return;
    }

    const valida = await bcrypt.compare(body.password, usuario.passwordHash);
    if (!valida) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    const token = firmarToken({
      sub: usuario.id,
      rol: usuario.rol.nombre,
      profesionalId: usuario.profesional?.id ?? null,
      username: usuario.username,
      nombreCompleto: `${usuario.nombre} ${usuario.apellido}`,
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombreCompleto: `${usuario.nombre} ${usuario.apellido}`,
        email: usuario.email,
        rol: usuario.rol.nombre,
        profesional: usuario.profesional
          ? { id: usuario.profesional.id, nombres: usuario.profesional.nombres, apellidos: usuario.profesional.apellidos }
          : null,
      },
    });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error interno' });
  }
});
