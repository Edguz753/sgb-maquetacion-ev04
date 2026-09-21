-- Migración reestructuración: familia (acudientes N:M), escolaridad estructurada y catálogos del ERD
-- Conserva todas las tablas existentes. Trasladar datos de "familiar" a "acudiente"+"beneficiario_acudiente" y eliminarla.

-- CreateTable
CREATE TABLE "acudiente" (
    "id" SERIAL NOT NULL,
    "nombres" VARCHAR(150) NOT NULL,
    "tipo_documento" VARCHAR(30),
    "numero_documento" VARCHAR(50),
    "telefono" VARCHAR(30),
    "direccion" TEXT,
    "correo" VARCHAR(255),
    "ocupacion" VARCHAR(120),
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "acudiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiario_acudiente" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "acudiente_id" INTEGER NOT NULL,
    "parentezco" VARCHAR(50) NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "convive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "beneficiario_acudiente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitor" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    CONSTRAINT "monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eps" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "regimen" VARCHAR(50),
    CONSTRAINT "eps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defensoria" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "centro_zonal" VARCHAR(80),
    CONSTRAINT "defensoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_afiliacion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,
    CONSTRAINT "estado_afiliacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colegio" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "localidad" VARCHAR(120),
    "sede" VARCHAR(80),
    CONSTRAINT "colegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_escolar" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,
    CONSTRAINT "estado_escolar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orientador" (
    "id" SERIAL NOT NULL,
    "colegio_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(30),
    "correo" VARCHAR(255),
    CONSTRAINT "orientador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colegio_beneficiario" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "colegio_id" INTEGER,
    "estado_escolar_id" INTEGER NOT NULL,
    "jornada" VARCHAR(50),
    "grado" VARCHAR(50),
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "actual" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "colegio_beneficiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
ALTER TABLE "beneficiario" ADD COLUMN "sim" VARCHAR(50),
    ADD COLUMN "jornada_club" VARCHAR(50),
    ADD COLUMN "monitor_id" INTEGER,
    ADD COLUMN "eps_id" INTEGER,
    ADD COLUMN "defensoria_id" INTEGER,
    ADD COLUMN "estado_afiliacion_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "monitor_codigo_key" ON "monitor"("codigo");
CREATE UNIQUE INDEX "eps_nombre_key" ON "eps"("nombre");
CREATE UNIQUE INDEX "estado_afiliacion_nombre_key" ON "estado_afiliacion"("nombre");
CREATE UNIQUE INDEX "estado_escolar_nombre_key" ON "estado_escolar"("nombre");
CREATE INDEX "acudiente_numero_documento_idx" ON "acudiente"("numero_documento");
CREATE INDEX "beneficiario_acudiente_acudiente_id_idx" ON "beneficiario_acudiente"("acudiente_id");
CREATE UNIQUE INDEX "beneficiario_acudiente_beneficiario_id_acudiente_id_key" ON "beneficiario_acudiente"("beneficiario_id", "acudiente_id");
CREATE INDEX "colegio_beneficiario_beneficiario_id_idx" ON "colegio_beneficiario"("beneficiario_id");
CREATE INDEX "orientador_colegio_id_idx" ON "orientador"("colegio_id");

-- AddForeignKey
ALTER TABLE "beneficiario_acudiente" ADD CONSTRAINT "beneficiario_acudiente_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "beneficiario_acudiente" ADD CONSTRAINT "beneficiario_acudiente_acudiente_id_fkey" FOREIGN KEY ("acudiente_id") REFERENCES "acudiente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orientador" ADD CONSTRAINT "orientador_colegio_id_fkey" FOREIGN KEY ("colegio_id") REFERENCES "colegio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "colegio_beneficiario" ADD CONSTRAINT "colegio_beneficiario_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "colegio_beneficiario" ADD CONSTRAINT "colegio_beneficiario_colegio_id_fkey" FOREIGN KEY ("colegio_id") REFERENCES "colegio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "colegio_beneficiario" ADD CONSTRAINT "colegio_beneficiario_estado_escolar_id_fkey" FOREIGN KEY ("estado_escolar_id") REFERENCES "estado_escolar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "beneficiario" ADD CONSTRAINT "beneficiario_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "beneficiario" ADD CONSTRAINT "beneficiario_eps_id_fkey" FOREIGN KEY ("eps_id") REFERENCES "eps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "beneficiario" ADD CONSTRAINT "beneficiario_defensoria_id_fkey" FOREIGN KEY ("defensoria_id") REFERENCES "defensoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "beneficiario" ADD CONSTRAINT "beneficiario_estado_afiliacion_id_fkey" FOREIGN KEY ("estado_afiliacion_id") REFERENCES "estado_afiliacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Traslado de datos: familiar -> acudiente + beneficiario_acudiente (si existía la tabla)
INSERT INTO "acudiente" ("nombres", "tipo_documento", "numero_documento", "telefono", "correo", "ocupacion")
SELECT f."nombres", f."tipo_documento", f."numero_documento", f."telefono", f."correo", f."ocupacion"
FROM "familiar" f;

INSERT INTO "beneficiario_acudiente" ("beneficiario_id", "acudiente_id", "parentezco", "es_principal", "convive", "created_at", "updated_at")
SELECT f."beneficiario_id", a."id", f."parentezco", f."es_principal", f."convive", f."created_at", CURRENT_TIMESTAMP
FROM "familiar" f
JOIN "acudiente" a ON a."nombres" = f."nombres" AND a."tipo_documento" IS NOT DISTINCT FROM f."tipo_documento" AND a."numero_documento" IS NOT DISTINCT FROM f."numero_documento";

DROP TABLE "familiar";