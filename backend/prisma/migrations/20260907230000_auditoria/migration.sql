-- Auditoría SGB: monitores vinculados a profesionales + pre-ingreso pre-entrevista
ALTER TABLE "monitor" ADD COLUMN "profesional_id" INTEGER REFERENCES "profesional"("id");

ALTER TABLE "pre_ingreso" ADD COLUMN "tipo_documento" VARCHAR(30),
    ADD COLUMN "documento_acudiente" VARCHAR(50),
    ADD COLUMN "barrio" VARCHAR(120),
    ADD COLUMN "direccion" TEXT,
    ADD COLUMN "motivo_apertura_cupo" TEXT,
    ADD COLUMN "antecedentes_medicos" TEXT,
    ADD COLUMN "ocupacion_acudiente" VARCHAR(120);