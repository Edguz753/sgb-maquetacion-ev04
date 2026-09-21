-- Migración Sprint 9: Atenciones y seguimientos por áreas
-- plan_atencion (rotación manual del gestor), atencion (atenciones generadas), hecho_emergente (situaciones de riesgo)

-- CreateTable
CREATE TABLE "plan_atencion" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "periodicidad_meses" INTEGER NOT NULL DEFAULT 3,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" INTEGER NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plan_atencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atencion" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "area_codigo" VARCHAR(10) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "plan_atencion_id" INTEGER,
    "hecho_emergente_id" INTEGER,
    "fecha_programada" DATE NOT NULL,
    "fecha_realizacion" DATE,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "riesgo_emergente" VARCHAR(20),
    "observaciones" TEXT,
    "creado_por" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "atencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hecho_emergente" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "fecha_hecho" DATE NOT NULL,
    "ubicacion" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "acta_referencia" VARCHAR(120),
    "nivel_riesgo" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ABIERTO',
    "creado_por" INTEGER NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hecho_emergente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_atencion_beneficiario_id_idx" ON "plan_atencion"("beneficiario_id");
CREATE INDEX "atencion_beneficiario_id_idx" ON "atencion"("beneficiario_id");
CREATE INDEX "atencion_fecha_programada_idx" ON "atencion"("fecha_programada");
CREATE INDEX "atencion_area_codigo_idx" ON "atencion"("area_codigo");
CREATE INDEX "hecho_emergente_beneficiario_id_idx" ON "hecho_emergente"("beneficiario_id");

-- AddForeignKey
ALTER TABLE "plan_atencion" ADD CONSTRAINT "plan_atencion_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_atencion" ADD CONSTRAINT "plan_atencion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "atencion" ADD CONSTRAINT "atencion_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "atencion" ADD CONSTRAINT "atencion_plan_atencion_id_fkey" FOREIGN KEY ("plan_atencion_id") REFERENCES "plan_atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "atencion" ADD CONSTRAINT "atencion_hecho_emergente_id_fkey" FOREIGN KEY ("hecho_emergente_id") REFERENCES "hecho_emergente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "atencion" ADD CONSTRAINT "atencion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "hecho_emergente" ADD CONSTRAINT "hecho_emergente_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hecho_emergente" ADD CONSTRAINT "hecho_emergente_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;