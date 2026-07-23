// Motor de cálculo de remuneraciones Chile (TCP — Trabajadores de Casa Particular)
// Función pura: entrada → resultado inmutable con trazabilidad. Sin side effects.

import type {
  PayrollEngineInput,
  PayrollResult,
  ConceptResult,
  CalculationTraceStep,
} from './types/payroll';
import { ConceptType, HealthType } from './types/enums';

// Tasa mutual base mínima (ACHS básica). El snapshot no expone campo propio.
const MUTUAL_BASE_RATE = 0.0093;
// AFC trabajador TCP: 0,6% primeros 10 años, 1,4% desde año 11 (Ley 21.585, 2023).
const AFC_WORKER_RATE_YEARS_1_10 = 0.006;
const AFC_WORKER_RATE_YEARS_11_PLUS = 0.014;

export function calculatePayroll(input: PayrollEngineInput): PayrollResult {
  const { contract, worker, periodEvents, variableItems = [], snapshot } = input;
  const trace: CalculationTraceStep[] = [];
  const concepts: ConceptResult[] = [];
  const warnings: string[] = [];
  let traceOrder = 0;

  function t(
    code: string,
    description: string,
    result: number,
    formula?: string,
    inputs?: Record<string, number | string | null>
  ): void {
    trace.push({ order: traceOrder++, code, description, formula, inputs, result });
  }

  function c(
    conceptCode: string,
    conceptName: string,
    conceptType: ConceptType,
    amount: number,
    opts: Partial<Omit<ConceptResult, 'conceptCode' | 'conceptName' | 'conceptType' | 'amount'>> = {}
  ): void {
    concepts.push({
      conceptCode,
      conceptName,
      conceptType,
      amount: Math.round(amount),
      baseAmount: opts.baseAmount !== undefined ? Math.round(opts.baseAmount) : undefined,
      rate: opts.rate,
      taxable: opts.taxable ?? true,
      imponible: opts.imponible ?? true,
      legal: opts.legal ?? true,
      visibleInPayslip: opts.visibleInPayslip ?? true,
      calculationOrder: opts.calculationOrder ?? concepts.length,
    });
  }

  // ── 1. Sueldo base proporcional ──
  // Base de días: días del mes (aplica tanto puertas afuera como adentro).
  // Licencia médica y permiso sin goce reducen días efectivos pagados por empleador.
  const [y, m] = input.payrollPeriod.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const medicalLeaveDays = periodEvents.medicalLeaveDays ?? 0;
  const unpaidLeaveDays = periodEvents.unpaidLeaveDays ?? 0;
  // Días que el empleador efectivamente paga (excluye licencia y permiso sin goce).
  const paidDays = Math.min(
    Math.max(0, periodEvents.workedDays - medicalLeaveDays - unpaidLeaveDays),
    daysInMonth
  );
  const sueldoBase = contract.baseSalary * (paidDays / daysInMonth);
  t('SUELDO_BASE', 'Sueldo base proporcional', sueldoBase,
    'baseSalary * (paidDays / daysInMonth)',
    { baseSalary: contract.baseSalary, paidDays, daysInMonth, medicalLeaveDays, unpaidLeaveDays });
  c('SUELDO_BASE', 'Sueldo Base', ConceptType.HABER, sueldoBase,
    { baseAmount: contract.baseSalary, calculationOrder: 1 });

  // ── 2. Horas extras (150%) ──
  let horasExtra = 0;
  if ((periodEvents.extraHours ?? 0) > 0) {
    const valorHora = contract.baseSalary / (contract.weeklyHours * 4.333);
    horasExtra = valorHora * 1.5 * periodEvents.extraHours!;
    t('HORAS_EXTRA', 'Horas extraordinarias (50%)', horasExtra,
      '(baseSalary / (weeklyHours * 4.333)) * 1.5 * extraHours',
      { valorHora: Math.round(valorHora), extraHours: periodEvents.extraHours! });
    c('HORAS_EXTRA', 'Horas Extraordinarias', ConceptType.HABER, horasExtra,
      { baseAmount: valorHora, rate: 1.5, calculationOrder: 2 });
  }

  // ── 3. Ítems variables ──
  const NON_TAXABLE_CODES = new Set([
    'ASIGNACION_MOVILIZACION', 'ASIGNACION_COLACION', 'VIATICO',
    'REEMBOLSO_GASTOS', 'BONO_NO_IMPONIBLE',
    'AGUINALDO',              // graciable (Fiestas Patrias/Navidad) — no imponible
    'ASIGNACION_PERDIDA_CAJA', // no imponible por ley
  ]);
  let variablesImponibles = 0;
  let variablesNoImponibles = 0;
  let anticipos = 0;
  for (const item of variableItems) {
    // Flag explícito gana sobre la inferencia por código
    const imponible = item.imponible ?? !NON_TAXABLE_CODES.has(item.conceptCode);
    const esAnticipo = item.conceptCode === 'ANTICIPO_SUELDO' || item.conceptCode === 'PRESTAMO_EMPLEADOR';
    if (esAnticipo) {
      anticipos += item.amount;
      // Anticipos se registran como DESCUENTO (no es haber), visible en payslip
      c(item.conceptCode, item.conceptCode === 'PRESTAMO_EMPLEADOR' ? 'Préstamo Empleador' : 'Anticipo de Sueldo',
        ConceptType.DESCUENTO, item.amount,
        { imponible: false, taxable: false, legal: false, calculationOrder: 27 });
    } else {
      if (imponible) variablesImponibles += item.amount;
      else variablesNoImponibles += item.amount;
      c(item.conceptCode, item.conceptCode, ConceptType.HABER, item.amount,
        { imponible, taxable: imponible });
    }
  }

  // ── 4. Bases ──
  const grossIncome = sueldoBase + horasExtra + variablesImponibles + variablesNoImponibles;
  const remuneracionImponible = sueldoBase + horasExtra + variablesImponibles;
  const cap = snapshot.afpHealthMutualCapClp;
  const capAfc = snapshot.unemploymentCapClp;
  const pensionBase = Math.min(remuneracionImponible, cap);
  const healthBase = Math.min(remuneracionImponible, cap);
  const afcBase = Math.min(remuneracionImponible, capAfc);
  const mutualBase = Math.min(remuneracionImponible, cap);
  t('RENTA_IMPONIBLE', 'Remuneración imponible', remuneracionImponible,
    'sueldoBase + horasExtra + variablesImponibles',
    { sueldoBase: Math.round(sueldoBase), horasExtra: Math.round(horasExtra), variablesImponibles });

  // ── 5. AFP ──
  const afpRate = snapshot.afpRates.find(r => r.afpCode === worker.afpCode);
  if (!afpRate) warnings.push(`AFP '${worker.afpCode}' no encontrada en snapshot; cotización en 0.`);
  const afp10Rate = afpRate?.mandatoryRate ?? 0.10;
  const afpCommissionRate = afpRate?.commissionRate ?? 0;
  const afp10 = worker.isPensioner ? 0 : Math.round(pensionBase * afp10Rate);
  const afpCommission = worker.isPensioner ? 0 : Math.round(pensionBase * afpCommissionRate);
  if (!worker.isPensioner) {
    c('AFP_10', 'Cotización AFP (10%)', ConceptType.DESCUENTO, afp10,
      { baseAmount: pensionBase, rate: afp10Rate, calculationOrder: 10 });
    c('AFP_COMISION', 'Comisión AFP', ConceptType.DESCUENTO, afpCommission,
      { baseAmount: pensionBase, rate: afpCommissionRate, calculationOrder: 11 });
  }

  // ── 6. Validación sueldo mínimo TCP ──
  if (contract.baseSalary < snapshot.minimumIncomeHouseholdWorker) {
    warnings.push(
      `Sueldo base $${contract.baseSalary} es menor al mínimo TCP $${snapshot.minimumIncomeHouseholdWorker}. Infracción DT.`
    );
  }

  // ── 7. Asignación familiar ──
  let asignacionFamiliar = 0;
  const familyCount = worker.familyAllowanceCount ?? 0;
  if (familyCount > 0 && snapshot.familyAllowanceTranches.length > 0) {
    const tranche = snapshot.familyAllowanceTranches.find(tr =>
      remuneracionImponible >= tr.incomeFrom &&
      (tr.incomeTo === null || remuneracionImponible <= tr.incomeTo)
    );
    if (tranche) {
      asignacionFamiliar = tranche.amount * familyCount;
      t('ASIGNACION_FAMILIAR', 'Asignación familiar', asignacionFamiliar,
        'trancheAmount * familyCount',
        { trancheAmount: tranche.amount, familyCount, tranche: tranche.trancheCode });
      c('ASIGNACION_FAMILIAR', 'Asignación Familiar', ConceptType.HABER, asignacionFamiliar,
        { imponible: false, taxable: false, calculationOrder: 5 });
    } else {
      warnings.push(`Sin tramo asignación familiar para renta $${remuneracionImponible}.`);
    }
  }

  // ── 8. Salud ──
  const salud7Minimo = Math.round(healthBase * snapshot.healthLegalRate);
  let salud7 = salud7Minimo;
  let isapreDiferencia = 0;
  if (worker.healthType === HealthType.ISAPRE && worker.isaprePlanUf) {
    const planClp = Math.round(worker.isaprePlanUf * snapshot.ufPeriodEndValue);
    if (planClp > salud7Minimo) {
      isapreDiferencia = planClp - salud7Minimo;
      c('SALUD_7', 'Cotización Salud ISAPRE (7% mínimo)', ConceptType.DESCUENTO, salud7,
        { baseAmount: healthBase, rate: snapshot.healthLegalRate, calculationOrder: 12 });
      c('ISAPRE_DIFERENCIA_PLAN', 'Diferencia Plan ISAPRE', ConceptType.DESCUENTO, isapreDiferencia,
        { baseAmount: planClp, calculationOrder: 13 });
    } else {
      c('SALUD_7', 'Cotización Salud ISAPRE (7%)', ConceptType.DESCUENTO, salud7,
        { baseAmount: healthBase, rate: snapshot.healthLegalRate, calculationOrder: 12 });
    }
  } else {
    c('SALUD_7', 'Cotización Salud FONASA (7%)', ConceptType.DESCUENTO, salud7,
      { baseAmount: healthBase, rate: snapshot.healthLegalRate, calculationOrder: 12 });
  }

  // ── 9. AFC del trabajador (Ley 21.585, 2023) ──
  // Pensionados y trabajadores con >65 años no cotizan AFC.
  let afcTrabajador = 0;
  if (!worker.isPensioner) {
    const startYear = parseInt(contract.startDate.substring(0, 4));
    const periodYearNum = parseInt(input.payrollPeriod.substring(0, 4));
    const yearsOfService = periodYearNum - startYear;
    const afcWorkerRate = yearsOfService >= 10
      ? AFC_WORKER_RATE_YEARS_11_PLUS
      : AFC_WORKER_RATE_YEARS_1_10;
    afcTrabajador = Math.round(afcBase * afcWorkerRate);
    t('AFC_TRABAJADOR', 'AFC trabajador TCP (Ley 21.585)', afcTrabajador,
      'afcBase * rate',
      { afcBase, rate: afcWorkerRate, yearsOfService });
    c('AFC_TRABAJADOR', 'AFC Trabajador TCP', ConceptType.DESCUENTO, afcTrabajador,
      { baseAmount: afcBase, rate: afcWorkerRate, calculationOrder: 14 });
  }

  // ── 10. Base impuesto único ──
  // Art. 42 LIR: imponible menos cotizaciones AFP y salud obligatorias.
  // SII Circular 31/2014: AFC NO es cotización previsional → no reduce base del impuesto único.
  const incomeTaxBase =
    remuneracionImponible - afp10 - afpCommission - salud7 - isapreDiferencia;
  t('BASE_IMPUESTO', 'Base imponible impuesto único', incomeTaxBase,
    'remuneracionImponible - afp10 - afpCommission - salud7 - isapreDiferencia',
    { remuneracionImponible, afp10, afpCommission, salud7, isapreDiferencia });

  // ── 11. Impuesto único 2ª categoría ──
  let incomeTax = 0;
  const bracket = snapshot.taxBrackets.find(b =>
    incomeTaxBase >= b.fromAmount && (b.toAmount === null || incomeTaxBase <= b.toAmount)
  );
  if (bracket) {
    incomeTax = Math.max(0, Math.round(incomeTaxBase * bracket.factor - bracket.deductionAmount));
    t('IMPUESTO_UNICO', 'Impuesto único 2ª categoría', incomeTax,
      'base * factor - deduccion',
      { incomeTaxBase, factor: bracket.factor, deduccion: bracket.deductionAmount });
  }
  if (incomeTax > 0) {
    c('IMPUESTO_UNICO_SEGUNDA_CATEGORIA', 'Impuesto Único 2ª Categoría', ConceptType.DESCUENTO, incomeTax,
      { baseAmount: incomeTaxBase, rate: bracket?.factor, calculationOrder: 20 });
  }

  // ── 12. Descuento ausencias injustificadas ──
  let descuentoAusencia = 0;
  if ((periodEvents.unjustifiedAbsenceDays ?? 0) > 0) {
    descuentoAusencia = Math.round(
      contract.baseSalary * (periodEvents.unjustifiedAbsenceDays! / daysInMonth)
    );
    c('AUSENCIA_INJUSTIFICADA', 'Descuento Ausencia Injustificada', ConceptType.DESCUENTO,
      descuentoAusencia, { baseAmount: contract.baseSalary, calculationOrder: 25 });
  }

  // ── 13. Aportes empleador (exentos para pensionados) ──
  const sis = worker.isPensioner ? 0 : Math.round(pensionBase * snapshot.sisRate);
  const afcEmpleador = worker.isPensioner ? 0 : Math.round(afcBase * snapshot.afcTcpEmployerRate);
  const cai = worker.isPensioner ? 0 : Math.round(remuneracionImponible * snapshot.caiTcpRate);
  const mutual = Math.round(mutualBase * MUTUAL_BASE_RATE);

  if (!worker.isPensioner) {
    c('SIS', 'Seguro de Invalidez y Sobrevivencia (SIS)', ConceptType.APORTE_EMPLEADOR, sis,
      { baseAmount: pensionBase, rate: snapshot.sisRate, visibleInPayslip: false, calculationOrder: 50 });
    c('AFC_EMPLEADOR_TCP_3', 'AFC Empleador TCP (3%)', ConceptType.APORTE_EMPLEADOR, afcEmpleador,
      { baseAmount: afcBase, rate: snapshot.afcTcpEmployerRate, visibleInPayslip: false, calculationOrder: 51 });
    c('CAI_INDEMNIZACION_TODO_EVENTO_1_11', 'CAI Todo Evento (1,11%)', ConceptType.APORTE_EMPLEADOR, cai,
      { baseAmount: remuneracionImponible, rate: snapshot.caiTcpRate, visibleInPayslip: false, calculationOrder: 52 });
  }
  c('MUTUAL_ACCIDENTES_TRABAJO', 'Mutual Accidentes del Trabajo', ConceptType.APORTE_EMPLEADOR, mutual,
    { baseAmount: mutualBase, rate: MUTUAL_BASE_RATE, visibleInPayslip: false, calculationOrder: 53 });

  // ── 13b. CCAF: aporte empleador 0.6% + descuentos voluntarios trabajador ──
  let ccafAporte = 0;
  let ccafDescuentos = 0;
  if (input.ccaf) {
    const aportePct = input.ccaf.aportePct ?? 0.006;
    ccafAporte = worker.isPensioner ? 0 : Math.round(pensionBase * aportePct);
    if (ccafAporte > 0) {
      c('CCAF_APORTE_EMPLEADOR', `Aporte CCAF (${(aportePct * 100).toFixed(2)}%)`,
        ConceptType.APORTE_EMPLEADOR, ccafAporte,
        { baseAmount: pensionBase, rate: aportePct, visibleInPayslip: false, calculationOrder: 54 });
    }
    for (const d of input.ccaf.descuentos ?? []) {
      if (d.monto > 0) {
        ccafDescuentos += d.monto;
        const codigo = `CCAF_DESC_${d.tipo.toUpperCase()}`;
        const nombre = `CCAF — ${({ credito: 'Crédito social', dental: 'Dental', leasing: 'Leasing', seguro_vida: 'Seguro de vida', otro: 'Otros' } as const)[d.tipo]}`;
        c(codigo, nombre, ConceptType.DESCUENTO, d.monto,
          { calculationOrder: 26, imponible: false });
      }
    }
  }

  // ── 14. Totales ──
  const totalDescuentos = afp10 + afpCommission + salud7 + isapreDiferencia
    + afcTrabajador + incomeTax + descuentoAusencia + anticipos + ccafDescuentos;
  const netPay = Math.round(grossIncome + asignacionFamiliar - totalDescuentos);
  const totalEmployerCost = Math.round(remuneracionImponible + sis + afcEmpleador + cai + mutual + ccafAporte);

  return {
    payrollPeriod: input.payrollPeriod,
    contractId: contract.contractId,
    workerId: contract.workerId,
    indicatorSnapshotId: snapshot.id,
    grossIncome: Math.round(grossIncome),
    taxableIncome: Math.round(remuneracionImponible),
    pensionBase: Math.round(pensionBase),
    healthBase: Math.round(healthBase),
    afcBase: Math.round(afcBase),
    mutualBase: Math.round(mutualBase),
    incomeTaxBase: Math.round(incomeTaxBase),
    employeeDeductions: {
      afp10,
      afpCommission,
      health7: salud7,
      incomeTax,
      advances: anticipos,
      other: descuentoAusencia + afcTrabajador + isapreDiferencia + ccafDescuentos,
    },
    ...(ccafDescuentos > 0 && { ccafDeductions: ccafDescuentos }),
    employerContributions: {
      sis,
      afcEmployer: afcEmpleador,
      cai111: cai,
      mutual,
      ...(ccafAporte > 0 && { ccaf: ccafAporte }),
    },
    netPay,
    totalEmployerCost,
    concepts,
    warnings,
    calculationTrace: trace,
  };
}
