/**
 * SGB — API REST (Sprint 0)
 * Express + Prisma + JWT + RBAC V4.1
 */
import express from 'express';
import path from 'path';
import cors from 'cors';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { authRouter } from './routes/auth.routes';
import { beneficiariosRouter } from './routes/beneficiarios.routes';
import { profesionalesRouter } from './routes/profesionales.routes';
import { casosRouter } from './routes/casos.routes';
import { actividadesRouter } from './routes/actividades.routes';
import { documentosRouter } from './routes/documentos.routes';
import { controlesRouter } from './routes/controles.routes';
import { nutricionRouter } from './routes/nutricion.routes';
import { redesRouter } from './routes/redes.routes';
import { escolaridadRouter } from './routes/escolaridad.routes';
import { alertasRouter } from './routes/alertas.routes';
import { catalogosRouter } from './routes/catalogos.routes';
import { acudientesRouter } from './routes/acudientes.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { reportesRouter } from './routes/reportes.routes';
import { atencionesRouter } from './routes/atenciones.routes';
import { usuariosRouter } from './routes/usuarios.routes';
import { condicionesRouter } from './routes/condiciones.routes';
import { auditoriaRouter } from './routes/auditoria.routes';
import { preingresosRouter } from './routes/preingresos.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Salud
app.get('/health', (_req, res) => {
  res.json({ estado: 'ok', servicio: 'sgb-backend', version: '0.1.0', sprint: 0 });
});

// Rutas
app.use('/api/auth', authRouter);
app.use('/api/beneficiarios', beneficiariosRouter);
app.use('/api/profesionales', profesionalesRouter);
app.use('/api/casos', casosRouter);
app.use('/api/actividades', actividadesRouter);
app.use('/api/documentos', documentosRouter);
app.use('/api/controles', controlesRouter);
app.use('/api/nutricion', nutricionRouter);
app.use('/api/redes', redesRouter);
app.use('/api/escolaridad', escolaridadRouter);
app.use('/api/alertas', alertasRouter);
app.use('/api/catalogos', catalogosRouter);
app.use('/api/acudientes', acudientesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/atenciones', atencionesRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/condiciones', condicionesRouter);
app.use('/api/auditoria', auditoriaRouter);
  app.use('/api/preingresos', preingresosRouter);

// Archivos de evidencias (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function main() {
  await prisma.$connect();
  app.listen(env.port, () => {
    console.log(`✅ SGB API escuchando en http://localhost:${env.port}`);
    console.log(`   Health: http://localhost:${env.port}/health`);
  });
}

main().catch((e) => {
  console.error('✖ Error al iniciar:', e);
  process.exit(1);
});
