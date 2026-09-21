-- Migración: módulo Familia (acudientes/familiares del beneficiario)
-- Sprint: ficha familiar (aditiva, no modifica tablas existentes)

-- CreateTable
CREATE TABLE "familiar" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "nombres" VARCHAR(150) NOT NULL,
    "parentezco" VARCHAR(50) NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "convive" BOOLEAN NOT NULL DEFAULT false,
    "tipo_documento" VARCHAR(30),
    "numero_documento" VARCHAR(50),
    "telefono" VARCHAR(30),
    "correo" VARCHAR(255),
    "ocupacion" VARCHAR(120),
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "familiar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "familiar_beneficiario_id_idx" ON "familiar"("beneficiario_id");

-- AddForeignKey
ALTER TABLE "familiar" ADD CONSTRAINT "familiar_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
