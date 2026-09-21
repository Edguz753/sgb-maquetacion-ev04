/**
 * Middleware de autenticación JWT + autorización por permisos (RBAC V4.1.1).
 * El token incluye: sub (usuarioId), rol, profesionalId, username.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthUser {
  userId: number;
  rol: string;
  profesionalId: number | null;
  username: string;
  nombreCompleto: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload {
  sub: number;
  rol: string;
  profesionalId: number | null;
  username: string;
  nombreCompleto: string;
}

export function firmarToken(user: JwtPayload): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });
}

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado: token requerido' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as unknown as JwtPayload;
    req.user = {
      userId: payload.sub,
      rol: payload.rol,
      profesionalId: payload.profesionalId ?? null,
      username: payload.username,
      nombreCompleto: payload.nombreCompleto,
    };
    next();
  } catch {
    res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
  }
}

/** Roles con permisos de escritura sobre la base (RBAC V4.1.1). */
export const ROLES_ESCRITURA_BASE = ['GESTOR', 'COORDINADOR', 'SECRETARIA'];
export const ROLES_CREAR_CASO = ['GESTOR', 'COORDINADOR'];
export const ROLES_ASIGNAR_PROFESIONAL = ['GESTOR', 'COORDINADOR', 'SECRETARIA'];
export const ROLES_GESTION_CATALOGO = ['ADMIN', 'GESTOR', 'COORDINADOR'];
