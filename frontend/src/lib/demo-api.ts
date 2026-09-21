// SGB · Modo DEMO (sin backend) - adaptador de la API con datos ficticios.
// Evidencia GA5-220501095-AA1-EV04: permite desplegar la maquetacion como
// sitio estatico (GitHub Pages) y recorrer TODA la aplicacion con datos
// inventados, incluida la creacion/edicion en memoria.
//
// En desarrollo con backend real (Vite proxy /api) este modulo NO interviene.
import type { LoginResponse, Usuario } from './types';
import { DEMO_USERS, DEMO_AREAS, DEMO_PROFESIONALES, DEMO_TIPOS_ACTIVIDAD, DEMO_TIPOS_DOCUMENTO, DEMO_TIPOS_CONTROL, DEMO_TIPOS_CONDICION, DEMO_TIPOS_RED, DEMO_EPS, DEMO_DEFENSORIAS, DEMO_ESTADOS_AFILIACION, DEMO_ESTADOS_ESCOLARES, DEMO_COLEGIOS, DEMO_MONITORES } from './demo-data';
import { demoBeneficiarios, demoEgresados, dISO } from './demo-store';

export const MODO_DEMO = true;

// Estado en memoria de la demo (los cambios viven hasta recargar).
const S = {
  usuario: null as Usuario | null,
  beneficiarios: JSON.parse(JSON.stringify(demoBeneficiarios)) as any[],
  atenciones: [] as any[],
  alertas: [] as any[],
  documentos: [] as any[],
  controlesSalud: [] as any[],
  controlesNutricionales: [] as any[],
  condiciones: [] as any[],
  redes: [] as any[],
  matriculas: [] as any[],
  acudientes: [] as any[],
  preingresos: [] as any[],
  usuarios: [] as any[],
  auditoria: [] as any[],
};

let nextId = 10000;
const nid = () => ++nextId;
const hoy = () => new Date().toISOString().slice(0, 10);
const ahora = () => new Date().toISOString();

class DemoError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Restaura la sesión demo desde localStorage (la recarga de página borra la
// memoria, pero el usuario queda en localStorage como en la app real).
(function restaurarSesion() {
  try {
    const raw = localStorage.getItem('sgb.user');
    if (!raw) return;
    const u = JSON.parse(raw);
    const encontrado = DEMO_USERS.find((x) => x.username === u?.username);
    if (encontrado) {
      S.usuario = {
        id: 100 + DEMO_USERS.indexOf(encontrado),
        username: encontrado.username,
        nombreCompleto: encontrado.nombre + ' ' + encontrado.apellido,
        email: encontrado.username + '@sgb.local',
        rol: encontrado.rol,
        profesional: encontrado.profesional,
      };
    }
  } catch {
    /* localStorage no disponible */
  }
})();

function allBens() {
  return [...S.beneficiarios, ...demoEgresados];
}
function findBen(id: number | string) {
  return allBens().find((b) => b.id === Number(id));
}

function recomputeEstados() {
  for (const b of S.beneficiarios) {
    for (const c of b.casos) {
      for (const a of c.asignaciones) {
        for (const act of a.actividades ?? []) {
          if (act.estado === 'PENDIENTE' && act.fechaProgramada < hoy()) act.estadoCalculado = 'ATRASADA';
        }
      }
    }
  }
}
recomputeEstados();

// ── Precarga de módulos para que la demo luzca poblada ─────────────────
function precargarDemo() {
  const bens = S.beneficiarios;
  const b = (i: number) => bens[i];

  // Documentos requeridos por beneficiario (algunos recibidos, otros pendientes)
  const docEstado = ['RECIBIDO', 'PENDIENTE', 'VIGENTE', 'VENCIDO'];
  let docId = 5000;
  for (const ben of bens) {
    const tipos = [DEMO_TIPOS_DOCUMENTO[0], DEMO_TIPOS_DOCUMENTO[1], DEMO_TIPOS_DOCUMENTO[4], DEMO_TIPOS_DOCUMENTO[3]];
    for (let i = 0; i < tipos.length; i++) {
      const t = tipos[i];
      const estado = docEstado[(ben.id + i) % docEstado.length];
      S.documentos.push({
        id: ++docId,
        estado,
        fechaDocumento: dISO(-(20 + i * 30)),
        fechaRecepcion: estado !== 'PENDIENTE' ? dISO(-(15 + i * 20)) : null,
        fechaVencimiento: estado === 'VIGENTE' ? dISO(60 + i * 30) : estado === 'VENCIDO' ? dISO(-10) : null,
        observaciones: null,
        tipoDocumento: { id: t.id, codigo: t.codigo, nombre: t.nombre, categoria: t.categoria },
        beneficiario: { id: ben.id, nombres: ben.nombres, apellidos: ben.apellidos, numeroHistoria: ben.numeroHistoria, numeroDocumento: ben.numeroDocumento },
        caso: ben.casos?.[0] ? { id: ben.casos[0].id, numeroCaso: ben.casos[0].numeroCaso, estado: ben.casos[0].estado } : null,
        evidencias: [],
      });
    }
  }

  // Controles de salud: algunos pendientes/atrasados
  let ctlId = 6000;
  const ctlTipos = [DEMO_TIPOS_CONTROL[0], DEMO_TIPOS_CONTROL[1], DEMO_TIPOS_CONTROL[3]];
  for (let i = 0; i < bens.length; i++) {
    const ben = bens[i];
    if (ben.id % 2 === 0) continue;
    const t = ctlTipos[i % ctlTipos.length];
    const estado = i % 3 === 0 ? 'REALIZADO' : i % 3 === 1 ? 'PENDIENTE' : 'REALIZADO';
    const fechaProg = estado === 'REALIZADO' ? dISO(-45) : i % 3 === 1 ? dISO(15) : dISO(-8);
    S.controlesSalud.push({
      id: ++ctlId,
      estado,
      estadoCalculado: estado === 'PENDIENTE' && fechaProg < hoy() ? 'ATRASADO' : estado === 'REALIZADO' ? 'REALIZADO' : 'PENDIENTE',
      fechaProgramada: fechaProg,
      fechaRealizacion: estado === 'REALIZADO' ? dISO(-45) : null,
      fechaProximoControl: estado === 'REALIZADO' ? dISO(t.periodicidadMeses ? t.periodicidadMeses * 30 - 45 : 90) : null,
      requiereControlEspecial: i % 5 === 0,
      especialidad: i % 5 === 0 ? 'Oftalmología pediátrica' : null,
      observaciones: null,
      tipoControl: { id: t.id, codigo: t.codigo, nombre: t.nombre, periodicidadMeses: t.periodicidadMeses },
      beneficiario: { id: ben.id, nombres: ben.nombres, apellidos: ben.apellidos, numeroHistoria: ben.numeroHistoria, fechaNacimiento: ben.fechaNacimiento },
      soporteDocumento: null,
    });
  }

  // Controles nutricionales
  let nutId = 7000;
  for (let i = 0; i < bens.length; i += 2) {
    const ben = bens[i];
    const conRiesgo = i % 4 === 0;
    const peso = 24 + (i % 5) * 3;
    const talla = 120 + (i % 4) * 8;
    S.controlesNutricionales.push({
      id: ++nutId,
      fechaControl: dISO(-30 - i),
      nivelRiesgo: conRiesgo ? 'CON_RIESGO' : 'SIN_RIESGO',
      peso,
      talla,
      imc: +(peso / Math.pow(talla / 100, 2)).toFixed(1),
      imcPercentil: 40 + (i % 5) * 10,
      categoriaImc: conRiesgo ? 'SOBREPESO' : 'SALUDABLE',
      imcP95: null,
      periodicidadMeses: conRiesgo ? 3 : 6,
      fechaProximoControl: dISO((conRiesgo ? 90 : 180) - 30 - i),
      observaciones: null,
      proximoVencido: i === 0,
      beneficiario: { id: ben.id, nombres: ben.nombres, apellidos: ben.apellidos, numeroHistoria: ben.numeroHistoria, fechaNacimiento: ben.fechaNacimiento, genero: ben.genero },
      profesional: { id: 4, nombres: 'Luis', apellidos: 'Gómez' },
    });
  }

  // Matrículas escolares
  let matId = 8000;
  for (let i = 0; i < bens.length; i++) {
    const ben = bens[i];
    const col = DEMO_COLEGIOS[i % DEMO_COLEGIOS.length];
    const est = DEMO_ESTADOS_ESCOLARES[i % 2 === 0 ? 0 : 4];
    S.matriculas.push({
      id: ++matId,
      jornada: i % 2 === 0 ? 'Mañana' : 'Tarde',
      grado: String(3 + (i % 5)),
      fechaInicio: dISO(-(200 + i * 10)),
      fechaFin: null,
      actual: true,
      observaciones: null,
      colegio: { id: col.id, nombre: col.nombre, localidad: col.localidad, sede: col.sede },
      estadoEscolar: { id: est.id, nombre: est.nombre, descripcion: est.descripcion },
      beneficiario: { id: ben.id, nombres: ben.nombres, apellidos: ben.apellidos, numeroHistoria: ben.numeroHistoria },
    });
  }

  // Acudientes
  let acId = 9000;
  const parentescos = ['MADRE', 'PADRE', 'ABUELA', 'TIA'];
  for (let i = 0; i < bens.length; i++) {
    const ben = bens[i];
    S.acudientes.push({
      id: ++acId,
      parentezgo: parentescos[i % parentescos.length],
      esPrincipal: true,
      convive: true,
      acudiente: {
        id: ++acId,
        nombres: 'Acudiente de ' + ben.nombres,
        tipoDocumento: 'CC',
        numeroDocumento: '52' + String(100000 + i * 137),
        telefono: '300' + String(1000000 + i * 3457),
        direccion: ben.direccion,
        correo: null,
        ocupacion: ['Comercio', 'Hogar', 'Construcción', 'Independiente'][i % 4],
      },
      beneficiarioId: ben.id,
    });
  }

  // Redes de apoyo
  let redId = 9500;
  for (let i = 0; i < Math.min(6, bens.length); i++) {
    const ben = bens[i];
    const t = DEMO_TIPOS_RED[i % DEMO_TIPOS_RED.length];
    S.redes.push({
      id: ++redId,
      estado: i % 3 === 2 ? 'INGRESADA' : 'ACTIVA',
      fechaActivacion: dISO(-60 - i * 5),
      fechaRemision: dISO(-70 - i * 5),
      fechaIngresoRed: i % 3 === 2 ? dISO(-30) : null,
      fechaCierre: null,
      observaciones: 'Remitido desde el club para valoración.',
      tipoRed: { id: t.id, nombre: t.nombre, descripcion: t.descripcion },
      beneficiario: { id: ben.id, nombres: ben.nombres, apellidos: ben.apellidos, numeroHistoria: ben.numeroHistoria },
      profesional: { id: 2, nombres: 'Carlos', apellidos: 'Ramírez' },
      soportes: [],
    });
  }

  // Condiciones de salud
  let condId = 9700;
  for (let i = 0; i < Math.min(5, bens.length); i++) {
    const ben = bens[i];
    const t = DEMO_TIPOS_CONDICION[i % DEMO_TIPOS_CONDICION.length];
    S.condiciones.push({
      id: ++condId,
      fechaDeteccion: dISO(-90 - i * 7),
      fechaInicio: dISO(-90 - i * 7),
      fechaFin: null,
      estado: 'ACTIVA',
      descripcion: 'Detectada en la valoración inicial.',
      tipoCondicion: { id: t.id, nombre: t.nombre, categoria: t.categoria },
      registradoPorUsuario: null,
      beneficiarioId: ben.id,
    });
  }

  // Atenciones
  let atId = 9800;
  for (let i = 0; i < bens.length; i++) {
    const ben = bens[i];
    S.atenciones.push({
      id: ++atId,
      beneficiarioId: ben.id,
      areaCodigo: ['PS', 'TS', 'PD', 'NT'][i % 4],
      tipo: i % 3 === 0 ? 'SEGUIMIENTO' : 'ATENCION',
      fechaProgramada: dISO(-20 - i),
      fechaRealizacion: dISO(-20 - i),
      estado: 'REALIZADA',
      riesgoEmergente: null,
      observaciones: 'Atención de rutina en jornada del club.',
      beneficiario: { id: ben.id, nombres: ben.nombres, apellidos: ben.apellidos, numeroHistoria: ben.numeroHistoria },
    });
    if (i % 2 === 0) {
      S.atenciones.push({
        id: ++atId,
        beneficiarioId: ben.id,
        areaCodigo: ['PS', 'TS', 'PD', 'NT'][i % 4],
        tipo: 'ATENCION',
        fechaProgramada: dISO(6 + i),
        fechaRealizacion: null,
        estado: 'PENDIENTE',
        riesgoEmergente: null,
        observaciones: null,
        beneficiario: { id: ben.id, nombres: ben.nombres, apellidos: ben.apellidos, numeroHistoria: ben.numeroHistoria },
      });
    }
  }

  // Pre-ingresos (citaciones)
  const preData = [
    { nombre: 'Tomás Ibarra', doc: '1120011112', acud: 'Rosa Ibarra', motivo: 'Solicitud directa de la familia', estado: 'CITADO' },
    { nombre: 'Salomé Upegui', doc: '1120022223', acud: 'Jorge Upegui', motivo: 'Remisión de la comisaría', estado: 'PENDIENTE' },
    { nombre: 'Emilio Zapata', doc: '1120033334', acud: 'Clemencia Zapata', motivo: 'Referido por el colegio', estado: 'CONFIRMADO' },
    { nombre: 'Antonella Rivas', doc: '1120044445', acud: 'Sandra Rivas', motivo: 'Familia migrante', estado: 'PENDIENTE' },
  ];
  let preId = 9900;
  for (const p of preData) {
    S.preingresos.push({
      id: ++preId,
      nombre: p.nombre,
      tipoDocumento: 'RC',
      numeroDocumento: p.doc,
      acudiente: p.acud,
      documentoAcudiente: '52' + String(7000000 + preId),
      ocupacionAcudiente: 'Independiente',
      telefono: '301' + String(2000000 + preId * 13),
      lugarResidencia: 'Bogotá',
      barrio: 'Barrio Los Cerros',
      direccion: 'Cra 12 # 34-56',
      motivoAperturaCupo: p.motivo,
      antecedentesMedicos: null,
      fechaCitacion: dISO(3 + (preId % 5)),
      horaCitacion: '09:00',
      recordatorio: null,
      respuesta: p.estado === 'CONFIRMADO' ? 'Confirmó asistencia' : null,
      observaciones: null,
      estado: p.estado,
    });
  }

  // Usuarios (gestión de usuarios del admin)
  const roles = ['SECRETARIA', 'GESTOR', 'COORDINADOR', 'PROFESIONAL', 'PROFESIONAL'];
  const nombresU = [
    ['Laura', 'Pardo'], ['Andrés', 'Salazar'], ['Diana', 'Fonseca'], ['Paola', 'Rueda'], ['Jhon', 'Cuesta'],
  ];
  for (let i = 0; i < nombresU.length; i++) {
    S.usuarios.push({
      id: 200 + i,
      username: ['secretaria2', 'gestor2', 'coordinador2', 'ps.paola', 'nt.jhon'][i],
      nombre: nombresU[i][0],
      apellido: nombresU[i][1],
      email: ['secretaria2', 'gestor2', 'coordinador2', 'ps.paola', 'nt.jhon'][i] + '@sgb.local',
      rol: roles[i],
      activo: i !== 3,
      ultimoAcceso: dISO(-i - 1),
      profesional: null,
    });
  }

  // Auditoría
  const acciones = ['CREAR', 'MODIFICAR', 'CONSULTAR', 'ELIMINAR'];
  const recursos = ['BENEFICIARIO', 'CASO', 'ACTIVIDAD', 'DOCUMENTO'];
  for (let i = 0; i < 12; i++) {
    S.auditoria.push({
      id: 300 + i,
      accion: acciones[i % acciones.length],
      recurso: recursos[i % recursos.length],
      registroId: 100 + i,
      fechaHora: dISO(-i) + 'T1' + (i % 9) + ':30:00.000Z',
      observacion: 'Registro de demostración',
      valorNuevo: null,
      usuario: { id: 200 + (i % 5), username: ['secretaria2', 'gestor2', 'coordinador2', 'ps.paola', 'nt.jhon'][i % 5], nombre: nombresU[i % 5][0], apellido: nombresU[i % 5][1] },
    });
  }

  // Alertas iniciales: algunas abiertas para que la pantalla luzca viva
  const alertasIni = [
    { tipo: 'DOCUMENTO', titulo: 'Certificado de afiliación vencido', desc: 'El certificado de afiliación a salud venció hace 10 días.', prioridad: 'ALTA', estado: 'NUEVA' },
    { tipo: 'ACTIVIDAD', titulo: 'Plan de caso atrasado', desc: 'El plan de caso no se ha radicado en el plazo establecido.', prioridad: 'MEDIA', estado: 'ASIGNADA' },
    { tipo: 'DOCUMENTO', titulo: 'Tarjeta de identidad pendiente', desc: 'El beneficiario cumplió 7 años y no tiene tarjeta de identidad.', prioridad: 'MEDIA', estado: 'EN_PROCESO' },
    { tipo: 'ACTIVIDAD', titulo: 'Seguimiento de plan próximo a vencer', desc: 'El seguimiento del plan de caso vence en 5 días.', prioridad: 'BAJA', estado: 'NUEVA' },
  ];
  let alId = 9600;
  for (let i = 0; i < alertasIni.length; i++) {
    const ben = bens[(i * 3) % bens.length];
    S.alertas.push({
      id: ++alId,
      ...alertasIni[i],
      descripcion: alertasIni[i].desc,
      fechaGeneracion: dISO(-3 - i),
      fechaLimite: dISO(7 + i * 2),
      fechaAtencion: null,
      fechaCierre: null,
      observaciones: null,
      responsableId: i === 1 ? 104 : null,
      responsableUsuario: i === 1 ? { id: 104, nombre: 'María', apellido: 'López', username: 'ps.maria' } : null,
      beneficiario: { id: ben.id, nombres: ben.nombres, apellidos: ben.apellidos, numeroHistoria: ben.numeroHistoria },
      documento: null,
      actividad: null,
    });
  }
}
precargarDemo();

function allActividades() {
  const out: any[] = [];
  for (const b of S.beneficiarios) {
    for (const c of b.casos) {
      for (const a of c.asignaciones) {
        for (const act of a.actividades ?? []) {
          out.push({
            ...act,
            asignacionCaso: {
              id: a.id,
              profesional: a.profesional,
              area: a.area,
              caso: { id: c.id, numeroCaso: c.numeroCaso, estado: c.estado, beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria } },
            },
          });
        }
      }
    }
  }
  return out;
}

function activeAreaOf(b: any) {
  const act = b.casos?.[0]?.asignaciones?.find((a: any) => a.estado === 'ACTIVA');
  return act?.area ?? null;
}

function demoLogin(username: string, password: string): LoginResponse {
  const u = DEMO_USERS.find((x) => x.username === username && x.password === password);
  if (!u) throw new DemoError(401, 'Credenciales incorrectas (demo). Usa las credenciales de prueba.');
  const usuario: Usuario = {
    id: 100 + DEMO_USERS.indexOf(u),
    username: u.username,
    nombreCompleto: u.nombre + ' ' + u.apellido,
    email: u.username + '@sgb.local',
    rol: u.rol,
    profesional: u.profesional,
  };
  S.usuario = usuario;
  return { token: 'demo-token-' + u.username, usuario };
}

// ── GET: dashboard y beneficiarios ──────────────────────────────────────
function demoGet(path: string): any {
  const [p, query] = splitPath(path);
  const q = new URLSearchParams(query ?? '');
  const num = (k: string) => (q.get(k) ? Number(q.get(k)) : undefined);

  if (p === '/dashboard') return demoDashboard();

  if (p === '/beneficiarios') {
    const estado = q.get('estado');
    const term = (q.get('q') ?? '').toLowerCase().trim();
    let list = allBens();
    if (estado) list = list.filter((b) => b.estado === estado);
    if (term) {
      list = list.filter((b) =>
        (b.nombres + ' ' + b.apellidos).toLowerCase().includes(term) ||
        b.numeroDocumento.includes(term) ||
        b.numeroHistoria.includes(term),
      );
    }
    const vista = estado === 'EGRESADO' ? 'egresados' : 'todos';
    return { soloLectura: false, vista, total: list.length, beneficiarios: list.map(benToRow) };
  }

  if (p.startsWith('/beneficiarios/')) {
    const id = p.split('/')[2];
    const b = findBen(id);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    return benToDetail(b);
  }

  if (p === '/profesionales') {
    return { total: DEMO_PROFESIONALES.length, profesionales: DEMO_PROFESIONALES.map((p2) => ({ id: p2.id, nombres: p2.nombres, apellidos: p2.apellidos, tipoDocumento: p2.tipoDocumento, numeroDocumento: p2.numeroDocumento })) };
  }

  if (p === '/profesionales/carga') {
    const umbrales = { optimaMin: 12, optimaMax: 18, altaMin: 20 };
    const profesionales = DEMO_PROFESIONALES.map((p2) => {
      const n = S.beneficiarios.filter((b) =>
        b.casos?.[0]?.asignaciones?.some((a: any) => a.estado === 'ACTIVA' && a.profesional.id === p2.id),
      ).length;
      const nivel = n >= umbrales.altaMin ? 'ALTA' : n >= umbrales.optimaMin ? 'OPTIMA' : n > 0 ? 'DISPONIBLE' : 'SIN_CARGA';
      return { id: p2.id, nombres: p2.nombres, apellidos: p2.apellidos, activo: true, beneficiariosAsignados: n, nivel, umbrales };
    });
    return { total: profesionales.length, profesionales };
  }

  if (p === '/actividades') return demoActividades(q);
  if (p === '/alertas') return demoAlertas(q);

  if (p === '/alertas/resumen-global') {
    const porEstado: Record<string, number> = {};
    for (const a of S.alertas) porEstado[a.estado] = (porEstado[a.estado] ?? 0) + 1;
    return { total: S.alertas.length, porEstado };
  }

  if (p === '/atenciones') {
    const benId = num('beneficiarioId');
    let list = S.atenciones;
    if (benId) list = list.filter((a) => a.beneficiarioId === benId);
    const mes = q.get('mes');
    if (mes) list = list.filter((a) => a.fechaProgramada.startsWith(mes));
    const area = q.get('area');
    if (area) list = list.filter((a) => a.areaCodigo === area);
    const estado = q.get('estado');
    if (estado) list = list.filter((a) => a.estado === estado);
    const tipo = q.get('tipo');
    if (tipo) list = list.filter((a) => a.tipo === tipo);
    return { total: list.length, atenciones: list };
  }

  if (p === '/auditoria') return { total: S.auditoria.length, registros: S.auditoria };

  if (p === '/auditoria/resumen') {
    const acciones: Record<string, number> = {};
    for (const r of S.auditoria) acciones[r.accion] = (acciones[r.accion] ?? 0) + 1;
    return { acciones };
  }

  if (p === '/usuarios') return { total: S.usuarios.length, usuarios: S.usuarios };

  if (p === '/documentos') {
    const benId = num('beneficiarioId');
    let list = S.documentos;
    if (benId) list = list.filter((d) => d.beneficiario.id === benId);
    const estado = q.get('estado');
    if (estado) list = list.filter((d) => d.estado === estado);
    const term = (q.get('q') ?? '').toLowerCase().trim();
    if (term) list = list.filter((d) => (d.beneficiario.nombres + ' ' + d.beneficiario.apellidos).toLowerCase().includes(term));
    return { total: list.length, documentos: list };
  }

  if (p === '/documentos/resumen') {
    const porEstado: Record<string, number> = {};
    for (const d of S.documentos) porEstado[d.estado] = (porEstado[d.estado] ?? 0) + 1;
    return { total: S.documentos.length, porEstado };
  }

  if (p === '/documentos/tipos') return { total: DEMO_TIPOS_DOCUMENTO.length, tipos: DEMO_TIPOS_DOCUMENTO };

  if (p === '/controles') {
    const benId = num('beneficiarioId');
    let list = S.controlesSalud;
    if (benId) list = list.filter((c) => c.beneficiario.id === benId);
    const estado = q.get('estado');
    if (estado) list = list.filter((c) => (c.estadoCalculado ?? c.estado) === estado);
    const resumen: Record<string, number> = {};
    for (const c of list) resumen[c.estadoCalculado ?? c.estado] = (resumen[c.estadoCalculado ?? c.estado] ?? 0) + 1;
    return { total: list.length, resumen, controles: list };
  }

  if (p === '/controles/tipos') return { total: DEMO_TIPOS_CONTROL.length, tipos: DEMO_TIPOS_CONTROL };

  if (p === '/nutricion') {
    const benId = num('beneficiarioId');
    let list = S.controlesNutricionales;
    if (benId) list = list.filter((c) => c.beneficiario.id === benId);
    const nivel = q.get('nivelRiesgo');
    if (nivel) list = list.filter((c) => c.nivelRiesgo === nivel);
    const resumen: Record<string, number> = {};
    for (const c of list) resumen[c.nivelRiesgo] = (resumen[c.nivelRiesgo] ?? 0) + 1;
    return { total: list.length, resumen, controles: list };
  }

  if (p === '/nutricion/clasificar') return demoClasificarIMC(q);

  if (p === '/redes') {
    const benId = num('beneficiarioId');
    let list = S.redes;
    if (benId) list = list.filter((r) => r.beneficiario.id === benId);
    const estado = q.get('estado');
    if (estado) list = list.filter((r) => r.estado === estado);
    const resumen: Record<string, number> = {};
    for (const r of list) resumen[r.estado] = (resumen[r.estado] ?? 0) + 1;
    return { total: list.length, resumen, redes: list };
  }

  if (p === '/redes/tipos') return { total: DEMO_TIPOS_RED.length, tipos: DEMO_TIPOS_RED };

  if (p === '/escolaridad/matriculas') {
    const benId = num('beneficiarioId');
    let list = S.matriculas;
    if (benId) list = list.filter((m) => m.beneficiario.id === benId);
    const estadoId = num('estadoEscolarId');
    if (estadoId) list = list.filter((m) => m.estadoEscolar.id === estadoId);
    const resumen: Record<string, number> = {};
    for (const m of list) resumen[m.estadoEscolar.nombre] = (resumen[m.estadoEscolar.nombre] ?? 0) + 1;
    return { total: list.length, resumen, matriculas: list };
  }

  if (p === '/catalogos/estados-escolares') return { estadosEscolares: DEMO_ESTADOS_ESCOLARES };
  if (p === '/catalogos/colegios') return { items: DEMO_COLEGIOS };

  if (p === '/catalogos/todos') {
    return {
      areas: DEMO_AREAS,
      tiposActividad: DEMO_TIPOS_ACTIVIDAD,
      tiposDocumento: DEMO_TIPOS_DOCUMENTO,
      tiposControlSalud: DEMO_TIPOS_CONTROL,
      tiposCondicion: DEMO_TIPOS_CONDICION,
      tiposRedApoyo: DEMO_TIPOS_RED,
      eps: DEMO_EPS,
      defensorias: DEMO_DEFENSORIAS,
      estadosAfiliacion: DEMO_ESTADOS_AFILIACION,
      estadosEscolares: DEMO_ESTADOS_ESCOLARES,
      colegios: DEMO_COLEGIOS,
      monitores: DEMO_MONITORES,
    };
  }

  if (p.startsWith('/catalogos/')) {
    const key = p.split('/')[2];
    const map: Record<string, any[]> = {
      colegios: DEMO_COLEGIOS,
      orientadores: [],
      eps: DEMO_EPS,
      monitores: DEMO_MONITORES,
      defensorias: DEMO_DEFENSORIAS,
      'estados-afiliacion': DEMO_ESTADOS_AFILIACION,
      'estados-escolares': DEMO_ESTADOS_ESCOLARES,
    };
    const items = map[key] ?? [];
    return { total: items.length, items };
  }

  if (p === '/condiciones') {
    const benId = num('beneficiarioId');
    let list = S.condiciones;
    if (benId) list = list.filter((c) => c.beneficiarioId === benId);
    return { total: list.length, condiciones: list };
  }

  if (p === '/condiciones/tipos') return { total: DEMO_TIPOS_CONDICION.length, tipos: DEMO_TIPOS_CONDICION };

  if (p === '/acudientes') {
    const benId = num('beneficiarioId');
    let list = S.acudientes;
    if (benId) list = list.filter((a) => a.beneficiarioId === benId);
    return { total: list.length, vinculaciones: list };
  }

  if (p === '/preingresos') {
    const estado = q.get('estado');
    let list = S.preingresos;
    if (estado) list = list.filter((x) => x.estado === estado);
    const term = (q.get('q') ?? '').toLowerCase().trim();
    if (term) list = list.filter((x) => x.nombre.toLowerCase().includes(term));
    const resumen: Record<string, number> = {};
    for (const x of list) resumen[x.estado] = (resumen[x.estado] ?? 0) + 1;
    return { total: list.length, resumen, preingresos: list };
  }

  if (p === '/reportes/beneficiarios') return demoReporte(q);

  throw new DemoError(404, 'Ruta no disponible en la demo: ' + p);
}
// ── POST / PATCH / DELETE / PUT ──────────────────────────────────────
function demoMutate(method: 'POST' | 'PATCH' | 'DELETE' | 'PUT', path: string, body: any): any {
  const [p] = splitPath(path);

  if (p === '/auth/login') return demoLogin(body.username, body.password);

  if (p === '/alertas/escanear') {
    const creadas = demoEscanearAlertas();
    return { candidatas: creadas + 2, creadas, omitidas: 2 };
  }

  if (p === '/actividades' && method === 'POST') {
    const asigId = body.asignacionCasoId;
    let destino: any = null;
    for (const b of S.beneficiarios) for (const c of b.casos) for (const a of c.asignaciones) if (a.id === asigId) destino = { b, c, a };
    if (!destino) throw new DemoError(400, 'Asignacion no encontrada (demo)');
    const tipo = DEMO_TIPOS_ACTIVIDAD.find((t) => t.id === Number(body.tipoActividadId));
    if (!tipo) throw new DemoError(400, 'Tipo de actividad no encontrado (demo)');
    const act = {
      id: nid(),
      estado: 'PENDIENTE',
      estadoCalculado: 'PENDIENTE',
      fechaProgramada: body.fechaProgramada,
      fechaRealizacion: null,
      prioridad: body.prioridad === 'ALTA' ? 5 : body.prioridad === 'BAJA' ? 50 : 20,
      observaciones: body.observaciones ?? null,
      tipoActividad: { id: tipo.id, codigo: tipo.codigo, nombre: tipo.nombre },
    };
    destino.a.actividades.push(act);
    return { mensaje: 'Actividad creada (demo)', actividad: act };
  }

  if (p.startsWith('/actividades/') && p.endsWith('/marcar-realizada')) {
    const id = Number(p.split('/')[2]);
    let found = false;
    for (const b of S.beneficiarios) for (const c of b.casos) for (const a of c.asignaciones) for (const act of a.actividades ?? []) {
      if (act.id === id) { act.estado = 'REALIZADA'; act.estadoCalculado = 'REALIZADA'; act.fechaRealizacion = ahora(); found = true; }
    }
    if (!found) throw new DemoError(404, 'Actividad no encontrada (demo)');
    return { mensaje: 'Actividad realizada' };
  }

  if (p === '/atenciones' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const at = {
      id: nid(),
      beneficiarioId: b.id,
      areaCodigo: body.areaCodigo,
      tipo: body.tipo,
      fechaProgramada: body.fechaProgramada,
      fechaRealizacion: null,
      estado: 'PENDIENTE',
      riesgoEmergente: null,
      observaciones: body.observaciones ?? null,
      beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria },
    };
    S.atenciones.push(at);
    return at;
  }

  if (p === '/atenciones/rotacion' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const creadas: any[] = [];
    for (let r = 0; r < (body.rondas ?? 1); r++) {
      for (const paso of body.pasos ?? []) {
        const fecha = new Date(paso.fechaInicial);
        fecha.setMonth(fecha.getMonth() + (body.periodicidadMeses ?? 3) * r);
        const at = {
          id: nid(),
          beneficiarioId: b.id,
          areaCodigo: paso.areaCodigo,
          tipo: 'ATENCION',
          fechaProgramada: fecha.toISOString().slice(0, 10),
          fechaRealizacion: null,
          estado: 'PENDIENTE',
          riesgoEmergente: null,
          observaciones: (body.nombre ? body.nombre + ' · ' : '') + (body.observaciones ?? ''),
          beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria },
        };
        S.atenciones.push(at);
        creadas.push(at);
      }
    }
    return { mensaje: 'Plan de rotacion creado (demo): ' + creadas.length + ' atenciones programadas' };
  }

  if (p === '/atenciones/hechos' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    for (const paso of body.pasos ?? []) {
      S.atenciones.push({
        id: nid(),
        beneficiarioId: b.id,
        areaCodigo: paso.areaCodigo,
        tipo: 'SEGUIMIENTO',
        fechaProgramada: paso.fechaInicial,
        fechaRealizacion: null,
        estado: 'PENDIENTE',
        riesgoEmergente: body.nivelRiesgo ?? 'MEDIO',
        observaciones: (body.descripcion ? 'Hecho emergente: ' + body.descripcion : '') + (body.actaReferencia ? ' · ' + body.actaReferencia : ''),
        beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria },
      });
    }
    return { mensaje: 'Hecho emergente registrado (demo)' };
  }

  if (p.startsWith('/atenciones/') && p.endsWith('/continuar')) {
    const id = Number(p.split('/')[2]);
    const at = S.atenciones.find((x) => x.id === id);
    if (!at) throw new DemoError(404, 'Atencion no encontrada (demo)');
    const fecha = new Date(at.fechaProgramada);
    fecha.setMonth(fecha.getMonth() + 3);
    const nueva = { ...at, id: nid(), estado: 'PENDIENTE', fechaProgramada: fecha.toISOString().slice(0, 10), fechaRealizacion: null };
    S.atenciones.push(nueva);
    return { mensaje: 'Seguimiento continuado (demo)' };
  }

  if (p.startsWith('/atenciones/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const at = S.atenciones.find((x) => x.id === id);
    if (!at) throw new DemoError(404, 'Atencion no encontrada (demo)');
    Object.assign(at, body);
    return { mensaje: 'Atencion actualizada (demo)' };
  }

  if (p === '/alertas' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const al = {
      id: nid(),
      tipo: body.tipo,
      titulo: body.titulo,
      descripcion: body.descripcion ?? null,
      prioridad: body.prioridad,
      estado: 'NUEVA',
      fechaGeneracion: ahora(),
      fechaLimite: body.fechaLimite ?? null,
      fechaAtencion: null,
      fechaCierre: null,
      observaciones: null,
      responsableId: null,
      responsableUsuario: null,
      beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria },
      documento: null,
      actividad: null,
    };
    S.alertas.push(al);
    return al;
  }

  if (p.startsWith('/alertas/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const al = S.alertas.find((x) => x.id === id);
    if (!al) throw new DemoError(404, 'Alerta no encontrada (demo)');
    Object.assign(al, body);
    if (al.estado === 'ATENDIDA') al.fechaAtencion = ahora();
    if (al.estado === 'CERRADA') al.fechaCierre = ahora();
    return { mensaje: 'Alerta actualizada' };
  }

  if (p === '/documentos' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const tipo = DEMO_TIPOS_DOCUMENTO.find((t) => t.id === Number(body.tipoDocumentoId));
    if (!tipo) throw new DemoError(400, 'Tipo de documento no encontrado (demo)');
    const doc = {
      id: nid(),
      estado: body.estado ?? 'PENDIENTE',
      fechaDocumento: body.fechaDocumento ?? null,
      fechaRecepcion: body.fechaRecepcion ?? null,
      fechaVencimiento: body.fechaVencimiento ?? null,
      observaciones: body.observaciones ?? null,
      tipoDocumento: { id: tipo.id, codigo: tipo.codigo, nombre: tipo.nombre, categoria: tipo.categoria },
      beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria, numeroDocumento: b.numeroDocumento },
      caso: b.casos?.[0] ? { id: b.casos[0].id, numeroCaso: b.casos[0].numeroCaso, estado: b.casos[0].estado } : null,
      evidencias: [],
    };
    S.documentos.push(doc);
    return doc;
  }

  if (p.startsWith('/documentos/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const d = S.documentos.find((x) => x.id === id);
    if (!d) throw new DemoError(404, 'Documento no encontrado (demo)');
    Object.assign(d, body);
    return { mensaje: 'Documento actualizado' };
  }
  if (p === '/controles' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const tipo = DEMO_TIPOS_CONTROL.find((t) => t.id === Number(body.tipoControlId));
    if (!tipo) throw new DemoError(400, 'Tipo de control no encontrado (demo)');
    const c = {
      id: nid(),
      estado: 'PENDIENTE',
      estadoCalculado: 'PENDIENTE',
      fechaProgramada: body.fechaProgramada ?? hoy(),
      fechaRealizacion: null,
      fechaProximoControl: null,
      requiereControlEspecial: body.requiereControlEspecial ?? false,
      especialidad: body.especialidad ?? null,
      observaciones: body.observaciones ?? null,
      tipoControl: { id: tipo.id, codigo: tipo.codigo, nombre: tipo.nombre, periodicidadMeses: tipo.periodicidadMeses },
      beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria, fechaNacimiento: b.fechaNacimiento },
      soporteDocumento: null,
    };
    S.controlesSalud.push(c);
    return c;
  }

  if (p.startsWith('/controles/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const c = S.controlesSalud.find((x) => x.id === id);
    if (!c) throw new DemoError(404, 'Control no encontrado (demo)');
    Object.assign(c, body);
    return { mensaje: 'Control actualizado' };
  }

  if (p === '/nutricion' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const cn = {
      id: nid(),
      fechaControl: body.fechaControl ?? hoy(),
      nivelRiesgo: body.nivelRiesgo ?? 'SIN_RIESGO',
      peso: body.peso ?? null,
      talla: body.talla ?? null,
      imc: body.imc ?? null,
      imcPercentil: body.imcPercentil ?? null,
      categoriaImc: body.categoriaImc ?? null,
      imcP95: null,
      periodicidadMeses: body.nivelRiesgo === 'CON_RIESGO' ? 3 : 6,
      fechaProximoControl: body.fechaProximoControl ?? dISO(90),
      observaciones: body.observaciones ?? null,
      proximoVencido: false,
      beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria, fechaNacimiento: b.fechaNacimiento, genero: b.genero },
      profesional: S.usuario?.profesional ?? { id: 1, nombres: 'Maria', apellidos: 'Lopez' },
    };
    S.controlesNutricionales.push(cn);
    return cn;
  }

  if (p.startsWith('/nutricion/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const c = S.controlesNutricionales.find((x) => x.id === id);
    if (!c) throw new DemoError(404, 'Control nutricional no encontrado (demo)');
    Object.assign(c, body);
    return { mensaje: 'Control actualizado' };
  }

  if (p === '/redes' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const tipo = DEMO_TIPOS_RED.find((t) => t.id === Number(body.tipoRedId));
    if (!tipo) throw new DemoError(400, 'Tipo de red no encontrado (demo)');
    const r = {
      id: nid(),
      estado: 'ACTIVA',
      fechaActivacion: hoy(),
      fechaRemision: body.fechaRemision ?? null,
      fechaIngresoRed: null,
      fechaCierre: null,
      observaciones: body.observaciones ?? null,
      tipoRed: { id: tipo.id, nombre: tipo.nombre, descripcion: tipo.descripcion },
      beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria },
      profesional: S.usuario?.profesional ?? null,
      soportes: [],
    };
    S.redes.push(r);
    return r;
  }

  if (p.startsWith('/redes/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const r = S.redes.find((x) => x.id === id);
    if (r) Object.assign(r, body);
    return { mensaje: 'Red actualizada' };
  }

  if (p === '/condiciones' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const tipo = DEMO_TIPOS_CONDICION.find((t) => t.id === Number(body.tipoCondicionId));
    if (!tipo) throw new DemoError(400, 'Tipo de condicion no encontrado (demo)');
    const c = {
      id: nid(),
      fechaDeteccion: body.fechaDeteccion ?? hoy(),
      fechaInicio: body.fechaInicio ?? null,
      fechaFin: null,
      estado: 'ACTIVA',
      descripcion: body.descripcion ?? null,
      tipoCondicion: { id: tipo.id, nombre: tipo.nombre, categoria: tipo.categoria },
      registradoPorUsuario: null,
      beneficiarioId: b.id,
    };
    S.condiciones.push(c);
    return c;
  }

  if (p.startsWith('/condiciones/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const c = S.condiciones.find((x) => x.id === id);
    if (c) Object.assign(c, body);
    return { mensaje: 'Condicion actualizada' };
  }

  if (p.startsWith('/condiciones/') && method === 'DELETE') {
    const id = Number(p.split('/')[2]);
    S.condiciones = S.condiciones.filter((x) => x.id !== id);
    return undefined;
  }

  if (p === '/acudientes' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const ac = {
      id: nid(),
      parentezgo: body.parentezgo ?? 'OTRO',
      esPrincipal: body.esPrincipal ?? false,
      convive: body.convive ?? true,
      acudiente: {
        id: nid(),
        nombres: body.nombres,
        tipoDocumento: body.tipoDocumento ?? null,
        numeroDocumento: body.numeroDocumento ?? null,
        telefono: body.telefono ?? null,
        direccion: body.direccion ?? null,
        correo: body.correo ?? null,
        ocupacion: body.ocupacion ?? null,
      },
      beneficiarioId: b.id,
    };
    S.acudientes.push(ac);
    return ac;
  }

  if (p.startsWith('/acudientes/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const a = S.acudientes.find((x) => x.id === id);
    if (a) Object.assign(a, body);
    return { mensaje: 'Acudiente actualizado' };
  }

  if (p.startsWith('/acudientes/') && method === 'DELETE') {
    const id = Number(p.split('/')[2]);
    S.acudientes = S.acudientes.filter((x) => x.id !== id);
    return undefined;
  }

  if (p === '/escolaridad/matriculas' && method === 'POST') {
    const b = findBen(body.beneficiarioId);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    const colegio = DEMO_COLEGIOS.find((c) => c.id === Number(body.colegioId));
    const estado = DEMO_ESTADOS_ESCOLARES.find((e) => e.id === Number(body.estadoEscolarId));
    if (!colegio) throw new DemoError(400, 'Colegio no encontrado (demo)');
    if (!estado) throw new DemoError(400, 'Estado escolar no encontrado (demo)');
    const m = {
      id: nid(),
      jornada: body.jornada ?? null,
      grado: body.grado ?? null,
      fechaInicio: body.fechaInicio ?? hoy(),
      fechaFin: null,
      actual: body.actual ?? true,
      observaciones: body.observaciones ?? null,
      colegio: { id: colegio.id, nombre: colegio.nombre, localidad: colegio.localidad, sede: colegio.sede },
      estadoEscolar: { id: estado.id, nombre: estado.nombre, descripcion: estado.descripcion },
      beneficiario: { id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria },
    };
    S.matriculas.push(m);
    return m;
  }

  if (p.startsWith('/escolaridad/matriculas/') && method === 'PATCH') {
    const id = Number(p.split('/')[3]);
    const m = S.matriculas.find((x) => x.id === id);
    if (m) Object.assign(m, body);
    return { mensaje: 'Matricula actualizada' };
  }

  if (p === '/preingresos' && method === 'POST') {
    const x = {
      id: nid(),
      nombre: body.nombre,
      tipoDocumento: body.tipoDocumento ?? null,
      numeroDocumento: body.numeroDocumento ?? null,
      acudiente: body.acudiente ?? null,
      documentoAcudiente: body.documentoAcudiente ?? null,
      ocupacionAcudiente: body.ocupacionAcudiente ?? null,
      telefono: body.telefono ?? null,
      lugarResidencia: body.lugarResidencia ?? null,
      barrio: body.barrio ?? null,
      direccion: body.direccion ?? null,
      motivoAperturaCupo: body.motivoAperturaCupo ?? null,
      antecedentesMedicos: body.antecedentesMedicos ?? null,
      fechaCitacion: body.fechaCitacion ?? null,
      horaCitacion: body.horaCitacion ?? null,
      recordatorio: null,
      respuesta: null,
      observaciones: body.observaciones ?? null,
      estado: 'PENDIENTE',
    };
    S.preingresos.push(x);
    return x;
  }

  if (p.startsWith('/preingresos/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const x = S.preingresos.find((y) => y.id === id);
    if (x) Object.assign(x, body);
    return { mensaje: 'Pre-ingreso actualizado' };
  }
  if (p === '/beneficiarios' && method === 'POST') {
    const casoNum = 'C-2026-' + String(900 + S.beneficiarios.length);
    const historia = String(100 + S.beneficiarios.length + demoEgresados.length + 1);
    const areaMap: Record<string, { codigo: string; nombre: string }> = { PS: { codigo: 'PS', nombre: 'Psicologia' }, TS: { codigo: 'TS', nombre: 'Trabajo Social' }, PD: { codigo: 'PD', nombre: 'Pedagogia' }, NT: { codigo: 'NT', nombre: 'Nutricion' } };
    const prof = DEMO_PROFESIONALES.find((p2) => p2.id === Number(body.profesionalId)) ?? DEMO_PROFESIONALES[0];
    const area = areaMap[body.areaInicial] ?? areaMap.PS;
    const nuevaAsig = {
      id: nid(),
      estado: 'ACTIVA',
      fechaInicio: hoy(),
      fechaFin: null,
      motivoCambio: null,
      observaciones: null,
      profesional: { id: prof.id, nombres: prof.nombres, apellidos: prof.apellidos },
      area,
      actividades: [
        { id: nid(), estado: 'PENDIENTE', estadoCalculado: 'PENDIENTE', fechaProgramada: dISO(5), fechaRealizacion: null, prioridad: 10, observaciones: null, tipoActividad: { id: 1, codigo: 'VALORACION_PRELIMINAR', nombre: 'Valoracion preliminar' } },
        { id: nid(), estado: 'PENDIENTE', estadoCalculado: 'PENDIENTE', fechaProgramada: dISO(15), fechaRealizacion: null, prioridad: 20, observaciones: null, tipoActividad: { id: 2, codigo: 'VALORACION_INTEGRADORA', nombre: 'Valoracion integradora' } },
        { id: nid(), estado: 'PENDIENTE', estadoCalculado: 'PENDIENTE', fechaProgramada: dISO(20), fechaRealizacion: null, prioridad: 30, observaciones: null, tipoActividad: { id: 3, codigo: 'ANALISIS_CASO', nombre: 'Analisis de caso' } },
        { id: nid(), estado: 'PENDIENTE', estadoCalculado: 'PENDIENTE', fechaProgramada: dISO(30), fechaRealizacion: null, prioridad: 40, observaciones: null, tipoActividad: { id: 4, codigo: 'PLAN_CASO', nombre: 'Plan de caso' } },
      ],
    };
    const nuevoCaso = { id: nid(), numeroCaso: casoNum, estado: 'ACTIVO', fechaApertura: hoy(), fechaCierre: null, motivoIngreso: body.motivoIngreso ?? null, asignaciones: [nuevaAsig], documentos: [] };
    const b = {
      id: nid(),
      numeroHistoria: historia,
      tipoDocumento: body.tipoDocumento,
      numeroDocumento: body.numeroDocumento,
      nombres: body.nombres,
      apellidos: body.apellidos,
      fechaNacimiento: body.fechaNacimiento,
      genero: body.genero ?? null,
      telefono: body.telefono ?? null,
      correo: body.correo ?? null,
      direccion: body.direccion ?? null,
      estado: 'ACTIVO',
      fechaIngreso: body.fechaIngreso ?? hoy(),
      taller: null,
      barrio: null,
      fechaEgreso: null,
      motivoEgreso: null,
      observaciones: body.observaciones ?? null,
      sim: null,
      jornadaClub: null,
      epsId: body.epsId ?? null,
      defensoriaId: body.defensoriaId ?? null,
      estadoAfiliacionId: body.estadoAfiliacionId ?? null,
      casos: [nuevoCaso],
      condiciones: [],
      controlesSalud: [],
      controlesNutricionales: [],
      redesApoyo: [],
      alertas: [],
    };
    S.beneficiarios.push(b);
    return {
      mensaje: 'Beneficiario registrado (demo)',
      numeroHistoria: historia,
      numeroCaso: casoNum,
      beneficiario: b,
      caso: nuevoCaso,
      asignacion: nuevaAsig,
      actividadesGeneradas: nuevaAsig.actividades.map((a) => ({ id: a.id, fechaProgramada: a.fechaProgramada, prioridad: a.prioridad })),
      documentosIniciales: 0,
    };
  }

  if (p.startsWith('/beneficiarios/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const b = findBen(id);
    if (!b) throw new DemoError(404, 'Beneficiario no encontrado (demo)');
    Object.assign(b, body);
    if (body.estado === 'EGRESADO') {
      b.fechaEgreso = body.fechaEgreso ?? hoy();
      b.motivoEgreso = body.motivoEgreso ?? null;
      if (b.casos?.[0]) { b.casos[0].estado = 'CERRADO'; b.casos[0].fechaCierre = b.fechaEgreso; }
      const i = S.beneficiarios.findIndex((x) => x.id === b.id);
      if (i >= 0) { S.beneficiarios.splice(i, 1); demoEgresados.push(b); }
    } else if (body.estado === 'ACTIVO') {
      b.fechaEgreso = null; b.motivoEgreso = null;
      if (b.casos?.[0]) { b.casos[0].estado = 'ACTIVO'; b.casos[0].fechaCierre = null; }
      const j = demoEgresados.findIndex((x) => x.id === b.id);
      if (j >= 0) { demoEgresados.splice(j, 1); S.beneficiarios.push(b); }
    }
    return b;
  }

  if (p.startsWith('/beneficiarios/') && method === 'DELETE') {
    const id = Number(p.split('/')[2]);
    const i = S.beneficiarios.findIndex((x) => x.id === id);
    const j = demoEgresados.findIndex((x) => x.id === id);
    if (i >= 0) S.beneficiarios.splice(i, 1);
    else if (j >= 0) demoEgresados.splice(j, 1);
    return undefined;
  }

  if (p.startsWith('/casos/') && p.endsWith('/profesionales')) {
    const casoId = Number(p.split('/')[2]);
    for (const b of allBens()) {
      const c = b.casos?.find((x: any) => x.id === casoId);
      if (c) {
        const prof = DEMO_PROFESIONALES.find((x) => x.id === Number(body.profesionalId));
        if (!prof) throw new DemoError(404, 'Profesional no encontrado (demo)');
        for (const a of c.asignaciones) if (a.estado === 'ACTIVA') { a.estado = 'FINALIZADA'; a.fechaFin = hoy(); }
        c.asignaciones.push({
          id: nid(),
          estado: 'ACTIVA',
          fechaInicio: hoy(),
          fechaFin: null,
          motivoCambio: body.motivoCambio ?? null,
          observaciones: null,
          profesional: { id: prof.id, nombres: prof.nombres, apellidos: prof.apellidos },
          area: c.asignaciones[c.asignaciones.length - 1]?.area ?? { codigo: 'PS', nombre: 'Psicologia' },
          actividades: [],
        });
        return { mensaje: 'Profesional asignado (demo)' };
      }
    }
    throw new DemoError(404, 'Caso no encontrado (demo)');
  }

  if (p.startsWith('/casos/') && p.endsWith('/cerrar')) {
    const casoId = Number(p.split('/')[2]);
    for (const b of allBens()) {
      const c = b.casos?.find((x: any) => x.id === casoId);
      if (c) {
        c.estado = 'CERRADO';
        c.fechaCierre = hoy();
        for (const a of c.asignaciones) if (a.estado === 'ACTIVA') { a.estado = 'FINALIZADA'; a.fechaFin = hoy(); }
        b.estado = 'EGRESADO';
        b.fechaEgreso = hoy();
        b.motivoEgreso = body.motivoEgreso ?? 'Cierre de caso';
        const i = S.beneficiarios.findIndex((x) => x.id === b.id);
        if (i >= 0) { S.beneficiarios.splice(i, 1); demoEgresados.push(b); }
        return { mensaje: 'Caso cerrado (demo)' };
      }
    }
    throw new DemoError(404, 'Caso no encontrado (demo)');
  }

  if (p === '/usuarios' && method === 'POST') {
    const u = {
      id: nid(),
      username: body.username,
      nombre: body.nombre,
      apellido: body.apellido,
      email: body.email ?? null,
      rol: body.rol,
      activo: true,
      ultimoAcceso: null,
      profesional: null,
    };
    S.usuarios.push(u);
    return u;
  }

  if (p.startsWith('/usuarios/') && method === 'PATCH') {
    const id = Number(p.split('/')[2]);
    const u = S.usuarios.find((x) => x.id === id) as any;
    if (u) Object.assign(u, body);
    return { mensaje: 'Usuario actualizado (demo)' };
  }

  if (p.startsWith('/usuarios/') && method === 'DELETE') {
    const id = Number(p.split('/')[2]);
    S.usuarios = S.usuarios.filter((x) => x.id !== id);
    return undefined;
  }

  if (p === '/catalogos/colegios' && method === 'POST') {
    const c = { id: nid(), nombre: body.nombre, localidad: body.localidad ?? null, sede: body.sede ?? null, orientadores: [] };
    DEMO_COLEGIOS.push(c);
    return c;
  }

  if (p.startsWith('/catalogos/') && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    if (method === 'DELETE') return undefined;
    if (method === 'PUT') return { mensaje: 'Actualizado (demo)' };
    return { id: nid(), ...(body ?? {}) };
  }

  if (p === '/usuarios/mi-contrasena/cambiar') {
    return { mensaje: 'Contrasena cambiada (demo)' };
  }

  throw new DemoError(404, 'Ruta no disponible en la demo: ' + method + ' ' + p);
}
// ── Dashboard ───────────────────────────────────────────────────────
function demoDashboard(): any {
  const me = S.usuario;
  if (!me) throw new DemoError(401, 'Sesion no iniciada');
  const hoyISO = hoy();

  if (me.rol === 'PROFESIONAL') {
    const profId = me.profesional?.id;
    const mis = S.beneficiarios.filter((b) =>
      b.casos?.[0]?.asignaciones?.some((a: any) => a.estado === 'ACTIVA' && a.profesional.id === profId),
    );
    const acts = allActividades().filter((a) => a.asignacionCaso.profesional.id === profId);
    const resumen = {
      HOY: acts.filter((a) => a.fechaProgramada === hoyISO && a.estado !== 'REALIZADA').length,
      ATRASADAS: acts.filter((a) => a.estadoCalculado === 'ATRASADA').length,
      PROXIMAS: acts.filter((a) => a.fechaProgramada > hoyISO && a.estado === 'PENDIENTE').length,
      REALIZADAS: acts.filter((a) => a.estado === 'REALIZADA').length,
    };
    const controlesPend = S.controlesSalud.filter((c) => c.beneficiario && mis.some((b) => b.id === c.beneficiario.id) && (c.estadoCalculado ?? c.estado) !== 'REALIZADO');
    const nutPend = S.controlesNutricionales.filter((c) => c.beneficiario && mis.some((b) => b.id === c.beneficiario.id) && c.proximoVencido);
    return {
      scope: 'me',
      perfil: { nombre: me.nombreCompleto, rol: 'Profesional' },
      misBeneficiarios: mis.length,
      resumenActividades: resumen,
      actividadesHoy: acts
        .filter((a) => a.fechaProgramada >= hoyISO && (a.estado === 'PENDIENTE' || a.estadoCalculado === 'ATRASADA'))
        .slice(0, 6)
        .map((a) => ({
          id: a.id,
          tipo: a.tipoActividad.nombre,
          fechaProgramada: a.fechaProgramada,
          beneficiario: { id: a.asignacionCaso.caso.beneficiario.id, nombre: a.asignacionCaso.caso.beneficiario.nombres + ' ' + a.asignacionCaso.caso.beneficiario.apellidos },
          area: a.asignacionCaso.area.nombre,
          estado: a.estadoCalculado ?? a.estado,
        })),
      controlesPendientes: {
        salud: controlesPend.slice(0, 3).map((c) => ({ id: c.id, tipo: c.tipoControl?.nombre ?? 'Control', beneficiario: c.beneficiario.nombres + ' ' + c.beneficiario.apellidos })),
        saludTotal: controlesPend.length,
        nutricion: nutPend.slice(0, 3).map((c) => ({ id: c.id, beneficiario: c.beneficiario.nombres + ' ' + c.beneficiario.apellidos, proximo: c.fechaProximoControl })),
        nutricionTotal: nutPend.length,
      },
      misAlertas: S.alertas
        .filter((a) => !['ATENDIDA', 'CERRADA', 'CANCELADA'].includes(a.estado))
        .slice(0, 5)
        .map((a) => ({ id: a.id, titulo: a.titulo, prioridad: a.prioridad, estado: a.estado, beneficiario: a.beneficiario ? a.beneficiario.nombres + ' ' + a.beneficiario.apellidos : null })),
    };
  }

  const acts = allActividades();
  const activos = S.beneficiarios.filter((b) => b.estado === 'ACTIVO');
  const porArea: Record<string, { hoy: number; atrasadas: number }> = {};
  for (const cod of ['PS', 'TS', 'PD', 'NT']) {
    const areaActs = acts.filter((a) => a.asignacionCaso.area.codigo === cod);
    porArea[cod] = {
      hoy: areaActs.filter((a) => a.fechaProgramada === hoyISO && a.estado !== 'REALIZADA').length,
      atrasadas: areaActs.filter((a) => a.estadoCalculado === 'ATRASADA').length,
    };
  }
  const carga = DEMO_PROFESIONALES.map((p) => {
    const n = S.beneficiarios.filter((b) =>
      b.casos?.[0]?.asignaciones?.some((a: any) => a.estado === 'ACTIVA' && a.profesional.id === p.id),
    ).length;
    return { id: p.id, nombre: p.nombres + ' ' + p.apellidos, beneficiarios: n };
  });
  const docsPorEstado: Record<string, number> = {};
  for (const d of S.documentos) docsPorEstado[d.estado] = (docsPorEstado[d.estado] ?? 0) + 1;
  return {
    scope: 'global',
    perfil: { nombre: me.nombreCompleto, rol: me.rol },
    kpis: {
      beneficiariosActivos: activos.length,
      casosActivos: S.beneficiarios.filter((b) => b.casos?.[0]?.estado === 'ACTIVO').length,
      ingresosMes: activos.filter((b) => b.fechaIngreso >= mesInicioISO()).length,
      egresosMes: demoEgresados.filter((b) => (b.fechaEgreso ?? '') >= mesInicioISO()).length,
      actividadesHoy: acts.filter((a) => a.fechaProgramada === hoyISO && a.estado !== 'REALIZADA').length,
      actividadesAtrasadas: acts.filter((a) => a.estadoCalculado === 'ATRASADA').length,
      alertasAbiertas: S.alertas.filter((a) => !['ATENDIDA', 'CERRADA', 'CANCELADA'].includes(a.estado)).length,
      alertasAlta: S.alertas.filter((a) => a.prioridad === 'ALTA' && !['ATENDIDA', 'CERRADA', 'CANCELADA'].includes(a.estado)).length,
    },
    documentos: docsPorEstado,
    porArea,
    carga,
    ultimosBeneficiarios: activos
      .sort((a, b) => (a.fechaIngreso < b.fechaIngreso ? 1 : -1))
      .slice(0, 5)
      .map((b) => ({ id: b.id, nombres: b.nombres, apellidos: b.apellidos, numeroHistoria: b.numeroHistoria, fechaIngreso: b.fechaIngreso, estado: b.estado })),
    proximasActividades: acts
      .filter((a) => a.fechaProgramada >= hoyISO && a.estado === 'PENDIENTE')
      .sort((x, y) => (x.fechaProgramada > y.fechaProgramada ? 1 : -1))
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        tipo: a.tipoActividad.nombre,
        fechaProgramada: a.fechaProgramada,
        beneficiario: { id: a.asignacionCaso.caso.beneficiario.id, nombre: a.asignacionCaso.caso.beneficiario.nombres + ' ' + a.asignacionCaso.caso.beneficiario.apellidos },
        area: a.asignacionCaso.area.nombre,
        estado: a.estadoCalculado ?? a.estado,
      })),
    alertasCriticas: S.alertas
      .filter((a) => a.prioridad === 'ALTA' && !['ATENDIDA', 'CERRADA', 'CANCELADA'].includes(a.estado))
      .slice(0, 4)
      .map((a) => ({ id: a.id, titulo: a.titulo, estado: a.estado, beneficiario: a.beneficiario ? a.beneficiario.nombres + ' ' + a.beneficiario.apellidos : null })),
  };
}

// ── Sub-consultas ────────────────────────────────────────────────────
function demoActividades(q: URLSearchParams) {
  const estado = q.get('estado');
  let list = allActividades();
  if (estado && estado !== 'TODAS') list = list.filter((a) => (a.estadoCalculado ?? a.estado) === estado);
  const hoyISO = hoy();
  const resumen: Record<string, number> = { HOY: 0, ATRASADAS: 0, PROXIMAS: 0, REALIZADAS: 0 };
  for (const a of allActividades()) {
    const est = a.estadoCalculado ?? a.estado;
    if (est === 'REALIZADA') resumen.REALIZADAS++;
    else if (a.fechaProgramada === hoyISO) resumen.HOY++;
    else if (a.fechaProgramada > hoyISO) resumen.PROXIMAS++;
    else resumen.ATRASADAS++;
  }
  list.sort((a, b) => (a.fechaProgramada > b.fechaProgramada ? 1 : -1));
  return { total: list.length, resumen, actividades: list };
}

function demoAlertas(q: URLSearchParams) {
  const estado = q.get('estado');
  const term = (q.get('q') ?? '').toLowerCase().trim();
  let list = [...S.alertas];
  if (estado) list = list.filter((a) => a.estado === estado);
  if (term) list = list.filter((a) => a.titulo.toLowerCase().includes(term));
  const resumen: Record<string, number> = {};
  for (const a of list) resumen[a.estado] = (resumen[a.estado] ?? 0) + 1;
  return { total: list.length, resumen, alertas: list };
}

function demoEscanearAlertas(): number {
  let creadas = 0;
  for (const a of allActividades()) {
    if (a.estadoCalculado === 'ATRASADA') {
      const existe = S.alertas.some((x) => x.actividad?.id === a.id);
      if (!existe) {
        S.alertas.push({
          id: nid(),
          tipo: 'ACTIVIDAD',
          titulo: 'Actividad atrasada: ' + a.tipoActividad.nombre,
          descripcion: 'La actividad programada para ' + a.fechaProgramada + ' sigue pendiente.',
          prioridad: 'MEDIA',
          estado: 'NUEVA',
          fechaGeneracion: ahora(),
          fechaLimite: dISO(7),
          fechaAtencion: null,
          fechaCierre: null,
          observaciones: null,
          responsableId: null,
          responsableUsuario: null,
          beneficiario: { ...a.asignacionCaso.caso.beneficiario },
          documento: null,
          actividad: { id: a.id, fechaProgramada: a.fechaProgramada, tipoActividad: { nombre: a.tipoActividad.nombre } },
        });
        creadas++;
      }
    }
  }
  return creadas;
}

function demoReporte(q: URLSearchParams) {
  const formato = q.get('formato');
  const estado = q.get('estado');
  const area = q.get('area');
  const desde = q.get('desde');
  const hasta = q.get('hasta');
  const term = (q.get('q') ?? '').toLowerCase().trim();
  let list = allBens();
  if (estado) list = list.filter((b) => b.estado === estado);
  if (desde) list = list.filter((b) => b.fechaIngreso >= desde!);
  if (hasta) list = list.filter((b) => b.fechaIngreso <= hasta!);
  if (term) {
    list = list.filter((b) => (b.nombres + ' ' + b.apellidos).toLowerCase().includes(term) || b.numeroDocumento.includes(term) || b.numeroHistoria.includes(term));
  }
  let filas = list.map((b) => {
    const a = activeAreaOf(b);
    const asig = b.casos?.[0]?.asignaciones?.find((x: any) => x.estado === 'ACTIVA');
    return {
      id: b.id,
      historia: b.numeroHistoria,
      documento: b.tipoDocumento + ' ' + b.numeroDocumento,
      nombres: b.nombres,
      apellidos: b.apellidos,
      edad: Math.floor((Date.now() - new Date(b.fechaNacimiento).getTime()) / (365.25 * 24 * 3600 * 1000)),
      genero: b.genero ?? ' - ',
      area: a?.codigo ?? ' - ',
      areaNombre: a?.nombre ?? ' - ',
      profesional: asig ? asig.profesional.nombres + ' ' + asig.profesional.apellidos : ' - ',
      estado: b.estado,
      fechaIngreso: b.fechaIngreso,
    };
  });
  if (area) filas = filas.filter((f) => f.area === area);
  const filtrosTxt = [estado, area, desde, hasta, term].filter(Boolean).join(' · ') || 'sin filtros';
  if (formato === 'csv') {
    const head = 'historia,documento,nombres,apellidos,edad,genero,area,profesional,estado,fechaIngreso';
    const lines = filas.map((f) => [f.historia, f.documento, f.nombres, f.apellidos, f.edad, f.genero, f.area, f.profesional, f.estado, f.fechaIngreso].map((x) => '"' + String(x).split('"').join('""') + '"').join(','));
    return head + '\n' + lines.join('\n');
  }
  if (formato === 'html') {
    const rows = filas.map((f) => '<tr><td>' + f.historia + '</td><td>' + f.nombres + ' ' + f.apellidos + '</td><td>' + f.documento + '</td><td>' + f.edad + '</td><td>' + f.areaNombre + '</td><td>' + f.profesional + '</td><td>' + f.estado + '</td><td>' + f.fechaIngreso + '</td></tr>').join('');
    return '<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif"><h1>Reporte de beneficiarios (demo)</h1><table border="1" cellpadding="6" style="border-collapse:collapse">' + rows + '</table></body></html>';
  }
  return { total: filas.length, filtros: filtrosTxt, filas };
}

function demoClasificarIMC(q: URLSearchParams) {
  const peso = Number(q.get('peso'));
  const talla = Number(q.get('talla'));
  const benId = Number(q.get('beneficiarioId'));
  const b = findBen(benId);
  const imc = talla > 0 ? +(peso / Math.pow(talla / 100, 2)).toFixed(1) : null;
  const edadAnios = b ? Math.floor((Date.now() - new Date(b.fechaNacimiento).getTime()) / (365.25 * 24 * 3600 * 1000)) : 10;
  const percentil = imc != null ? Math.round(50 + (imc - 16) * 5) : null;
  let categoria = 'SALUDABLE';
  if (imc != null && percentil != null) {
    if (percentil < 5) categoria = 'BAJO_PESO';
    else if (percentil >= 95) categoria = 'OBESIDAD';
    else if (percentil >= 85) categoria = 'SOBREPESO';
  }
  return {
    imc,
    percentil,
    categoria,
    imcP95: imc != null ? +(imc + 2).toFixed(1) : null,
    edadMeses: edadAnios * 12,
    edadAnios,
    edadMesesRestantes: 0,
    aplica: true,
    nivelRiesgoSugerido: categoria === 'SALUDABLE' ? 'SIN_RIESGO' : 'CON_RIESGO',
  };
}

// ── Transformaciones de fila ─────────────────────────────────────────
function benToRow(b: any) {
  return { ...b, casos: b.casos.map((c: any) => ({ ...c, documentos: undefined })) };
}

function benToDetail(b: any) {
  const conds = S.condiciones.filter((c) => c.beneficiarioId === b.id);
  const docs = S.documentos.filter((d) => d.beneficiario.id === b.id);
  const cs = S.controlesSalud.filter((c) => c.beneficiario.id === b.id);
  const cn = S.controlesNutricionales.filter((c) => c.beneficiario.id === b.id);
  const redes = S.redes.filter((r) => r.beneficiario.id === b.id);
  const alertas = S.alertas.filter((a) => a.beneficiario?.id === b.id);
  const eps = DEMO_EPS.find((e) => e.id === b.epsId) ?? null;
  const def = DEMO_DEFENSORIAS.find((d) => d.id === b.defensoriaId) ?? null;
  const estAf = DEMO_ESTADOS_AFILIACION.find((e) => e.id === b.estadoAfiliacionId) ?? null;
  return {
    ...b,
    casos: b.casos.map((c: any) => ({ ...c, documentos: undefined })),
    eps,
    defensoria: def,
    estadoAfiliacion: estAf,
    condiciones: conds,
    controlesSalud: cs,
    controlesNutricionales: cn,
    redesApoyo: redes,
    alertas,
  };
}

function splitPath(path: string): [string, string | null] {
  const i = path.indexOf('?');
  if (i < 0) return [path, null];
  return [path.slice(0, i), path.slice(i + 1)];
}

function mesInicioISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

// ── API pública demo ─────────────────────────────────────────────────
export const demoApi = {
  get<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => setTimeout(() => {
      try { resolve(demoGet(path) as T); } catch (e) { reject(e); }
    }, 120 + Math.random() * 200));
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return new Promise((resolve, reject) => setTimeout(() => {
      try { resolve(demoMutate('POST', path, body) as T); } catch (e) { reject(e); }
    }, 150 + Math.random() * 220));
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return new Promise((resolve, reject) => setTimeout(() => {
      try { resolve(demoMutate('PATCH', path, body) as T); } catch (e) { reject(e); }
    }, 150 + Math.random() * 220));
  },
  del<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => setTimeout(() => {
      try { resolve(demoMutate('DELETE', path, undefined) as T); } catch (e) { reject(e); }
    }, 150 + Math.random() * 220));
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return new Promise((resolve, reject) => setTimeout(() => {
      try { resolve(demoMutate('PUT', path, body) as T); } catch (e) { reject(e); }
    }, 150 + Math.random() * 220));
  },
};
