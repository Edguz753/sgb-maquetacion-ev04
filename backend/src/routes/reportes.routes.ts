/**
 * Rutas de Reportes — Sprint 8 (línea base V4.1.1).
 * Reporte de beneficiarios con filtros (búsqueda, estado, área, rango de ingreso)
 * en tres formatos: json (vista previa), csv (Excel, UTF-8 con BOM) y html
 * (documento de impresión / Guardar como PDF).
 * RBAC (seed: REPORTE): lectura para todos; PROFESIONAL solo sus beneficiarios asignados.
 */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { autenticar } from '../middleware/auth';

export const reportesRouter = Router();

reportesRouter.use(autenticar);

const CABECERAS = ['Historia', 'Documento', 'Nombres', 'Apellidos', 'Edad', 'Género', 'Área', 'Profesional', 'Estado', 'Fecha de ingreso'];

function edad(fechaNacimiento: Date): number {
  const nac = new Date(fechaNacimiento);
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

function celdasCsv(valor: unknown): string {
  const s = valor === null || valor === undefined ? '' : String(valor);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * GET /api/reportes/agenda?mes=YYYY-MM&profesionalId=&formato=json|html
 * Agenda mensual para imprimir:
 *  - Con profesionalId: las atenciones/seguimientos del mes de su(s) área(s) y las
 *    actividades de sus asignaciones activas (actas, planes, proyecto de vida…).
 *  - Sin profesionalId (vista del gestor): actas de caso del mes de todo el club
 *    (análisis y plan por área) y atenciones de todas las áreas.
 */
reportesRouter.get('/agenda', async (req, res) => {
  try {
    const formato = ((req.query.formato as string) || 'json').toLowerCase();
    const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
    const profesionalId = req.query.profesionalId ? parseInt(req.query.profesionalId as string, 10) : null;
    const [anio, numMes] = mes.split('-').map(Number);
    if (!anio || !numMes) return res.status(400).json({ error: 'mes inválido (usa YYYY-MM)' });
    const inicio = new Date(anio, numMes - 1, 1);
    const fin = new Date(anio, numMes, 1);

    let nombreProfesional = 'Todos los profesionales (vista de gestión)';
    let areaCodigos: string[] = [];
    if (profesionalId) {
      const pro = await prisma.profesional.findUnique({
        where: { id: profesionalId },
        include: { asignaciones: { where: { estado: 'ACTIVA' }, include: { area: true } }, usuario: true },
      });
      if (!pro) return res.status(404).json({ error: 'Profesional no encontrado' });
      nombreProfesional = `${pro.nombres} ${pro.apellidos}`;
      areaCodigos = [...new Set(pro.asignaciones.filter((a) => a.area).map((a) => a.area!.codigo))];
    }

    const atenciones = await prisma.atencion.findMany({
      where: {
        fechaProgramada: { gte: inicio, lt: fin },
        ...(areaCodigos.length ? { areaCodigo: { in: areaCodigos } } : {}),
      },
      include: { beneficiario: { select: { numeroHistoria: true, nombres: true, apellidos: true } } },
      orderBy: { fechaProgramada: 'asc' },
    });

    const actividades = await prisma.actividad.findMany({
      where: {
        fechaProgramada: { gte: inicio, lt: fin },
        ...(profesionalId ? { asignacionCaso: { profesionalId, estado: 'ACTIVA' } } : {}),
      },
      include: {
        tipoActividad: true,
        asignacionCaso: { include: { area: true, profesional: true, caso: { include: { beneficiario: { select: { numeroHistoria: true, nombres: true, apellidos: true } } } } } },
      },
      orderBy: { fechaProgramada: 'asc' },
    });

    if (formato === 'json') {
      return res.json({
        mes, profesional: nombreProfesional, areaCodigos,
        atenciones: atenciones.map((a) => ({
          id: a.id, fecha: a.fechaProgramada, area: a.areaCodigo, tipo: a.tipo,
          beneficiario: `${a.beneficiario.nombres} ${a.beneficiario.apellidos} (${a.beneficiario.numeroHistoria})`,
          estado: a.estado, observaciones: a.observaciones,
        })),
        actividades: actividades.map((a) => ({
          id: a.id, fecha: a.fechaProgramada, tipo: a.tipoActividad.nombre,
          area: a.asignacionCaso?.area?.nombre ?? '',
          profesional: a.asignacionCaso?.profesional ? `${a.asignacionCaso.profesional.nombres} ${a.asignacionCaso.profesional.apellidos}` : '',
          beneficiario: a.asignacionCaso?.caso?.beneficiario ? `${a.asignacionCaso.caso.beneficiario.nombres} ${a.asignacionCaso.caso.beneficiario.apellidos} (${a.asignacionCaso.caso.beneficiario.numeroHistoria})` : '',
          estado: calcularEstadoAgenda(a.fechaProgramada, a.fechaRealizacion, a.estado),
        })),
      });
    }

    const nombreMes = new Date(anio, numMes - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    function filaAtenciones(a: any): string {
      const fecha = new Date(a.fechaProgramada).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
      const estadoColor = a.estado === 'REALIZADA' ? '#16a34a' : new Date(a.fechaProgramada) < new Date() ? '#dc2626' : '#1d4ed8';
      return `<tr>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${fecha}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${a.beneficiario.numeroHistoria} — ${a.beneficiario.nombres} ${a.beneficiario.apellidos}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${a.areaCodigo}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${a.tipo}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;color:${estadoColor};font-weight:600;">${a.estado}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${a.observaciones || ''}</td>
      </tr>`;
    }
    function filaActividades(a: any): string {
      const fecha = new Date(a.fechaProgramada).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
      const estadoColor = a.estado === 'REALIZADA' ? '#16a34a' : new Date(a.fechaProgramada) < new Date() ? '#dc2626' : '#1d4ed8';
      const ben = a.asignacionCaso?.caso?.beneficiario ? `${a.asignacionCaso.caso.beneficiario.numeroHistoria} — ${a.asignacionCaso.caso.beneficiario.nombres} ${a.asignacionCaso.caso.beneficiario.apellidos}` : '';
      return `<tr>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${fecha}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${ben}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${a.tipoActividad.nombre}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${a.asignacionCaso?.area?.nombre ?? ''}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${a.asignacionCaso?.profesional ? a.asignacionCaso.profesional.nombres + ' ' + a.asignacionCaso.profesional.apellidos : ''}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;color:${estadoColor};font-weight:600;">${estadoActividadVista(a)}</td>
        <td style="border:1px solid #cbd5e1;padding:5px 7px;">${a.observaciones || ''}</td>
      </tr>`;
    }
    function calcularEstadoAgenda(fechaProgramada: Date, fechaRealizacion: Date | null, estado: string): string {
      if (fechaRealizacion) return 'REALIZADA';
      if (estado === 'CANCELADA' || estado === 'NO_APLICA') return estado;
      return new Date(fechaProgramada) < new Date() ? 'ATRASADA' : estado;
    }
    function estadoActividadVista(a: any): string {
      if (a.fechaRealizacion) return 'REALIZADA';
      if (a.estado === 'CANCELADA' || a.estado === 'NO_APLICA') return a.estado;
      return new Date(a.fechaProgramada) < new Date() ? 'ATRASADA' : a.estado;
    }

    const filasAt = atenciones.map(filaAtenciones).join('\n') || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#666;">Sin atenciones programadas este mes.</td></tr>';
    const filasAc = actividades.map(filaActividades).join('\n') || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#666;">Sin actividades programadas este mes.</td></tr>';

    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Agenda ${nombreMes} — ${nombreProfesional}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #1e293b; }
  h1 { font-size: 17px; color: #0044A3; margin: 0; }
  h2 { font-size: 14px; margin: 2px 0 0; color: #334155; font-weight: 600; }
  .sub { color: #64748b; font-size: 12px; margin-top: 4px; }
  h3 { font-size: 13px; color: #0044A3; margin: 18px 0 6px; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th { border: 1px solid #cbd5e1; padding: 5px 7px; background: #eef2ff; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: .03em; }
  .pie { margin-top: 26px; font-size: 11px; color: #64748b; }
  @media print { body { margin: 8mm; } .noprint { display: none; } }
</style></head>
<body>
  <div class="noprint" style="text-align:right;margin-bottom:8px;"><button onclick="window.print()" style="padding:8px 18px;background:#0044A3;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:13px;">Imprimir / PDF</button></div>
  <h1>Club Juvenil Demo</h1>
  <h2>Agenda del mes: ${nombreMes} — ${nombreProfesional}</h2>
  <p class="sub">Generado: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}${areaCodigos.length ? ' · Áreas: ' + areaCodigos.join(', ') : ''}</p>

  <h3>Atenciones y seguimientos del mes</h3>
  <table>
    <thead><tr><th>Fecha</th><th>Beneficiario</th><th>Área</th><th>Tipo</th><th>Estado</th><th>Observaciones</th></tr></thead>
    <tbody>${filasAt}</tbody>
  </table>

  <h3>Actividades de caso del mes (actas, planes, proyecto de vida y demás)</h3>
  <table>
    <thead><tr><th>Fecha</th><th>Beneficiario</th><th>Actividad</th><th>Área</th><th>Profesional</th><th>Estado</th><th>Observaciones</th></tr></thead>
    <tbody>${filasAc}</tbody>
  </table>

  <p class="pie">Documento generado por el Sistema de Gestión de Beneficiarios (SGB) — entrega mensual al profesional.</p>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar la agenda' });
  }
});

/** GET /api/reportes/beneficiarios?formato=json|csv|html&q=&estado=&area=&desde=&hasta= */
reportesRouter.get('/beneficiarios', async (req, res) => {
  try {
    const formato = ((req.query.formato as string) || 'json').toLowerCase();
    const q = (req.query.q as string)?.trim() || '';
    const estado = (req.query.estado as string) || '';
    // Por defecto los egresados no aparecen en reportes; con estado=EGRESADO se reportan solo ellos.
    const estadoEfectivo = estado || 'NO_EGRESADO';
    const area = (req.query.area as string) || '';
    const desde = (req.query.desde as string) || '';
    const hasta = (req.query.hasta as string) || '';

    const where: any = {};
    if (estadoEfectivo === 'EGRESADO') where.estado = 'EGRESADO';
    else if (estadoEfectivo === 'NO_EGRESADO') where.estado = { not: 'EGRESADO' };
    else where.estado = estadoEfectivo;
    if (desde || hasta) {
      where.fechaIngreso = {
        ...(desde ? { gte: new Date(desde) } : {}),
        ...(hasta ? { lte: new Date(`${hasta}T23:59:59`) } : {}),
      };
    }
    if (q) {
      where.OR = [
        { nombres: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { numeroHistoria: { contains: q, mode: 'insensitive' } },
        { numeroDocumento: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Alcance: PROFESIONAL solo sus beneficiarios con asignación activa
    const filtrosAsignaciones: any[] = [];
    if (area) filtrosAsignaciones.push({ estado: 'ACTIVA', area: { codigo: area } });
    if (req.user?.rol === 'PROFESIONAL' && req.user.profesionalId) {
      filtrosAsignaciones.push({ estado: 'ACTIVA', profesionalId: req.user.profesionalId });
    }
    if (filtrosAsignaciones.length > 0) {
      where.casos = { some: { asignaciones: { some: filtrosAsignaciones.length === 1 ? filtrosAsignaciones[0] : { AND: filtrosAsignaciones } } } };
    }

    const beneficiarios = await prisma.beneficiario.findMany({
      where,
      orderBy: [{ fechaIngreso: 'desc' }, { id: 'asc' }],
      include: {
        casos: {
          include: {
            asignaciones: {
              where: { estado: 'ACTIVA' },
              include: {
                area: { select: { codigo: true, nombre: true } },
                profesional: { select: { id: true, nombres: true, apellidos: true } },
              },
            },
          },
        },
      },
    });

    const filas = beneficiarios.map((b) => {
      const casoActivo = b.casos.find((c) => c.estado === 'ACTIVO') ?? b.casos[0];
      const activa = casoActivo?.asignaciones?.[0];
      return {
        id: b.id,
        historia: b.numeroHistoria,
        documento: `${b.tipoDocumento} ${b.numeroDocumento}`,
        nombres: b.nombres,
        apellidos: b.apellidos,
        edad: edad(b.fechaNacimiento),
        genero: b.genero ?? '',
        area: activa?.area?.codigo ?? '',
        areaNombre: activa?.area?.nombre ?? '',
        profesional: activa?.profesional ? `${activa.profesional.nombres} ${activa.profesional.apellidos}` : '',
        estado: b.estado,
        fechaIngreso: new Date(b.fechaIngreso).toISOString().slice(0, 10),
      };
    });

    const filtrosResumen = [
      estado ? `Estado: ${estado}` : null,
      area ? `Área: ${area}` : null,
      desde ? `Desde: ${desde}` : null,
      hasta ? `Hasta: ${hasta}` : null,
      q ? `Búsqueda: ${q}` : null,
    ].filter(Boolean).join(' · ');

    if (formato === 'csv') {
      const bom = String.fromCharCode(65279);
      const lineas = [CABECERAS.map(celdasCsv).join(';')];
      for (const f of filas) {
        lineas.push([f.historia, f.documento, f.nombres, f.apellidos, f.edad, f.genero, f.areaNombre || f.area, f.profesional, f.estado, f.fechaIngreso].map(celdasCsv).join(';'));
      }
      const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reporte-beneficiarios-${fecha}.csv"`);
      res.send(bom + lineas.join('\r\n'));
      return;
    }

    if (formato === 'html') {
      const fechaGen = new Date().toLocaleString('es-CO');
      const filasHtml = filas
        .map(
          (f) => `<tr>
            <td>${f.historia}</td>
            <td>${f.documento}</td>
            <td>${f.nombres}</td>
            <td>${f.apellidos}</td>
            <td class="c">${f.edad}</td>
            <td class="c">${f.genero}</td>
            <td class="c">${f.area}</td>
            <td>${f.profesional}</td>
            <td class="c"><span class="pill ${f.estado === 'ACTIVO' ? 'p-verde' : 'p-gris'}">${f.estado}</span></td>
            <td class="c">${f.fechaIngreso}</td>
          </tr>`,
        )
        .join('\n');
      const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>SGB — Reporte de beneficiarios</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #0f172a; }
  .barra { position: fixed; top: 0; left: 0; right: 0; background: #0f766e; padding: 10px 24px; }
  .barra button { background: #fff; color: #0f766e; border: none; padding: 8px 18px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; }
  .cabecera { margin-top: 64px; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0f766e; padding-bottom: 10px; }
  h1 { font-size: 20px; margin: 0; }
  .meta { font-size: 12px; color: #475569; text-align: right; }
  .filtros { font-size: 12px; color: #334155; margin: 10px 0 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0f766e; color: #fff; text-align: left; padding: 6px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .c { text-align: center; }
  .pill { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
  .p-verde { background: #d1fae5; color: #065f46; }
  .p-gris { background: #e2e8f0; color: #334155; }
  .pie { margin-top: 18px; font-size: 11px; color: #64748b; }
  @media print {
    .barra { display: none; }
    .cabecera { margin-top: 0; }
    body { margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="barra"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
  <div class="cabecera">
    <div>
      <h1>SGB — Reporte de beneficiarios</h1>
      <div class="meta">Sistema de Gestión de Beneficiarios · Línea base V4.1.1</div>
    </div>
    <div class="meta">Generado: ${fechaGen}<br>Total: ${filas.length} beneficiario(s)</div>
  </div>
  <div class="filtros"><strong>Filtros:</strong> ${filtrosResumen || 'Sin filtros'}</div>
  <table>
    <thead><tr>${CABECERAS.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${filasHtml || '<tr><td colspan="10" class="c">Sin resultados para los filtros aplicados</td></tr>'}</tbody>
  </table>
  <div class="pie">Documento generado automáticamente por el SGB. La información aquí contenida es de uso interno.</div>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }

    // json (vista previa)
    res.json({ total: filas.length, filtros: filtrosResumen || 'Sin filtros', filas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
});
