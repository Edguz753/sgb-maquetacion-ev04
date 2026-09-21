/**
 * Rutas de beneficiarios — módulo central (línea base V4.1.1).
 * Registro atómico: beneficiario + caso + asignación (área inicial) + actividades del motor.
 * RBAC V4.1.1: crear/modificar → GESTOR, COORDINADOR, SECRETARIA. Profesional → solo lectura
 * con toggle "Mis asignados" / "Todos".
 */
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { autenticar, ROLES_ESCRITURA_BASE } from '../middleware/auth';
import { generarActividadesIniciales } from '../lib/planificacion';
import { asegurarProyectoVida } from '../lib/proyecto-vida';

export const beneficiariosRouter = Router();

beneficiariosRouter.use(autenticar);

const crearBeneficiarioSchema = z.object({
  tipoDocumento: z.string().min(1).max(30),
  numeroDocumento: z.string().min(3).max(50),
  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  fechaNacimiento: z.string().min(1),
  genero: z.string().max(30).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  correo: z.string().email().optional().nullable(),
  direccion: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  // Datos del caso
  fechaIngreso: z.string().min(1),
  motivoIngreso: z.string().optional().nullable(),
  areaInicial: z.string().min(2).max(10), // codigo de area (PS, TS, PD, NT)
  profesionalId: z.number().int().optional().nullable(),
  sim: z.string().max(50).optional().nullable(),
  jornadaClub: z.string().max(50).optional().nullable(),
  taller: z.string().max(60).optional().nullable(),
  barrio: z.string().max(120).optional().nullable(),
  epsId: z.number().int().optional().nullable(),
  defensoriaId: z.number().int().optional().nullable(),
  estadoAfiliacionId: z.number().int().optional().nullable(),
  estado: z.enum(['ACTIVO', 'EGRESADO', 'SUSPENDIDO']).optional(),
  fechaEgreso: z.string().optional().nullable(),
  motivoEgreso: z.string().max(500).optional().nullable(),
});

const actualizarSchema = z.object({
  fechaIngreso: z.string().optional(),
  motivoIngreso: z.string().max(500).optional().nullable(),
  tipoDocumento: z.string().min(1).max(30).optional(),
  numeroDocumento: z.string().min(1).max(50).optional(),
  fechaNacimiento: z.string().optional(),
  nombres: z.string().min(1).max(100).optional(),
  apellidos: z.string().min(1).max(100).optional(),
  telefono: z.string().max(30).optional().nullable(),
  correo: z.string().email().optional().nullable(),
  direccion: z.string().optional().nullable(),
  genero: z.string().max(30).optional().nullable(),
  observaciones: z.string().optional().nullable(),
  sim: z.string().max(50).optional().nullable(),
  jornadaClub: z.string().max(50).optional().nullable(),
  taller: z.string().max(60).optional().nullable(),
  barrio: z.string().max(120).optional().nullable(),
  epsId: z.number().int().optional().nullable(),
  defensoriaId: z.number().int().optional().nullable(),
  estadoAfiliacionId: z.number().int().optional().nullable(),
  estado: z.enum(['ACTIVO', 'EGRESADO', 'SUSPENDIDO']).optional(),
  fechaEgreso: z.string().optional().nullable(),
  motivoEgreso: z.string().max(500).optional().nullable(),
});

/** Taller por edad (regla del club): 6-8 Ingeniosos, 9-13 Ganadores, 14-18 Líderes. */
function tallerPorEdad(fechaNacimiento: Date | string): string | null {
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  if (edad >= 6 && edad <= 8) return 'Ingeniosos';
  if (edad >= 9 && edad <= 13) return 'Ganadores';
  if (edad >= 14 && edad <= 18) return 'Líderes';
  return null;
}

/** Número de historia correlativo: HH-YYYY-NNNN */
async function generarNumeroHistoria(): Promise<string> {
  const anio = new Date().getFullYear();
  const prefijo = `HH-${anio}-`;
  const count = await prisma.beneficiario.count({
    where: { numeroHistoria: { startsWith: prefijo } },
  });
  return `${prefijo}${String(count + 1).padStart(4, '0')}`;
}

/** Número de caso correlativo: CASO-YYYY-NNNN */
async function generarNumeroCaso(): Promise<string> {
  const anio = new Date().getFullYear();
  const prefijo = `CASO-${anio}-`;
  const count = await prisma.caso.count({
    where: { numeroCaso: { startsWith: prefijo } },
  });
  return `${prefijo}${String(count + 1).padStart(4, '0')}`;
}

/**
 * POST /api/beneficiarios
 * Registro atómico: beneficiario + caso + asignación + actividades iniciales + documentos.
 * Solo SECRETARIA, GESTOR, COORDINADOR (RBAC V4.1.1).
 */
beneficiariosRouter.post('/', async (req, res) => {
  // Verificación de permiso por rol (RBAC V4.1.1)
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no tiene permisos para registrar beneficiarios' });
    return;
  }
  try {
    const body = crearBeneficiarioSchema.parse(req.body);

    const existente = await prisma.beneficiario.findUnique({
      where: { numeroDocumento: body.numeroDocumento },
    });
    if (existente) {
      res.status(409).json({ error: 'El número de documento ya está registrado', beneficiario: existente });
      return;
    }

    const area = await prisma.area.findUnique({ where: { codigo: body.areaInicial } });
    if (!area) {
      res.status(400).json({ error: `Área inválida: ${body.areaInicial}` });
      return;
    }

    const numeroHistoria = await generarNumeroHistoria();
    const numeroCaso = await generarNumeroCaso();

    // Si no se indica profesional, se asigna el primer profesional activo del área (carga inicial)
    let profesionalAsignado = body.profesionalId;
    if (!profesionalAsignado) {
      const profArea = await prisma.profesional.findFirst({ where: { activo: true }, orderBy: { id: 'asc' } });
      profesionalAsignado = profArea?.id ?? null;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const beneficiario = await tx.beneficiario.create({
        data: {
          numeroHistoria,
          tipoDocumento: body.tipoDocumento,
          numeroDocumento: body.numeroDocumento,
          nombres: body.nombres,
          apellidos: body.apellidos,
          fechaNacimiento: new Date(body.fechaNacimiento),
          genero: body.genero ?? null,
          telefono: body.telefono ?? null,
          correo: body.correo ?? null,
          direccion: body.direccion ?? null,
          observaciones: body.observaciones ?? null,
          sim: body.sim ?? null,
          jornadaClub: body.jornadaClub ?? null,
          taller: body.taller?.trim() || tallerPorEdad(body.fechaNacimiento),
          barrio: body.barrio?.trim() || null,
          epsId: body.epsId ?? null,
          defensoriaId: body.defensoriaId ?? null,
          estadoAfiliacionId: body.estadoAfiliacionId ?? null,
          fechaIngreso: new Date(body.fechaIngreso),
        },
      });

      const caso = await tx.caso.create({
        data: {
          beneficiarioId: beneficiario.id,
          numeroCaso,
          fechaApertura: new Date(body.fechaIngreso),
          motivoIngreso: body.motivoIngreso ?? null,
        },
      });

      // Asignación inicial: área + profesional (opcional en caso de no existir ninguno)
      const asignacion = await tx.asignacionCaso.create({
        data: {
          casoId: caso.id,
          profesionalId: profesionalAsignado ?? 0,
          areaId: area.id,
          fechaInicio: new Date(body.fechaIngreso),
        },
      });

      const plan = await generarActividadesIniciales({
        beneficiarioId: beneficiario.id,
        casoId: caso.id,
        asignacionCasoId: asignacion.id,
        fechaIngreso: body.fechaIngreso,
        fechaNacimiento: body.fechaNacimiento,
      }, tx);

      // Proyecto de Vida: si el área inicial es PS/TS/PD se genera su cronograma
      const pvCreadas = await asegurarProyectoVida(tx, {
        casoId: caso.id,
        nuevaAsignacionId: asignacion.id,
        areaId: area.id,
        areaCodigo: body.areaInicial,
        fechaIngreso: body.fechaIngreso,
      });

      // Auditoría del registro (V4.1.1)
      await tx.auditoria.create({
        data: {
          usuarioId: req.user!.userId,
          accion: 'CREAR',
          recurso: 'BENEFICIARIO',
          registroId: beneficiario.id,
          valorNuevo: { numeroHistoria, numeroDocumento: body.numeroDocumento },
          observacion: 'Registro inicial de beneficiario con caso y asignación',
        },
      });

      return { beneficiario, caso, asignacion, actividades: plan.actividades, documentos: plan.documentosGenerados, proyectoVida: pvCreadas };
    });

    res.status(201).json({
      mensaje: 'Beneficiario registrado correctamente',
      numeroHistoria: resultado.beneficiario.numeroHistoria,
      numeroCaso: resultado.caso.numeroCaso,
      beneficiario: resultado.beneficiario,
      caso: resultado.caso,
      asignacion: resultado.asignacion,
      actividadesGeneradas: resultado.actividades.map((a) => ({
        id: a.id,
        fechaProgramada: a.fechaProgramada,
        prioridad: a.prioridad,
      })),
      documentosIniciales: resultado.documentos,
    });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al registrar beneficiario' });
  }
});

/**
 * GET /api/beneficiarios?q=&soloAsignados=true
 * Lista/busca beneficiarios con toggle para profesional.
 */
beneficiariosRouter.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim() || '';
    const soloAsignados = req.query.soloAsignados === 'true';
    const esProfesional = req.user!.rol === 'PROFESIONAL';
    const verSoloAsignados = esProfesional && soloAsignados;

    const where: any = {};
    // Módulo de egresados: por defecto el listado oculta los EGRESADOS; con
    // ?estado=EGRESADO se consultan únicamente ellos (página Egresados).
    const estadoFiltro = (req.query.estado as string) || '';
    if (estadoFiltro === 'EGRESADO') {
      where.estado = 'EGRESADO';
    } else if (estadoFiltro === 'ACTIVO' || estadoFiltro === 'SUSPENDIDO') {
      where.estado = estadoFiltro;
    } else {
      where.estado = { not: 'EGRESADO' };
    }
    if (verSoloAsignados && req.user!.profesionalId) {
      where.casos = {
        some: {
          asignaciones: {
            some: { profesionalId: req.user!.profesionalId, estado: 'ACTIVA' },
          },
        },
      };
    }
    if (q) {
      where.OR = [
        { nombres: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { numeroDocumento: { contains: q, mode: 'insensitive' } },
        { numeroHistoria: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.beneficiario.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        casos: {
          include: {
            asignaciones: {
              where: { estado: 'ACTIVA' },
              include: { profesional: { select: { id: true, nombres: true, apellidos: true } }, area: { select: { codigo: true, nombre: true } } },
            },
          },
        },
      },
    });

    res.json({
      soloLectura: esProfesional,
      vista: verSoloAsignados ? 'mis-asignados' : esProfesional ? 'todos' : 'completo',
      total: items.length,
      beneficiarios: items,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar beneficiarios' });
  }
});

/**
 * GET /api/beneficiarios/:id — detalle con caso, asignaciones, actividades y documentos.
 */
beneficiariosRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.beneficiario.findUnique({
      where: { id },
      include: {
        casos: {
          include: {
            asignaciones: {
              include: { profesional: true, area: true, actividades: { include: { tipoActividad: true }, orderBy: { fechaProgramada: 'asc' } } },
            },
            documentos: { include: { tipoDocumento: true } },
          },
        },
        condiciones: true,
        controlesSalud: true,
        controlesNutricionales: true,
        redesApoyo: true,
        alertas: true,
        eps: { select: { id: true, nombre: true, regimen: true } },
        defensoria: { select: { id: true, nombre: true, centroZonal: true } },
        estadoAfiliacion: { select: { id: true, nombre: true, descripcion: true } },
        acudientes: { include: { acudiente: true } },
        matriculas: { include: { colegio: { select: { id: true, nombre: true } }, estadoEscolar: true }, orderBy: [{ actual: 'desc' }, { fechaInicio: 'desc' }] },
      },
    });
    if (!item) {
      res.status(404).json({ error: 'Beneficiario no encontrado' });
      return;
    }
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar beneficiario' });
  }
});

/**
 * PATCH /api/beneficiarios/:id — modifica datos administrativos (RBAC V4.1.1: GESTOR, COORDINADOR, SECRETARIA).
 */
beneficiariosRouter.patch('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no tiene permisos para modificar beneficiarios' });
    return;
  }
  try {
    const body = actualizarSchema.parse(req.body);
    const id = parseInt(req.params.id, 10);
    // Egreso/reactivación: al marcar EGRESADO sin fecha se usa hoy; al volver a
    // ACTIVO se limpian fecha y motivo de egreso; sin cambio de estado no se tocan.
    const dataPatch: Record<string, unknown> = { ...body };
    delete dataPatch.motivoIngreso; // motivoIngreso vive en el CASO, no en el beneficiario
    if (body.fechaNacimiento) dataPatch.fechaNacimiento = new Date(body.fechaNacimiento);
    if (body.fechaIngreso) dataPatch.fechaIngreso = new Date(body.fechaIngreso);

    // Regla del taller: si cambia la fecha de nacimiento sin taller explícito, se recalcula por edad
    if (body.fechaNacimiento && body.taller === undefined) {
      dataPatch.taller = tallerPorEdad(body.fechaNacimiento);
    }
    if (body.estado === 'EGRESADO') {
      dataPatch.fechaEgreso = body.fechaEgreso ? new Date(body.fechaEgreso) : new Date();
    } else if (body.estado === 'ACTIVO') {
      dataPatch.fechaEgreso = null;
      dataPatch.motivoEgreso = null;
    } else {
      delete dataPatch.fechaEgreso;
      delete dataPatch.motivoEgreso;
    }
    const actualizado = await prisma.beneficiario.update({
      where: { id },
      data: dataPatch,
    });

    // Sincronizar el caso: fecha de apertura = fecha de ingreso y motivo de ingreso
    if (body.fechaIngreso || body.motivoIngreso !== undefined) {
      const casoDelBen = await prisma.caso.findFirst({ where: { beneficiarioId: id }, orderBy: { id: 'asc' } });
      if (casoDelBen) {
        await prisma.caso.update({
          where: { id: casoDelBen.id },
          data: {
            ...(body.fechaIngreso ? { fechaApertura: new Date(body.fechaIngreso) } : {}),
            ...(body.motivoIngreso !== undefined ? { motivoIngreso: body.motivoIngreso ?? null } : {}),
          },
        });
      }
    }
    // Auditoría de modificación
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user!.userId,
        accion: 'MODIFICAR',
        recurso: 'BENEFICIARIO',
        registroId: id,
        valorNuevo: body,
        observacion: 'Modificación de datos administrativos',
      },
    });
    res.json(actualizado);
  } catch (e: any) {
    if (e.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
      return;
    }
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Beneficiario no encontrado' });
      return;
    }
    if (e.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un beneficiario con ese número de documento' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar beneficiario' });
  }
});

/**
 * DELETE /api/beneficiarios/:id — eliminación completa en cascada (ADMIN, GESTOR).
 */
beneficiariosRouter.delete('/:id', async (req, res) => {
  if (!req.user || !['ADMIN', 'GESTOR'].includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: solo ADMIN y GESTOR pueden eliminar beneficiarios' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const beneficiario = await prisma.beneficiario.findUnique({
      where: { id },
      include: {
        documentos: {
          include: { evidencias: true },
        },
        casos: {
          include: {
            asignaciones: {
              include: {
                actividades: {
                  include: { evidencias: true },
                },
              },
            },
          },
        },
      },
    });

    if (!beneficiario) {
      res.status(404).json({ error: 'Beneficiario no encontrado' });
      return;
    }

    // Recolectar rutas de archivos físicos a eliminar
    const rutasArchivos: string[] = [];
    for (const doc of beneficiario.documentos) {
      for (const ev of doc.evidencias) {
        if (ev.rutaReferencia) rutasArchivos.push(ev.rutaReferencia);
      }
    }
    for (const caso of beneficiario.casos) {
      for (const asig of caso.asignaciones) {
        for (const act of asig.actividades) {
          for (const ev of act.evidencias) {
            if (ev.rutaReferencia) rutasArchivos.push(ev.rutaReferencia);
          }
        }
      }
    }

    // Verificación de seguridad: un ingreso por error se puede eliminar, pero si ya
    // hubo atención real (asistencias, controles, atenciones, condiciones, etc.) el
    // beneficiario NO se elimina: corresponde retirarlo del programa (estado de afiliación).
    const asigIdsCheck = beneficiario.casos.flatMap((c) => c.asignaciones.map((a) => a.id));
    const [actsRealizadas, controlesSalud, controlesNut, atenciones, hechos, condiciones, escolarizaciones, matriculas, redes] = await Promise.all([
      prisma.actividad.count({ where: { asignacionCasoId: { in: asigIdsCheck }, estado: 'REALIZADA' } }),
      prisma.controlSalud.count({ where: { beneficiarioId: id } }),
      prisma.controlNutricional.count({ where: { beneficiarioId: id } }),
      prisma.atencion.count({ where: { beneficiarioId: id } }),
      prisma.hechoEmergente.count({ where: { beneficiarioId: id } }),
      prisma.condicion.count({ where: { beneficiarioId: id } }),
      prisma.escolarizacion.count({ where: { beneficiarioId: id } }),
      prisma.colegioBeneficiario.count({ where: { beneficiarioId: id } }),
      prisma.redApoyo.count({ where: { beneficiarioId: id } }),
    ]);
    const docsAtendidos = await prisma.documento.count({
      where: { beneficiarioId: id, OR: [{ fechaRecepcion: { not: null } }, { evidencias: { some: {} } }] },
    });
    const bloqueos: string[] = [];
    if (actsRealizadas > 0) bloqueos.push(actsRealizadas + ' actividad(es) realizada(s)');
    if (controlesSalud > 0) bloqueos.push(controlesSalud + ' control(es) de salud');
    if (controlesNut > 0) bloqueos.push(controlesNut + ' control(es) nutricional(es)');
    if (atenciones > 0) bloqueos.push(atenciones + ' atención(es)');
    if (hechos > 0) bloqueos.push(hechos + ' hecho(s) emergente(s)');
    if (condiciones > 0) bloqueos.push(condiciones + ' condición(es) de salud');
    if (escolarizaciones > 0) bloqueos.push('historial de escolarización');
    if (matriculas > 0) bloqueos.push(matriculas + ' matrícula(s) escolar(es)');
    if (redes > 0) bloqueos.push(redes + ' red(es) de apoyo');
    if (docsAtendidos > 0) bloqueos.push(docsAtendidos + ' documento(s) recibido(s)');
    if (bloqueos.length > 0) {
      res.status(409).json({
        error: 'No se puede eliminar porque el beneficiario ya tiene atención registrada (' + bloqueos.join(', ') + '). Si debe salir del programa, cámbiale el estado de afiliación a RETIRADO en su lugar.',
        enUso: true,
        detalle: bloqueos,
      });
      return;
    }

    // Borrado en cascada en transacción de base de datos
    await prisma.$transaction(async (tx) => {
      // 1. Alertas
      await tx.alerta.deleteMany({ where: { beneficiarioId: id } });

      // 2. Redes de apoyo y soportes
      const redes = await tx.redApoyo.findMany({ where: { beneficiarioId: id }, select: { id: true } });
      const redIds = redes.map((r) => r.id);
      if (redIds.length > 0) {
        await tx.soporteRed.deleteMany({ where: { redApoyoId: { in: redIds } } });
        await tx.redApoyo.deleteMany({ where: { id: { in: redIds } } });
      }

      // 3. Documentos y evidencias de documentos
      const docs = await tx.documento.findMany({ where: { beneficiarioId: id }, select: { id: true } });
      const docIds = docs.map((d) => d.id);
      if (docIds.length > 0) {
        await tx.evidencia.deleteMany({ where: { documentoId: { in: docIds } } });
        await tx.documento.deleteMany({ where: { id: { in: docIds } } });
      }

      // 4. Actividades y evidencias de actividades
      const casos = await tx.caso.findMany({ where: { beneficiarioId: id }, select: { id: true } });
      const casoIds = casos.map((c) => c.id);
      if (casoIds.length > 0) {
        const asigs = await tx.asignacionCaso.findMany({ where: { casoId: { in: casoIds } }, select: { id: true } });
        const asigIds = asigs.map((a) => a.id);
        if (asigIds.length > 0) {
          const acts = await tx.actividad.findMany({ where: { asignacionCasoId: { in: asigIds } }, select: { id: true } });
          const actIds = acts.map((a) => a.id);
          if (actIds.length > 0) {
            await tx.evidencia.deleteMany({ where: { actividadId: { in: actIds } } });
            await tx.actividad.deleteMany({ where: { id: { in: actIds } } });
          }
          await tx.asignacionCaso.deleteMany({ where: { id: { in: asigIds } } });
        }
        await tx.caso.deleteMany({ where: { id: { in: casoIds } } });
      }

      // 5. Atenciones, Hechos emergentes y Planes de atención
      await tx.atencion.deleteMany({ where: { beneficiarioId: id } });
      await tx.hechoEmergente.deleteMany({ where: { beneficiarioId: id } });
      await tx.planAtencion.deleteMany({ where: { beneficiarioId: id } });

      // 6. Controles de Salud y Nutrición
      await tx.controlSalud.deleteMany({ where: { beneficiarioId: id } });
      await tx.controlNutricional.deleteMany({ where: { beneficiarioId: id } });

      // 7. Condiciones, Escolarizaciones, Matrículas, Acudientes, Festivos, Reglas
      await tx.condicion.deleteMany({ where: { beneficiarioId: id } });
      await tx.escolarizacion.deleteMany({ where: { beneficiarioId: id } });
      await tx.colegioBeneficiario.deleteMany({ where: { beneficiarioId: id } });
      await tx.beneficiarioAcudiente.deleteMany({ where: { beneficiarioId: id } });
      await tx.festivoExcepcion.deleteMany({ where: { beneficiarioId: id } });
      await tx.reglaInstancia.deleteMany({ where: { beneficiarioId: id } });

      // 8. Beneficiario principal
      await tx.beneficiario.delete({ where: { id } });

      // 9. Registro de Auditoría
      await tx.auditoria.create({
        data: {
          usuarioId: req.user!.userId,
          accion: 'ELIMINAR',
          recurso: 'BENEFICIARIO',
          registroId: id,
          valorAnterior: {
            numeroHistoria: beneficiario.numeroHistoria,
            numeroDocumento: beneficiario.numeroDocumento,
            nombreCompleto: `${beneficiario.nombres} ${beneficiario.apellidos}`,
          },
          observacion: 'Eliminación completa del beneficiario y su expediente',
        },
      });
    });

    // Limpiar archivos físicos de disco
    for (const ruta of rutasArchivos) {
      try {
        const nombreLimpio = ruta.replace('/uploads/', '');
        const archivoDisco = path.join(process.cwd(), 'uploads', nombreLimpio);
        if (fs.existsSync(archivoDisco)) {
          fs.unlinkSync(archivoDisco);
        }
      } catch (err) {
        console.warn('No se pudo borrar archivo físico:', ruta, err);
      }
    }

    res.json({ mensaje: `Beneficiario ${beneficiario.numeroHistoria} eliminado exitosamente` });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar beneficiario', detalle: e.message });
  }
});

