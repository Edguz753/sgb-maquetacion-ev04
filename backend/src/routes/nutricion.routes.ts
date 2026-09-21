/**
 * Rutas del módulo Controles Nutricionales — Sprint 3 (línea base V4.1.1).
 * ControlNutricional: fecha del control, nivel de riesgo (SIN_RIESGO/CON_RIESGO),
 * peso/talla con IMC calculado automáticamente, nutricionista responsable,
 * periodicidad (por defecto: CON_RIESGO=3 meses, SIN_RIESGO=6 meses) y próximo control.
 * Se marca "vencido" cuando fechaProximoControl quedó en el pasado.
 * RBAC (según seed): escritura GESTOR y PROFESIONAL; lectura el resto de autenticados.
 */
import { Router } from 'express';
import { z } from 'zod';
import { NivelRiesgoNutricional } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';
import { clasificarIMC } from '../lib/bmi-cdc';

export const nutricionRouter = Router();

nutricionRouter.use(autenticar);

const ROLES_ESCRITURA = ['GESTOR', 'PROFESIONAL'];

const PERIODICIDAD_DEFECTO: Record<string, number> = {
  CON_RIESGO: 3,
  SIN_RIESGO: 6,
};

function sumarMeses(fecha: Date, meses: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + meses, fecha.getDate());
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcularImc(pesoKg?: number | null, tallaM?: number | null): number | null {
  if (!pesoKg || !tallaM || tallaM <= 0) return null;
  return redondear(pesoKg / (tallaM * tallaM));
}

function normalizarDecimal(valor: unknown): number | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

const crearSchema = z.object({
  beneficiarioId: z.number().int(),
  profesionalId: z.number().int().optional().nullable(),
  fechaControl: z.string(),
  nivelRiesgo: z.enum(['SIN_RIESGO', 'CON_RIESGO']).optional(),
  peso: z.union([z.string(), z.number(), z.null()]).optional(),
  talla: z.union([z.string(), z.number(), z.null()]).optional(),
  periodicidadMeses: z.number().int().min(1).max(60).optional(),
  observaciones: z.string().optional().nullable(),
});

const actualizarSchema = z.object({
  fechaControl: z.string().optional(),
  nivelRiesgo: z.enum(['SIN_RIESGO', 'CON_RIESGO']).optional(),
  peso: z.union([z.string(), z.number(), z.null()]).optional(),
  talla: z.union([z.string(), z.number(), z.null()]).optional(),
  periodicidadMeses: z.number().int().min(1).max(60).optional(),
  observaciones: z.string().optional().nullable(),
});

const includeBase = {
  beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true, fechaNacimiento: true } },
  profesional: { select: { id: true, nombres: true, apellidos: true } },
};

/** Prepara datos comunes: decimales, IMC y próximo control */
function prepararDatos(body: {
  fechaControl?: string;
  nivelRiesgo?: string;
  peso?: number | null;
  talla?: number | null;
  periodicidadMeses?: number | null;
}) {
  const data: any = {};
  if (body.fechaControl !== undefined && body.fechaControl !== null) data.fechaControl = new Date(body.fechaControl);
  if (body.nivelRiesgo) data.nivelRiesgo = body.nivelRiesgo as NivelRiesgoNutricional;

  let peso = body.peso ?? undefined;
  let talla = body.talla ?? undefined;
  if (peso !== undefined) data.peso = peso;
  if (talla !== undefined) data.talla = talla;

  // Recalcular IMC si hay peso y talla definidos
  const pesoFinal = data.peso ?? undefined;
  const tallaFinal = data.talla ?? undefined;
  const imc = calcularImc(pesoFinal, tallaFinal);
  if (imc !== null) data.imc = imc;

  return data;
}

/** POST-procesamiento: próximo control según periodicidad (si cambia riesgo o periodicidad o fecha) */
function calcularProximo(fechaBase: Date, nivel: string, periodExplicit?: number | null): number {
  const periodo = periodExplicit ?? PERIODICIDAD_DEFECTO[nivel] ?? 6;
  void fechaBase;
  return periodo;
}

/** GET /api/nutricion?beneficiarioId=&nivelRiesgo=&q= — listado con marca de vencido */
nutricionRouter.get('/', async (req, res) => {
  try {
    const nivelFiltro = (req.query.nivelRiesgo as string) || '';
    const q = (req.query.q as string)?.trim() || '';
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;

    const where: any = {};
    if (nivelFiltro) where.nivelRiesgo = nivelFiltro;
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

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const items = await prisma.controlNutricional.findMany({ where, include: includeBase, orderBy: [{ fechaControl: 'desc' }], take: 200 });
    const conExtras = items.map((n) => ({
      ...n,
      proximoVencido: n.fechaProximoControl ? new Date(new Date(n.fechaProximoControl).setHours(0, 0, 0, 0)) < hoy : false,
    }));

    const filtradas = nivelFiltro ? conExtras.filter((n) => n.nivelRiesgo === nivelFiltro) : conExtras;
    const resumen = {
      SIN_RIESGO: conExtras.filter((n) => n.nivelRiesgo === 'SIN_RIESGO').length,
      CON_RIESGO: conExtras.filter((n) => n.nivelRiesgo === 'CON_RIESGO').length,
      PROXIMO_VENCIDO: conExtras.filter((n) => n.proximoVencido).length,
    };

    res.json({ total: filtradas.length, resumen, controles: filtradas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar controles nutricionales' });
  }
});

/** POST /api/nutricion — registrar control nutricional (calcula IMC y próximo control) */
nutricionRouter.post('/', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no registra controles nutricionales' });
    return;
  }
  try {
    const body = crearSchema.parse(req.body);
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) {
      res.status(404).json({ error: 'Beneficiario no encontrado' });
      return;
    }

    // Profesional responsable: para PROFESIONAL se fija al propio usuario; otros roles lo indican
    let profesionalId: number | null = body.profesionalId ?? null;
    if (req.user.rol === 'PROFESIONAL') {
      profesionalId = req.user.profesionalId;
      if (!profesionalId) {
        res.status(400).json({ error: 'El usuario profesional no tiene perfil de profesional asociado' });
        return;
      }
    }
    if (!profesionalId) {
      res.status(400).json({ error: 'Indica el profesional nutricional responsable' });
      return;
    }
    const profesional = await prisma.profesional.findUnique({ where: { id: profesionalId } });
    if (!profesional) {
      res.status(400).json({ error: 'Profesional inválido' });
      return;
    }

    const peso = normalizarDecimal(body.peso) ?? null;
    const talla = normalizarDecimal(body.talla) ?? null;
    const imc = calcularImc(peso, talla);

    // Baremo CDC: percentil y categoría según edad (meses) y sexo del beneficiario
    const clasificacion = clasificarIMC(beneficiario.fechaNacimiento, beneficiario.genero === 'F' ? 'F' : 'M', imc);
    // Riesgo automático: peso saludable -> SIN_RIESGO; cualquier otra categoría (bajo peso,
    // sobrepeso, obesidad, obesidad severa) -> CON_RIESGO, salvo indicación explícita.
    const nivelRiesgoFinal = (body.nivelRiesgo as NivelRiesgoNutricional | undefined) ?? (clasificacion.categoria === 'PESO_SALUDABLE' ? 'SIN_RIESGO' : 'CON_RIESGO');
    const periodicidad = body.periodicidadMeses ?? PERIODICIDAD_DEFECTO[nivelRiesgoFinal] ?? 6;
    const fechaControl = new Date(body.fechaControl);
    const fechaProximoControl = sumarMeses(fechaControl, periodicidad);

    const creado = await prisma.controlNutricional.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        profesionalId,
        fechaControl,
        nivelRiesgo: nivelRiesgoFinal,
        peso,
        talla,
        imc,
        imcPercentil: clasificacion.percentil,
        categoriaImc: clasificacion.categoria,
        imcP95: clasificacion.imcP95,
        periodicidadMeses: periodicidad,
        fechaProximoControl,
        observaciones: body.observaciones ?? null,
      },
      include: includeBase,
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'CONTROL_NUTRICIONAL',
        registroId: creado.id,
        valorNuevo: { beneficiarioId: body.beneficiarioId, nivelRiesgo: body.nivelRiesgo, imc },
        observacion: 'Registro de control nutricional',
      },
    });
    res.status(201).json(creado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al registrar control nutricional' });
  }
});

/** PATCH /api/nutricion/:id — actualiza control nutricional (recalcula IMC y próximo control) */
nutricionRouter.patch('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no modifica controles nutricionales' });
    return;
  }
  try {
    const body = actualizarSchema.parse(req.body);
    const id = parseInt(req.params.id, 10);
    const actual = await prisma.controlNutricional.findUnique({ where: { id } });
    if (!actual) {
      res.status(404).json({ error: 'Control nutricional no encontrado' });
      return;
    }

    const datosPreparados = prepararDatos({
      fechaControl: body.fechaControl,
      nivelRiesgo: body.nivelRiesgo,
      peso: body.peso === undefined ? undefined : normalizarDecimal(body.peso),
      talla: body.talla === undefined ? undefined : normalizarDecimal(body.talla),
      periodicidadMeses: body.periodicidadMeses ?? undefined,
    });

    const data: any = { ...datosPreparados };
    if (body.observaciones !== undefined) data.observaciones = body.observaciones;

    const nivelFinal = (data.nivelRiesgo ?? actual.nivelRiesgo) as string;
    // Si cambia el riesgo y no se envía periodicidad explícita, se adopta la del nuevo nivel (3 CON / 6 SIN)
    const periodicidadFinal = data.periodicidadMeses ?? body.periodicidadMeses ?? (body.nivelRiesgo && body.nivelRiesgo !== actual.nivelRiesgo ? PERIODICIDAD_DEFECTO[nivelFinal] : actual.periodicidadMeses);
    data.periodicidadMeses = periodicidadFinal;
    data.imc = calcularImc(data.peso ?? Number(actual.peso ?? NaN), data.talla ?? Number(actual.talla ?? NaN)) ?? actual.imc;
    // Baremo CDC: percentil y categoría con los valores finales
    const beneficiarioCtrl = await prisma.beneficiario.findUnique({ where: { id: actual.beneficiarioId } });
    const clasificacionPatch = clasificarIMC(
      beneficiarioCtrl?.fechaNacimiento ?? new Date(),
      beneficiarioCtrl?.genero === 'F' ? 'F' : 'M',
      (data.imc ?? Number(actual.imc ?? NaN)) || null,
    );
    data.imcPercentil = clasificacionPatch.percentil;
    data.categoriaImc = clasificacionPatch.categoria;
    data.imcP95 = clasificacionPatch.imcP95;

    const fechaBase = data.fechaControl ?? actual.fechaControl;
    if (data.fechaControl || data.periodicidadMeses !== actual.periodicidadMeses || data.nivelRiesgo) {
      data.fechaProximoControl = sumarMeses(new Date(fechaBase), periodicidadFinal);
    }

    const actualizado = await prisma.controlNutricional.update({ where: { id }, data, include: includeBase });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ACTUALIZAR',
        recurso: 'CONTROL_NUTRICIONAL',
        registroId: id,
        valorNuevo: { nivelRiesgo: actualizado.nivelRiesgo, imc: actualizado.imc },
        observacion: 'Actualización de control nutricional',
      },
    });
    res.json(actualizado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Control nutricional no encontrado' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar control nutricional' });
  }
});

/** GET /api/nutricion/profesiones — alias de profesionales (para el selector) */
nutricionRouter.get('/profesionales-resumen', async (_req, res) => {
  try {
    const profesionales = await prisma.profesional.findMany({
      where: { activo: true },
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: 'asc' }],
    });
    res.json({ total: profesionales.length, profesionales });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar profesionales' });
  }
});

/** GET /api/nutricion/clasificar?beneficiarioId=&peso=&talla= — cálculo CDC en vivo */
nutricionRouter.get('/clasificar', async (req, res) => {
  try {
    const beneficiarioId = parseInt(req.query.beneficiarioId as string, 10);
    const peso = normalizarDecimal(req.query.peso) ?? null;
    const talla = normalizarDecimal(req.query.talla) ?? null;
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: beneficiarioId } });
    if (!beneficiario) return res.status(404).json({ error: 'Beneficiario no encontrado' });

    const imc = calcularImc(peso, talla);
    const clasificacion = clasificarIMC(beneficiario.fechaNacimiento, beneficiario.genero === 'F' ? 'F' : 'M', imc);
    const nivelRiesgoSugerido = clasificacion.categoria === 'PESO_SALUDABLE' ? 'SIN_RIESGO' : 'CON_RIESGO';

    res.json({
      imc: clasificacion.imc,
      percentil: clasificacion.percentil,
      categoria: clasificacion.categoria,
      imcP95: clasificacion.imcP95,
      edadMeses: clasificacion.edadMeses,
      edadAnios: Math.floor(clasificacion.edadMeses / 12),
      edadMesesRestantes: clasificacion.edadMeses % 12,
      aplica: clasificacion.aplica,
      nivelRiesgoSugerido,
      fechaProximoSugerida: null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al clasificar el IMC' });
  }
});

/** GET /api/nutricion/:id — detalle */
nutricionRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.controlNutricional.findUnique({ where: { id }, include: includeBase });
    if (!item) {
      res.status(404).json({ error: 'Control nutricional no encontrado' });
      return;
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar control nutricional' });
  }
});

/** DELETE /api/nutricion/:id — elimina un control nutricional */
nutricionRouter.delete('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no puede eliminar controles nutricionales' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const control = await prisma.controlNutricional.findUnique({ where: { id } });
    if (!control) {
      res.status(404).json({ error: 'Control nutricional no encontrado' });
      return;
    }
    await prisma.controlNutricional.delete({ where: { id } });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'CONTROL_NUTRICIONAL',
        registroId: id,
        valorAnterior: { beneficiarioId: control.beneficiarioId, nivelRiesgo: control.nivelRiesgo },
        observacion: 'Control nutricional eliminado',
      },
    });
    res.json({ mensaje: 'Control nutricional eliminado exitosamente' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar control nutricional' });
  }
});

