/**
 * Mock data para desarrollo sin BUK API.
 * Simula las respuestas reales de BUK.
 * Activar con USE_MOCK_DATA=true en .env.local
 */

import type { BukEmployee, BukPayrollItem, BukAbsenceRequest, BukBenefit } from '@/types/buk';

export const MOCK_EMPLOYEES: BukEmployee[] = [
  {
    id: 1,
    first_name: 'María',
    last_name: 'Martínez García',
    identification_number: '12.345.678-9',
    position: { name: 'Empleada de Casa Particular' },
    start_date: '2022-03-01',
    employment_status: 'active',
    base_salary: 500000,
    contract_type: 'Indefinido',
    email: 'mmartinez@gmail.com',
    phone: '+56 9 1234 5678',
    address: 'Av. Los Leones 432, Providencia',
    afp: 'Provida',
    health_plan: 'Fonasa',
  },
  {
    id: 2,
    first_name: 'Ana Lucía',
    last_name: 'López Silva',
    identification_number: '15.678.901-2',
    position: { name: 'Cuidadora de Adulto Mayor' },
    start_date: '2023-06-15',
    employment_status: 'active',
    base_salary: 450000,
    contract_type: 'Plazo Fijo',
    email: 'alopez@gmail.com',
    phone: '+56 9 2345 6789',
    address: 'Teatinos 890, Santiago',
    afp: 'Habitat',
    health_plan: 'Isapre Masvida',
  },
  {
    id: 3,
    first_name: 'Carmen',
    last_name: 'González Rojas',
    identification_number: '11.222.333-4',
    position: { name: 'Nana Puertas Adentro' },
    start_date: '2021-01-01',
    employment_status: 'active',
    base_salary: 520000,
    contract_type: 'Indefinido',
    email: 'cgonzalez@gmail.com',
    phone: '+56 9 3456 7890',
    address: 'Av. Grecia 1201, Ñuñoa',
    afp: 'Capital',
    health_plan: 'Fonasa',
  },
  {
    id: 4,
    first_name: 'Julia',
    last_name: 'Rodríguez Pérez',
    identification_number: '14.555.666-7',
    position: { name: 'Asistente de Hogar' },
    start_date: '2022-09-10',
    employment_status: 'active',
    base_salary: 480000,
    contract_type: 'Indefinido',
    email: 'jrodriguez@gmail.com',
    phone: '+56 9 4567 8901',
    address: "O'Higgins 567, Puente Alto",
    afp: 'Planvital',
    health_plan: 'Fonasa',
  },
  {
    id: 5,
    first_name: 'Rosa',
    last_name: 'Soto Fuentes',
    identification_number: '16.888.999-0',
    position: { name: 'Cocinera' },
    start_date: '2023-11-01',
    employment_status: 'active',
    base_salary: 550000,
    contract_type: 'Plazo Fijo',
    email: 'rsoto@gmail.com',
    phone: '+56 9 5678 9012',
    address: 'Av. Kennedy 4567, Las Condes',
    afp: 'Cuprum',
    health_plan: 'Isapre Cruz Blanca',
  },
];

export const MOCK_PAYROLL_ITEMS: BukPayrollItem[] = [
  {
    id: 1, employee_id: 1, period: '02-2026', gross_salary: 1213354,
    net_salary: 982608, base_salary: 500000, overtime_pay: 0, bonus: 0,
    gratification: 41667, health_deduction: 37917, afp_deduction: 51417,
    unemployment_insurance: 5500, tax: 0, other_deductions: 0,
    total_earnings: 1213354, total_deductions: 230746,
    status: 'paid', payment_date: '2026-02-28',
  },
  {
    id: 2, employee_id: 1, period: '01-2026', gross_salary: 646667,
    net_salary: 563667, base_salary: 500000, overtime_pay: 25000, bonus: 0,
    gratification: 41667, health_deduction: 30000, afp_deduction: 47500,
    unemployment_insurance: 5500, tax: 0, other_deductions: 0,
    total_earnings: 646667, total_deductions: 83000,
    status: 'paid', payment_date: '2026-01-31',
  },
  {
    id: 3, employee_id: 2, period: '02-2026', gross_salary: 567500,
    net_salary: 430500, base_salary: 450000, overtime_pay: 0, bonus: 0,
    gratification: 37500, health_deduction: 27000, afp_deduction: 42750,
    unemployment_insurance: 4950, tax: 0, other_deductions: 0,
    total_earnings: 567500, total_deductions: 80000,
    status: 'paid', payment_date: '2026-02-28',
  },
];

export const MOCK_ABSENCES: BukAbsenceRequest[] = [
  {
    id: 1, employee_id: 1, absence_type: 'vacation',
    start_date: '2026-02-10', end_date: '2026-02-21', days: 10,
    status: 'approved', observations: '',
  },
  {
    id: 2, employee_id: 2, absence_type: 'medical_leave',
    start_date: '2026-01-15', end_date: '2026-01-17', days: 3,
    status: 'approved', observations: 'Reposo médico',
  },
  {
    id: 3, employee_id: 3, absence_type: 'vacation',
    start_date: '2026-03-01', end_date: '2026-03-07', days: 5,
    status: 'pending', observations: '',
  },
  {
    id: 4, employee_id: 5, absence_type: 'personal_leave',
    start_date: '2026-02-28', end_date: '2026-02-28', days: 1,
    status: 'pending', observations: 'Trámite personal',
  },
];

export const MOCK_BENEFITS: BukBenefit[] = [
  { id: 1, name: 'Seguro complementario', description: 'Cobertura adicional de salud', amount: 15000 },
  { id: 2, name: 'Bono movilización', description: 'Transporte mensual garantizado', amount: 25000 },
  { id: 3, name: 'Colación', description: 'Bono de alimentación diario', amount: 45000 },
  { id: 4, name: 'Regalo de cumpleaños', description: 'Detalle especial cada año', amount: 5000 },
];
