// Construye un IndicatorSnapshot para el período dado.
// UF y UTM se obtienen de mindicador.cl (fallback a valores 2026).
// AFP rates, tramos impuesto, asignación familiar: valores mayo 2026 (actualizar anualmente).

import type { IndicatorSnapshot } from './types/indicators';
import { SnapshotStatus, UfPolicy } from './types/enums';

const AFP_RATES_2026 = [
  { afpCode: 'capital',   afpName: 'AFP Capital',   mandatoryRate: 0.10, commissionRate: 0.0069, totalWorkerRate: 0.1069 },
  { afpCode: 'cuprum',    afpName: 'AFP Cuprum',     mandatoryRate: 0.10, commissionRate: 0.0069, totalWorkerRate: 0.1069 },
  { afpCode: 'habitat',   afpName: 'AFP Hábitat',    mandatoryRate: 0.10, commissionRate: 0.0127, totalWorkerRate: 0.1127 },
  { afpCode: 'planvital', afpName: 'AFP PlanVital',  mandatoryRate: 0.10, commissionRate: 0.0149, totalWorkerRate: 0.1149 },
  { afpCode: 'provida',   afpName: 'AFP ProVida',    mandatoryRate: 0.10, commissionRate: 0.0127, totalWorkerRate: 0.1127 },
  { afpCode: 'modelo',    afpName: 'AFP Modelo',     mandatoryRate: 0.10, commissionRate: 0.0058, totalWorkerRate: 0.1058 },
  { afpCode: 'uno',       afpName: 'AFP Uno',        mandatoryRate: 0.10, commissionRate: 0.0049, totalWorkerRate: 0.1049 },
];

// Tramos impuesto único 2ª categoría (mensual, CLP) — 2026 con UTM≈$68.500
// Factor × base imponible − deducción = impuesto
const TAX_BRACKETS_2026 = [
  { periodicity: 'MENSUAL' as const, fromAmount: 0,       toAmount: 924750,  factor: 0,    deductionAmount: 0      },
  { periodicity: 'MENSUAL' as const, fromAmount: 924751,  toAmount: 2055000, factor: 0.04, deductionAmount: 36990  },
  { periodicity: 'MENSUAL' as const, fromAmount: 2055001, toAmount: 3425000, factor: 0.08, deductionAmount: 119190 },
  { periodicity: 'MENSUAL' as const, fromAmount: 3425001, toAmount: 4795000, factor: 0.135,deductionAmount: 307655 },
  { periodicity: 'MENSUAL' as const, fromAmount: 4795001, toAmount: null,    factor: 0.23, deductionAmount: 763150 },
];

// Tramos asignación familiar (art. 1 Ley 18.987) — 2026
const FAMILY_ALLOWANCE_2026 = [
  { trancheCode: 'A', amount: 7000,  incomeFrom: 0,       incomeTo: 200000  },
  { trancheCode: 'B', amount: 4500,  incomeFrom: 200001,  incomeTo: 500000  },
  { trancheCode: 'C', amount: 2500,  incomeFrom: 500001,  incomeTo: 1000000 },
  { trancheCode: 'D', amount: 0,     incomeFrom: 1000001, incomeTo: null    },
];

// Topes imponibles 2026 (en UF, constantes del año)
const CAP_AFP_HEALTH_MUTUAL_UF = 81.6;
const CAP_AFC_UF = 126.7;

// Tasas empleador 2026 (TCP)
const RATES_2026 = {
  healthLegalRate:      0.07,
  afcTcpEmployerRate:   0.03,
  caiTcpRate:           0.0111,
  sisRate:              0.0157,
  minimumIncomeGeneral:          500000,
  minimumIncomeHouseholdWorker:  564000, // TCP puertas adentro/afuera
  minimumIncomeUnder18Over65:    420000,
  minimumIncomeNonRemunerational:195000,
};

interface MindicadorResponse {
  uf?: { valor: number };
  utm?: { valor: number };
}

export async function buildSnapshotForPeriod(period: string): Promise<IndicatorSnapshot> {
  // Intentar obtener UF/UTM reales
  let uf = 38800;
  let utm = 68500;
  try {
    const res = await fetch('https://mindicador.cl/api', { next: { revalidate: 21600 } });
    if (res.ok) {
      const data = await res.json() as MindicadorResponse;
      if (data?.uf?.valor)  uf  = Math.round(data.uf.valor);
      if (data?.utm?.valor) utm = Math.round(data.utm.valor);
    }
  } catch { /* usar fallback */ }

  const capAfpCLP          = Math.round(CAP_AFP_HEALTH_MUTUAL_UF * uf);
  const capAfcCLP          = Math.round(CAP_AFC_UF * uf);
  const utaValue           = utm * 12;

  return {
    id:      `snapshot-${period}`,
    country: 'CL',
    period,
    status:  SnapshotStatus.APPROVED,

    ufPeriodEndValue: uf,
    ufPolicy:         UfPolicy.PERIOD_END_DATE,
    utmValue:         utm,
    utaValue,

    afpHealthMutualCapUf:  CAP_AFP_HEALTH_MUTUAL_UF,
    unemploymentCapUf:     CAP_AFC_UF,
    afpHealthMutualCapClp: capAfpCLP,
    unemploymentCapClp:    capAfcCLP,

    healthLegalRate:                        RATES_2026.healthLegalRate,
    afcTcpEmployerRate:                     RATES_2026.afcTcpEmployerRate,
    caiTcpRate:                             RATES_2026.caiTcpRate,
    sisRate:                                RATES_2026.sisRate,
    socialSecurityLifeExpectancyRate:       0,
    socialSecurityProtectedProfitabilityRate: 0,

    minimumIncomeGeneral:              RATES_2026.minimumIncomeGeneral,
    minimumIncomeHouseholdWorker:      RATES_2026.minimumIncomeHouseholdWorker,
    minimumIncomeUnder18Over65:        RATES_2026.minimumIncomeUnder18Over65,
    minimumIncomeNonRemunerational:    RATES_2026.minimumIncomeNonRemunerational,

    previredFormatType:    'LARGO_VARIABLE_SEPARADOR',
    previredFormatVersion: '82',
    previredFieldCount:    105,

    afpRates:               AFP_RATES_2026,
    taxBrackets:            TAX_BRACKETS_2026,
    familyAllowanceTranches: FAMILY_ALLOWANCE_2026,
  };
}
