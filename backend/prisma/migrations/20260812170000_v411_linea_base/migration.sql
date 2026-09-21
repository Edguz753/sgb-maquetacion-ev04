-- Línea base V4.1.1: reemplaza el esquema V4 (tablas y tipos antiguos) sin tocar _prisma_migrations
DROP TABLE IF EXISTS "alertas" CASCADE;
DROP TABLE IF EXISTS "seguimientos_especializados" CASCADE;
DROP TABLE IF EXISTS "documentos_escolares" CASCADE;
DROP TABLE IF EXISTS "escolarizacion" CASCADE;
DROP TABLE IF EXISTS "seguimientos_red" CASCADE;
DROP TABLE IF EXISTS "redes_apoyo" CASCADE;
DROP TABLE IF EXISTS "controles_medicos" CASCADE;
DROP TABLE IF EXISTS "condiciones_beneficiario" CASCADE;
DROP TABLE IF EXISTS "documentos" CASCADE;
DROP TABLE IF EXISTS "requisitos_documentales" CASCADE;
DROP TABLE IF EXISTS "control_archivo" CASCADE;
DROP TABLE IF EXISTS "evidencias" CASCADE;
DROP TABLE IF EXISTS "reglas_planificacion" CASCADE;
DROP TABLE IF EXISTS "reglas" CASCADE;
DROP TABLE IF EXISTS "auditoria" CASCADE;
DROP TABLE IF EXISTS "proyecto_vida" CASCADE;
DROP TABLE IF EXISTS "seguimientos" CASCADE;
DROP TABLE IF EXISTS "plan_caso" CASCADE;
DROP TABLE IF EXISTS "analisis_caso" CASCADE;
DROP TABLE IF EXISTS "festivos" CASCADE;
DROP TABLE IF EXISTS "actividades" CASCADE;
DROP TABLE IF EXISTS "tipos_actividad" CASCADE;
DROP TABLE IF EXISTS "caso_profesional" CASCADE;
DROP TABLE IF EXISTS "casos" CASCADE;
DROP TABLE IF EXISTS "beneficiarios" CASCADE;
DROP TABLE IF EXISTS "profesionales" CASCADE;
DROP TABLE IF EXISTS "usuarios" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;
DROP TYPE IF EXISTS "estado_archivo_enum" CASCADE;
DROP TYPE IF EXISTS "estado_documento_enum" CASCADE;
DROP TYPE IF EXISTS "estado_alerta_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_alerta_enum" CASCADE;
DROP TYPE IF EXISTS "prioridad_alerta_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_control_medico_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_condicion_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_documento_req_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_evidencia_enum" CASCADE;
DROP TYPE IF EXISTS "estado_red_apoyo_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_documento_escolar_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_seguimiento_especializado_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_regla_enum" CASCADE;
DROP TYPE IF EXISTS "accion_regla_enum" CASCADE;
DROP TYPE IF EXISTS "estado_condicion_enum" CASCADE;
DROP TYPE IF EXISTS "estado_control_archivo_enum" CASCADE;
DROP TYPE IF EXISTS "rol_enum" CASCADE;
DROP TYPE IF EXISTS "estado_usuario_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_documento_enum" CASCADE;
DROP TYPE IF EXISTS "genero_enum" CASCADE;
DROP TYPE IF EXISTS "estado_beneficiario_enum" CASCADE;
DROP TYPE IF EXISTS "estado_caso_enum" CASCADE;
DROP TYPE IF EXISTS "area_enum" CASCADE;
DROP TYPE IF EXISTS "estado_actividad_enum" CASCADE;
DROP TYPE IF EXISTS "origen_actividad_enum" CASCADE;
DROP TYPE IF EXISTS "accion_auditoria_enum" CASCADE;
DROP TYPE IF EXISTS "estado_profesional_enum" CASCADE;
DROP TYPE IF EXISTS "tipo_seguimiento_enum" CASCADE;
DROP TYPE IF EXISTS "EstadoBeneficiario" CASCADE;
DROP TYPE IF EXISTS "EstadoCaso" CASCADE;
DROP TYPE IF EXISTS "EstadoActividad" CASCADE;
DROP TYPE IF EXISTS "EstadoDocumento" CASCADE;
DROP TYPE IF EXISTS "EstadoAlerta" CASCADE;
DROP TYPE IF EXISTS "TipoAlerta" CASCADE;
DROP TYPE IF EXISTS "PrioridadAlerta" CASCADE;
DROP TYPE IF EXISTS "EstadoArchivo" CASCADE;
DROP TYPE IF EXISTS "TipoControlMedico" CASCADE;
DROP TYPE IF EXISTS "TipoCondicion" CASCADE;
DROP TYPE IF EXISTS "TipoDocumentoReq" CASCADE;
DROP TYPE IF EXISTS "TipoEvidencia" CASCADE;
DROP TYPE IF EXISTS "EstadoRedApoyo" CASCADE;
DROP TYPE IF EXISTS "TipoDocumentoEscolar" CASCADE;
DROP TYPE IF EXISTS "TipoSeguimientoEspecializado" CASCADE;
DROP TYPE IF EXISTS "TipoRegla" CASCADE;
DROP TYPE IF EXISTS "AccionRegla" CASCADE;
DROP TYPE IF EXISTS "EstadoCondicion" CASCADE;
DROP TYPE IF EXISTS "EstadoControlArchivo" CASCADE;
DROP TYPE IF EXISTS "Rol" CASCADE;
DROP TYPE IF EXISTS "EstadoUsuario" CASCADE;
DROP TYPE IF EXISTS "TipoDocumento" CASCADE;
DROP TYPE IF EXISTS "Genero" CASCADE;
DROP TYPE IF EXISTS "Area" CASCADE;
DROP TYPE IF EXISTS "OrigenActividad" CASCADE;
DROP TYPE IF EXISTS "AccionAuditoria" CASCADE;
DROP TYPE IF EXISTS "EstadoProfesional" CASCADE;
DROP TYPE IF EXISTS "TipoSeguimiento" CASCADE;
-- CreateEnum
CREATE TYPE "EstadoBeneficiario" AS ENUM ('ACTIVO', 'EGRESADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "EstadoCaso" AS ENUM ('ACTIVO', 'CERRADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('ACTIVA', 'FINALIZADA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "EstadoActividad" AS ENUM ('PENDIENTE', 'REALIZADA', 'ATRASADA', 'CANCELADA', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "PrioridadActividad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('PENDIENTE', 'RECIBIDO', 'VIGENTE', 'VENCIDO', 'FALTANTE', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "EstadoRevisionArchivo" AS ENUM ('PENDIENTE', 'CORRECTO', 'INCOMPLETO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "NivelRiesgoNutricional" AS ENUM ('SIN_RIESGO', 'CON_RIESGO');

-- CreateEnum
CREATE TYPE "EstadoControl" AS ENUM ('PENDIENTE', 'REALIZADO', 'ATRASADO', 'CANCELADO', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "EstadoRed" AS ENUM ('IDENTIFICADA', 'REMISIONADA', 'ACTIVA', 'VERIFICACION_PENDIENTE', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('NUEVA', 'ASIGNADA', 'EN_PROCESO', 'ATENDIDA', 'CERRADA', 'CANCELADA', 'REABIERTA');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('DOCUMENTO', 'ACTIVIDAD', 'ARCHIVO', 'SALUD', 'NUTRICION', 'ESCOLARIZACION', 'RED_APOYO', 'EDAD', 'VENCIMIENTO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "AlcancePermiso" AS ENUM ('ALL', 'OWN', 'ASSIGNED', 'NONE');

-- CreateEnum
CREATE TYPE "EstadoReglaInstancia" AS ENUM ('PENDIENTE', 'PROCESADA', 'OMITIDA', 'ERROR');

-- CreateTable
CREATE TABLE "rol" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permiso" (
    "id" SERIAL NOT NULL,
    "recurso" VARCHAR(80) NOT NULL,
    "accion" VARCHAR(40) NOT NULL,
    "alcance" "AlcancePermiso" NOT NULL DEFAULT 'ALL',
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "rol_id" INTEGER NOT NULL,
    "permiso_id" INTEGER NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profesional" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "tipo_documento" VARCHAR(30),
    "numero_documento" VARCHAR(50),
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiario" (
    "id" SERIAL NOT NULL,
    "numero_historia" VARCHAR(50) NOT NULL,
    "tipo_documento" VARCHAR(30) NOT NULL,
    "numero_documento" VARCHAR(50) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "genero" VARCHAR(30),
    "telefono" VARCHAR(30),
    "correo" VARCHAR(255),
    "direccion" TEXT,
    "estado" "EstadoBeneficiario" NOT NULL DEFAULT 'ACTIVO',
    "fecha_ingreso" DATE NOT NULL,
    "fecha_egreso" DATE,
    "motivo_egreso" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "beneficiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caso" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "numero_caso" VARCHAR(50) NOT NULL,
    "fecha_apertura" DATE NOT NULL,
    "fecha_cierre" DATE,
    "estado" "EstadoCaso" NOT NULL DEFAULT 'ACTIVO',
    "motivo_ingreso" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_caso" (
    "id" SERIAL NOT NULL,
    "caso_id" INTEGER NOT NULL,
    "profesional_id" INTEGER NOT NULL,
    "area_id" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'ACTIVA',
    "motivo_cambio" TEXT,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "asignacion_caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_actividad" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "area_id" INTEGER,
    "periodicidad_dias" INTEGER,
    "requiere_archivo" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividad" (
    "id" SERIAL NOT NULL,
    "asignacion_caso_id" INTEGER NOT NULL,
    "tipo_actividad_id" INTEGER NOT NULL,
    "fecha_programada" DATE NOT NULL,
    "fecha_realizacion" DATE,
    "estado" "EstadoActividad" NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" "PrioridadActividad" NOT NULL DEFAULT 'MEDIA',
    "es_emergente" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_documento" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(80),
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "edad_inicio" INTEGER,
    "edad_fin" INTEGER,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "caso_id" INTEGER,
    "tipo_documento_id" INTEGER NOT NULL,
    "fecha_documento" DATE,
    "fecha_recepcion" DATE,
    "fecha_vencimiento" DATE,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencia" (
    "id" SERIAL NOT NULL,
    "actividad_id" INTEGER,
    "documento_id" INTEGER,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_referencia" TEXT NOT NULL,
    "tipo_mime" VARCHAR(120),
    "fecha_carga" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cargado_por" INTEGER NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_archivo" (
    "id" SERIAL NOT NULL,
    "documento_id" INTEGER NOT NULL,
    "revisado_por" INTEGER NOT NULL,
    "fecha_revision" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "estado_revision" "EstadoRevisionArchivo" NOT NULL DEFAULT 'PENDIENTE',
    "area_responsable_id" INTEGER,
    "profesional_responsable_id" INTEGER,
    "observaciones" TEXT,

    CONSTRAINT "control_archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_condicion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(80),
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_condicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicion" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "tipo_condicion_id" INTEGER NOT NULL,
    "fecha_deteccion" DATE NOT NULL,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    "descripcion" TEXT,
    "registrado_por" INTEGER,

    CONSTRAINT "condicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_control_salud" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "periodicidad_meses" INTEGER,
    "aplica_por_defecto" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_control_salud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_salud" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "tipo_control_id" INTEGER NOT NULL,
    "fecha_programada" DATE,
    "fecha_realizacion" DATE,
    "fecha_proximo_control" DATE,
    "requiere_control_especial" BOOLEAN NOT NULL DEFAULT false,
    "especialidad" VARCHAR(120),
    "estado" "EstadoControl" NOT NULL DEFAULT 'PENDIENTE',
    "soporte_documento_id" INTEGER,
    "observaciones" TEXT,

    CONSTRAINT "control_salud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_nutricional" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "profesional_id" INTEGER NOT NULL,
    "fecha_control" DATE NOT NULL,
    "nivel_riesgo" "NivelRiesgoNutricional" NOT NULL,
    "peso" DECIMAL(6,2),
    "talla" DECIMAL(6,2),
    "imc" DECIMAL(6,2),
    "periodicidad_meses" INTEGER NOT NULL,
    "fecha_proximo_control" DATE,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_nutricional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escolarizacion" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "profesional_id" INTEGER NOT NULL,
    "institucion" VARCHAR(200),
    "grado" VARCHAR(80),
    "jornada" VARCHAR(50),
    "estado_escolar" VARCHAR(80),
    "periodo" VARCHAR(50),
    "fecha_registro" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "escolarizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_red_apoyo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_red_apoyo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "red_apoyo" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "tipo_red_id" INTEGER NOT NULL,
    "profesional_id" INTEGER,
    "fecha_activacion" DATE,
    "fecha_remision" DATE,
    "fecha_ingreso_red" DATE,
    "estado" "EstadoRed" NOT NULL DEFAULT 'IDENTIFICADA',
    "fecha_cierre" DATE,
    "observaciones" TEXT,

    CONSTRAINT "red_apoyo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soporte_red" (
    "id" SERIAL NOT NULL,
    "red_apoyo_id" INTEGER NOT NULL,
    "documento_id" INTEGER NOT NULL,
    "fecha_soporte" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "soporte_red_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regla" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "condicion" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 100,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "regla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regla_instancia" (
    "id" SERIAL NOT NULL,
    "regla_id" INTEGER NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "fecha_evaluacion" DATE NOT NULL,
    "estado" "EstadoReglaInstancia" NOT NULL DEFAULT 'PENDIENTE',
    "valor_contexto" JSONB,
    "ultima_ejecucion" TIMESTAMPTZ(6),

    CONSTRAINT "regla_instancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "regla_id" INTEGER,
    "actividad_id" INTEGER,
    "documento_id" INTEGER,
    "creada_por" INTEGER,
    "responsable_id" INTEGER,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoAlerta" NOT NULL,
    "prioridad" "PrioridadActividad" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'NUEVA',
    "fecha_generacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_limite" DATE,
    "fecha_atencion" TIMESTAMPTZ(6),
    "fecha_cierre" TIMESTAMPTZ(6),
    "observaciones" TEXT,

    CONSTRAINT "alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivo" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "pais" CHAR(2) NOT NULL DEFAULT 'CO',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "festivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivo_excepcion" (
    "id" SERIAL NOT NULL,
    "beneficiario_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "motivo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "festivo_excepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(60) NOT NULL,
    "recurso" VARCHAR(100) NOT NULL,
    "registro_id" INTEGER,
    "fecha_hora" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_anterior" JSONB,
    "valor_nuevo" JSONB,
    "observacion" TEXT,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permiso_recurso_accion_alcance_key" ON "permiso"("recurso", "accion", "alcance");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_username_key" ON "usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profesional_usuario_id_key" ON "profesional"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "profesional_numero_documento_key" ON "profesional"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiario_numero_historia_key" ON "beneficiario"("numero_historia");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiario_numero_documento_key" ON "beneficiario"("numero_documento");

-- CreateIndex
CREATE INDEX "beneficiario_estado_idx" ON "beneficiario"("estado");

-- CreateIndex
CREATE INDEX "beneficiario_fecha_ingreso_idx" ON "beneficiario"("fecha_ingreso");

-- CreateIndex
CREATE INDEX "beneficiario_fecha_egreso_idx" ON "beneficiario"("fecha_egreso");

-- CreateIndex
CREATE INDEX "beneficiario_fecha_nacimiento_idx" ON "beneficiario"("fecha_nacimiento");

-- CreateIndex
CREATE UNIQUE INDEX "caso_numero_caso_key" ON "caso"("numero_caso");

-- CreateIndex
CREATE INDEX "caso_beneficiario_id_idx" ON "caso"("beneficiario_id");

-- CreateIndex
CREATE INDEX "caso_estado_idx" ON "caso"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "area_codigo_key" ON "area"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "area_nombre_key" ON "area"("nombre");

-- CreateIndex
CREATE INDEX "asignacion_caso_caso_id_idx" ON "asignacion_caso"("caso_id");

-- CreateIndex
CREATE INDEX "asignacion_caso_profesional_id_idx" ON "asignacion_caso"("profesional_id");

-- CreateIndex
CREATE INDEX "asignacion_caso_area_id_idx" ON "asignacion_caso"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_actividad_codigo_key" ON "tipo_actividad"("codigo");

-- CreateIndex
CREATE INDEX "actividad_asignacion_caso_id_idx" ON "actividad"("asignacion_caso_id");

-- CreateIndex
CREATE INDEX "actividad_tipo_actividad_id_idx" ON "actividad"("tipo_actividad_id");

-- CreateIndex
CREATE INDEX "actividad_fecha_programada_estado_idx" ON "actividad"("fecha_programada", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_documento_codigo_key" ON "tipo_documento"("codigo");

-- CreateIndex
CREATE INDEX "documento_beneficiario_id_idx" ON "documento"("beneficiario_id");

-- CreateIndex
CREATE INDEX "documento_caso_id_idx" ON "documento"("caso_id");

-- CreateIndex
CREATE INDEX "documento_tipo_documento_id_idx" ON "documento"("tipo_documento_id");

-- CreateIndex
CREATE INDEX "documento_estado_idx" ON "documento"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_condicion_nombre_key" ON "tipo_condicion"("nombre");

-- CreateIndex
CREATE INDEX "condicion_beneficiario_id_idx" ON "condicion"("beneficiario_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_control_salud_codigo_key" ON "tipo_control_salud"("codigo");

-- CreateIndex
CREATE INDEX "control_salud_beneficiario_id_idx" ON "control_salud"("beneficiario_id");

-- CreateIndex
CREATE INDEX "control_nutricional_beneficiario_id_idx" ON "control_nutricional"("beneficiario_id");

-- CreateIndex
CREATE INDEX "escolarizacion_beneficiario_id_idx" ON "escolarizacion"("beneficiario_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_red_apoyo_nombre_key" ON "tipo_red_apoyo"("nombre");

-- CreateIndex
CREATE INDEX "red_apoyo_beneficiario_id_idx" ON "red_apoyo"("beneficiario_id");

-- CreateIndex
CREATE INDEX "red_apoyo_estado_idx" ON "red_apoyo"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "regla_codigo_key" ON "regla"("codigo");

-- CreateIndex
CREATE INDEX "regla_instancia_beneficiario_id_idx" ON "regla_instancia"("beneficiario_id");

-- CreateIndex
CREATE INDEX "alerta_beneficiario_id_idx" ON "alerta"("beneficiario_id");

-- CreateIndex
CREATE INDEX "alerta_responsable_id_estado_idx" ON "alerta"("responsable_id", "estado");

-- CreateIndex
CREATE INDEX "alerta_fecha_limite_idx" ON "alerta"("fecha_limite");

-- CreateIndex
CREATE UNIQUE INDEX "festivo_fecha_key" ON "festivo"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "festivo_excepcion_beneficiario_id_fecha_key" ON "festivo_excepcion"("beneficiario_id", "fecha");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_recurso_idx" ON "auditoria"("recurso");

-- CreateIndex
CREATE INDEX "auditoria_fecha_hora_idx" ON "auditoria"("fecha_hora");

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profesional" ADD CONSTRAINT "profesional_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso" ADD CONSTRAINT "caso_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_caso" ADD CONSTRAINT "asignacion_caso_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_caso" ADD CONSTRAINT "asignacion_caso_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_caso" ADD CONSTRAINT "asignacion_caso_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_actividad" ADD CONSTRAINT "tipo_actividad_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_asignacion_caso_id_fkey" FOREIGN KEY ("asignacion_caso_id") REFERENCES "asignacion_caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_tipo_actividad_id_fkey" FOREIGN KEY ("tipo_actividad_id") REFERENCES "tipo_actividad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "caso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_tipo_documento_id_fkey" FOREIGN KEY ("tipo_documento_id") REFERENCES "tipo_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_cargado_por_fkey" FOREIGN KEY ("cargado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_revisado_por_fkey" FOREIGN KEY ("revisado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_area_responsable_id_fkey" FOREIGN KEY ("area_responsable_id") REFERENCES "area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_profesional_responsable_id_fkey" FOREIGN KEY ("profesional_responsable_id") REFERENCES "profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicion" ADD CONSTRAINT "condicion_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicion" ADD CONSTRAINT "condicion_tipo_condicion_id_fkey" FOREIGN KEY ("tipo_condicion_id") REFERENCES "tipo_condicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicion" ADD CONSTRAINT "condicion_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_salud" ADD CONSTRAINT "control_salud_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_salud" ADD CONSTRAINT "control_salud_tipo_control_id_fkey" FOREIGN KEY ("tipo_control_id") REFERENCES "tipo_control_salud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_salud" ADD CONSTRAINT "control_salud_soporte_documento_id_fkey" FOREIGN KEY ("soporte_documento_id") REFERENCES "documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_nutricional" ADD CONSTRAINT "control_nutricional_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_nutricional" ADD CONSTRAINT "control_nutricional_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolarizacion" ADD CONSTRAINT "escolarizacion_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolarizacion" ADD CONSTRAINT "escolarizacion_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "red_apoyo" ADD CONSTRAINT "red_apoyo_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "red_apoyo" ADD CONSTRAINT "red_apoyo_tipo_red_id_fkey" FOREIGN KEY ("tipo_red_id") REFERENCES "tipo_red_apoyo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "red_apoyo" ADD CONSTRAINT "red_apoyo_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soporte_red" ADD CONSTRAINT "soporte_red_red_apoyo_id_fkey" FOREIGN KEY ("red_apoyo_id") REFERENCES "red_apoyo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soporte_red" ADD CONSTRAINT "soporte_red_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regla_instancia" ADD CONSTRAINT "regla_instancia_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "regla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regla_instancia" ADD CONSTRAINT "regla_instancia_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "regla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_creada_por_fkey" FOREIGN KEY ("creada_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festivo_excepcion" ADD CONSTRAINT "festivo_excepcion_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;


