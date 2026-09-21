// Prueba de humo del modo demo: carga el bundle compilado en un entorno
// DOM mínimo y verifica que login + páginas principales respondan.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://edguz753.github.io/sgb-maquetacion-ev04/',
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
try { global.navigator = dom.window.navigator; } catch { /* Node 22: navigator readonly, ya existe */ }
global.location = dom.window.location;
global.history = dom.window.history;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
window.addEventListener = dom.window.addEventListener.bind(dom.window);

// fetch no debería usarse en modo demo
global.fetch = () => { throw new Error('fetch llamado en modo demo (no esperado)'); };

const { demoApi, MODO_DEMO } = await import('../src/lib/demo-api.ts');
console.log('MODO_DEMO =', MODO_DEMO);

// 1) Login incorrecto
try { await demoApi.post('/auth/login', { username: 'admin', password: 'mala' }); console.log('FAIL login malo aceptado'); }
catch (e) { console.log('OK login rechazado:', e.message); }

// 2) Login admin
const r = await demoApi.post('/auth/login', { username: 'admin', password: 'Admin123!' });
console.log('OK login admin:', r.usuario.nombreCompleto, '| rol', r.usuario.rol);

// 3) Dashboard global
const d = await demoApi.get('/dashboard');
console.log('OK dashboard global: activos=', d.kpis.beneficiariosActivos, 'casos=', d.kpis.casosActivos, 'atrasadas=', d.kpis.actividadesAtrasadas, 'hoy=', d.kpis.actividadesHoy, 'carga=', d.carga.length);

// 4) Beneficiarios
const bl = await demoApi.get('/beneficiarios');
console.log('OK beneficiarios:', bl.total, '| vista', bl.vista, '| primero:', bl.beneficiarios[0].nombres, bl.beneficiarios[0].apellidos, bl.beneficiarios[0].numeroHistoria);

// 5) Detalle
const det = await demoApi.get('/beneficiarios/1');
console.log('OK detalle:', det.nombres, det.apellidos, '| caso', det.casos[0].numeroCaso, '| acts', det.casos[0].asignaciones[0].actividades.length, '| EPS', det.eps?.nombre);

// 6) Actividades
const ac = await demoApi.get('/actividades');
console.log('OK actividades:', ac.total, '| resumen', JSON.stringify(ac.resumen));

// 7) Login profesional
await demoApi.post('/auth/login', { username: 'ps.maria', password: 'Prof123!' });
const dp = await demoApi.get('/dashboard');
console.log('OK dashboard profesional: beneficiarios=', dp.misBeneficiarios, '| resumen', JSON.stringify(dp.resumenActividades));

// 8) Escanear alertas
await demoApi.post('/auth/login', { username: 'admin', password: 'Admin123!' });
const esc = await demoApi.post('/alertas/escanear');
console.log('OK escanear alertas:', JSON.stringify(esc));
const al = await demoApi.get('/alertas');
console.log('OK alertas:', al.total);

// 9) Crear beneficiario
const nb = await demoApi.post('/beneficiarios', {
  tipoDocumento: 'RC', numeroDocumento: '1199887766', nombres: 'Prueba', apellidos: 'Demo',
  fechaNacimiento: '2016-04-12', genero: 'F', fechaIngreso: '2026-09-20', motivoIngreso: 'Prueba demo',
  areaInicial: 'PS', profesionalId: 1,
});
console.log('OK crear beneficiario:', nb.numeroHistoria, nb.numeroCaso, '| acts generadas:', nb.actividadesGeneradas.length);

// 10) Reporte
const rep = await demoApi.get('/reportes/beneficiarios?formato=json');
console.log('OK reporte:', rep.total, 'filas | filtros:', rep.filtros);

// 11) Marcar actividad realizada
const ac2 = await demoApi.get('/actividades?estado=PENDIENTE');
if (ac2.actividades.length) {
  const mr = await demoApi.patch('/actividades/' + ac2.actividades[0].id + '/marcar-realizada');
  console.log('OK marcar realizada:', mr.mensaje);
} else console.log('Sin actividades pendientes para marcar');

// 12) Nutrición clasificar
const cl = await demoApi.get('/nutricion/clasificar?beneficiarioId=2&peso=32&talla=132');
console.log('OK clasificar IMC:', JSON.stringify(cl));

console.log('SMOKE TEST COMPLETO');
