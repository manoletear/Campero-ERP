// Validación de campos legales obligatorios para liquidar a un trabajador TCP.
// Se usa tanto en UI (badge + bloqueo de guardado) como en backend (cierre de
// período, ya cubierto adicionalmente por validacion-prevision.ts).

export interface TrabajadorParaValidar {
  rut?: string | null;
  nombre?: string | null;
  apellido_paterno?: string | null;
  fecha_nacimiento?: string | null;
  email?: string | null;
  direccion?: string | null;
  comuna?: string | null;
  region?: string | null;
  afp_id?: number | null;
  salud_id?: number | null;
  salud_tipo?: string | null;             // 'fonasa' | 'isapre'
  salud_plan_uf?: number | string | null;
  es_pensionado?: boolean | null;
  banco?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  payment_method?: string | null;         // 'transferencia' | 'efectivo' | 'cheque'
}

export interface CamposFaltantesTrabajador {
  faltantes: string[];   // labels human-readable
  campos: string[];      // nombres de columna en BD
  ok: boolean;
}

export function validarCamposTrabajador(t: TrabajadorParaValidar): CamposFaltantesTrabajador {
  const faltantes: string[] = [];
  const campos: string[] = [];

  const requerir = (cond: boolean, label: string, col: string) => {
    if (!cond) { faltantes.push(label); campos.push(col); }
  };

  // Identificación
  requerir(!!(t.rut?.trim()),              'RUT',                'rut');
  requerir(!!(t.nombre?.trim()),           'Nombre',             'nombre');
  requerir(!!(t.apellido_paterno?.trim()), 'Apellido paterno',   'apellido_paterno');
  requerir(!!t.fecha_nacimiento,           'Fecha de nacimiento','fecha_nacimiento');
  requerir(!!(t.email?.trim()),            'Email',              'email');

  // Dirección (Art. 10 CT)
  requerir(!!(t.direccion?.trim()),        'Dirección',          'direccion');
  requerir(!!(t.comuna?.trim()),           'Comuna',             'comuna');

  // Previsional — solo si NO es pensionado
  if (!t.es_pensionado) {
    requerir(t.afp_id != null,             'AFP',                'afp_id');
  }

  // Salud
  requerir(!!(t.salud_tipo),               'Tipo de salud (Fonasa/Isapre)', 'salud_tipo');
  if (t.salud_tipo === 'isapre') {
    requerir(t.salud_id != null,           'Isapre',             'salud_id');
    const plan = Number(t.salud_plan_uf ?? 0);
    requerir(plan > 0,                     'Plan Isapre (UF)',   'salud_plan_uf');
  } else if (t.salud_tipo === 'fonasa') {
    // salud_id puede ser el ID de Fonasa por default — si está nulo, también se requiere.
    requerir(t.salud_id != null,           'Institución de salud','salud_id');
  }

  // Pago — si el método es transferencia, banco/cuenta obligatorios.
  if (t.payment_method === 'transferencia') {
    requerir(!!(t.banco?.trim()),          'Banco',              'banco');
    requerir(!!(t.tipo_cuenta?.trim()),    'Tipo de cuenta',     'tipo_cuenta');
    requerir(!!(t.numero_cuenta?.trim()),  'Número de cuenta',   'numero_cuenta');
  }

  return { faltantes, campos, ok: faltantes.length === 0 };
}
