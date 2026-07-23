// Calcula horas extra del período a partir de marcajes de la tabla marcajes_horario.
// Función pura — recibe marcajes ya leídos, sin acceso a Supabase.

export interface MarcajeDia {
  fecha: string;           // 'YYYY-MM-DD'
  horas_trabajadas: number | null;
}

export interface HorasExtraResult {
  horasContractuales: number;
  horasTrabajadas: number;
  horasExtra: number;      // >= 0; lo que va a periodEvents.extraHours
  diasConMarcaje: number;
}

/**
 * Calcula horas extra del período.
 *
 * Lógica:
 *   - horas contractuales = (días del período / 7) × weeklyHours
 *   - horas trabajadas    = suma de horas_trabajadas de los marcajes
 *   - horas extra         = max(0, trabajadas - contractuales)
 *
 * Usa días del período (no días hábiles) para mantener consistencia con el
 * denominador que usa el motor en la proporcionalidad del sueldo base.
 */
export function calcularHorasExtra(
  marcajes: MarcajeDia[],
  weeklyHours: number,
  period: string  // 'YYYY-MM'
): HorasExtraResult {
  const [y, m] = period.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const horasContractuales = (daysInMonth / 7) * weeklyHours;
  const diasConMarcaje = marcajes.filter(d => (d.horas_trabajadas ?? 0) > 0).length;
  const horasTrabajadas = marcajes.reduce((acc, d) => acc + (d.horas_trabajadas ?? 0), 0);
  const horasExtra = Math.max(0, horasTrabajadas - horasContractuales);

  return {
    horasContractuales: Math.round(horasContractuales * 100) / 100,
    horasTrabajadas: Math.round(horasTrabajadas * 100) / 100,
    horasExtra: Math.round(horasExtra * 100) / 100,
    diasConMarcaje,
  };
}
