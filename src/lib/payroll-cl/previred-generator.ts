// Generador de archivo Previred — Formato LARGO_VARIABLE_SEPARADOR v82 (105 campos)
// Ref: https://www.previred.com/formatos-de-carga
// Separador: ';'  Encoding: ISO-8859-1  Sin línea de cabecera.
// Solo se implementan los campos relevantes para TCP (trabajadores de casa particular).

export interface PreviredRowInput {
  /** Período del archivo, ej: '2026-05' */
  period: string;

  // ── Empleador ──────────────────────────────────────────────────────────────
  empleadorRut: string; // '12345678-9'

  // ── Trabajador ─────────────────────────────────────────────────────────────
  workerRut: string;
  workerNombre: string;
  workerApellidoPaterno: string;
  workerApellidoMaterno?: string | null;
  workerSexo?: 'M' | 'F' | null;
  workerFechaNacimiento?: string | null; // ISO 'YYYY-MM-DD'
  workerNacionalidad?: number | null;    // 56 = Chile

  // ── Contrato ───────────────────────────────────────────────────────────────
  contractType: 'I' | 'P'; // Indefinido | Plazo fijo
  isPensioner: boolean;
  /** Código AFP en Previred (01=Capital, 02=Cuprum, 03=Hábitat,
   *  04=PlanVital, 05=Provida, 08=Modelo, 09=Uno). 0 si exento. */
  afpPreviredCode: number;
  /** Código salud (007=FONASA, 001=Banmédica, 002=Colmena, 003=Consalud,
   *  004=Cruz Blanca, 005=Nueva MásVida, 008=Vida Tres). */
  healthPreviredCode: number;
  /** Código mutual (01=ACHS, 02=MUTUAL CChC, 03=IST). Default 01. */
  mutualPreviredCode?: number;

  // ── Bases imponibles (desde PayrollResult) ─────────────────────────────────
  pensionBase: number;
  afcBase: number;
  healthBase: number;
  mutualBase: number;

  // ── Montos calculados ──────────────────────────────────────────────────────
  afp10: number;            // Cotización obligatoria AFP (10%)
  afpCommission: number;    // Comisión AFP
  sis: number;              // SIS empleador
  health7: number;          // Cotización salud 7%
  healthAdicional: number;  // Diferencia plan ISAPRE (0 si FONASA)
  afcTrabajador: number;    // AFC trabajador
  afcEmpleador: number;     // AFC empleador
  atep: number;             // Mutual/ATEP empleador

  workedDays: number;

  // ── Asignación familiar ────────────────────────────────────────────────────
  familyAllowanceTranche: string; // 'A'|'B'|'C'|'D'|''
  familyAllowanceCount: number;
  familyAllowanceAmount: number;

  // ── Movimiento personal ────────────────────────────────────────────────────
  /** 0=sin movimiento, 1=contratación, 2=retiro, 7=licencia médica, etc. */
  movimientoPersonal?: number;
  /** ISO date de la novedad, si corresponde */
  fechaMovimiento?: string | null;

  // ── CCAF ──────────────────────────────────────────────────────────────────
  /** Código Previred CCAF ('01','02','03'); vacío si no hay afiliación. */
  ccafCodigoPrevired?: string | null;
  /** Aporte empleador 0.6% del imponible. */
  ccafAporte?: number;
  /** Descuentos trabajador por tipo. */
  ccafCredito?: number;
  ccafDental?: number;
  ccafLeasing?: number;
  ccafSeguroVida?: number;
  ccafOtros?: number;
}

// ── AFP: texto del engine → código Previred ────────────────────────────────
const AFP_CODE: Record<string, number> = {
  capital: 1, cuprum: 2, habitat: 3, planvital: 4,
  provida: 5, modelo: 8, uno: 9,
};
export function afpCodeToPrevired(code: string): number {
  return AFP_CODE[code.toLowerCase()] ?? 1;
}

// ── Salud: salud_id DB o salud_tipo → código Previred ─────────────────────
const HEALTH_CODE_BY_DB_ID: Record<number, number> = {
  13: 7,   // FONASA
  8: 1,    // Banmédica
  9: 2,    // Colmena
  10: 3,   // Consalud
  11: 4,   // Cruz Blanca
  12: 5,   // Nueva MásVida
  32: 8,   // Vida Tres
  33: 50,  // Esencial
};
export function saludIdToPrevired(saludId: number | null, saludTipo: string): number {
  if (saludId && HEALTH_CODE_BY_DB_ID[saludId]) return HEALTH_CODE_BY_DB_ID[saludId];
  return saludTipo === 'isapre' ? 1 : 7; // default FONASA=7
}

// ── Helpers de formato ─────────────────────────────────────────────────────
function padRut(rut: string): string {
  // Normalizar: quitar puntos, asegurar guión
  const clean = rut.replace(/\./g, '').replace(/[^0-9kK-]/g, '');
  if (!clean.includes('-')) return clean;
  return clean;
}
function periodToAAAMM(period: string): string {
  return period.replace('-', ''); // '2026-05' → '202605'
}
function dateToddMMAAAA(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}${m}${y}`;
}
function n(v: number, len = 9): string {
  return v === 0 ? '0' : String(Math.round(v));
}
function trunc(s: string, len: number): string {
  return (s || '').substring(0, len);
}

// ── Función principal ──────────────────────────────────────────────────────
export function generatePreviredLines(rows: PreviredRowInput[]): string {
  return rows.map(buildLine).join('\r\n') + '\r\n';
}

function buildLine(r: PreviredRowInput): string {
  const aaaamm = periodToAAAMM(r.period);
  const mutual = r.mutualPreviredCode ?? 1;

  // Tipo trabajador Previred campo 52: 0=Activo, 1=Pensionado, 2=Exento AFP
  const tipoTrabajador = r.isPensioner ? 1 : 0;

  // Cotización AFP campo 14 = 10% + comisión (total que va a la AFP)
  const afpCot = r.afp10 + r.afpCommission;

  const f: (string | number)[] = [
    /* 01 */ padRut(r.empleadorRut),
    /* 02 */ padRut(r.workerRut),
    /* 03 */ aaaamm,
    /* 04 */ trunc(r.workerNombre, 40),
    /* 05 */ trunc(r.workerApellidoPaterno, 40),
    /* 06 */ trunc(r.workerApellidoMaterno || '', 40),
    /* 07 */ r.workerSexo || '',
    /* 08 */ dateToddMMAAAA(r.workerFechaNacimiento),
    /* 09 */ r.workerNacionalidad ?? 56,
    /* 10 */ 1, // Tipo de pago: 1=Normal
    /* 11 */ aaaamm,
    /* 12 */ r.isPensioner ? 0 : String(r.afpPreviredCode).padStart(2, '0'),
    /* 13 */ n(r.pensionBase),
    /* 14 */ n(afpCot),
    /* 15 */ n(r.sis),
    /* 16 */ 0, // APV Régimen A
    /* 17 */ 0, // Renta imponible IPS (ex-INP, sector público)
    /* 18 */ 0, // Cotización IPS
    /* 19 */ 0, // Renta imponible desahucio
    /* 20 */ String(r.healthPreviredCode).padStart(3, '0'),
    /* 21 */ n(r.healthBase),
    /* 22 */ n(r.health7),
    /* 23 */ n(r.healthAdicional),
    /* 24 */ String(mutual).padStart(2, '0'),
    /* 25 */ n(r.mutualBase),
    /* 26 */ n(r.atep),
    /* 27 */ r.ccafCodigoPrevired || 0,                                 // Código CCAF (00 si no afiliado)
    /* 28 */ r.ccafCodigoPrevired ? n(r.pensionBase) : 0,               // Renta imponible CCAF (= pensionBase)
    /* 29 */ n(r.ccafCredito ?? 0),                                     // Créditos personales CCAF
    /* 30 */ n(r.ccafDental ?? 0),                                      // Descuento dental CCAF
    /* 31 */ n(r.ccafLeasing ?? 0),                                     // Descuento leasing CCAF
    /* 32 */ n(r.ccafSeguroVida ?? 0),                                  // Descuento seguro de vida CCAF
    /* 33 */ n(r.ccafOtros ?? 0),                                       // Otros descuentos CCAF
    /* 34 */ n(r.ccafAporte ?? 0),                                      // Cotización CCAF (aporte empleador)
    /* 35 */ 0,  // Código sucursal mutual
    /* 36 */ r.movimientoPersonal ?? 0,
    /* 37 */ r.fechaMovimiento ? dateToddMMAAAA(r.fechaMovimiento) : '',
    /* 38 */ r.familyAllowanceTranche || '',
    /* 39 */ r.familyAllowanceCount,
    /* 40 */ 0,  // Cargas maternales
    /* 41 */ 0,  // Cargas invalidez
    /* 42 */ n(r.familyAllowanceAmount),
    /* 43 */ 0,  // AF retroactiva
    /* 44 */ 0,  // Reintegro cargas
    /* 45 */ 'N', // Trabajador joven
    /* 46 */ '01', // Código AFC Chile
    /* 47 */ n(r.afcBase),
    /* 48 */ n(r.afcTrabajador),
    /* 49 */ n(r.afcEmpleador),
    /* 50 */ r.contractType,
    /* 51 */ r.workedDays,
    /* 52 */ tipoTrabajador,
    /* 53 */ 0,  // Código APVI
    /* 54 */ 0,  // Monto APVI
    /* 55 */ 0,  // Código APVC
    /* 56 */ 0,  // Monto APVC trabajador
    /* 57 */ 0,  // Monto APVC empleador
    /* 58 */ '', // RUT pagadora subsidio
    /* 59 */ 0,  // Renta imponible subsidio
    /* 60 */ '', // Tasa pactada salud
    /* 61 */ 0,  // APV Régimen B
    /* 62 */ '', // Forma APV
    /* 63 */ 0,  // Cotización desahucio
    /* 64 */ 0,  // Cot. FONASA/ISAPRE independiente
    /* 65 */ '', // Tasa cotización SIS
    // Campos 66-105: vacíos para compatibilidad con formato v82 (105 campos)
    ...Array(40).fill(''),
  ];

  return f.join(';');
}

// ── Encode a ISO-8859-1 Buffer ─────────────────────────────────────────────
export function encodeIso88591(text: string): Buffer {
  const bytes: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    bytes.push(cp <= 0xFF ? cp : 0x3F); // '?' para fuera de rango
  }
  return Buffer.from(bytes);
}
