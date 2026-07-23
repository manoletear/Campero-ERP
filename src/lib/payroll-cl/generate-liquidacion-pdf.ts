// Genera el PDF de liquidación para un trabajador × período.
// Usado por /api/payroll/liquidacion-pdf (descarga individual) y
// /api/payroll/liquidaciones-zip (descarga masiva ZIP).

import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { LiquidacionDocument, type LiquidacionLineItem } from '@/lib/payroll-cl/liquidacion-pdf';
import { buildSnapshotForPeriod } from '@/lib/payroll-cl/snapshot-builder';
import type { SupabaseClient } from '@supabase/supabase-js';

const AFP_NOMBRES: Record<number, string> = {
  1: 'AFP Capital', 2: 'AFP Cuprum', 3: 'AFP Hábitat',
  4: 'AFP Modelo', 5: 'AFP PlanVital', 6: 'AFP Provida', 7: 'AFP Uno',
};

const SALUD_NOMBRES: Record<number, string> = {
  7: 'FONASA', 1: 'Banmédica', 2: 'Colmena', 3: 'Consalud',
  4: 'Cruz Blanca', 5: 'Nueva MásVida', 8: 'Vida Tres',
};

const TIPO_CONTRATO_LABEL: Record<string, string> = {
  indefinido: 'Indefinido', plazo_fijo: 'Plazo fijo', obra_o_faena: 'Obra o faena',
};

function dedupeLastWords(s: string): string {
  const parts = (s || '').trim().split(/\s+/);
  for (let len = Math.floor(parts.length / 2); len > 0; len--) {
    const a = parts.slice(parts.length - 2 * len, parts.length - len).join(' ');
    const b = parts.slice(parts.length - len).join(' ');
    if (a && a === b) return parts.slice(0, parts.length - len).join(' ');
  }
  return parts.join(' ');
}

function formatRut(rut: string | null | undefined): string {
  if (!rut) return '';
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return rut;
  const dv = clean.slice(-1);
  const num = clean.slice(0, -1);
  const withDots = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  const dd = String(d.getDate()).padStart(2, '0');
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${dd} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

export interface LiquidacionPdfArtifact {
  buffer: Uint8Array;
  filename: string;
  workerName: string;
}

export async function generarLiquidacionPdf(
  supabase: SupabaseClient,
  empleadorId: string,
  period: string,
  workerId: string,
): Promise<LiquidacionPdfArtifact | { error: string }> {
  const [empData, snapshot] = await Promise.all([
    supabase.from('empleadores').select('nombre, apellido, rut').eq('id', empleadorId).single().then(r => r.data),
    buildSnapshotForPeriod(period),
  ]);

  const { data: result, error } = await supabase
    .from('payroll_results')
    .select(`
      id, gross_income, taxable_income, pension_base, afc_base, income_tax_base,
      deduction_afp10, deduction_afp_commission, deduction_health7,
      deduction_income_tax, deduction_advances, deduction_other, deduction_ccaf,
      net_pay, calculation_trace, worker_id, contract_id,
      pagado_at, medio_pago, referencia_pago, recibo_firmado_at
    `)
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('worker_id', workerId)
    .eq('voided', false)
    .single();

  if (error || !result) return { error: 'resultado_no_encontrado' };

  // Sin FK formal entre payroll_results y trabajadores/contratos (worker_id es text),
  // hacemos los lookups en 2 queries separadas.
  const [conceptosRes, trabRes, contratoRes] = await Promise.all([
    supabase
      .from('payroll_concept_results')
      .select('concept_code, concept_name, concept_type, amount, imponible, legal, calculation_order')
      .eq('payroll_result_id', (result as any).id)
      .order('calculation_order', { ascending: true }),
    supabase
      .from('trabajadores')
      .select('rut, nombre, apellido_paterno, apellido_materno, cargo, afp_id, salud_id, salud_tipo, salud_plan_uf')
      .eq('id', (result as any).worker_id)
      .maybeSingle(),
    supabase
      .from('contratos')
      .select('sueldo_base, fecha_inicio, tipo_contrato')
      .eq('id', (result as any).contract_id)
      .maybeSingle(),
  ]);
  const conceptos = conceptosRes.data;
  const trab: any = trabRes.data ?? {};
  const contrato: any = contratoRes.data ?? {};

  const trace = (result as any).calculation_trace ?? {};

  const [y, m] = period.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const paidDays = trace['SUELDO_BASE']?.inputs?.paidDays ?? daysInMonth;
  const horasExtraCount = trace['HORAS_EXTRA']?.inputs?.extraHours ?? 0;

  const haberesImp: LiquidacionLineItem[] = [];
  const haberesNoImp: LiquidacionLineItem[] = [];
  const descLegales: LiquidacionLineItem[] = [];
  const descOtros: LiquidacionLineItem[] = [];
  for (const c of conceptos ?? []) {
    const item = { label: c.concept_name, amount: c.amount };
    if (c.concept_type === 'HABER') {
      if (c.imponible) haberesImp.push(item); else haberesNoImp.push(item);
    } else if (c.concept_type === 'DESCUENTO') {
      if (c.legal) descLegales.push(item); else descOtros.push(item);
    }
  }

  const totalHaberesImp = haberesImp.reduce((a, x) => a + x.amount, 0);
  const totalHaberesNoImp = haberesNoImp.reduce((a, x) => a + x.amount, 0);
  const totalDescLegales = descLegales.reduce((a, x) => a + x.amount, 0);
  const totalDescOtros = descOtros.reduce((a, x) => a + x.amount, 0);

  const afpCode = trace['AFP_10']?.inputs?.afpCode as string | undefined;
  const afpRateRow = snapshot.afpRates.find((r: any) => r.afpCode === afpCode);
  const afpTasaPct = afpRateRow ? `${(afpRateRow.totalWorkerRate * 100).toFixed(2)}%` : '11.00%';

  const saludNombre = trab.salud_tipo === 'isapre'
    ? (SALUD_NOMBRES[trab.salud_id] ?? 'Isapre')
    : 'FONASA';
  const saludDetalle = trab.salud_tipo === 'isapre' && trab.salud_plan_uf
    ? `${saludNombre} ${Number(trab.salud_plan_uf).toLocaleString('es-CL')} UF`
    : saludNombre;

  const empleadorNombre = dedupeLastWords(`${empData?.nombre ?? ''} ${empData?.apellido ?? ''}`.trim()) || 'Empleador';
  const trabajadorNombre = [trab.nombre, trab.apellido_paterno, trab.apellido_materno].filter(Boolean).join(' ');

  const data = {
    period,
    empleadorNombre,
    empleadorRut: formatRut(empData?.rut),
    trabajadorNombre,
    trabajadorRut: formatRut(trab.rut),
    cargo: trab.cargo ?? undefined,
    tipoContrato: TIPO_CONTRATO_LABEL[contrato.tipo_contrato] ?? (contrato.tipo_contrato ?? 'Indefinido'),
    fechaIngreso: fmtFecha(contrato.fecha_inicio),
    diasTrabajados: paidDays,
    horasExtras: horasExtraCount || undefined,
    sueldoBase: contrato.sueldo_base ?? 0,
    afpNombre: trab.afp_id ? (AFP_NOMBRES[trab.afp_id] ?? `AFP ${trab.afp_id}`) : '—',
    afpTasa: afpTasaPct,
    saludNombre,
    saludDetalle,
    ufValor: snapshot.ufPeriodEndValue,
    haberesImponibles: haberesImp,
    haberesNoImponibles: haberesNoImp,
    descuentosLegales: descLegales,
    otrosDescuentos: descOtros,
    totalHaberesImponibles: totalHaberesImp,
    totalHaberesNoImponibles: totalHaberesNoImp,
    totalDescuentosLegales: totalDescLegales,
    totalOtrosDescuentos: totalDescOtros,
    totalHaberes: totalHaberesImp + totalHaberesNoImp,
    totalDescuentos: totalDescLegales + totalDescOtros + (result.deduction_ccaf ?? 0),
    impPrevSalud: result.pension_base ?? 0,
    impCesantia: result.afc_base ?? result.pension_base ?? 0,
    baseTributable: result.income_tax_base ?? 0,
    netPay: result.net_pay ?? 0,
    pagadoAt: (result as any).pagado_at ?? null,
    medioPago: (result as any).medio_pago ?? null,
    referenciaPago: (result as any).referencia_pago ?? null,
    reciboFirmadoAt: (result as any).recibo_firmado_at ?? null,
  };

  const buffer = await renderToBuffer(
    React.createElement(LiquidacionDocument, { data }) as any,
  );

  const rut = trab.rut?.replace(/\./g, '').replace('-', '') ?? 'trab';
  const filename = `liquidacion_${period.replace('-', '')}_${rut}.pdf`;

  return { buffer: new Uint8Array(buffer.buffer), filename, workerName: trabajadorNombre };
}
