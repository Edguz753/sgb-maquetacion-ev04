/**
 * Rutas de Pre-ingresos — candidatos al programa en fase de citación.
 * Origen: hoja "Ingresos" del histórico Excel (nombre, documento, acudiente,
 * teléfono, lugar, fecha/hora de citación, recordatorio, respuesta).
 * Flujo de estados: PENDIENTE -> CITADO -> CONFIRMADO -> INGRESADO (o DESCARTADO).
 * RBAC: escritura GESTOR/COORDINADOR/SECRETARIA; lectura el resto de autenticados.
 */
import { Router } from 'express';
import { z } from 'zod';
import { EstadoPreIngreso } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { autenticar, ROLES_ESCRITURA_BASE } from '../middleware/auth';

export const preingresosRouter = Router();

preingresosRouter.use(autenticar);

const crearSchema = z.object({
  nombre: z.string().min(1).max(150),
  numeroDocumento: z.string().max(50).optional().nullable(),
  acudiente: z.string().max(150).optional().nullable(),
  telefono: z.string().max(80).optional().nullable(),
  tipoDocumento: z.string().max(30).optional().nullable(),
  documentoAcudiente: z.string().max(50).optional().nullable(),
  ocupacionAcudiente: z.string().max(120).optional().nullable(),
  barrio: z.string().max(120).optional().nullable(),
  direccion: z.string().optional().nullable(),
  motivoAperturaCupo: z.string().optional().nullable(),
  antecedentesMedicos: z.string().optional().nullable(),
  lugarResidencia: z.string().max(150).optional().nullable(),
  fechaCitacion: z.string().optional().nullable(),
  horaCitacion: z.string().max(20).optional().nullable(),
  recordatorio: z.string().max(60).optional().nullable(),
  respuesta: z.string().max(150).optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const actualizarSchema = crearSchema.partial().extend({
  estado: z.enum(['PENDIENTE', 'CITADO', 'CONFIRMADO', 'INGRESADO', 'DESCARTADO']).optional(),
});

preingresosRouter.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim() || '';
    const estado = (req.query.estado as string) || '';
    const where: any = {};
    if (estado && ['PENDIENTE','CITADO','CONFIRMADO','INGRESADO','DESCARTADO'].includes(estado)) where.estado = estado;
    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { numeroDocumento: { contains: q, mode: 'insensitive' } },
        { acudiente: { contains: q, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.preIngreso.findMany({ where, orderBy: [{ estado: 'asc' }, { fechaCitacion: 'desc' }, { createdAt: 'desc' }], take: 200 });
    const resumen = {
      PENDIENTE: items.filter((x) => x.estado === 'PENDIENTE').length,
      CITADO: items.filter((x) => x.estado === 'CITADO').length,
      CONFIRMADO: items.filter((x) => x.estado === 'CONFIRMADO').length,
      INGRESADO: items.filter((x) => x.estado === 'INGRESADO').length,
      DESCARTADO: items.filter((x) => x.estado === 'DESCARTADO').length,
    };
    res.json({ total: items.length, resumen, preingresos: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al consultar pre-ingresos' });
  }
});

/** GET /api/preingresos/tabla?estados=PENDIENTE,CITADO,CONFIRMADO — HTML imprimible con los posibles ingresos para la Defensoría */
preingresosRouter.get('/tabla', async (_req, res) => {
  try {
    const estadosValidos = ['PENDIENTE', 'CITADO', 'CONFIRMADO', 'INGRESADO', 'DESCARTADO'] as const;
    const estados = ((_req.query.estados as string) || 'PENDIENTE,CITADO,CONFIRMADO').split(',').filter((e) => (estadosValidos as readonly string[]).includes(e));
    const items = await prisma.preIngreso.findMany({
      where: { estado: { in: estados as unknown as import('@prisma/client').EstadoPreIngreso[] } },
      orderBy: [{ fechaCitacion: 'asc' }, { createdAt: 'desc' }],
    });
    const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    let filas = '';
    if (items.length === 0) {
      filas = '<tr><td colspan="9" style="padding:16px;text-align:center;color:#666;">No hay posibles ingresos en los estados seleccionados.</td></tr>';
    }
    for (const p of items) {
      const fechaCita = p.fechaCitacion ? new Date(p.fechaCitacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      const estadoColor = p.estado === 'CONFIRMADO' ? '#16a34a' : p.estado === 'CITADO' ? '#1d4ed8' : '#b45309';
      filas += `<tr>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;">${p.nombre || ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;">${p.tipoDocumento || ''} ${p.numeroDocumento || ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;">${(p.acudiente || '') + (p.ocupacionAcudiente ? ' (' + p.ocupacionAcudiente + ')' : '')}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;">${p.telefono || ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;">${p.barrio || ''}${p.barrio && p.direccion ? ', ' : ''}${p.direccion || ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;">${p.motivoAperturaCupo || ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;">${p.antecedentesMedicos || ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;">${fechaCita}${p.horaCitacion ? ' ' + p.horaCitacion : ''}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;color:${estadoColor};font-weight:600;">${p.estado}</td>
      </tr>`;
    }

    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Posibles ingresos — Club Juvenil Demo</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #1e293b; }
  h1 { font-size: 17px; color: #0044A3; margin: 0; }
  h2 { font-size: 14px; margin: 2px 0 0; color: #334155; font-weight: 600; }
  .sub { color: #64748b; font-size: 12px; margin-top: 4px; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 11px; }
  th { border: 1px solid #cbd5e1; padding: 6px 8px; background: #eef2ff; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: .03em; }
  .pie { margin-top: 28px; font-size: 11px; color: #64748b; }
  @media print { body { margin: 8mm; } .noprint { display: none; } }
</style></head>
<body>
  <div class="noprint" style="text-align:right;margin-bottom:8px;"><button onclick="window.print()" style="padding:8px 18px;background:#0044A3;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:13px;">Imprimir / PDF</button></div>
  <h1>Club Juvenil Demo</h1>
  <h2>Posibles ingresos (apertura de cupo) para la Defensoría de Familia</h2>
  <p class="sub">Generado: ${hoy} &nbsp;·&nbsp; Candidatos en estado: ${estados.join(', ')} &nbsp;·&nbsp; Total: ${items.length}</p>
  <table>
    <thead><tr>
      <th>Nombre</th><th>Documento</th><th>Acudiente (ocupación)</th><th>Teléfono</th>
      <th>Barrio / dirección</th><th>Motivo de apertura de cupo</th><th>Antecedentes médicos</th><th>Citación</th><th>Estado</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <p class="pie">Documento generado por el Sistema de Gestión de Beneficiarios (SGB) — sirve para remitir a la Defensoría los posibles ingresos que requieren apertura de caso.</p>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send('<h3>Error al generar la tabla</h3>');
  }
});

preingresosRouter.post('/', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona pre-ingresos' });
    return;
  }
  try {
    const body = crearSchema.parse(req.body);
    const creado = await prisma.preIngreso.create({
      data: {
        nombre: body.nombre.trim(),
        numeroDocumento: body.numeroDocumento?.trim() || null,
        acudiente: body.acudiente?.trim() || null,
        telefono: body.telefono?.trim() || null,
        tipoDocumento: body.tipoDocumento?.trim() || null,
        documentoAcudiente: body.documentoAcudiente?.trim() || null,
        ocupacionAcudiente: body.ocupacionAcudiente?.trim() || null,
        barrio: body.barrio?.trim() || null,
        direccion: body.direccion?.trim() || null,
        motivoAperturaCupo: body.motivoAperturaCupo?.trim() || null,
        antecedentesMedicos: body.antecedentesMedicos?.trim() || null,
        lugarResidencia: body.lugarResidencia?.trim() || null,
        fechaCitacion: body.fechaCitacion ? new Date(body.fechaCitacion) : null,
        horaCitacion: body.horaCitacion?.trim() || null,
        recordatorio: body.recordatorio?.trim() || null,
        respuesta: body.respuesta?.trim() || null,
        observaciones: body.observaciones?.trim() || null,
        estado: body.fechaCitacion ? 'CITADO' : 'PENDIENTE',
      },
    });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'CREAR',
        recurso: 'PREINGRESO',
        registroId: creado.id,
        valorNuevo: { nombre: creado.nombre, estado: creado.estado },
        observacion: 'Pre-ingreso creado',
      },
    });
    res.status(201).json(creado);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Error al crear el pre-ingreso' });
  }
});

preingresosRouter.patch('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona pre-ingresos' });
    return;
  }
  try {
    const body = actualizarSchema.parse(req.body);
    const id = parseInt(req.params.id, 10);
    const data: any = {};
    if (body.nombre !== undefined) data.nombre = body.nombre.trim();
    if (body.numeroDocumento !== undefined) data.numeroDocumento = body.numeroDocumento?.trim() || null;
    if (body.acudiente !== undefined) data.acudiente = body.acudiente?.trim() || null;
    if (body.telefono !== undefined) data.telefono = body.telefono?.trim() || null;
    if (body.tipoDocumento !== undefined) data.tipoDocumento = body.tipoDocumento?.trim() || null;
    if (body.documentoAcudiente !== undefined) data.documentoAcudiente = body.documentoAcudiente?.trim() || null;
    if (body.ocupacionAcudiente !== undefined) data.ocupacionAcudiente = body.ocupacionAcudiente?.trim() || null;
    if (body.barrio !== undefined) data.barrio = body.barrio?.trim() || null;
    if (body.direccion !== undefined) data.direccion = body.direccion?.trim() || null;
    if (body.motivoAperturaCupo !== undefined) data.motivoAperturaCupo = body.motivoAperturaCupo?.trim() || null;
    if (body.antecedentesMedicos !== undefined) data.antecedentesMedicos = body.antecedentesMedicos?.trim() || null;
    if (body.lugarResidencia !== undefined) data.lugarResidencia = body.lugarResidencia?.trim() || null;
    if (body.fechaCitacion !== undefined) data.fechaCitacion = body.fechaCitacion ? new Date(body.fechaCitacion) : null;
    if (body.horaCitacion !== undefined) data.horaCitacion = body.horaCitacion?.trim() || null;
    if (body.recordatorio !== undefined) data.recordatorio = body.recordatorio?.trim() || null;
    if (body.respuesta !== undefined) data.respuesta = body.respuesta?.trim() || null;
    if (body.observaciones !== undefined) data.observaciones = body.observaciones?.trim() || null;
    if (body.estado !== undefined) data.estado = body.estado as EstadoPreIngreso;

    const actualizado = await prisma.preIngreso.update({ where: { id }, data });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'MODIFICAR',
        recurso: 'PREINGRESO',
        registroId: id,
        valorNuevo: { estado: actualizado.estado, nombre: actualizado.nombre },
        observacion: 'Pre-ingreso actualizado',
      },
    });
    res.json(actualizado);
  } catch (e: any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Datos inválidos', detalle: e.errors });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Pre-ingreso no encontrado' });
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar el pre-ingreso' });
  }
});

preingresosRouter.delete('/:id', async (req, res) => {
  if (!req.user || !ROLES_ESCRITURA_BASE.includes(req.user.rol)) {
    res.status(403).json({ error: 'Prohibido: el rol no gestiona pre-ingresos' });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const eliminado = await prisma.preIngreso.delete({ where: { id } });
    await prisma.auditoria.create({
      data: {
        usuarioId: req.user.userId,
        accion: 'ELIMINAR',
        recurso: 'PREINGRESO',
        registroId: id,
        observacion: 'Pre-ingreso eliminado: ' + eliminado.nombre,
      },
    });
    res.json({ ok: true });
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Pre-ingreso no encontrado' });
    console.error(e);
    res.status(500).json({ error: 'Error al eliminar el pre-ingreso' });
  }
});
