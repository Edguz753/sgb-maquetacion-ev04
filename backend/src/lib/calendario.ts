/**
 * Calendario laboral colombiano — días hábiles (V4.1.1).
 * Los festivos se consultan de la tabla `festivo` (sembrada con Colombia 2026).
 * Regla: si la fecha objetivo cae en fin de semana o festivo, se retrocede al día hábil anterior.
 */
import { prisma } from './prisma';

export function toDate(d: Date | string): Date {
  const dt = typeof d === 'string' ? new Date(d) : new Date(d);
  dt.setHours(12, 0, 0, 0);
  return dt;
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Normaliza una fecha a medianoche local. */
export function normDate(d: Date | string): Date {
  const dt = typeof d === 'string' ? new Date(d) : new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

/** Suma días calendario a una fecha (base normalizada). */
export function addDays(base: Date, days: number): Date {
  const dt = normDate(base);
  dt.setDate(dt.getDate() + days);
  return dt;
}

/** Suma meses a una fecha conservando el día (o el último del mes si no existe). */
export function addMonths(base: Date, months: number): Date {
  const dt = normDate(base);
  const day = dt.getDate();
  dt.setMonth(dt.getMonth() + months);
  if (dt.getDate() !== day) dt.setDate(0);
  return dt;
}

/**
 * Fecha objetivo en días hábiles desde una fecha base.
 * Avanza `n` días hábiles; si el resultado cae en no hábil, retrocede al día hábil anterior.
 */
export async function fechaObjetivoHabiles(base: Date | string, diasHabiles: number): Promise<Date> {
  let current = normDate(base);
  let restantes = diasHabiles;

  while (restantes > 0) {
    current = addDays(current, 1);
    if (await esDiaHabil(current)) restantes -= 1;
  }
  while (!(await esDiaHabil(current))) {
    current = addDays(current, -1);
  }
  return current;
}

/**
 * Fecha objetivo en días naturales desde una fecha base.
 * Si el resultado cae en fin de semana o festivo, se retrocede al día hábil anterior.
 */
export async function fechaObjetivoNaturales(base: Date | string, dias: number): Promise<Date> {
  let current = normDate(base);
  current = addDays(current, dias);
  while (!(await esDiaHabil(current))) {
    current = addDays(current, -1);
  }
  return current;
}

/** Fecha objetivo en días calendario. */
export function fechaObjetivoCalendario(base: Date | string, dias: number): Date {
  return addDays(normDate(base), dias);
}

/** Verifica si una fecha es día hábil (no fin de semana y no festivo). */
export async function esDiaHabil(d: Date): Promise<boolean> {
  if (isWeekend(d)) return false;
  const norm = normDate(d);
  const festivo = await prisma.festivo.findUnique({ where: { fecha: norm } });
  return !festivo;
}

/** Rellena el calendario de festivos si falta el año (festivos móviles por Pascua). */
export async function asegurarFestivosAnio(anio: number): Promise<void> {
  const count = await prisma.festivo.count({ where: { fecha: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) } } });
  if (count > 0) return;
  const pascua = fechaPascua(anio);
  const festivos = [
    { fecha: new Date(anio, 0, 1), nombre: 'Año Nuevo' },
    { fecha: trasladarLunes(new Date(anio, 0, 6)), nombre: 'Reyes Magos' },
    { fecha: trasladarLunes(new Date(anio, 2, 19)), nombre: 'San José' },
    { fecha: addDays(pascua, -3), nombre: 'Jueves Santo' },
    { fecha: addDays(pascua, -2), nombre: 'Viernes Santo' },
    { fecha: new Date(anio, 4, 1), nombre: 'Día del Trabajo' },
    { fecha: trasladarLunes(addDays(pascua, 39)), nombre: 'Ascensión del Señor' },
    { fecha: trasladarLunes(addDays(pascua, 60)), nombre: 'Corpus Christi' },
    { fecha: trasladarLunes(addDays(pascua, 68)), nombre: 'Sagrado Corazón' },
    { fecha: trasladarLunes(new Date(anio, 5, 29)), nombre: 'San Pedro y San Pablo' },
    { fecha: new Date(anio, 6, 20), nombre: 'Independencia' },
    { fecha: new Date(anio, 7, 7), nombre: 'Batalla de Boyacá' },
    { fecha: trasladarLunes(new Date(anio, 7, 15)), nombre: 'Asunción de la Virgen' },
    { fecha: trasladarLunes(new Date(anio, 9, 12)), nombre: 'Día de la Raza' },
    { fecha: trasladarLunes(new Date(anio, 10, 1)), nombre: 'Todos los Santos' },
    { fecha: trasladarLunes(new Date(anio, 10, 11)), nombre: 'Independencia de Cartagena' },
    { fecha: trasladarLunes(new Date(anio, 11, 8)), nombre: 'Inmaculada Concepción' },
    { fecha: new Date(anio, 11, 25), nombre: 'Navidad' },
  ];
  for (const f of festivos) {
    const fecha = normDate(f.fecha);
    await prisma.festivo.upsert({
      where: { fecha },
      update: { nombre: f.nombre, pais: 'CO' },
      create: { fecha, nombre: f.nombre, pais: 'CO' },
    });
  }
}

/** Traslada un festivo al lunes siguiente si cae en día no lunes (Ley Emiliani). */
function trasladarLunes(fecha: Date): Date {
  const dt = normDate(fecha);
  const day = dt.getDay();
  if (day === 0) return addDays(dt, 1);
  if (day === 1) return dt;
  return addDays(dt, 8 - day);
}

/** Fecha de Pascua (algoritmo de Meeus / Anonymous Gregorian). */
function fechaPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}
