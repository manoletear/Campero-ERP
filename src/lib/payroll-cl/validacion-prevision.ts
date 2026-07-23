// Validación de vigencia previsional (AFP / Isapre) para TCP.
// Se invoca antes de cualquier cálculo final de liquidación.
//
// Reglas (Chile, TCP):
// - AFP obligatoria → afp_id debe existir y catálogo cat_afp.activa = true
// - Salud obligatoria → salud_id válido (fonasa o isapre activa)
// - Si isapre → salud_plan_uf > 0 (sin plan, no se puede descontar pactado)
// - prevision_verificada_at debe existir y no ser más antigua que VIGENCIA_MAX_DIAS
// - Si fecha_termino del contrato es < periodoFin, el contrato ya terminó (bloquear)

export type PrevisionEstado = 'vigente' | 'pendiente' | 'invalida';

export interface TrabajadorPrevisionInput {
  id: string;
  rut?: string;
  nombre?: string;
  afp_id: number | null;
  salud_id: number | null;
  salud_tipo: string | null;             // 'fonasa' | 'isapre'
  salud_plan_uf?: number | null;
  prevision_verificada_at?: string | null; // ISO timestamp
  prevision_estado?: PrevisionEstado;
}

export interface CatalogoPrevision {
  afps: Array<{ id: number; codigo: string; activa: boolean }>;
  isapres: Array<{ id: number; codigo: string; tipo: 'fonasa' | 'isapre'; activa: boolean }>;
}

export interface ValidacionPrevisionResult {
  ok: boolean;
  estado: PrevisionEstado;
  errores: string[];   // bloquean cálculo
  warnings: string[];  // permiten pero alertan
}

// Si la verificación es más antigua que esto, marcamos warning (no bloquea).
export const VIGENCIA_MAX_DIAS = 180;

export function validarPrevision(
  trab: TrabajadorPrevisionInput,
  catalogo: CatalogoPrevision,
  opts: { periodoFin?: Date; contratoFechaTermino?: string | null } = {},
): ValidacionPrevisionResult {
  const errores: string[] = [];
  const warnings: string[] = [];

  // 1) AFP
  if (trab.afp_id == null) {
    errores.push('Trabajador sin AFP asignada');
  } else {
    const afp = catalogo.afps.find((a) => a.id === trab.afp_id);
    if (!afp) errores.push(`AFP id=${trab.afp_id} no existe en catálogo`);
    else if (!afp.activa) errores.push(`AFP "${afp.codigo}" no está vigente`);
  }

  // 2) Salud
  if (trab.salud_id == null) {
    errores.push('Trabajador sin previsión de salud asignada');
  } else {
    const inst = catalogo.isapres.find((i) => i.id === trab.salud_id);
    if (!inst) {
      errores.push(`Institución de salud id=${trab.salud_id} no existe en catálogo`);
    } else if (!inst.activa) {
      errores.push(`Institución "${inst.codigo}" no está vigente`);
    } else if (inst.tipo === 'isapre') {
      const plan = Number(trab.salud_plan_uf || 0);
      if (!plan || plan <= 0) {
        errores.push(`Isapre "${inst.codigo}" sin plan UF registrado (salud_plan_uf)`);
      }
    }
  }

  // 3) Antigüedad de la verificación
  if (!trab.prevision_verificada_at) {
    warnings.push('Datos previsionales nunca verificados con la fuente (Buk)');
  } else {
    const verif = new Date(trab.prevision_verificada_at);
    const dias = Math.floor((Date.now() - verif.getTime()) / (1000 * 60 * 60 * 24));
    if (dias > VIGENCIA_MAX_DIAS) {
      warnings.push(`Verificación previsional con ${dias} días de antigüedad (máx ${VIGENCIA_MAX_DIAS})`);
    }
  }

  // 4) Contrato terminado
  if (opts.contratoFechaTermino && opts.periodoFin) {
    const term = new Date(opts.contratoFechaTermino);
    if (term < opts.periodoFin) {
      errores.push(`Contrato terminado el ${opts.contratoFechaTermino}; no se puede liquidar período posterior`);
    }
  }

  const ok = errores.length === 0;
  const estado: PrevisionEstado = !ok ? 'invalida' : warnings.length > 0 ? 'pendiente' : 'vigente';

  return { ok, estado, errores, warnings };
}
