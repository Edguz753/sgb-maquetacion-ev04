-- Sprint: baremo CDC de IMC por percentil en controles nutricionales
ALTER TABLE "control_nutricional" ADD COLUMN "imc_percentil" DOUBLE PRECISION,
    ADD COLUMN "categoria_imc" VARCHAR(40),
    ADD COLUMN "imc_p95" DOUBLE PRECISION;
