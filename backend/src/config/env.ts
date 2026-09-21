import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://sgb:sgb_secret@localhost:5432/sgb?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'cambiar-este-secreto-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // Umbrales de carga operativa (configurables)
  cargaOptimaMin: Number(process.env.CARGA_OPTIMA_MIN || 30),
  cargaOptimaMax: Number(process.env.CARGA_OPTIMA_MAX || 40),
  cargaAltaMin: Number(process.env.CARGA_ALTA_MIN || 41),
};
