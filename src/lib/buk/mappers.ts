/**
 * Mappers BUK API → Poppins
 * Transforma los shapes de BUK al modelo interno de Poppins.
 */

import type {
  BukEmployee,
  BukPayrollItem,
  BukAbsenceRequest,
  PoppinsEmployee,
  PoppinsLiquidacion,
  PoppinsVacacion,
} from '@/types/buk';

const COLORS = ['#1B1564', '#F0197A', '#059669', '#7C3AED', '#D97706', '#2563EB'];

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getColor(name: string): string {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function mapEstado(status: string): 'activo' | 'inactivo' | 'licencia' {
  switch (status) {
    case 'active': return 'activo';
    case 'inactive': return 'inactivo';
    case 'medical_leave': return 'licencia';
    default: return 'inactivo';
  }
}

function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Employee Mapper ──

export function mapBukEmployee(buk: BukEmployee): PoppinsEmployee {
  const firstName = buk.first_name || '';
  const lastName = buk.last_name || '';
  return {
    id: buk.id,
    nombre: firstName,
    apellido: lastName,
    nombreCompleto: `${lastName}, ${firstName}`,
    rut: buk.identification_number || '',
    cargo: buk.position?.name || 'Sin cargo',
    fechaIngreso: formatDate(buk.start_date),
    estado: mapEstado(buk.employment_status),
    tipoContrato: buk.contract_type || 'Indefinido',
    sueldoBase: buk.base_salary || 0,
    afp: buk.afp || '',
    salud: buk.health_plan || 'Fonasa',
    email: buk.email || '',
    telefono: buk.phone || '',
    direccion: buk.address || '',
    iniciales: getInitials(firstName, lastName),
    color: getColor(`${firstName}${lastName}`),
    empleador: '', // se resuelve por contrato/empleador real (no hardcode)
  };
}

export function mapBukEmployees(bukEmployees: BukEmployee[]): PoppinsEmployee[] {
  return bukEmployees.map(mapBukEmployee);
}

// ── Payroll Mapper ──

export function mapBukPayrollItem(buk: BukPayrollItem): PoppinsLiquidacion {
  return {
    id: buk.id,
    empleadoId: buk.employee_id,
    periodo: buk.period,
    sueldoBruto: buk.gross_salary || 0,
    sueldoBase: buk.base_salary || 0,
    horasExtra: buk.overtime_pay || 0,
    bonos: buk.bonus || 0,
    gratificacion: buk.gratification || 0,
    descSalud: buk.health_deduction || 0,
    descAfp: buk.afp_deduction || 0,
    descCesantia: buk.unemployment_insurance || 0,
    impuestoUnico: buk.tax || 0,
    otrosDescuentos: buk.other_deductions || 0,
    totalHaberes: buk.total_earnings || 0,
    totalDescuentos: buk.total_deductions || 0,
    liquido: buk.net_salary || 0,
    estado: buk.status === 'paid' ? 'Pagado' : 'Pendiente',
    fechaPago: buk.payment_date ? formatDate(buk.payment_date) : null,
  };
}

export function mapBukPayrollItems(items: BukPayrollItem[]): PoppinsLiquidacion[] {
  return items.map(mapBukPayrollItem);
}

// ── Absence Mapper ──

const TIPO_AUSENCIA: Record<string, string> = {
  vacation: 'vacaciones',
  medical_leave: 'licencia_medica',
  personal_leave: 'permiso',
  maternity_leave: 'prenatal',
  paternity_leave: 'postnatal',
};

function mapEstadoAusencia(status: string): 'pendiente' | 'aprobada' | 'rechazada' {
  switch (status) {
    case 'approved': return 'aprobada';
    case 'rejected': return 'rechazada';
    default: return 'pendiente';
  }
}

export function mapBukAbsence(buk: BukAbsenceRequest): PoppinsVacacion {
  return {
    id: buk.id,
    empleadoId: buk.employee_id,
    tipo: TIPO_AUSENCIA[buk.absence_type] || buk.absence_type,
    inicio: formatDate(buk.start_date),
    fin: formatDate(buk.end_date),
    dias: buk.days,
    estado: mapEstadoAusencia(buk.status),
    observaciones: buk.observations || '',
  };
}

export function mapBukAbsences(absences: BukAbsenceRequest[]): PoppinsVacacion[] {
  return absences.map(mapBukAbsence);
}
