-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'GESTOR', 'PROFESIONAL', 'COORDINADOR', 'SECRETARIA');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CC', 'TI', 'CE', 'RC', 'PA');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('M', 'F', 'O');

-- CreateEnum
CREATE TYPE "EstadoBeneficiario" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoCaso" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'EGRESADO');

-- CreateEnum
CREATE TYPE "Area" AS ENUM ('PS', 'TS', 'PD', 'NT');

-- CreateEnum
CREATE TYPE "EstadoActividad" AS ENUM ('PROGRAMADA', 'PENDIENTE', 'HOY', 'ATRASADA', 'REALIZADA', 'CANCELADA', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "OrigenActividad" AS ENUM ('SISTEMA', 'MANUAL');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'ESTADO');

-- CreateEnum
CREATE TYPE "EstadoProfesional" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoSeguimiento" AS ENUM ('ANALISIS', 'PLAN');

-- CreateEnum
CREATE TYPE "EstadoArchivo" AS ENUM ('NO_REQUIERE', 'PENDIENTE', 'ARCHIVADO', 'NO_ARCHIVADO');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('PENDIENTE', 'SOLICITADO', 'RECIBIDO', 'DIGITALIZADO', 'ARCHIVADO', 'NO_ARCHIVADO', 'VENCIDO', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('NUEVA', 'LEIDA', 'EN_PROCESO', 'ATENDIDA', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('ACTIVIDAD_PROXIMA', 'ACTIVIDAD_HOY', 'ACTIVIDAD_ATRASADA', 'DOCUMENTO_FALTANTE', 'DOCUMENTO_NO_ARCHIVADO', 'DOCUMENTO_VENCIDO', 'CONTROL_MEDICO_PROXIMO', 'CONTROL_NUTRICIONAL_PROXIMO', 'CAMBIO_RIESGO', 'RED_APOYO_PENDIENTE', 'SOPORTE_PENDIENTE', 'REQUISITO_EDAD', 'REQUISITO_ESCOLAR', 'ALERTA_ADMINISTRATIVA');

-- CreateEnum
CREATE TYPE "PrioridadAlerta" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoControlMedico" AS ENUM ('MEDICINA_GENERAL', 'PEDIATRIA', 'OPTOMETRIA', 'ODONTOLOGIA', 'VACUNACION', 'ESPECIALIDAD', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoCondicion" AS ENUM ('RIESGO_NUTRICIONAL', 'ENFERMEDAD_BASE', 'CONDICION_PARTICULAR', 'NECESIDAD_ESPECIALISTA', 'SEGUIMIENTO_MEDICO', 'CONDICION_ESCOLAR', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDocumentoReq" AS ENUM ('REGISTRO_CIVIL', 'TARJETA_IDENTIDAD', 'CEDULA_ACUDIENTE', 'RECIBO_SERVICIO', 'CERTIFICADO_AFILIACION', 'CERTIFICADO_ESTUDIO', 'BOLETIN', 'SOPORTE_ATENCION', 'SOPORTE_RED', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoEvidencia" AS ENUM ('INFORME', 'CERTIFICADO', 'BOLETIN', 'SOPORTE_MEDICO', 'SOPORTE_RED', 'DOCUMENTO_IDENTIDAD', 'REGISTRO_FISICO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoRedApoyo" AS ENUM ('POR_ACTIVAR', 'SOLICITADA', 'EN_PROCESO', 'ACTIVADA', 'PENDIENTE_SOPORTE', 'COMPLETADA', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoDocumentoEscolar" AS ENUM ('BOLETIN_1', 'BOLETIN_2', 'BOLETIN_3', 'BOLETIN_4', 'CERTIFICADO_ESTUDIO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoSeguimientoEspecializado" AS ENUM ('NUTRICIONAL', 'MEDICO', 'ODONTOLOGICO', 'OFTALMOLOGICO', 'PSICOLOGICO', 'RED_APOYO', 'PEDAGOGICO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoRegla" AS ENUM ('FECHA', 'EDAD', 'CONDICION', 'RIESGO', 'ESCOLAR', 'DOCUMENTO', 'PERIODICIDAD', 'CONTROL_MEDICO', 'OTRO');

-- CreateEnum
CREATE TYPE "AccionRegla" AS ENUM ('GENERAR_ACTIVIDAD', 'GENERAR_ALERTA', 'GENERAR_REQUISITO', 'CAMBIAR_PERIODICIDAD');

-- CreateEnum
CREATE TYPE "EstadoCondicion" AS ENUM ('ACTIVA', 'INACTIVA', 'RESUELTA');

-- CreateEnum
CREATE TYPE "EstadoControlArchivo" AS ENUM ('ARCHIVADO', 'NO_ARCHIVADO', 'FALTANTE', 'SUBSANADO');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "nombre" "Rol" NOT NULL,
    "descripcion" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nombre_usuario" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100),
    "rol_id" UUID NOT NULL,
    "profesional_id" UUID,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "ultimo_login" TIMESTAMP(6),
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(6),
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profesionales" (
    "id" UUID NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "area" "Area" NOT NULL,
    "estado" "EstadoProfesional" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profesionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiarios" (
    "id" UUID NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "numero_historia" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "genero" "Genero",
    "telefono" VARCHAR(20),
    "direccion" VARCHAR(200),
    "email" VARCHAR(100),
    "estado" "EstadoBeneficiario" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casos" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "contexto_ingreso" TEXT,
    "area_inicial" "Area" NOT NULL,
    "estado" "EstadoCaso" NOT NULL DEFAULT 'ACTIVO',
    "fecha_egreso" DATE,
    "motivo_egreso" TEXT,
    "motivo_suspension" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caso_profesional" (
    "id" UUID NOT NULL,
    "caso_id" UUID NOT NULL,
    "profesional_id" UUID NOT NULL,
    "fecha_asignacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_desasignacion" TIMESTAMP(6),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "caso_profesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_actividad" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "es_automatica" BOOLEAN NOT NULL,
    "genera_seguimientos" BOOLEAN NOT NULL DEFAULT false,
    "periodicidad_meses" INTEGER,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades" (
    "id" UUID NOT NULL,
    "caso_id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "tipo_actividad_id" UUID NOT NULL,
    "profesional_id" UUID,
    "area" "Area" NOT NULL,
    "es_automatica" BOOLEAN NOT NULL,
    "origen" "OrigenActividad" NOT NULL DEFAULT 'SISTEMA',
    "descripcion" TEXT,
    "contenido" TEXT,
    "fecha_base" DATE,
    "fecha_objetivo" DATE,
    "fecha_programada" DATE NOT NULL,
    "fecha_realizada" DATE,
    "fecha_registro" TIMESTAMP(6),
    "fecha_radicacion" DATE,
    "usuario_realiza_id" UUID,
    "estado" "EstadoActividad" NOT NULL DEFAULT 'PROGRAMADA',
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "evidencia_id" UUID,
    "numero_periodo" INTEGER,
    "mes_correspondiente" INTEGER,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivos" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" VARCHAR(100),
    "anio" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "festivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analisis_caso" (
    "id" UUID NOT NULL,
    "caso_id" UUID NOT NULL,
    "actividad_id" UUID NOT NULL,
    "contenido" TEXT,
    "fecha_calculo" DATE NOT NULL,
    "fecha_programada" DATE NOT NULL,
    "fecha_realizada" DATE,
    "responsable_id" UUID,
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "evidencia_id" UUID,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analisis_caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_caso" (
    "id" UUID NOT NULL,
    "caso_id" UUID NOT NULL,
    "actividad_id" UUID NOT NULL,
    "contenido" TEXT,
    "fecha_calculo" DATE NOT NULL,
    "fecha_programada" DATE NOT NULL,
    "fecha_realizada" DATE,
    "responsable_id" UUID,
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "evidencia_id" UUID,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimientos" (
    "id" UUID NOT NULL,
    "caso_id" UUID NOT NULL,
    "tipo" "TipoSeguimiento" NOT NULL,
    "analisis_caso_id" UUID,
    "plan_caso_id" UUID,
    "actividad_id" UUID NOT NULL,
    "numero_periodo" INTEGER NOT NULL,
    "contenido" TEXT,
    "fecha_programada" DATE NOT NULL,
    "fecha_realizada" DATE,
    "responsable_id" UUID,
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "evidencia_id" UUID,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_vida" (
    "id" UUID NOT NULL,
    "caso_id" UUID NOT NULL,
    "actividad_id" UUID NOT NULL,
    "area" "Area" NOT NULL,
    "mes_correspondiente" INTEGER NOT NULL,
    "contenido" TEXT,
    "fecha_programada" DATE NOT NULL,
    "fecha_realizada" DATE,
    "responsable_id" UUID,
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "evidencia_id" UUID,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_vida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "tabla_afectada" VARCHAR(50) NOT NULL,
    "registro_id" UUID NOT NULL,
    "campo_afectado" VARCHAR(50),
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "accion" "AccionAuditoria" NOT NULL,
    "fecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_usuario" VARCHAR(45),

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_planificacion" (
    "id" UUID NOT NULL,
    "tipo_actividad_codigo" VARCHAR(20) NOT NULL,
    "dias_desde_ingreso" INTEGER,
    "dias_habiles" BOOLEAN NOT NULL DEFAULT false,
    "periodicidad_meses" INTEGER,
    "meses_proyecto_vida" JSONB,
    "area_aplicable" "Area",
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reglas_planificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias" (
    "id" UUID NOT NULL,
    "tipo" "TipoEvidencia" NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "url_archivo" VARCHAR(500),
    "requiere_archivo_fisico" BOOLEAN NOT NULL DEFAULT false,
    "archivo_fisico_verificado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_registro" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_registro_id" UUID NOT NULL,

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_archivo" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "actividad_id" UUID,
    "documento_id" UUID,
    "area" "Area",
    "profesional_id" UUID,
    "fecha_revision" DATE NOT NULL,
    "documento_faltante" BOOLEAN NOT NULL DEFAULT false,
    "descripcion_faltante" TEXT,
    "estado" "EstadoControlArchivo" NOT NULL,
    "observaciones" TEXT,
    "fecha_subsanacion" DATE,
    "usuario_verifica_id" UUID NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitos_documentales" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" "TipoDocumentoReq" NOT NULL,
    "area" "Area",
    "responsable_id" UUID,
    "condicion_activacion" TEXT,
    "fecha_limite" DATE,
    "periodicidad_meses" INTEGER,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'PENDIENTE',
    "requiere_archivo_fisico" BOOLEAN NOT NULL DEFAULT false,
    "evidencia_id" UUID,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requisitos_documentales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "tipo" "TipoDocumentoReq" NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "url_archivo" VARCHAR(500),
    "area" "Area",
    "requiere_archivo_fisico" BOOLEAN NOT NULL DEFAULT false,
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "fecha_recepcion" DATE,
    "fecha_vencimiento" DATE,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condiciones_beneficiario" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "tipo" "TipoCondicion" NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" "EstadoCondicion" NOT NULL DEFAULT 'ACTIVA',
    "motivo" TEXT NOT NULL,
    "observaciones" TEXT,
    "responsable_id" UUID,
    "evidencia_id" UUID,
    "periodicidad_control_meses" INTEGER,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "condiciones_beneficiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controles_medicos" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "caso_id" UUID,
    "tipo" "TipoControlMedico" NOT NULL,
    "especialidad" VARCHAR(100),
    "fecha_programada" DATE,
    "fecha_realizada" DATE,
    "institucion" VARCHAR(200),
    "profesional_externo" VARCHAR(150),
    "resultado" TEXT,
    "recomendaciones" TEXT,
    "proxima_fecha" DATE,
    "periodicidad_meses" INTEGER,
    "condicion_asociada_id" UUID,
    "evidencia_id" UUID,
    "estado" "EstadoActividad" NOT NULL DEFAULT 'PROGRAMADA',
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "controles_medicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redes_apoyo" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "institucion" VARCHAR(200) NOT NULL,
    "motivo" TEXT NOT NULL,
    "area_solicitante" "Area" NOT NULL,
    "fecha_solicitud" DATE,
    "fecha_activacion" DATE,
    "responsable_id" UUID,
    "estado" "EstadoRedApoyo" NOT NULL DEFAULT 'POR_ACTIVAR',
    "soporte_requerido" BOOLEAN NOT NULL DEFAULT true,
    "soporte_recibido" BOOLEAN NOT NULL DEFAULT false,
    "evidencia_id" UUID,
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redes_apoyo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimientos_red" (
    "id" UUID NOT NULL,
    "red_apoyo_id" UUID NOT NULL,
    "fecha_programada" DATE NOT NULL,
    "fecha_realizada" DATE,
    "descripcion" TEXT,
    "resultado" TEXT,
    "estado" "EstadoActividad" NOT NULL DEFAULT 'PROGRAMADA',
    "responsable_id" UUID,
    "evidencia_id" UUID,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimientos_red_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escolarizacion" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "escolarizado" BOOLEAN NOT NULL,
    "institucion" VARCHAR(200),
    "grado" VARCHAR(50),
    "jornada" VARCHAR(20),
    "situacion_educativa" TEXT,
    "seguimiento_academico" TEXT,
    "fecha_actualizacion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escolarizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_escolares" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "escolarizacion_id" UUID,
    "tipo" "TipoDocumentoEscolar" NOT NULL,
    "periodo" VARCHAR(20),
    "fecha_programada" DATE,
    "fecha_recibida" DATE,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'PENDIENTE',
    "evidencia_id" UUID,
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_escolares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimientos_especializados" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID NOT NULL,
    "caso_id" UUID,
    "tipo" "TipoSeguimientoEspecializado" NOT NULL,
    "fecha_programada" DATE,
    "fecha_realizada" DATE,
    "periodicidad_meses" INTEGER,
    "motivo" TEXT,
    "estado" "EstadoActividad" NOT NULL DEFAULT 'PROGRAMADA',
    "responsable_id" UUID,
    "condicion_asociada_id" UUID,
    "evidencia_id" UUID,
    "estado_archivo" "EstadoArchivo" NOT NULL DEFAULT 'NO_REQUIERE',
    "observaciones" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimientos_especializados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoRegla" NOT NULL,
    "condicion" TEXT NOT NULL,
    "accion" "AccionRegla" NOT NULL,
    "parametros_accion" JSONB,
    "area_aplicable" "Area",
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "prioridad" INTEGER NOT NULL DEFAULT 1,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reglas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" UUID NOT NULL,
    "beneficiario_id" UUID,
    "caso_id" UUID,
    "actividad_id" UUID,
    "regla_id" UUID,
    "tipo" "TipoAlerta" NOT NULL,
    "prioridad" "PrioridadAlerta" NOT NULL DEFAULT 'MEDIA',
    "mensaje" TEXT NOT NULL,
    "responsable_id" UUID,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'NUEVA',
    "fecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_atencion" TIMESTAMP(6),
    "observacion" TEXT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nombre_usuario_key" ON "usuarios"("nombre_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_profesional_id_key" ON "usuarios"("profesional_id");

-- CreateIndex
CREATE INDEX "usuarios_rol_id_idx" ON "usuarios"("rol_id");

-- CreateIndex
CREATE INDEX "usuarios_estado_idx" ON "usuarios"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "profesionales_numero_documento_key" ON "profesionales"("numero_documento");

-- CreateIndex
CREATE INDEX "profesionales_area_idx" ON "profesionales"("area");

-- CreateIndex
CREATE INDEX "profesionales_estado_idx" ON "profesionales"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiarios_numero_documento_key" ON "beneficiarios"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiarios_numero_historia_key" ON "beneficiarios"("numero_historia");

-- CreateIndex
CREATE INDEX "beneficiarios_numero_documento_idx" ON "beneficiarios"("numero_documento");

-- CreateIndex
CREATE INDEX "beneficiarios_numero_historia_idx" ON "beneficiarios"("numero_historia");

-- CreateIndex
CREATE INDEX "casos_beneficiario_id_idx" ON "casos"("beneficiario_id");

-- CreateIndex
CREATE INDEX "casos_estado_idx" ON "casos"("estado");

-- CreateIndex
CREATE INDEX "caso_profesional_profesional_id_activo_idx" ON "caso_profesional"("profesional_id", "activo");

-- CreateIndex
CREATE INDEX "caso_profesional_caso_id_activo_idx" ON "caso_profesional"("caso_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "caso_profesional_caso_id_profesional_id_key" ON "caso_profesional"("caso_id", "profesional_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_actividad_codigo_key" ON "tipos_actividad"("codigo");

-- CreateIndex
CREATE INDEX "actividades_profesional_id_fecha_programada_idx" ON "actividades"("profesional_id", "fecha_programada");

-- CreateIndex
CREATE INDEX "actividades_caso_id_estado_idx" ON "actividades"("caso_id", "estado");

-- CreateIndex
CREATE INDEX "actividades_beneficiario_id_fecha_programada_idx" ON "actividades"("beneficiario_id", "fecha_programada");

-- CreateIndex
CREATE INDEX "actividades_estado_fecha_programada_idx" ON "actividades"("estado", "fecha_programada");

-- CreateIndex
CREATE INDEX "actividades_tipo_actividad_id_idx" ON "actividades"("tipo_actividad_id");

-- CreateIndex
CREATE INDEX "actividades_area_idx" ON "actividades"("area");

-- CreateIndex
CREATE UNIQUE INDEX "festivos_fecha_key" ON "festivos"("fecha");

-- CreateIndex
CREATE INDEX "festivos_fecha_idx" ON "festivos"("fecha");

-- CreateIndex
CREATE INDEX "festivos_anio_idx" ON "festivos"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "analisis_caso_caso_id_key" ON "analisis_caso"("caso_id");

-- CreateIndex
CREATE INDEX "analisis_caso_caso_id_idx" ON "analisis_caso"("caso_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_caso_caso_id_key" ON "plan_caso"("caso_id");

-- CreateIndex
CREATE INDEX "plan_caso_caso_id_idx" ON "plan_caso"("caso_id");

-- CreateIndex
CREATE INDEX "seguimientos_caso_id_idx" ON "seguimientos"("caso_id");

-- CreateIndex
CREATE INDEX "seguimientos_analisis_caso_id_idx" ON "seguimientos"("analisis_caso_id");

-- CreateIndex
CREATE INDEX "seguimientos_plan_caso_id_idx" ON "seguimientos"("plan_caso_id");

-- CreateIndex
CREATE INDEX "proyecto_vida_caso_id_idx" ON "proyecto_vida"("caso_id");

-- CreateIndex
CREATE INDEX "auditoria_tabla_afectada_registro_id_idx" ON "auditoria"("tabla_afectada", "registro_id");

-- CreateIndex
CREATE INDEX "auditoria_fecha_idx" ON "auditoria"("fecha");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "evidencias_tipo_idx" ON "evidencias"("tipo");

-- CreateIndex
CREATE INDEX "control_archivo_beneficiario_id_idx" ON "control_archivo"("beneficiario_id");

-- CreateIndex
CREATE INDEX "control_archivo_estado_idx" ON "control_archivo"("estado");

-- CreateIndex
CREATE INDEX "requisitos_documentales_beneficiario_id_idx" ON "requisitos_documentales"("beneficiario_id");

-- CreateIndex
CREATE INDEX "requisitos_documentales_estado_idx" ON "requisitos_documentales"("estado");

-- CreateIndex
CREATE INDEX "requisitos_documentales_tipo_idx" ON "requisitos_documentales"("tipo");

-- CreateIndex
CREATE INDEX "documentos_beneficiario_id_idx" ON "documentos"("beneficiario_id");

-- CreateIndex
CREATE INDEX "documentos_tipo_idx" ON "documentos"("tipo");

-- CreateIndex
CREATE INDEX "documentos_estado_archivo_idx" ON "documentos"("estado_archivo");

-- CreateIndex
CREATE INDEX "condiciones_beneficiario_beneficiario_id_idx" ON "condiciones_beneficiario"("beneficiario_id");

-- CreateIndex
CREATE INDEX "condiciones_beneficiario_tipo_estado_idx" ON "condiciones_beneficiario"("tipo", "estado");

-- CreateIndex
CREATE INDEX "controles_medicos_beneficiario_id_idx" ON "controles_medicos"("beneficiario_id");

-- CreateIndex
CREATE INDEX "controles_medicos_tipo_idx" ON "controles_medicos"("tipo");

-- CreateIndex
CREATE INDEX "controles_medicos_estado_idx" ON "controles_medicos"("estado");

-- CreateIndex
CREATE INDEX "redes_apoyo_beneficiario_id_idx" ON "redes_apoyo"("beneficiario_id");

-- CreateIndex
CREATE INDEX "redes_apoyo_estado_idx" ON "redes_apoyo"("estado");

-- CreateIndex
CREATE INDEX "seguimientos_red_red_apoyo_id_idx" ON "seguimientos_red"("red_apoyo_id");

-- CreateIndex
CREATE INDEX "escolarizacion_beneficiario_id_idx" ON "escolarizacion"("beneficiario_id");

-- CreateIndex
CREATE INDEX "documentos_escolares_beneficiario_id_idx" ON "documentos_escolares"("beneficiario_id");

-- CreateIndex
CREATE INDEX "documentos_escolares_estado_idx" ON "documentos_escolares"("estado");

-- CreateIndex
CREATE INDEX "seguimientos_especializados_beneficiario_id_idx" ON "seguimientos_especializados"("beneficiario_id");

-- CreateIndex
CREATE INDEX "seguimientos_especializados_tipo_idx" ON "seguimientos_especializados"("tipo");

-- CreateIndex
CREATE INDEX "reglas_activa_idx" ON "reglas"("activa");

-- CreateIndex
CREATE INDEX "reglas_tipo_idx" ON "reglas"("tipo");

-- CreateIndex
CREATE INDEX "alertas_responsable_id_estado_idx" ON "alertas"("responsable_id", "estado");

-- CreateIndex
CREATE INDEX "alertas_beneficiario_id_idx" ON "alertas"("beneficiario_id");

-- CreateIndex
CREATE INDEX "alertas_tipo_idx" ON "alertas"("tipo");

-- CreateIndex
CREATE INDEX "alertas_fecha_idx" ON "alertas"("fecha");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "profesionales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos" ADD CONSTRAINT "casos_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_profesional" ADD CONSTRAINT "caso_profesional_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_profesional" ADD CONSTRAINT "caso_profesional_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "profesionales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_tipo_actividad_id_fkey" FOREIGN KEY ("tipo_actividad_id") REFERENCES "tipos_actividad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "profesionales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_usuario_realiza_id_fkey" FOREIGN KEY ("usuario_realiza_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_caso" ADD CONSTRAINT "analisis_caso_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_caso" ADD CONSTRAINT "analisis_caso_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_caso" ADD CONSTRAINT "analisis_caso_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_caso" ADD CONSTRAINT "analisis_caso_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_caso" ADD CONSTRAINT "plan_caso_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_caso" ADD CONSTRAINT "plan_caso_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_caso" ADD CONSTRAINT "plan_caso_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_caso" ADD CONSTRAINT "plan_caso_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_analisis_caso_id_fkey" FOREIGN KEY ("analisis_caso_id") REFERENCES "analisis_caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_plan_caso_id_fkey" FOREIGN KEY ("plan_caso_id") REFERENCES "plan_caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_vida" ADD CONSTRAINT "proyecto_vida_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_vida" ADD CONSTRAINT "proyecto_vida_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_vida" ADD CONSTRAINT "proyecto_vida_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_vida" ADD CONSTRAINT "proyecto_vida_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_usuario_registro_id_fkey" FOREIGN KEY ("usuario_registro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "profesionales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_archivo" ADD CONSTRAINT "control_archivo_usuario_verifica_id_fkey" FOREIGN KEY ("usuario_verifica_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitos_documentales" ADD CONSTRAINT "requisitos_documentales_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitos_documentales" ADD CONSTRAINT "requisitos_documentales_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitos_documentales" ADD CONSTRAINT "requisitos_documentales_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condiciones_beneficiario" ADD CONSTRAINT "condiciones_beneficiario_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condiciones_beneficiario" ADD CONSTRAINT "condiciones_beneficiario_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condiciones_beneficiario" ADD CONSTRAINT "condiciones_beneficiario_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_medicos" ADD CONSTRAINT "controles_medicos_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_medicos" ADD CONSTRAINT "controles_medicos_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_medicos" ADD CONSTRAINT "controles_medicos_condicion_asociada_id_fkey" FOREIGN KEY ("condicion_asociada_id") REFERENCES "condiciones_beneficiario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controles_medicos" ADD CONSTRAINT "controles_medicos_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redes_apoyo" ADD CONSTRAINT "redes_apoyo_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redes_apoyo" ADD CONSTRAINT "redes_apoyo_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redes_apoyo" ADD CONSTRAINT "redes_apoyo_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_red" ADD CONSTRAINT "seguimientos_red_red_apoyo_id_fkey" FOREIGN KEY ("red_apoyo_id") REFERENCES "redes_apoyo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_red" ADD CONSTRAINT "seguimientos_red_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_red" ADD CONSTRAINT "seguimientos_red_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolarizacion" ADD CONSTRAINT "escolarizacion_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_escolares" ADD CONSTRAINT "documentos_escolares_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_escolares" ADD CONSTRAINT "documentos_escolares_escolarizacion_id_fkey" FOREIGN KEY ("escolarizacion_id") REFERENCES "escolarizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_escolares" ADD CONSTRAINT "documentos_escolares_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_especializados" ADD CONSTRAINT "seguimientos_especializados_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_especializados" ADD CONSTRAINT "seguimientos_especializados_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_especializados" ADD CONSTRAINT "seguimientos_especializados_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_especializados" ADD CONSTRAINT "seguimientos_especializados_condicion_asociada_id_fkey" FOREIGN KEY ("condicion_asociada_id") REFERENCES "condiciones_beneficiario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_especializados" ADD CONSTRAINT "seguimientos_especializados_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_beneficiario_id_fkey" FOREIGN KEY ("beneficiario_id") REFERENCES "beneficiarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_caso_id_fkey" FOREIGN KEY ("caso_id") REFERENCES "casos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "reglas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
