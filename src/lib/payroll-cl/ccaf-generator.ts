// Generador de archivo de pago CCAF.
//
// Cada CCAF tiene su propio formato físico de planilla. Para v1 emitimos un
// CSV resumen estándar Poppins con todas las líneas necesarias para conciliar
// con la CCAF (RUT trabajador, imponible, aporte empleador, desgloses).
// La CCAF receptora típicamente acepta este CSV o requiere convertir a su
// formato propio (Los Andes, La Araucana, Los Héroes tienen plantillas
// distintas — se pueden agregar adapters después).

export interface CcafPayrollRow {
  workerRut: string;
  workerNombre: string;
  workerApellidoPaterno: string;
  workerApellidoMaterno?: string | null;
  pensionBase: number;        // base imponible
  aporteEmpleador: number;    // 0.6% × pensionBase
  credito: number;
  dental: number;
  leasing: number;
  seguroVida: number;
  otros: number;
}

export interface CcafFileInput {
  period: string;             // 'YYYY-MM'
  ccafCodigo: string;         // 'losandes' | 'laaraucana' | 'losheroes'
  ccafNombre: string;
  empleadorRut: string;
  empleadorNombre: string;
  rows: CcafPayrollRow[];
}

const HEADER = [
  'RUT_TRABAJADOR',
  'NOMBRE',
  'APELLIDO_PATERNO',
  'APELLIDO_MATERNO',
  'RENTA_IMPONIBLE',
  'APORTE_EMPLEADOR_06',
  'CREDITO_SOCIAL',
  'DENTAL',
  'LEASING',
  'SEGURO_VIDA',
  'OTROS_DESCUENTOS',
  'TOTAL_DESCUENTOS',
  'TOTAL_LINEA',
] as const;

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  return /[;\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function generateCcafFile(input: CcafFileInput): {
  filename: string;
  content: string;
  totales: {
    rentaImponible: number;
    aporteEmpleador: number;
    descuentos: number;
    totalLinea: number;
  };
} {
  const lines: string[] = [];

  // Cabecera con info empleador (para conciliar planilla con CCAF)
  lines.push(`# CCAF=${input.ccafNombre};PERIODO=${input.period};EMPLEADOR=${input.empleadorRut};NOMBRE=${csvEscape(input.empleadorNombre)}`);
  lines.push(HEADER.join(';'));

  let totalImp = 0, totalApo = 0, totalDesc = 0, totalLin = 0;

  for (const r of input.rows) {
    const descuentos = r.credito + r.dental + r.leasing + r.seguroVida + r.otros;
    const totalLinea = r.aporteEmpleador + descuentos;
    totalImp += r.pensionBase;
    totalApo += r.aporteEmpleador;
    totalDesc += descuentos;
    totalLin += totalLinea;

    lines.push([
      csvEscape(r.workerRut),
      csvEscape(r.workerNombre),
      csvEscape(r.workerApellidoPaterno),
      csvEscape(r.workerApellidoMaterno || ''),
      r.pensionBase,
      r.aporteEmpleador,
      r.credito,
      r.dental,
      r.leasing,
      r.seguroVida,
      r.otros,
      descuentos,
      totalLinea,
    ].join(';'));
  }

  // Fila TOTAL
  lines.push([
    'TOTAL', '', '', '',
    totalImp, totalApo, '', '', '', '', '', totalDesc, totalLin,
  ].join(';'));

  const filename = `CCAF_${input.ccafCodigo}_${input.empleadorRut.replace(/[^0-9kK]/g, '')}_${input.period.replace('-', '')}.csv`;

  return {
    filename,
    content: lines.join('\r\n') + '\r\n',
    totales: {
      rentaImponible: totalImp,
      aporteEmpleador: totalApo,
      descuentos: totalDesc,
      totalLinea: totalLin,
    },
  };
}
