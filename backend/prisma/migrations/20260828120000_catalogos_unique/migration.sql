-- Catálogos: nombre único (el seed hace upsert por nombre)
CREATE UNIQUE INDEX "defensoria_nombre_key" ON "defensoria"("nombre");
CREATE UNIQUE INDEX "colegio_nombre_key" ON "colegio"("nombre");
