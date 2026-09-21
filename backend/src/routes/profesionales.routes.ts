/**
 * Rutas de profesionales — incluye carga operativa (HU-PRO-003).
 * Conteo de beneficiarios únicos por profesional vía asignaciones ACTIVAS.
 * Umbrales configurables: Óptima 30-40 · Alta >40 · Disponible <30.
 */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';
import { env } from '../config/env';

export const profesionalesRouter = Router();

profesionalesRouter.use(autenticar);

/**
 * GET /api/profesionales/carga
 * Lista profesionales con conteo de beneficiarios asignados (asignaciones ACTIVAS) y nivel de carga.
 */
profesionalesRouter.get('/carga', async (_req, res) => {
  try {
    const profesionales = await prisma.profesional.findMany({
      where: { activo: true },
      include: {
        asignaciones: {
          where: { estado: 'ACTIVA' },
          include: { caso: { select: { beneficiarioId: true, estado: true } } },
        },
      },
    });

    const carga = profesionales.map((p) => {
      const casosActivos = p.asignaciones.filter((a) => a.caso.estado === 'ACTIVO');
      const beneficiariosUnicos = new Set(casosActivos.map((a) => a.caso.beneficiarioId)).size;
      let nivel: 'OPTIMA' | 'ALTA' | 'DISPONIBLE' | 'SIN_CARGA';
      if (beneficiariosUnicos === 0) nivel = 'SIN_CARGA';
      else if (beneficiariosUnicos > env.cargaAltaMin) nivel = 'ALTA';
      else if (beneficiariosUnicos >= env.cargaOptimaMin && beneficiariosUnicos <= env.cargaOptimaMax) nivel = 'OPTIMA';
      else nivel = 'DISPONIBLE';

      return {
        id: p.id,
        nombres: p.nombres,
        apellidos: p.apellidos,
        activo: p.activo,
        beneficiariosAsignados: beneficiariosUnicos,
        nivel,
        umbrales: { optimaMin: env.cargaOptimaMin, optimaMax: env.cargaOptimaMax, altaMin: env.cargaAltaMin },
      };
    });

    res.json({ total: carga.length, profesionales: carga });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar carga operativa' });
  }
});

/**
 * GET /api/profesionales — listado básico con área.
 */
profesionalesRouter.get('/', async (_req, res) => {
  try {
    const items = await prisma.profesional.findMany({
      where: { activo: true },
      select: { id: true, nombres: true, apellidos: true, tipoDocumento: true, numeroDocumento: true },
      orderBy: [{ apellidos: 'asc' }],
    });
    res.json({ total: items.length, profesionales: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar profesionales' });
  }
});
