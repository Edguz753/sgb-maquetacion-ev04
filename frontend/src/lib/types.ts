// Tipos alineados con la API REST del backend (línea base V4.1.1)

export interface Usuario {
  id: number;
  username: string;
  nombreCompleto: string;
  email: string | null;
  rol: string;
  profesional: { id: number; nombres: string; apellidos: string } | null;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface AreaInfo {
  codigo: string;
  nombre: string;
}

export interface ProfesionalInfo {
  id: number;
  nombres: string;
  apellidos: string;
}

export interface ProfesionalSimple {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
}

export interface TipoActividad {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ActividadItem {
  id: number;
  estado: string;
  estadoCalculado?: string;
  fechaProgramada: string;
  fechaRealizacion: string | null;
  prioridad: number | null;
  observaciones: string | null;
  tipoActividad: TipoActividad;
  asignacionCaso?: {
    id: number;
    profesional: ProfesionalInfo;
    area: AreaInfo;
    caso: {
      id: number;
      numeroCaso: string;
      estado: string;
      beneficiario: { id: number; nombres: string; apellidos: string; numeroHistoria: string };
    };
  };
}

export interface ActividadesResponse {
  total: number;
  resumen: Record<string, number>;
  actividades: ActividadItem[];
}

export interface Asignacion {
  id: number;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  motivoCambio: string | null;
  observaciones: string | null;
  profesional: ProfesionalInfo;
  area: AreaInfo;
  actividades?: ActividadItem[];
}

export interface CasoInfo {
  id: number;
  numeroCaso: string;
  estado: string;
  fechaApertura: string;
  fechaCierre: string | null;
  motivoIngreso: string | null;
  asignaciones: Asignacion[];
  documentos?: any[];
}

export interface Beneficiario {
  id: number;
  numeroHistoria: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  estado: string;
  fechaIngreso: string;
  taller?: string | null;
  barrio?: string | null;
  fechaEgreso?: string | null;
  motivoEgreso?: string | null;
  observaciones: string | null;
  casos: CasoInfo[];
}

export interface BeneficiarioListResponse {
  soloLectura: boolean;
  vista: string;
  total: number;
  beneficiarios: Beneficiario[];
}

export interface BeneficiarioDetail extends Beneficiario {
  condiciones: any[];
  controlesSalud: any[];
  controlesNutricionales: any[];
  redesApoyo: any[];
  alertas: any[];
}

export interface CargaItem {
  id: number;
  nombres: string;
  apellidos: string;
  activo: boolean;
  beneficiariosAsignados: number;
  nivel: 'OPTIMA' | 'ALTA' | 'DISPONIBLE' | 'SIN_CARGA';
  umbrales: { optimaMin: number; optimaMax: number; altaMin: number };
}

export interface CargaResponse {
  total: number;
  profesionales: CargaItem[];
}

export interface RegistroBeneficiarioPayload {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  fechaIngreso: string;
  motivoIngreso?: string | null;
  areaInicial: string;
  profesionalId?: number | null;
}

export interface RegistroResponse {
  mensaje: string;
  numeroHistoria: string;
  numeroCaso: string;
  beneficiario: Beneficiario;
  caso: CasoInfo;
  asignacion: Asignacion;
  actividadesGeneradas: { id: number; fechaProgramada: string; prioridad: number | null }[];
  /** Número de documentos requeridos generados (el backend devuelve el conteo) */
  documentosIniciales: number;
}

export interface ApiErrorBody {
  error?: string;
  detalle?: unknown;
  mensaje?: string;
}