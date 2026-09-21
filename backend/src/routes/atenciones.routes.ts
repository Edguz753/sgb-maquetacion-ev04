/**
 * Rutas de Atenciones y seguimientos — Sprint 9 (línea base V4.1.1 + ERD).
 * Tres tipos de atención:
 *  - ROTACION: plan de atenciones por áreas que asigna el Gestor/Coordinador con fechas
 *    iniciales manuales; el sistema renueva automáticamente cada periodicidadMeses
 *    (3 por defecto) mientras el plan siga activo.
 *  - EMERGENTE: atenciones derivadas de un hecho emergente con nivel de riesgo
 *    (BAJO = mensual, MEDIO = cada 15 días, ALTO = semanal). Al atender, el Gestor decide
 *    si el riesgo continúa (genera el siguiente seguimiento) o se cierra el hecho.
 * Todas las fechas generadas se corrigen al día hábil anterior si caen en fin de
 * semana o festivo (mismo criterio del motor de planificación).
 * RBAC: lectura autenticados; creación/edición GESTOR y COORDINADOR; PROFESIONAL puede
 * actualizar estado y continuar atenciones; Secretaría solo lectura.
 */
import { Router } from 'express';
import { z } from 'zod';
import { addDays, addMonths, esDiaHabil, normDate } from '../lib/calendario';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';

export const atencionesRouter = Router();

atencionesRouter.use(autenticar);

const ROLES_PLANIFICAR = ['GESTOR', 'COORDINADOR'];
const RIESGO_DIAS: Record<string, number> = { BAJO: 30, MEDIO: 15, ALTO: 7 };

/** Corrige una fecha al día hábil anterior si cae en fin de semana o festivo. */
async function corregirAHabil(fecha: Date): Promise<Date> {
  let f = normDate(fecha);
  while (!(await esDiaHabil(f))) f = addDays(f, -1);
  return f;
}

function inicioDia(f: Date): Date {
  const d = new Date(f);
  d.setHours(0, 0, 0, 0);
  return d;
}

const includeBase = {
  beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } },
};

const pasosSchema = z.object({
  areaCodigo: z.string().min(2).max(10),
  fechaInicial: z.string(),
});

const rotacionSchema = z.object({
  beneficiarioId: z.number().int(),
  nombre: z.string().max(150).optional().nullable(),
  periodicidadMeses: z.number().int().min(1).max(12).optional().default(3),
  rondas: z.number().int().min(1).max(8).optional().default(4),
  pasos: z.array(pasosSchema).min(1),
  observaciones: z.string().optional().nullable(),
});

const hechoSchema = z.object({
  beneficiarioId: z.number().int(),
  fechaHecho: z.string(),
  ubicacion: z.enum(['CLUB', 'CASA', 'COLEGIO', 'OTRO']),
  descripcion: z.string().optional().nullable(),
  actaReferencia: z.string().max(120).optional().nullable(),
  nivelRiesgo: z.enum(['BAJO', 'MEDIO', 'ALTO']),
  pasos: z.array(pasosSchema).min(1),
  observaciones: z.string().optional().nullable(),
});

/** GET /api/atenciones?beneficiarioId=&area=&mes=YYYY-MM&estado=&tipo= */
/**
 * POST /api/atenciones — registra UNA atención manual individual de un beneficiario
 * (área, fecha y observaciones a elección del usuario; el seguimiento se continua desde la ficha).
 * RBAC: GESTOR, COORDINADOR y PROFESIONAL.
 */
const crearAtencionSchema = z.object({
  beneficiarioId: z.number().int(),
  areaCodigo: z.string().min(1).max(10),
  tipo: z.enum(['ATENCION', 'SEGUIMIENTO']).default('ATENCION'),
  fechaProgramada: z.string().min(1),
  observaciones: z.string().optional().nullable(),
});

atencionesRouter.post('/', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const body = crearAtencionSchema.parse(req.body);
    if (!['GESTOR', 'COORDINADOR', 'PROFESIONAL'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Prohibido: el rol no registra atenciones' });
    }
    const ben = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!ben) return res.status(404).json({ error: 'Beneficiario no encontrado' });
    if (ben.estado !== 'ACTIVO') return res.status(409).json({ error: 'El beneficiario no está activo' });

    const creada = await prisma.atencion.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        areaCodigo: body.areaCodigo.toUpperCase(),
        tipo: body.tipo,
        fechaProgramada: new Date(body.fechaProgramada),
        estado: 'PENDIENTE',
        observaciones: body.observaciones?.trim() || null,
        creadoPor: req.user.userId,
      },
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'ATENCION',
        registroId: creada.id,
        valorNuevo: { area: creada.areaCodigo, fecha: creada.fechaProgramada },
        observacion: 'Atención creada manualmente',
      },
    });

    res.status(201).json(creada);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al registrar la atención' });
  }
});

atencionesRouter.get('/', async (req, res) => {
  try {
    const beneficiarioId = req.query.beneficiarioId ? parseInt(req.query.beneficiarioId as string, 10) : null;
    const area = (req.query.area as string) || '';
    const mes = (req.query.mes as string) || '';
    const estado = (req.query.estado as string) || '';
    const tipo = (req.query.tipo as string) || '';

    const where: any = {};
    if (beneficiarioId) where.beneficiarioId = beneficiarioId;
    if (area) where.areaCodigo = area;
    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      const inicio = new Date(parseInt(mes.slice(0, 4), 10), parseInt(mes.slice(5, 7), 10) - 1, 1);
      const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0, 23, 59, 59);
      where.fechaProgramada = { gte: inicio, lte: fin };
    }

    const items = await prisma.atencion.findMany({ where, include: includeBase, orderBy: { fechaProgramada: 'asc' }, take: 300 });
    const hoy = inicioDia(new Date());
    const conEstado = items.map((a) => ({
      ...a,
      estadoCalculado: a.estado === 'PENDIENTE' && a.fechaProgramada && inicioDia(a.fechaProgramada) < hoy ? 'ATRASADA' : a.estado,
    }));
    res.json({ total: conEstado.length, atenciones: conEstado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar atenciones' });
  }
});

/** POST /api/atenciones/rotacion — plan de rotación por áreas (ronda inicial manual + renovación automática) */
atencionesRouter.post('/rotacion', async (req, res) => {
  if (!req.user || !ROLES_PLANIFICAR.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: solo Gestor o Coordinador asignan planes de rotación' });
    return;
  }
  try {
    const body = rotacionSchema.parse(req.body);
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) return res.status(404).json({ error: 'Beneficiario no encontrado' });

    const plan = await prisma.planAtencion.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        nombre: body.nombre ?? 'Rotación trimestral por áreas',
        periodicidadMeses: body.periodicidadMeses,
        creadoPor: req.user!.userId,
        observaciones: body.observaciones ?? null,
      },
    });

    const creadas: any[] = [];
    for (const paso of body.pasos) {
      let fecha = await corregirAHabil(new Date(paso.fechaInicial));
      for (let ronda = 0; ronda < body.rondas; ronda++) {
        const creada = await prisma.atencion.create({
          data: {
            beneficiarioId: body.beneficiarioId,
            areaCodigo: paso.areaCodigo,
            tipo: 'ROTACION',
            planAtencionId: plan.id,
            fechaProgramada: fecha,
            estado: 'PENDIENTE',
            creadoPor: req.user!.userId,
            observaciones: ronda === 0 ? 'Fecha asignada por el Gestor' : `Renovación automática (+${body.periodicidadMeses} meses)`,
          },
        });
        creadas.push(creada);
        fecha = await corregirAHabil(addMonths(fecha, body.periodicidadMeses));
      }
    }

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'PLAN_ATENCION',
        registroId: plan.id,
        valorNuevo: { beneficiarioId: body.beneficiarioId, pasos: body.pasos.length, rondas: body.rondas },
        observacion: 'Plan de rotación por áreas creado',
      },
    });

    res.status(201).json({ mensaje: `Plan de rotación creado con ${creadas.length} atención(es)`, plan, atenciones: creadas });
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al crear el plan de rotación' });
  }
});

/** POST /api/atenciones/hechos — registra un hecho emergente y sus seguimientos iniciales */
atencionesRouter.post('/hechos', async (req, res) => {
  if (!req.user || !ROLES_PLANIFICAR.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: solo Gestor o Coordinador registran hechos emergentes' });
    return;
  }
  try {
    const body = hechoSchema.parse(req.body);
    const beneficiario = await prisma.beneficiario.findUnique({ where: { id: body.beneficiarioId } });
    if (!beneficiario) return res.status(404).json({ error: 'Beneficiario no encontrado' });

    const hecho = await prisma.hechoEmergente.create({
      data: {
        beneficiarioId: body.beneficiarioId,
        fechaHecho: new Date(body.fechaHecho),
        ubicacion: body.ubicacion,
        descripcion: body.descripcion ?? null,
        actaReferencia: body.actaReferencia ?? null,
        nivelRiesgo: body.nivelRiesgo,
        estado: 'ABIERTO',
        creadoPor: req.user!.userId,
        observaciones: body.observaciones ?? null,
      },
    });

    const creadas: any[] = [];
    for (const paso of body.pasos) {
      const fecha = await corregirAHabil(new Date(paso.fechaInicial));
      const creada = await prisma.atencion.create({
        data: {
          beneficiarioId: body.beneficiarioId,
          areaCodigo: paso.areaCodigo,
          tipo: 'EMERGENTE',
          hechoEmergenteId: hecho.id,
          fechaProgramada: fecha,
          estado: 'PENDIENTE',
          riesgoEmergente: body.nivelRiesgo,
          creadoPor: req.user!.userId,
          observaciones: `Seguimiento de hecho emergente (riesgo ${body.nivelRiesgo})`,
        },
      });
      creadas.push(creada);
    }

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'HECHO_EMERGENTE',
        registroId: hecho.id,
        valorNuevo: { nivelRiesgo: body.nivelRiesgo, ubicacion: body.ubicacion, seguimientos: creadas.length },
        observacion: 'Hecho emergente registrado con seguimientos',
      },
    });

    res.status(201).json({ mensaje: `Hecho emergente registrado con ${creadas.length} seguimiento(s)`, hecho, atenciones: creadas });
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al registrar el hecho emergente' });
  }
});

/** PATCH /api/atenciones/:id — actualizar estado/fechas de una atención */
atencionesRouter.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const atencion = await prisma.atencion.findUnique({ where: { id } });
    if (!atencion) return res.status(404).json({ error: 'Atención no encontrada' });

    const esGestion = req.user && ['GESTOR', 'COORDINADOR'].includes(req.user.rol);
    const esProfesional = req.user?.rol === 'PROFESIONAL';
    if (!esGestion && !esProfesional) {
      res.status(403).json({ error: 'Prohibido: Secretaría no modifica atenciones' });
      return;
    }

    const body = z.object({
      estado: z.enum(['PENDIENTE', 'REALIZADA', 'CANCELADA']).optional(),
      fechaRealizacion: z.string().optional().nullable(),
      fechaProgramada: z.string().optional().nullable(),
      observaciones: z.string().optional().nullable(),
    }).parse(req.body);

    const data: any = {};
    if (body.estado) data.estado = body.estado;
    if (body.fechaProgramada !== undefined) data.fechaProgramada = body.fechaProgramada ? new Date(body.fechaProgramada) : null;
    if (body.observaciones !== undefined) data.observaciones = body.observaciones;
    if (body.estado === 'REALIZADA') {
      data.fechaRealizacion = body.fechaRealizacion ? new Date(body.fechaRealizacion) : new Date();
    }

    const actualizada = await prisma.atencion.update({ where: { id }, data, include: includeBase });
    res.json(actualizada);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar la atención' });
  }
});

/** POST /api/atenciones/:id/continuar — genera el siguiente seguimiento de la cadena */
atencionesRouter.post('/:id/continuar', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const atencion = await prisma.atencion.findUnique({ where: { id }, include: { planAtencion: true, hechoEmergente: true } });
    if (!atencion) return res.status(404).json({ error: 'Atención no encontrada' });

    const body = z.object({
      areaCodigo: z.string().min(2).max(10).optional().nullable(),
      fechaRealizacion: z.string().optional().nullable(),
      observaciones: z.string().optional().nullable(),
    }).parse(req.body);

    const esGestion = req.user && ['GESTOR', 'COORDINADOR'].includes(req.user.rol);
    const esProfesional = req.user?.rol === 'PROFESIONAL';
    if (!esGestion && !esProfesional) {
      res.status(403).json({ error: 'Prohibido: Secretaría no continúa atenciones' });
      return;
    }

    const fechaRealizacion = body.fechaRealizacion ? new Date(body.fechaRealizacion) : new Date();
    await prisma.atencion.update({
      where: { id },
      data: { estado: 'REALIZADA', fechaRealizacion, observaciones: body.observaciones ?? atencion.observaciones },
    });

    const caso = await prisma.caso.findFirst({ where: { beneficiarioId: atencion.beneficiarioId, estado: 'ACTIVO' } });
    if (!caso) {
      res.json({ mensaje: 'El caso ya está cerrado; no se genera seguimiento.', siguiente: null });
      return;
    }

    const nuevaArea = body.areaCodigo ?? atencion.areaCodigo;
    let nuevaFecha: Date;

    if (atencion.tipo === 'ROTACION' && atencion.planAtencionId) {
      const plan = atencion.planAtencion;
      if (!plan) {
        res.json({ mensaje: 'Plan no encontrado.', siguiente: null });
        return;
      }
      if (!plan.activo) {
        res.json({ mensaje: 'El plan está inactivo; no se genera la siguiente atención.', siguiente: null });
        return;
      }
      nuevaFecha = await corregirAHabil(addMonths(fechaRealizacion, plan.periodicidadMeses));
      const creada = await prisma.atencion.create({
        data: {
          beneficiarioId: atencion.beneficiarioId,
          areaCodigo: nuevaArea,
          tipo: 'ROTACION',
          planAtencionId: plan.id,
          fechaProgramada: nuevaFecha,
          estado: 'PENDIENTE',
          creadoPor: req.user!.userId,
          observaciones: `Renovación automática (+${plan.periodicidadMeses} meses)`,
        },
      });
      res.status(201).json({ mensaje: `Siguiente atención generada para ${nuevaFecha.toISOString().slice(0, 10)}`, siguiente: creada });
      return;
    }

    if (atencion.tipo === 'EMERGENTE' && atencion.hechoEmergenteId) {
      const riesgo = atencion.riesgoEmergente ?? 'MEDIO';
      const dias = RIESGO_DIAS[riesgo] ?? 15;
      nuevaFecha = await corregirAHabil(addDays(fechaRealizacion, dias));
      const creada = await prisma.atencion.create({
        data: {
          beneficiarioId: atencion.beneficiarioId,
          areaCodigo: nuevaArea,
          tipo: 'EMERGENTE',
          hechoEmergenteId: atencion.hechoEmergenteId,
          fechaProgramada: nuevaFecha,
          estado: 'PENDIENTE',
          riesgoEmergente: riesgo,
          creadoPor: req.user!.userId,
          observaciones: `Seguimiento continuado (riesgo ${riesgo}: cada ${dias} días)`,
        },
      });
      res.status(201).json({ mensaje: `Siguiente seguimiento generado para ${nuevaFecha.toISOString().slice(0, 10)} (riesgo ${riesgo}: cada ${dias} días)`, siguiente: creada });
      return;
    }

    res.status(400).json({ error: 'Tipo de atención sin cadena de continuación' });
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al continuar la atención' });
  }
});

/** POST /api/atenciones/hechos/:id/cerrar — cierra el hecho y cancela seguimientos pendientes */
atencionesRouter.post('/hechos/:id/cerrar', async (req, res) => {
  if (!req.user || !ROLES_PLANIFICAR.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: solo Gestor o Coordinador cierran hechos' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const hecho = await prisma.hechoEmergente.findUnique({ where: { id } });
    if (!hecho) return res.status(404).json({ error: 'Hecho emergente no encontrado' });

    await prisma.$transaction(async (tx) => {
      await tx.hechoEmergente.update({ where: { id }, data: { estado: 'CERRADO' } });
      await tx.atencion.updateMany({
        where: { hechoEmergenteId: id, estado: 'PENDIENTE' },
        data: { estado: 'CANCELADA' },
      });
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CERRAR',
        recurso: 'HECHO_EMERGENTE',
        registroId: id,
        observacion: 'Hecho emergente cerrado; seguimientos pendientes cancelados',
      },
    });
    res.json({ mensaje: 'Hecho emergente cerrado y seguimientos pendientes cancelados' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al cerrar el hecho emergente' });
  }
});

/** DELETE /api/atenciones/hechos/:id — elimina un hecho emergente y sus atenciones */
atencionesRouter.delete('/hechos/:id', async (req, res) => {
  if (!req.user || !ROLES_PLANIFICAR.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: solo Gestor o Coordinador pueden eliminar' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const hecho = await prisma.hechoEmergente.findUnique({ where: { id } });
    if (!hecho) return res.status(404).json({ error: 'Hecho emergente no encontrado' });
    await prisma.atencion.deleteMany({ where: { hechoEmergenteId: id } });
    await prisma.hechoEmergente.delete({ where: { id } });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'HECHO_EMERGENTE',
        registroId: id,
        valorAnterior: { beneficiarioId: hecho.beneficiarioId, descripcion: hecho.descripcion },
        observacion: 'Hecho emergente y sus atenciones eliminados',
      },
    });
    res.json({ mensaje: 'Hecho emergente y sus atenciones eliminados' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar el hecho emergente' });
  }
});

/** DELETE /api/atenciones/planes/:id — elimina un plan de atención y sus rotaciones */
atencionesRouter.delete('/planes/:id', async (req, res) => {
  if (!req.user || !ROLES_PLANIFICAR.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: solo Gestor o Coordinador pueden eliminar' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const plan = await prisma.planAtencion.findUnique({ where: { id } });
    if (!plan) return res.status(404).json({ error: 'Plan de atención no encontrado' });
    await prisma.atencion.deleteMany({ where: { planAtencionId: id } });
    await prisma.planAtencion.delete({ where: { id } });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'PLAN_ATENCION',
        registroId: id,
        valorAnterior: { beneficiarioId: plan.beneficiarioId, nombre: plan.nombre },
        observacion: 'Plan de atención y sus atenciones eliminados',
      },
    });
    res.json({ mensaje: 'Plan de atención y sus atenciones eliminados' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar el plan de atención' });
  }
});