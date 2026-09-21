-- Taller y barrio del beneficiario + módulo de pre-ingresos (citaciones)
ALTER TABLE "beneficiario" ADD COLUMN "taller" VARCHAR(60),
    ADD COLUMN "barrio" VARCHAR(120);

-- Tabla pre_ingreso
-- Tipo de estado de pre-ingreso
CREATE TYPE "EstadoPreIngreso" AS ENUM ('PENDIENTE', 'CITADO', 'CONFIRMADO', 'INGRESADO', 'DESCARTADO');
CREATE TABLE "pre_ingreso" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "numero_documento" VARCHAR(50),
    "acudiente" VARCHAR(150),
    "telefono" VARCHAR(80),
    "lugar_residencia" VARCHAR(150),
    "fecha_citacion" DATE,
    "hora_citacion" VARCHAR(20),
    "recordatorio" VARCHAR(60),
    "respuesta" VARCHAR(150),
    "observaciones" TEXT,
    "estado" "EstadoPreIngreso" NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pre_ingreso_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pre_ingreso" ALTER COLUMN "estado" TYPE "EstadoPreIngreso" USING ("estado"::text::"EstadoPreIngreso");

CREATE INDEX "pre_ingreso_estado_idx" ON "pre_ingreso"("estado");
CREATE INDEX "pre_ingreso_fecha_citacion_idx" ON "pre_ingreso"("fecha_citacion");
