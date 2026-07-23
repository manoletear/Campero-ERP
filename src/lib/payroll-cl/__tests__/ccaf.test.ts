import { describe, it, expect } from 'vitest';
import { calculatePayroll } from '../engine';
import { generateCcafFile } from '../ccaf-generator';
import type { PayrollEngineInput } from '../types/payroll';
import type { IndicatorSnapshot } from '../types/indicators';
import { HealthType, SnapshotStatus, UfPolicy } from '../types/enums';

const SNAPSHOT: IndicatorSnapshot = {
  id: 'snap-test', country: 'CL', period: '2026-06',
  status: SnapshotStatus.APPROVED,
  ufPeriodEndValue: 38800, ufPolicy: UfPolicy.PERIOD_END_DATE,
  utmValue: 68500, utaValue: 822000,
  afpHealthMutualCapUf: 81.6, unemploymentCapUf: 126.7,
  afpHealthMutualCapClp: 3166080, unemploymentCapClp: 4915960,
  healthLegalRate: 0.07, afcTcpEmployerRate: 0.03, caiTcpRate: 0.0111, sisRate: 0.0157,
  socialSecurityLifeExpectancyRate: 0, socialSecurityProtectedProfitabilityRate: 0,
  minimumIncomeGeneral: 500000, minimumIncomeHouseholdWorker: 564000,
  minimumIncomeUnder18Over65: 420000, minimumIncomeNonRemunerational: 195000,
  previredFormatType: 'LARGO_VARIABLE_SEPARADOR', previredFormatVersion: '82', previredFieldCount: 105,
  afpRates: [{ afpCode: 'capital', afpName: 'AFP Capital', mandatoryRate: 0.10, commissionRate: 0.0069, totalWorkerRate: 0.1069 }],
  taxBrackets: [
    { periodicity: 'MENSUAL', fromAmount: 0,      toAmount: 924750, factor: 0,    deductionAmount: 0     },
    { periodicity: 'MENSUAL', fromAmount: 924751, toAmount: null,   factor: 0.04, deductionAmount: 36990 },
  ],
  familyAllowanceTranches: [
    { trancheCode: 'A', amount: 7000, incomeFrom: 0, incomeTo: 200000 },
    { trancheCode: 'D', amount: 0,    incomeFrom: 200001, incomeTo: null },
  ],
};

function inp(overrides: Partial<PayrollEngineInput> = {}): PayrollEngineInput {
  return {
    payrollPeriod: '2026-06', country: 'CL',
    contract: {
      contractId: 'c1', workerId: 'w1',
      legalProfileType: 'TCP_PUERTAS_AFUERA',
      startDate: '2025-01-01', baseSalary: 700000,
      weeklyHours: 45, workScheduleType: 'PUERTAS_AFUERA',
    },
    worker: {
      rut: '11111111-1', afpCode: 'capital',
      healthType: HealthType.FONASA,
      isPensioner: false, workerTypePrevired: '31',
    },
    periodEvents: { workedDays: 30 },
    snapshot: SNAPSHOT,
    ...overrides,
  };
}

describe('engine CCAF', () => {
  it('sin afiliación: sin aporte ni descuentos CCAF', () => {
    const r = calculatePayroll(inp());
    expect(r.employerContributions.ccaf).toBeUndefined();
    expect(r.ccafDeductions).toBeUndefined();
    expect(r.concepts.some(c => c.conceptCode.startsWith('CCAF'))).toBe(false);
  });

  it('con afiliación: aporte empleador 0.6% sobre pensionBase', () => {
    const r = calculatePayroll(inp({ ccaf: { codigoPrevired: '01', aportePct: 0.006 } }));
    expect(r.employerContributions.ccaf).toBe(Math.round(r.pensionBase * 0.006));
    expect(r.concepts.some(c => c.conceptCode === 'CCAF_APORTE_EMPLEADOR')).toBe(true);
  });

  it('pensionado: no cobra aporte CCAF', () => {
    const r = calculatePayroll(inp({
      worker: { rut: '1', afpCode: 'capital', healthType: HealthType.FONASA, isPensioner: true, workerTypePrevired: '31' },
      ccaf: { codigoPrevired: '01' },
    }));
    expect(r.employerContributions.ccaf).toBeUndefined();
  });

  it('descuentos voluntarios se restan del líquido', () => {
    const sin = calculatePayroll(inp());
    const con = calculatePayroll(inp({
      ccaf: {
        codigoPrevired: '01',
        descuentos: [
          { tipo: 'credito', monto: 25000 },
          { tipo: 'dental',  monto: 5000  },
        ],
      },
    }));
    expect(con.ccafDeductions).toBe(30000);
    expect(con.netPay).toBe(sin.netPay - 30000);
    expect(con.concepts.find(c => c.conceptCode === 'CCAF_DESC_CREDITO')?.amount).toBe(25000);
    expect(con.concepts.find(c => c.conceptCode === 'CCAF_DESC_DENTAL')?.amount).toBe(5000);
  });
});

describe('generateCcafFile', () => {
  it('genera CSV con cabecera, filas y TOTAL', () => {
    const { content, filename, totales } = generateCcafFile({
      period: '2026-06',
      ccafCodigo: 'losandes',
      ccafNombre: 'Los Andes',
      empleadorRut: '12345678-9',
      empleadorNombre: 'Hogar Test',
      rows: [
        { workerRut: '11111111-1', workerNombre: 'Ana', workerApellidoPaterno: 'Pérez',
          pensionBase: 500000, aporteEmpleador: 3000,
          credito: 25000, dental: 0, leasing: 0, seguroVida: 0, otros: 0 },
        { workerRut: '22222222-2', workerNombre: 'Luis', workerApellidoPaterno: 'Soto',
          pensionBase: 600000, aporteEmpleador: 3600,
          credito: 0, dental: 5000, leasing: 0, seguroVida: 2000, otros: 0 },
      ],
    });
    expect(filename).toMatch(/CCAF_losandes_.*202606\.csv/);
    expect(content).toContain('CCAF=Los Andes');
    expect(content).toContain('11111111-1;Ana;Pérez');
    expect(content.split('\r\n').filter(l => l.startsWith('TOTAL'))).toHaveLength(1);
    expect(totales.rentaImponible).toBe(1100000);
    expect(totales.aporteEmpleador).toBe(6600);
    expect(totales.descuentos).toBe(32000);
  });
});
