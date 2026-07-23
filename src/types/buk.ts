// ── Tipos BUK API (response shapes) ──

export interface BukEmployee {
  id: number;
  first_name: string;
  last_name: string;
  identification_number: string;
  position: { name: string };
  start_date: string;
  employment_status: 'active' | 'inactive';
  base_salary: number;
  contract_type?: string;
  email?: string;
  phone?: string;
  address?: string;
  afp?: string;
  health_plan?: string;
}

export interface BukPayrollProcess {
  id: number;
  period: string;
  status: string;
  created_at: string;
}

export interface BukPayrollItem {
  id: number;
  employee_id: number;
  period: string;
  gross_salary: number;
  net_salary: number;
  base_salary: number;
  overtime_pay: number;
  bonus: number;
  gratification: number;
  health_deduction: number;
  afp_deduction: number;
  unemployment_insurance: number;
  tax: number;
  other_deductions: number;
  total_earnings: number;
  total_deductions: number;
  status: string;
  payment_date: string | null;
}

export interface BukAbsenceRequest {
  id: number;
  employee_id: number;
  absence_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  observations?: string;
}

export interface BukBenefit {
  id: number;
  name: string;
  description: string;
  amount: number;
}

export interface BukEmployeeBenefit {
  id: number;
  employee_id: number;
  benefit_id: number;
  benefit: BukBenefit;
}

// ── Tipos Poppins (internos del front) ──

export interface PoppinsEmployee {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  rut: string;
  cargo: string;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo' | 'licencia';
  tipoContrato: string;
  sueldoBase: number;
  afp: string;
  salud: string;
  email: string;
  telefono: string;
  direccion: string;
  iniciales: string;
  color: string;
  empleador: string;
}

export interface PoppinsLiquidacion {
  id: number;
  empleadoId: number;
  periodo: string;
  sueldoBruto: number;
  sueldoBase: number;
  horasExtra: number;
  bonos: number;
  gratificacion: number;
  descSalud: number;
  descAfp: number;
  descCesantia: number;
  impuestoUnico: number;
  otrosDescuentos: number;
  totalHaberes: number;
  totalDescuentos: number;
  liquido: number;
  estado: string;
  fechaPago: string | null;
}

export interface PoppinsVacacion {
  id: number;
  empleadoId: number;
  tipo: string;
  inicio: string;
  fin: string;
  dias: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  observaciones: string;
}

export interface PoppinsBeneficio {
  id: number;
  nombre: string;
  descripcion: string;
  monto: number;
  icono: string;
  asignados: number[];
}
