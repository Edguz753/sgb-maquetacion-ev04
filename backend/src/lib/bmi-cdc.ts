/**
 * Cálculo de IMC-for-age con percentiles CDC (niños y adolescentes 2-20 años)
 * usando la tabla LMS oficial (CDC Extended BMI-for-Age) y la fórmula LMS:
 *   z = ((IMC / M)^L - 1) / (L * S)   (L != 0)
 *   z = ln(IMC / M) / S               (L == 0)
 * percentil = CDF normal estándar de z.
 *
 * Baremo (CDC/AAP):
 *   < P5                    -> Bajo peso
 *   P5 - < P85              -> Peso saludable
 *   P85 - < P95             -> Sobrepeso
 *   >= P95                  -> Obesidad
 *   IMC >= 1.2 x IMC P95    -> Obesidad severa
 * Adultos (>= 20 años): baremo por IMC directo (<18.5 / <25 / <30 / <35 / >=35).
 * Menores de 2 años: el IMC-for-age CDC no aplica (se marca NO_APLICA).
 */
import { CDC_BMI_LMS } from './bmi-cdc-data';

export type SexoCDC = 'M' | 'F';

export interface ClasificacionIMC {
  imc: number | null;
  percentil: number | null;
  categoria: string;
  imcP95: number | null;
  edadMeses: number;
  aplica: boolean;
}

/** Edad exacta en meses completos (criterio CDC). */
export function edadEnMeses(fechaNacimiento: Date | string, fechaReferencia: Date = new Date()): number {
  const nac = new Date(fechaNacimiento);
  const ref = new Date(fechaReferencia);
  let meses = (ref.getFullYear() - nac.getFullYear()) * 12 + (ref.getMonth() - nac.getMonth());
  if (ref.getDate() < nac.getDate()) meses -= 1;
  return Math.max(0, meses);
}

/** Edad en días (para precisión en fracciones de mes). */
function edadEnDias(fechaNacimiento: Date | string, fechaReferencia: Date = new Date()): number {
  const nac = new Date(fechaNacimiento);
  nac.setHours(0, 0, 0, 0);
  const ref = new Date(fechaReferencia);
  ref.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((ref.getTime() - nac.getTime()) / 86400000));
}

/** CDF normal estándar (aproximación de Abramowitz y Stegun 7.1.26 + 26.2.17). */
function normalCdf(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    0.319381530 * t -
    0.356563782 * t ** 2 +
    1.781477937 * t ** 3 -
    1.821255978 * t ** 4 +
    1.330274429 * t ** 5;
  const densidad = Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
  const cola = densidad * poly;
  return z >= 0 ? 1 - cola : cola;
}

/** Fila LMS más cercana para (sexo, edadMeses) con interpolación lineal. */
function filaLMS(sexo: 1 | 2, edadMeses: number): { l: number; mv: number; sd: number } | null {
  const filas = CDC_BMI_LMS.filter((r) => r.s === sexo).sort((a, b) => a.m - b.m);
  if (filas.length === 0) return null;
  if (edadMeses <= filas[0].m) return { l: filas[0].l, mv: filas[0].mv, sd: filas[0].sd };
  const ultima = filas[filas.length - 1];
  if (edadMeses >= ultima.m) return { l: ultima.l, mv: ultima.mv, sd: ultima.sd };
  for (let i = 1; i < filas.length; i++) {
    if (edadMeses <= filas[i].m) {
      const a = filas[i - 1];
      const b = filas[i];
      const t = (edadMeses - a.m) / (b.m - a.m);
      return {
        l: a.l + t * (b.l - a.l),
        mv: a.mv + t * (b.mv - a.mv),
        sd: a.sd + t * (b.sd - a.sd),
      };
    }
  }
  const u = filas[filas.length - 1];
  return { l: u.l, mv: u.mv, sd: u.sd };
}

/**
 * Clasifica el IMC según el baremo CDC (2-20 años) o el baremo de adultos (>=20 años).
 * Devuelve también el percentil y el IMC del percentil 95.
 */
export function clasificarIMC(
  fechaNacimiento: Date | string,
  sexo: SexoCDC,
  imc: number | null,
  fechaReferencia: Date = new Date(),
): ClasificacionIMC {
  const edadMeses = edadEnMeses(fechaNacimiento, fechaReferencia);
  const imcP95n: number | null = null;

  if (imc === null || !Number.isFinite(imc) || imc <= 0) {
    return { imc: null, percentil: null, categoria: 'NO_APLICA', imcP95: null, edadMeses, aplica: false };
  }

  // Menor de 2 años: el IMC-for-age CDC no aplica
  if (edadMeses < 24) {
    return { imc, percentil: null, categoria: 'MENOR_DE_2_ANIOS', imcP95: null, edadMeses, aplica: false };
  }

  // Adulto (20 años o más): baremo por IMC directo
  if (edadMeses >= 240) {
    const categoria = imc < 18.5 ? 'BAJO_PESO' : imc < 25 ? 'PESO_SALUDABLE' : imc < 30 ? 'SOBREPESO' : imc < 35 ? 'OBESIDAD' : 'OBESIDAD_SEVERA';
    return { imc, percentil: null, categoria, imcP95: null, edadMeses, aplica: false };
  }

  const sexoCdc: 1 | 2 = sexo === 'M' ? 1 : 2;
  const lms = filaLMS(sexoCdc, edadMeses);
  if (!lms) {
    return { imc, percentil: null, categoria: 'NO_APLICA', imcP95: null, edadMeses, aplica: false };
  }

  const z = lms.l === 0 ? Math.log(imc / lms.mv) / lms.sd : (Math.pow(imc / lms.mv, lms.l) - 1) / (lms.l * lms.sd);
  const percentil = Math.min(99.9, Math.max(0.1, normalCdf(z) * 100));

  // IMC del percentil 95 de la tabla (para obesidad severa: IMC >= 1.2 x P95)
  // La tabla tiene pasos de 0.5 mes: se toma la fila más cercana a la edad exacta.
  const filaP95 = CDC_BMI_LMS.filter((r) => r.s === sexoCdc)
    .sort((a, b) => Math.abs(a.m - edadMeses) - Math.abs(b.m - edadMeses))[0];
  const imcP95 = filaP95?.p95 ?? null;

  let categoria: string;
  if (imc >= 1.2 * (imcP95 ?? Infinity)) categoria = 'OBESIDAD_SEVERA';
  else if (percentil < 5) categoria = 'BAJO_PESO';
  else if (percentil < 85) categoria = 'PESO_SALUDABLE';
  else if (percentil < 95) categoria = 'SOBREPESO';
  else categoria = 'OBESIDAD';

  return { imc, percentil: Math.round(percentil * 10) / 10, categoria, imcP95, edadMeses, aplica: true };
}