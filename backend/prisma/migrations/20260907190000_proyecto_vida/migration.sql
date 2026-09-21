-- Tipos de actividad del Proyecto de Vida (cronogramas por área desde el ingreso)
-- Psicología: +1m, +7m, +13m | Trabajo Social: +4m, +10m, +15m | Pedagogía: +6m, +12m, +17m
INSERT INTO "tipo_actividad" ("codigo", "nombre", "area_id", "requiere_archivo", "activa") VALUES
('PV_PS_1',  'Proyecto de vida — Psicología (1 mes)',  (SELECT "id" FROM "area" WHERE "codigo" = 'PS'), false, true),
('PV_PS_7',  'Proyecto de vida — Seguimiento Psicología (7 meses)',  (SELECT "id" FROM "area" WHERE "codigo" = 'PS'), false, true),
('PV_PS_13', 'Proyecto de vida — Seguimiento Psicología (13 meses)', (SELECT "id" FROM "area" WHERE "codigo" = 'PS'), false, true),
('PV_TS_4',  'Proyecto de vida — Trabajo Social (4 meses)',  (SELECT "id" FROM "area" WHERE "codigo" = 'TS'), false, true),
('PV_TS_10', 'Proyecto de vida — Seguimiento Trabajo Social (10 meses)', (SELECT "id" FROM "area" WHERE "codigo" = 'TS'), false, true),
('PV_TS_15', 'Proyecto de vida — Seguimiento Trabajo Social (15 meses)', (SELECT "id" FROM "area" WHERE "codigo" = 'TS'), false, true),
('PV_PD_6',  'Proyecto de vida — Pedagogía (6 meses)',  (SELECT "id" FROM "area" WHERE "codigo" = 'PD'), false, true),
('PV_PD_12', 'Proyecto de vida — Seguimiento Pedagogía (12 meses)', (SELECT "id" FROM "area" WHERE "codigo" = 'PD'), false, true),
('PV_PD_17', 'Proyecto de vida — Seguimiento Pedagogía (17 meses)', (SELECT "id" FROM "area" WHERE "codigo" = 'PD'), false, true)
ON CONFLICT ("codigo") DO NOTHING;
