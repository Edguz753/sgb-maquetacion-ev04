/**
 * Rutas del Dashboard personalizado por rol — Sprint 7 (línea base V4.1.1).
 * Un único GET /api/dashboard que responde según el rol:
 *  - PROFESIONAL (scope "me"): solo su información — beneficiarios asignados,
 *    actividades (hoy/atrasadas/próximas), controles pendientes de sus beneficiarios,
 *    alertas que le fueron asignadas.
 *  - SECRETARIA / GESTOR / COORDINADOR / ADMIN (scope "global"): visión general —
 *    beneficiarios activos, casos activos, ingresos/egresos del mes, documentos por
 *    estado, alertas abiertas, carga operativa, últimos registros y próximas actividades.
 * RBAC: cualquier usuario autenticado (cada uno recibe su propio alcance).
 */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.use(autenticar);

function inicioDia(f: Date): Date {
  const d = new Date(f);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inicioMes(): Date {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), 1);
}

function calcularEstado(fechaProgramada: Date | null, fechaRealizacion: Date | null, estado: string): string {
  if (fechaRealizacion) return 'REALIZADA';
  if (estado === 'CANCELADA' || estado === 'NO_APLICA') return estado;
  if (fechaProgramada && inicioDia(fechaProgramada) < inicioDia(new Date())) return 'ATRASADA';
  return estado;
}

/** GET /api/dashboard — datos del dashboard según el rol */
dashboardRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const scope = user.rol === 'PROFESIONAL' ? 'me' : 'global';

    if (scope === 'me') {
      // ── Vista PROFESIONAL ──────────────────────────────────────────
      const profesionalId = user.profesionalId;
      if (!profesionalId) {
        return res.json({ scope, perfilIncompleto: true, sinPerfil: 'El usuario no tiene perfil de profesional' });
      }

      // Beneficiarios asignados (asignaciones activas)
      const asignaciones = await prisma.asignacionCaso.findMany({
        where: { profesionalId, estado: 'ACTIVA' },
        include: { caso: { select: { beneficiarioId: true, estado: true } } },
      });
      const beneficiarioIds = [...new Set(asignaciones.filter((a) => a.caso.estado === 'ACTIVO').map((a) => a.caso.beneficiarioId))];

      // Mis actividades (de mis asignaciones activas)
      const misActividades = await prisma.actividad.findMany({
        where: { asignacionCaso: { profesionalId, estado: 'ACTIVA' } },
        include: {
          tipoActividad: { select: { nombre: true } },
          asignacionCaso: { include: { caso: { include: { beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } } } }, area: { select: { codigo: true, nombre: true } } } },
        },
        orderBy: { fechaProgramada: 'asc' },
        take: 200,
      });

      const hoy = inicioDia(new Date());
      const resumen = { HOY: 0, ATRASADAS: 0, PROXIMAS: 0, REALIZADAS: 0 };
      const proximas: any[] = [];
      for (const a of misActividades) {
        const estado = calcularEstado(a.fechaProgramada, a.fechaRealizacion, a.estado);
        if (estado === 'REALIZADA') { resumen.REALIZADAS++; continue; }
        const fp = inicioDia(a.fechaProgramada);
        if (fp < hoy) { resumen.ATRASADAS++; continue; }
        if (fp.getTime() === hoy.getTime()) { resumen.HOY++; proximas.push(a); continue; }
        resumen.PROXIMAS++;
        if (proximas.length < 6) proximas.push(a);
      }

      // Controles pendientes de mis beneficiarios
      const controlesSalud = await prisma.controlSalud.findMany({
        where: { beneficiarioId: { in: beneficiarioIds.length ? beneficiarioIds : [-1] }, estado: { in: ['PENDIENTE'] } },
        include: { tipoControl: { select: { nombre: true } }, beneficiario: { select: { nombres: true, apellidos: true } } },
      });
      const hoy2 = new Date(); hoy2.setHours(0, 0, 0, 0);
      const nutricion = await prisma.controlNutricional.findMany({
        where: { beneficiarioId: { in: beneficiarioIds.length ? beneficiarioIds : [-1] }, fechaProximoControl: { not: null, lt: new Date(new Date().setHours(23, 59, 59, 999)) } },
        include: { beneficiario: { select: { nombres: true, apellidos: true } } },
      });

      // Mis alertas abiertas
      const misAlertas = await prisma.alerta.findMany({
        where: { responsableId: user.userId, estado: { in: ['NUEVA', 'ASIGNADA', 'EN_PROCESO', 'REABIERTA'] } },
        orderBy: [{ prioridad: 'asc' }, { fechaGeneracion: 'desc' }],
        take: 6,
        include: { beneficiario: { select: { id: true, nombres: true, apellidos: true } } },
      });

      return res.json({
        scope,
        perfil: { id: profesionalId, nombre: user.nombreCompleto, rol: user.rol },
        misBeneficiarios: beneficiarioIds.length,
        resumenActividades: resumen,
        actividadesHoy: proximas.slice(0, 6).map((a) => ({
          id: a.id,
          tipo: a.tipoActividad.nombre,
          fechaProgramada: a.fechaProgramada,
          beneficiario: a.asignacionCaso?.caso.beneficiario
            ? { id: a.asignacionCaso.caso.beneficiario.id, nombre: `${a.asignacionCaso.caso.beneficiario.nombres} ${a.asignacionCaso.caso.beneficiario.apellidos}` }
            : null,
          area: a.asignacionCaso?.area?.nombre ?? null,
          estado: calcularEstado(a.fechaProgramada, a.fechaRealizacion, a.estado),
        })),
        controlesPendientes: {
          salud: controlesSalud.slice(0, 5).map((c) => ({ id: c.id, tipo: c.tipoControl.nombre, beneficiario: `${c.beneficiario.nombres} ${c.beneficiario.apellidos}` })),
          saludTotal: controlesSalud.length,
          nutricion: nutricion.slice(0, 5).map((n) => ({ id: n.id, beneficiario: `${n.beneficiario.nombres} ${n.beneficiario.apellidos}`, proximo: n.fechaProximoControl })),
          nutricionTotal: nutricion.length,
        },
        misAlertas: misAlertas.map((a) => ({ id: a.id, titulo: a.titulo, prioridad: a.prioridad, estado: a.estado, beneficiario: a.beneficiario?.nombres ?? null })),
      });
    }

    // ── Vista GLOBAL (Secretaría, Gestor, Coordinador, Admin) ────────
    const mes = inicioMes();
    const hoy = inicioDia(new Date());

    const [beneficiariosActivos, casosActivos, ingresosMes, egresosMes] = await Promise.all([
      prisma.beneficiario.count({ where: { estado: 'ACTIVO' } }),
      prisma.caso.count({ where: { estado: 'ACTIVO' } }),
      prisma.beneficiario.count({ where: { fechaIngreso: { gte: mes } } }),
      prisma.beneficiario.count({ where: { fechaEgreso: { gte: mes } } }),
    ]);

    const documentosAgrupado = await prisma.documento.groupBy({ by: ['estado'], _count: { _all: true } });
    const documentos: Record<string, number> = {};
    for (const d of documentosAgrupado) documentos[d.estado] = d._count._all;

    const actividadesAtrasadas = await prisma.actividad.count({
      where: { fechaProgramada: { lt: hoy }, estado: { notIn: ['REALIZADA', 'CANCELADA', 'NO_APLICA'] } },
    });
    const actividadesHoy = await prisma.actividad.count({
      where: { fechaProgramada: { gte: hoy, lt: new Date(hoy.getTime() + 86400000) }, estado: { notIn: ['CANCELADA', 'NO_APLICA'] } },
    });

    const alertasAgrupado = await prisma.alerta.groupBy({
      by: ['prioridad'],
      where: { estado: { in: ['NUEVA', 'ASIGNADA', 'EN_PROCESO', 'REABIERTA'] } },
      _count: { _all: true },
    });
    const alertas: Record<string, number> = { NUEVAS: 0 };
    for (const a of alertasAgrupado) alertas[a.prioridad] = a._count._all;

    // Carga operativa
    const profesionales = await prisma.profesional.findMany({
      where: { activo: true },
      include: { asignaciones: { where: { estado: 'ACTIVA' }, include: { caso: { select: { beneficiarioId: true, estado: true } } } } },
    });
    const carga = profesionales.map((p) => {
      const ids = new Set(p.asignaciones.filter((a) => a.caso.estado === 'ACTIVO').map((a) => a.caso.beneficiarioId));
      return { id: p.id, nombre: `${p.nombres} ${p.apellidos}`, beneficiarios: ids.size };
    }).sort((a, b) => b.beneficiarios - a.beneficiarios);

    // Actividades por área (hoy y atrasadas)
    const acts = await prisma.actividad.findMany({
      include: {
        tipoActividad: { select: { nombre: true } },
        asignacionCaso: { include: { area: { select: { codigo: true, nombre: true } }, caso: { include: { beneficiario: { select: { id: true, nombres: true, apellidos: true, numeroHistoria: true } } } } } },
      },
      orderBy: { fechaProgramada: 'asc' },
      take: 400,
    });
    const porArea: Record<string, { hoy: number; atrasadas: number }> = {};
    for (const a of acts) {
      const cod = a.asignacionCaso?.area?.codigo ?? '—';
      const estado = calcularEstado(a.fechaProgramada, a.fechaRealizacion, a.estado);
      const fila = porArea[cod] ?? { hoy: 0, atrasadas: 0 };
      const fp = a.fechaProgramada ? inicioDia(a.fechaProgramada) : null;
      if (estado === 'ATRASADA') fila.atrasadas++;
      else if (fp && fp.getTime() === hoy.getTime()) fila.hoy++;
      porArea[cod] = fila;
    }

    const ultimosBeneficiarios = await prisma.beneficiario.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, nombres: true, apellidos: true, numeroHistoria: true, fechaIngreso: true, estado: true },
    });
    const proximasActividades = acts
      .filter((a) => !a.fechaRealizacion && a.fechaProgramada && inicioDia(a.fechaProgramada) >= hoy)
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        tipo: a.tipoActividad.nombre,
        fechaProgramada: a.fechaProgramada,
        beneficiario: a.asignacionCaso?.caso.beneficiario ? { id: a.asignacionCaso.caso.beneficiario.id, nombre: `${a.asignacionCaso.caso.beneficiario.nombres} ${a.asignacionCaso.caso.beneficiario.apellidos}` } : null,
        area: a.asignacionCaso?.area?.nombre ?? null,
        estado: calcularEstado(a.fechaProgramada, a.fechaRealizacion, a.estado),
      }));

    const alertasCriticas = await prisma.alerta.findMany({
      where: { prioridad: 'ALTA', estado: { in: ['NUEVA', 'ASIGNADA', 'EN_PROCESO', 'REABIERTA'] } },
      include: { beneficiario: { select: { id: true, nombres: true, apellidos: true } } },
      orderBy: { fechaGeneracion: 'desc' },
      take: 5,
    });

    return res.json({
      scope,
      perfil: { nombre: user.nombreCompleto, rol: user.rol },
      kpis: {
        beneficiariosActivos,
        casosActivos,
        ingresosMes,
        egresosMes,
        actividadesHoy,
        actividadesAtrasadas,
        alertasAbiertas: alertas.NUEVAS + (alertas.ALTA ?? 0) + (alertas.MEDIA ?? 0) + (alertas.BAJA ?? 0),
        alertasAlta: alertas.ALTA ?? 0,
      },
      documentos,
      porArea,
      carga: carga.slice(0, 6),
      ultimosBeneficiarios,
      proximasActividades,
      alertasCriticas: alertasCriticas.map((a) => ({ id: a.id, titulo: a.titulo, estado: a.estado, beneficiario: a.beneficiario?.nombres ?? null })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al construir el dashboard' });
  }
});
