/**
 * Motor de alertas SGB — Sprint 6 (línea base V4.1.1).
 * Escanea los datos y genera alertas automáticas (sin duplicar las ya abiertas):
 *  - DOCUMENTO: documentos en estado PENDIENTE o FALTANTE (ALTA)
 *  - ACTIVIDAD: actividades con fecha programada vencida sin realizar (ALTA)
 *  - SALUD: controles de salud atrasados (ALTA) o próximos en <=7 días (MEDIA)
 *  - NUTRICION: próximos controles nutricionales vencidos (ALTA)
 *  - ESCOLARIZACION: beneficiarios >=5 años sin escolarizar (MEDIA)
 *  - RED_APOYO: redes en VERIFICACION_PENDIENTE (MEDIA)
 * Deduplicación por (tipo, beneficiario, documento/actividad o título determinista).
 */
import { Prisma, EstadoAlerta } from '@prisma/client';
import { prisma } from './prisma';

type Tx = Prisma.TransactionClient;

interface Candidata {
  tipo: string;
  beneficiarioId: number;
  titulo: string;
  descripcion?: string | null;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  documentoId?: number | null;
  actividadId?: number | null;
  fechaLimite?: Date | null;
}

const ESTADOS_ABIERTOS: EstadoAlerta[] = ['NUEVA', 'ASIGNADA', 'EN_PROCESO', 'REABIERTA'] as EstadoAlerta[];

function inicioDia(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function ejecutarEscaneoAlertas(tx: Tx = prisma) {
  const hoy = inicioDia(new Date());
  const en7 = new Date(hoy);
  en7.setDate(en7.getDate() + 7);
  const candidatas: Candidata[] = [];

  // ── Regla 1: documentos pendientes / faltantes ──────────────────────
  const docs = await tx.documento.findMany({
    where: { estado: { in: ['PENDIENTE', 'FALTANTE'] } },
    include: { tipoDocumento: true, beneficiario: true },
  });
  for (const d of docs) {
    candidatas.push({
      tipo: 'DOCUMENTO',
      beneficiarioId: d.beneficiarioId,
      documentoId: d.id,
      titulo: `Documento pendiente: ${d.tipoDocumento.nombre} (doc #${d.id})`,
      descripcion: `${d.beneficiario.nombres} ${d.beneficiario.apellidos} — ${d.tipoDocumento.nombre} sin recibir`,
      prioridad: 'ALTA',
      fechaLimite: d.fechaVencimiento,
    });
  }

  // ── Regla 2: actividades atrasadas ──────────────────────────────────
  const acts = await tx.actividad.findMany({
    where: { fechaProgramada: { lt: hoy }, estado: { notIn: ['REALIZADA', 'CANCELADA', 'NO_APLICA'] } },
    include: { tipoActividad: true, asignacionCaso: { include: { caso: { include: { beneficiario: true } } } } },
  });
  for (const a of acts) {
    candidatas.push({
      tipo: 'ACTIVIDAD',
      beneficiarioId: a.asignacionCaso.caso.beneficiarioId,
      actividadId: a.id,
      titulo: `Actividad atrasada: ${a.tipoActividad.nombre} (act #${a.id})`,
      descripcion: `Programada para ${a.fechaProgramada.toISOString().slice(0, 10)} y sin realizar`,
      prioridad: 'ALTA',
      fechaLimite: a.fechaProgramada,
    });
  }

  // ── Regla 3: controles de salud atrasados y próximos ────────────────
  const controles = await tx.controlSalud.findMany({
    where: { estado: { notIn: ['REALIZADO', 'CANCELADO', 'NO_APLICA'] }, fechaProgramada: { not: null } },
    include: { tipoControl: true, beneficiario: true },
  });
  for (const c of controles) {
    if (!c.fechaProgramada) continue;
    const fp = inicioDia(c.fechaProgramada);
    if (fp < hoy) {
      candidatas.push({
        tipo: 'SALUD',
        beneficiarioId: c.beneficiarioId,
        titulo: `Control de salud atrasado: ${c.tipoControl.nombre} (ctrl #${c.id})`,
        descripcion: `Programado para ${fp.toISOString().slice(0, 10)} y sin realizar`,
        prioridad: 'ALTA',
        fechaLimite: c.fechaProgramada,
      });
    } else if (fp <= en7) {
      candidatas.push({
        tipo: 'SALUD',
        beneficiarioId: c.beneficiarioId,
        titulo: `Control de salud próximo: ${c.tipoControl.nombre} (ctrl #${c.id})`,
        descripcion: 'Control programado dentro de los próximos 7 días',
        prioridad: 'MEDIA',
        fechaLimite: c.fechaProgramada,
      });
    }
  }

  // ── Regla 4: controles nutricionales vencidos ───────────────────────
  const nutr = await tx.controlNutricional.findMany({
    where: { fechaProximoControl: { lt: hoy } },
    include: { beneficiario: true },
  });
  for (const n of nutr) {
    candidatas.push({
      tipo: 'NUTRICION',
      beneficiarioId: n.beneficiarioId,
      titulo: `Control nutricional vencido · ben #${n.beneficiarioId} · ctrl #${n.id}`,
      descripcion: `Próximo control vencido desde ${n.fechaProximoControl?.toISOString().slice(0, 10)} (riesgo: ${n.nivelRiesgo})`,
      prioridad: 'ALTA',
      fechaLimite: n.fechaProximoControl,
    });
  }

  // ── Regla 5: niños >=5 años sin escolarizar ─────────────────────────
  const bens = await tx.beneficiario.findMany({
    where: { estado: 'ACTIVO' },
    include: { escolarizaciones: { orderBy: { fechaRegistro: 'desc' }, take: 1 } },
  });
  for (const b of bens) {
    const edadAnios = Math.floor((hoy.getTime() - new Date(b.fechaNacimiento).getTime()) / 31557600000);
    const ultimo = b.escolarizaciones[0];
    const sinEscolarizar = !ultimo || ultimo.estadoEscolar === 'SIN_ESCOLARIZAR';
    if (edadAnios >= 5 && sinEscolarizar) {
      candidatas.push({
        tipo: 'ESCOLARIZACION',
        beneficiarioId: b.id,
        titulo: `Sin escolarizar (edad ${edadAnios}) · ben #${b.id}`,
        descripcion: `${b.nombres} ${b.apellidos} tiene ${edadAnios} años sin escolaridad registrada`,
        prioridad: 'MEDIA',
      });
    }
  }

  // ── Regla 6: redes en verificación pendiente ────────────────────────
  const redes = await tx.redApoyo.findMany({
    where: { estado: 'VERIFICACION_PENDIENTE' },
    include: { tipoRed: true, beneficiario: true },
  });
  for (const r of redes) {
    candidatas.push({
      tipo: 'RED_APOYO',
      beneficiarioId: r.beneficiarioId,
      titulo: `Red con verificación pendiente: ${r.tipoRed.nombre} (red #${r.id})`,
      descripcion: `${r.beneficiario.nombres} ${r.beneficiario.apellidos} — verificar vinculación con ${r.tipoRed.nombre}`,
      prioridad: 'MEDIA',
    });
  }

  // ── Deduplicación y creación ────────────────────────────────────────
  let creadas = 0;
  let omitidas = 0;
  const detalle: Array<{ id: number; tipo: string; titulo: string }> = [];

  for (const cand of candidatas) {
    const existente = await tx.alerta.findFirst({
      where: {
        tipo: cand.tipo as any,
        beneficiarioId: cand.beneficiarioId,
        estado: { in: ESTADOS_ABIERTOS },
        OR: [
          ...(cand.documentoId ? [{ documentoId: cand.documentoId }] : []),
          ...(cand.actividadId ? [{ actividadId: cand.actividadId }] : []),
          ...(cand.documentoId || cand.actividadId ? [] : [{ titulo: cand.titulo }]),
        ],
      },
    });
    if (existente) {
      omitidas++;
      continue;
    }
    const creada = await tx.alerta.create({
      data: {
        beneficiarioId: cand.beneficiarioId,
        tipo: cand.tipo as any,
        titulo: cand.titulo,
        descripcion: cand.descripcion ?? null,
        prioridad: cand.prioridad,
        estado: 'NUEVA',
        fechaLimite: cand.fechaLimite,
        documentoId: cand.documentoId ?? null,
        actividadId: cand.actividadId ?? null,
      },
    });
    detalle.push({ id: creada.id, tipo: creada.tipo, titulo: creada.titulo });
    creadas++;
  }

  return { candidatas: candidatas.length, creadas, omitidas, detalle };
}