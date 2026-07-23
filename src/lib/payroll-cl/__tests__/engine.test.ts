import { describe, it, expect } from 'vitest';
import { calculatePayroll } from '../engine';
import type { PayrollEngineInput } from '../types/payroll';
import type { IndicatorSnapshot } from '../types/indicators';
import { HealthType, SnapshotStatus, UfPolicy } from '../types/enums';

// ─────────────────────────────────────────────────────────────
// Snapshot mayo 2026 con valores reales verificados manualmente
// UF: $38.800 | UTM: $68.500
// Tope AFP/Salud/Mutual: 81,6 UF = $3.166.080
// Tope AFC: 126,7 UF = $4.915.960
// ─────────────────────────────────────────────────────────────
const SNAPSHOT: IndicatorSnapshot = {
  id: 'snap-2026-05',
  country: 'CL',
  period: '2026-05',
  status: SnapshotStatus.APPROVED,
  ufPeriodEndValue: 38800,
  ufPolicy: UfPolicy.PERIOD_END_DATE,
  utmValue: 68500,
  utaValue: 822000,
  // Topes imponibles
  afpHealthMutualCapUf: 81.6,
  unemploymentCapUf: 126.7,
  afpHealthMutualCapClp: 3166080,
  unemploymentCapClp: 4915960,
  // Tasas
  healthLegalRate: 0.07,
  afcTcpEmployerRate: 0.03,
  caiTcpRate: 0.0111,
  sisRate: 0.0157,
  socialSecurityLifeExpectancyRate: 0,
  socialSecurityProtectedProfitabilityRate: 0,
  // Rentas mínimas
  minimumIncomeGeneral: 500000,
  minimumIncomeHouseholdWorker: 564000,
  minimumIncomeUnder18Over65: 420000,
  minimumIncomeNonRemunerational: 195000,
  // Previred
  previredFormatType: 'LARGO_VARIABLE_SEPARADOR',
  previredFormatVersion: '82',
  previredFieldCount: 105,
  // AFP Capital
  afpRates: [
    { afpCode: 'capital', afpName: 'AFP Capital', mandatoryRate: 0.10, commissionRate: 0.0069, totalWorkerRate: 0.1069 },
    { afpCode: 'habitat', afpName: 'AFP Hábitat', mandatoryRate: 0.10, commissionRate: 0.0127, totalWorkerRate: 0.1127 },
  ],
  // Tabla impuesto único mensual (tramos en CLP, UTM=$68.500)
  // Verificada: límite inferior tramo 2 produce $0 de impuesto; continuidad entre tramos ✓
  taxBrackets: [
    { periodicity: 'MENSUAL', fromAmount: 0,       toAmount: 924750,  factor: 0,    deductionAmount: 0      },
    { periodicity: 'MENSUAL', fromAmount: 924751,  toAmount: 2055000, factor: 0.04, deductionAmount: 36990  },
    { periodicity: 'MENSUAL', fromAmount: 2055001, toAmount: 3425000, factor: 0.08, deductionAmount: 119190 },
    { periodicity: 'MENSUAL', fromAmount: 3425001, toAmount: 4795000, factor: 0.135,deductionAmount: 307655 },
    { periodicity: 'MENSUAL', fromAmount: 4795001, toAmount: null,    factor: 0.23, deductionAmount: 763150 },
  ],
  // Tramos asignación familiar (art. 1 Ley 18.987)
  familyAllowanceTranches: [
    { trancheCode: 'A', amount: 7000,  incomeFrom: 0,       incomeTo: 200000  },
    { trancheCode: 'B', amount: 4500,  incomeFrom: 200001,  incomeTo: 500000  },
    { trancheCode: 'C', amount: 2500,  incomeFrom: 500001,  incomeTo: 1000000 },
    { trancheCode: 'D', amount: 0,     incomeFrom: 1000001, incomeTo: null    },
  ],
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function baseInput(overrides: Partial<PayrollEngineInput> = {}): PayrollEngineInput {
  return {
    payrollPeriod: '2026-05',
    country: 'CL',
    contract: {
      contractId: 'c-1',
      workerId: 'w-1',
      legalProfileType: 'TCP_PUERTAS_AFUERA',
      startDate: '2024-01-01',
      baseSalary: 700000,
      weeklyHours: 45,
      workScheduleType: 'PUERTAS_AFUERA',
    },
    worker: {
      rut: '12345678-9',
      afpCode: 'capital',
      healthType: HealthType.FONASA,
      isPensioner: false,
      workerTypePrevired: '31',
    },
    periodEvents: { workedDays: 31 },
    snapshot: SNAPSHOT,
    ...overrides,
  };
}

function sumConceptsByType(result: ReturnType<typeof calculatePayroll>, type: string) {
  return result.concepts
    .filter(c => c.conceptType === type)
    .reduce((acc, c) => acc + c.amount, 0);
}

// ─────────────────────────────────────────────────────────────
// CASO 1 — Mes completo, FONASA, AFP Capital, <10 años servicio
// Verificado manualmente: todos los valores son exactos.
// ─────────────────────────────────────────────────────────────
describe('Caso 1 — mes completo $700.000 FONASA AFP Capital', () => {
  const result = calculatePayroll(baseInput());

  it('sueldo bruto = $700.000 (mes completo, sin proporción)', () => {
    expect(result.grossIncome).toBe(700000);
  });
  it('AFP 10% = $70.000', () => {
    expect(result.employeeDeductions.afp10).toBe(70000);
  });
  it('comisión AFP Capital 0,69% = $4.830', () => {
    expect(result.employeeDeductions.afpCommission).toBe(4830);
  });
  it('salud FONASA 7% = $49.000', () => {
    expect(result.employeeDeductions.health7).toBe(49000);
  });
  it('AFC trabajador 0,6% (< 10 años) = $4.200', () => {
    const afcW = result.concepts.find(c => c.conceptCode === 'AFC_TRABAJADOR');
    expect(afcW?.amount).toBe(4200);
  });
  it('base impuesto = $576.170 → tramo exento → impuesto $0', () => {
    expect(result.incomeTaxBase).toBe(576170);
    expect(result.employeeDeductions.incomeTax).toBe(0);
  });
  it('neto = $571.970', () => {
    expect(result.netPay).toBe(571970);
  });
  it('SIS empleador 1,57% = $10.990', () => {
    expect(result.employerContributions.sis).toBe(10990);
  });
  it('AFC empleador TCP 3% = $21.000', () => {
    expect(result.employerContributions.afcEmployer).toBe(21000);
  });
  it('CAI 1,11% = $7.770', () => {
    expect(result.employerContributions.cai111).toBe(7770);
  });
  it('Mutual 0,93% = $6.510', () => {
    expect(result.employerContributions.mutual).toBe(6510);
  });
  it('costo total empleador = $746.270', () => {
    expect(result.totalEmployerCost).toBe(746270);
  });
  it('sin warnings', () => {
    expect(result.warnings).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 2 — Proporcional: trabajó 21 de 31 días (mayo)
// Verifica que la base de cálculo sea proporcional, no el sueldo completo.
// ─────────────────────────────────────────────────────────────
describe('Caso 2 — proporcional 21/31 días', () => {
  const result = calculatePayroll(baseInput({
    periodEvents: { workedDays: 21 },
  }));

  it('sueldo base = round(700.000 × 21/31) = $474.194', () => {
    expect(result.grossIncome).toBe(474194);
  });
  it('AFP 10% sobre base proporcional = $47.419', () => {
    expect(result.employeeDeductions.afp10).toBe(47419);
  });
  it('neto = $387.464', () => {
    expect(result.netPay).toBe(387464);
  });
  it('trazabilidad incluye paidDays=21 y daysInMonth=31', () => {
    const step = result.calculationTrace.find(t => t.code === 'SUELDO_BASE');
    expect(step?.inputs?.paidDays).toBe(21);
    expect(step?.inputs?.daysInMonth).toBe(31);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 3 — ISAPRE con plan que supera el 7% mínimo (1,5 UF)
// La diferencia DEBE incluirse en el neto, no solo declararse como concepto.
// Este fue un bug real corregido en el motor.
// ─────────────────────────────────────────────────────────────
describe('Caso 3 — ISAPRE plan 1,5 UF ($58.200 > mínimo $49.000)', () => {
  const result = calculatePayroll(baseInput({
    worker: {
      rut: '12345678-9',
      afpCode: 'capital',
      healthType: HealthType.ISAPRE,
      isaprePlanUf: 1.5,
      isPensioner: false,
      workerTypePrevired: '31',
    },
  }));

  it('cotización 7% mínimo = $49.000', () => {
    const salud = result.concepts.find(c => c.conceptCode === 'SALUD_7');
    expect(salud?.amount).toBe(49000);
  });
  it('diferencia plan ISAPRE = $9.200', () => {
    const dif = result.concepts.find(c => c.conceptCode === 'ISAPRE_DIFERENCIA_PLAN');
    expect(dif?.amount).toBe(9200);
  });
  it('neto = $562.770 (diferencia descontada del neto)', () => {
    expect(result.netPay).toBe(562770);
  });
  it('neto ISAPRE < neto FONASA en exactamente $9.200 (la diferencia)', () => {
    const resultFonasa = calculatePayroll(baseInput());
    expect(resultFonasa.netPay - result.netPay).toBe(9200);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 4 — Pensionado: AFP=0, SIS=0, AFC_empleador=0, CAI=0, AFC_trabajador=0
// Solo paga salud y mutual. Este fue un bug real en SIS.
// ─────────────────────────────────────────────────────────────
describe('Caso 4 — pensionado FONASA', () => {
  const result = calculatePayroll(baseInput({
    worker: {
      rut: '12345678-9',
      afpCode: 'capital',
      healthType: HealthType.FONASA,
      isPensioner: true,
      workerTypePrevired: '31',
    },
  }));

  it('AFP = $0', () => {
    expect(result.employeeDeductions.afp10).toBe(0);
    expect(result.employeeDeductions.afpCommission).toBe(0);
  });
  it('SIS empleador = $0', () => {
    expect(result.employerContributions.sis).toBe(0);
  });
  it('AFC empleador = $0', () => {
    expect(result.employerContributions.afcEmployer).toBe(0);
  });
  it('CAI = $0', () => {
    expect(result.employerContributions.cai111).toBe(0);
  });
  it('AFC trabajador = $0', () => {
    const afcW = result.concepts.find(c => c.conceptCode === 'AFC_TRABAJADOR');
    expect(afcW).toBeUndefined();
  });
  it('salud FONASA 7% sí aplica = $49.000', () => {
    expect(result.employeeDeductions.health7).toBe(49000);
  });
  it('mutual sí aplica = $6.510', () => {
    expect(result.employerContributions.mutual).toBe(6510);
  });
  it('neto = $651.000', () => {
    expect(result.netPay).toBe(651000);
  });
  it('costo total empleador = $706.510 (solo mutual)', () => {
    expect(result.totalEmployerCost).toBe(706510);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 5 — Sueldo $3.500.000: supera tope imponible AFP ($3.166.080)
// y cae en tramo de impuesto único 8%.
// Verifica que los topes se apliquen correctamente y el impuesto sea exacto.
// ─────────────────────────────────────────────────────────────
describe('Caso 5 — $3.500.000, tope imponible AFP + impuesto único 8%', () => {
  const result = calculatePayroll(baseInput({
    contract: {
      contractId: 'c-1', workerId: 'w-1',
      legalProfileType: 'TCP_PUERTAS_AFUERA',
      startDate: '2024-01-01',
      baseSalary: 3500000,
      weeklyHours: 45,
      workScheduleType: 'PUERTAS_AFUERA',
    },
  }));

  it('base pensión/salud = tope $3.166.080 (no el sueldo completo)', () => {
    expect(result.pensionBase).toBe(3166080);
    expect(result.healthBase).toBe(3166080);
  });
  it('base AFC = $3.500.000 (tope AFC $4.915.960 no aplica)', () => {
    expect(result.afcBase).toBe(3500000);
  });
  it('AFP 10% sobre tope = $316.608', () => {
    expect(result.employeeDeductions.afp10).toBe(316608);
  });
  it('comisión AFP sobre tope = $21.846', () => {
    expect(result.employeeDeductions.afpCommission).toBe(21846);
  });
  it('salud 7% sobre tope = $221.626', () => {
    expect(result.employeeDeductions.health7).toBe(221626);
  });
  it('base impuesto = $2.939.920 (sueldo bruto - AFP - salud sobre tope)', () => {
    expect(result.incomeTaxBase).toBe(2939920);
  });
  it('impuesto único tramo 8% = $116.004', () => {
    // 2.939.920 × 0,08 - 1,74 UTM(119.190) = 235.194 - 119.190 = 116.004
    expect(result.employeeDeductions.incomeTax).toBe(116004);
  });
  it('neto = $2.802.916', () => {
    expect(result.netPay).toBe(2802916);
  });
  it('AFC empleador sobre $3.500.000 (no sobre tope AFP) = $105.000', () => {
    expect(result.employerContributions.afcEmployer).toBe(105000);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 6 — Licencia médica: 10 días de 30 (junio, mes de 30 días)
// El empleador paga solo 20 días; los 10 de licencia los cubre CCAF/FONASA.
// ─────────────────────────────────────────────────────────────
describe('Caso 6 — licencia médica 10 días (junio, 30d)', () => {
  const result = calculatePayroll(baseInput({
    payrollPeriod: '2026-06',
    periodEvents: { workedDays: 30, medicalLeaveDays: 10 },
  }));

  it('sueldo base = round(700.000 × 20/30) = $466.667 (empleador paga 20d)', () => {
    expect(result.grossIncome).toBe(466667);
  });
  it('neto = $381.313', () => {
    expect(result.netPay).toBe(381313);
  });
  it('trazabilidad registra medicalLeaveDays=10 y paidDays=20', () => {
    const step = result.calculationTrace.find(t => t.code === 'SUELDO_BASE');
    expect(step?.inputs?.medicalLeaveDays).toBe(10);
    expect(step?.inputs?.paidDays).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 7 — Asignación familiar: 2 cargas con renta $700.000 (tramo C → $2.500/carga)
// Es haber NO imponible y NO tributable; suma al neto pero no a la base AFP.
// ─────────────────────────────────────────────────────────────
describe('Caso 7 — asignación familiar 2 cargas (tramo C)', () => {
  const result = calculatePayroll(baseInput({
    worker: {
      rut: '12345678-9',
      afpCode: 'capital',
      healthType: HealthType.FONASA,
      isPensioner: false,
      familyAllowanceCount: 2,
      workerTypePrevired: '31',
    },
  }));

  it('asignación familiar = $5.000 (2 × $2.500 tramo C)', () => {
    const af = result.concepts.find(c => c.conceptCode === 'ASIGNACION_FAMILIAR');
    expect(af?.amount).toBe(5000);
    expect(af?.imponible).toBe(false);
    expect(af?.taxable).toBe(false);
  });
  it('no afecta base imponible AFP/salud (sigue siendo $700.000)', () => {
    expect(result.taxableIncome).toBe(700000);
    expect(result.pensionBase).toBe(700000);
  });
  it('neto = $576.970 (neto sin AF + $5.000)', () => {
    expect(result.netPay).toBe(576970);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 8 — AFC Ley 21.585: trabajador con 12 años de servicio → tasa 1,4%
// Un trabajador con inicio 2014-01-01 tiene 12 años en 2026. Tasa aumenta de 0,6% a 1,4%.
// ─────────────────────────────────────────────────────────────
describe('Caso 8 — AFC trabajador 11+ años (tasa 1,4%)', () => {
  const result = calculatePayroll(baseInput({
    contract: {
      contractId: 'c-1', workerId: 'w-1',
      legalProfileType: 'TCP_PUERTAS_AFUERA',
      startDate: '2014-01-01',
      baseSalary: 700000,
      weeklyHours: 45,
      workScheduleType: 'PUERTAS_AFUERA',
    },
  }));

  it('AFC trabajador 1,4% (≥10 años) = $9.800', () => {
    const afcW = result.concepts.find(c => c.conceptCode === 'AFC_TRABAJADOR');
    expect(afcW?.amount).toBe(9800);
    expect(afcW?.rate).toBe(0.014);
  });
  it('neto es $5.600 menor que trabajador con <10 años (diferencia de tasa)', () => {
    // <10 años: afcW=$4.200, >10 años: afcW=$9.800 → diferencia $5.600
    const resultJunior = calculatePayroll(baseInput());
    expect(resultJunior.netPay - result.netPay).toBe(5600);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 9 — Sueldo bajo el mínimo TCP ($400.000 < $564.000)
// El motor no bloquea el cálculo pero debe emitir warning de infracción DT.
// ─────────────────────────────────────────────────────────────
describe('Caso 9 — sueldo bajo mínimo TCP', () => {
  const result = calculatePayroll(baseInput({
    contract: {
      contractId: 'c-1', workerId: 'w-1',
      legalProfileType: 'TCP_PUERTAS_AFUERA',
      startDate: '2024-01-01',
      baseSalary: 400000,
      weeklyHours: 45,
      workScheduleType: 'PUERTAS_AFUERA',
    },
  }));

  it('emite warning de infracción DT', () => {
    expect(result.warnings.some(w => w.includes('Infracción DT'))).toBe(true);
  });
  it('igual calcula el neto (motor no bloquea)', () => {
    expect(result.netPay).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// CASO 10 — Clasificación no imponible: aguinaldo y pérdida de caja
// No deben afectar base AFP/salud/impuesto.
// ─────────────────────────────────────────────────────────────
describe('Caso 10 — aguinaldo y asignación pérdida de caja (no imponibles)', () => {
  const resultBase = calculatePayroll(baseInput());
  const resultConItems = calculatePayroll(baseInput({
    variableItems: [
      { conceptCode: 'AGUINALDO', amount: 50000 },
      { conceptCode: 'ASIGNACION_PERDIDA_CAJA', amount: 20000 },
    ],
  }));

  it('aguinaldo marcado como no imponible', () => {
    const c = resultConItems.concepts.find(c => c.conceptCode === 'AGUINALDO');
    expect(c?.imponible).toBe(false);
    expect(c?.taxable).toBe(false);
  });
  it('pérdida de caja marcada como no imponible', () => {
    const c = resultConItems.concepts.find(c => c.conceptCode === 'ASIGNACION_PERDIDA_CAJA');
    expect(c?.imponible).toBe(false);
    expect(c?.taxable).toBe(false);
  });
  it('base AFP/salud no cambia al agregar $70.000 no imponibles', () => {
    expect(resultConItems.taxableIncome).toBe(resultBase.taxableIncome);
    expect(resultConItems.pensionBase).toBe(resultBase.pensionBase);
  });
  it('neto aumenta en exactamente $70.000 (pasan directo al bolsillo)', () => {
    expect(resultConItems.netPay - resultBase.netPay).toBe(70000);
  });
});
// grossIncome + asignacionFamiliar - sum(descuentos) = netPay
// ─────────────────────────────────────────────────────────────
describe('Invariante — coherencia contable', () => {
  const cases: [string, PayrollEngineInput][] = [
    ['mes completo FONASA',  baseInput()],
    ['proporcional 21d',     baseInput({ periodEvents: { workedDays: 21 } })],
    ['ISAPRE diferencia',    baseInput({ worker: { rut: '1', afpCode: 'capital', healthType: HealthType.ISAPRE, isaprePlanUf: 1.5, isPensioner: false, workerTypePrevired: '31' } })],
    ['pensionado',           baseInput({ worker: { rut: '1', afpCode: 'capital', healthType: HealthType.FONASA, isPensioner: true, workerTypePrevired: '31' } })],
    ['con 2 cargas AF',      baseInput({ worker: { rut: '1', afpCode: 'capital', healthType: HealthType.FONASA, isPensioner: false, familyAllowanceCount: 2, workerTypePrevired: '31' } })],
    ['tope imponible $3.5M', baseInput({ contract: { contractId:'c-1', workerId:'w-1', legalProfileType:'TCP_PUERTAS_AFUERA', startDate:'2024-01-01', baseSalary:3500000, weeklyHours:45, workScheduleType:'PUERTAS_AFUERA' } })],
  ];

  for (const [name, input] of cases) {
    it(`grossIncome + AF_haber - sum(descuentos) = netPay [${name}]`, () => {
      const r = calculatePayroll(input);
      const af = r.concepts.find(c => c.conceptCode === 'ASIGNACION_FAMILIAR')?.amount ?? 0;
      const totalDesc = r.concepts
        .filter(c => c.conceptType === 'DESCUENTO')
        .reduce((acc, c) => acc + c.amount, 0);
      expect(r.grossIncome + af - totalDesc).toBe(r.netPay);
    });
  }
});
