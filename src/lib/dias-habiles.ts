// Cálculo de días hábiles en Chile, excluyendo fines de semana y feriados legales.
// Lista de feriados a revisar anualmente (feriados movibles cambian de fecha).

export const FERIADOS_CL = new Set<string>([
  // 2025
  '2025-01-01', '2025-04-18', '2025-04-19', '2025-05-01', '2025-05-21',
  '2025-06-20', '2025-06-29', '2025-07-16', '2025-08-15', '2025-09-18',
  '2025-09-19', '2025-10-12', '2025-10-31', '2025-11-01', '2025-12-08', '2025-12-25',
  // 2026
  '2026-01-01', // Año Nuevo
  '2026-04-03', // Viernes Santo
  '2026-04-04', // Sábado Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-21', // Glorias Navales
  '2026-06-21', // Día Nacional de los Pueblos Indígenas
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-16', // Virgen del Carmen
  '2026-08-15', // Asunción de la Virgen
  '2026-09-18', // Independencia Nacional
  '2026-09-19', // Glorias del Ejército
  '2026-10-12', // Encuentro de Dos Mundos
  '2026-10-31', // Día de las Iglesias Evangélicas
  '2026-11-01', // Día de Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
  // 2027
  '2027-01-01',
  '2027-03-26', // Viernes Santo (Pascua 28-mar-2027)
  '2027-03-27', // Sábado Santo
  '2027-05-01',
  '2027-05-21',
  '2027-06-21',
  '2027-06-28', // San Pedro y San Pablo (lunes más cercano)
  '2027-07-16',
  '2027-08-15',
  '2027-09-18',
  '2027-09-19',
  '2027-10-11', // Encuentro de Dos Mundos (lunes más cercano)
  '2027-10-31',
  '2027-11-01',
  '2027-12-08',
  '2027-12-25',
]);

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function esFeriado(iso: string): boolean {
  return FERIADOS_CL.has(iso);
}

/** Días hábiles entre dos fechas (inclusive), excluyendo sábados, domingos y feriados CL. */
export function calcBusinessDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6 && !FERIADOS_CL.has(toISO(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
