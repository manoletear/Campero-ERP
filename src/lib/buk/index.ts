/**
 * Service Layer — Punto de entrada único para datos.
 *
 * Prioridad:
 * 1. USE_MOCK_DATA=true → mock data (dev sin conexiones)
 * 2. Supabase (si hay datos en DB) → lectura local
 * 3. BUK SDK → fetch remoto tipado
 */

import { getBukSDK } from '@/lib/buk-sdk';
import type { BukEmployeeSummary } from '@/lib/buk-sdk/types/employees';
import { mapBukEmployees, mapBukPayrollItems, mapBukAbsences } from './mappers';
import { MOCK_EMPLOYEES, MOCK_PAYROLL_ITEMS, MOCK_ABSENCES, MOCK_BENEFITS } from './mock-data';
// Legacy BUK types - these map to the old English-named schema
// The actual DB tables are in Spanish (trabajadores, liquidaciones, etc.)
type Employee = Record<string, any>;
type Payroll = Record<string, any>;
type Absence = Record<string, any>;
type Benefit = Record<string, any>;
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const useMock = process.env.USE_MOCK_DATA === 'true';

/** Cliente service-role para la caché de Buk (bypassa RLS). null si falta env. */
function bukCacheClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

// ── Helper: mapear BukEmployeeSummary → PoppinsEmployee shape ──

function mapSdkEmployee(emp: BukEmployeeSummary) {
  return {
    id: emp.id,
    nombre: emp.first_name || '',
    apellido: emp.last_name || '',
    nombreCompleto: emp.full_name || `${emp.first_name} ${emp.last_name}`,
    rut: emp.rut || '',
    cargo: emp.current_job?.role?.name || 'Sin cargo',
    fechaIngreso: emp.current_job?.start_date || '',
    estado: emp.active ? 'activo' as const : 'inactivo' as const,
    tipoContrato: 'Indefinido',
    sueldoBase: 0,
    afp: '',
    salud: '',
    email: emp.email || '',
    telefono: emp.phone || '',
    direccion: '',
    iniciales: `${(emp.first_name || ' ')[0]}${(emp.last_name || ' ')[0]}`.toUpperCase(),
    color: `hsl(${((emp.first_name || '').charCodeAt(0) * 137) % 360}, 60%, 45%)`,
    empleador: emp.current_job?.company?.name || '',
  };
}

// ── Employees ──

export async function getEmployees() {
  if (useMock) {
    return mapBukEmployees(MOCK_EMPLOYEES);
  }

  // Intentar Supabase primero
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('nombre');

    const rows = data as unknown as Employee[] | null;
    if (!error && rows && rows.length > 0) {
      return rows.map(emp => ({
        id: emp.buk_id ?? 0,
        nombre: emp.nombre,
        apellido: emp.apellido,
        nombreCompleto: `${emp.nombre} ${emp.apellido}`,
        rut: emp.rut,
        cargo: emp.cargo,
        fechaIngreso: emp.fecha_ingreso,
        estado: emp.estado as 'activo' | 'inactivo' | 'licencia',
        tipoContrato: emp.tipo_contrato,
        sueldoBase: emp.sueldo_base,
        afp: emp.afp ?? '',
        salud: emp.salud ?? '',
        email: emp.email ?? '',
        telefono: emp.telefono ?? '',
        direccion: emp.direccion ?? '',
        iniciales: `${emp.nombre[0]}${emp.apellido[0]}`.toUpperCase(),
        color: `hsl(${(emp.nombre.charCodeAt(0) * 137) % 360}, 60%, 45%)`,
        empleador: '',
      }));
    }
  } catch {
    // Supabase no disponible, seguir con BUK SDK
  }

  // Fallback: BUK SDK
  const sdk = getBukSDK();
  const response = await sdk.employees.listActive();
  return response.data.map(mapSdkEmployee);
}

export async function getEmployee(id: number) {
  if (useMock) {
    const emp = MOCK_EMPLOYEES.find(e => e.id === id);
    if (!emp) throw new Error(`Employee ${id} not found`);
    return mapBukEmployees([emp])[0];
  }

  const sdk = getBukSDK();
  const e = (await sdk.employees.get(id)) as any;
  const cj = e.current_job || {};
  const str = (v: any) => (typeof v === 'string' ? v : v?.name) || '';
  return {
    id: e.id,
    nombre: e.first_name || '',
    apellido: e.surname || e.last_name || '',
    apellidoMaterno: e.second_surname || '',
    nombreCompleto: e.full_name || `${e.first_name || ''} ${e.surname || ''}`.trim(),
    rut: e.rut || e.document_number || '',
    cargo: cj.role?.name || cj.position?.name || cj.area?.name || cj.name || 'Sin cargo',
    fechaIngreso: e.active_since || e.hire_date || cj.start_date || '',
    estado: (e.status === 'activo' || e.active === true || (!e.active_until && e.active_since)) ? 'activo' as const : 'inactivo' as const,
    tipoContrato: cj.contract_type || cj.type || e.contract_type || 'Indefinido',
    sueldoBase: Number(cj.base_wage ?? cj.liquid_wage ?? cj.salary ?? cj.base_salary ?? cj.assignable_salary ?? e.base_salary ?? 0) || 0,
    afp: str(e.pension_fund) || str(e.afp),
    salud: str(e.health_company) || str(e.health_plan) || 'Fonasa',
    saludPlanUf: Number(e.health_plan_uf ?? e.health_plan?.uf ?? 0) || 0,
    email: e.email || e.personal_email || '',
    telefono: e.phone || e.office_phone || '',
    direccion: e.address || e.street || '',
    iniciales: `${(e.first_name || ' ')[0]}${(e.surname || ' ')[0]}`.toUpperCase(),
    color: `hsl(${((e.first_name || '').charCodeAt(0) * 137) % 360}, 60%, 45%)`,
    empleador: cj.company?.name || '',
    // Extras para importación
    sexo: e.gender || '',
    fechaNacimiento: e.birthday || '',
    estadoCivil: e.civil_status || '',
    nacionalidad: e.nationality || '',
    comuna: e.district || '',
    region: e.region || '',
    banco: str(e.bank),
    tipoCuenta: e.account_type || '',
    numeroCuenta: e.account_number || '',
    cargas: Array.isArray(e.family_responsabilities) ? e.family_responsabilities.length : 0,
    // Datos previsionales / laborales adicionales (Buk)
    apellidoPaterno: e.surname || '',
    codigoFicha: e.code_sheet || '',
    emailPersonal: e.personal_email || '',
    regimenPrevisional: e.pension_regime || '',
    seguroCesantia: e.afc || '',
    metodoPago: e.payment_method || '',
    periodoPago: e.payment_period || cj.periodicity || '',
    anticipo: e.advance_payment || '',
    monedaPago: e.payment_currency || cj.currency_code || 'CLP',
    inicioVacacionesProgresivas: e.progressive_vacations_start || '',
    jubilado: e.retired === true,
    // Contrato (current_job)
    horasSemanales: Number(cj.weekly_hours) || 0,
    tipoJornada: cj.working_schedule_type || '',
    fechaInicioContrato: cj.start_date || '',
    fechaTerminoContrato: cj.end_date || cj.contract_finishing_date_1 || null,
    fechaSuscripcion: cj.contract_subscription_date || '',
    centroCosto: cj.cost_center || '',
    jefe: cj.boss?.full_name || cj.boss?.rut || '',
    gratificacionLegal: cj.reward === true,
    diasTrabajo: Array.isArray(cj.days) ? cj.days.length : 0,
    // Cargas familiares (tramo)
    tramoAsignacion: (Array.isArray(e.family_responsabilities) && e.family_responsabilities[0]?.family_allowance_section) || '',
  };
}

// ── Payroll ──

export async function getPayrollItems(employeeId?: number) {
  if (useMock) {
    const items = employeeId
      ? MOCK_PAYROLL_ITEMS.filter(i => i.employee_id === employeeId)
      : MOCK_PAYROLL_ITEMS;
    return mapBukPayrollItems(items);
  }

  // Caché Supabase (buk_payroll_cache): rápida y resiliente si Buk cae. Frescura 12h.
  const cache = bukCacheClient();
  const TTL_MS = 12 * 60 * 60 * 1000;
  if (cache) {
    try {
      let q = cache.from('buk_payroll_cache').select('data, synced_at').order('periodo', { ascending: false });
      if (employeeId) q = q.eq('employee_id', employeeId);
      const { data, error } = await q;
      if (!error && data && data.length > 0) {
        const fresca = data.every((r: { synced_at: string }) => Date.now() - new Date(r.synced_at).getTime() < TTL_MS);
        if (fresca) return data.map((r: { data: unknown }) => r.data);
      }
    } catch { /* caché no disponible, seguir con Buk */ }
  }

  // Fallback: BUK API /accounting?month&year — un grupo por empleado/mes con líneas contables.
  // (El endpoint /payroll_processes no existe en estas instancias; /process solo trae cabecera.)
  const token = process.env.BUK_API_TOKEN || '';
  const base = process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1/chile';
  const now = new Date();
  const sum = (arr: { amount?: number }[]) => arr.reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const isEmployerCost = (d: string) => /empleador|mutual/i.test(d); // costos del empleador, no del trabajador
  // Los 12 meses en paralelo (cada uno pagina /accounting). ~12× más rápido que en serie.
  const porMes = await Promise.all(Array.from({ length: 12 }, async (_unused, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = dt.getMonth() + 1;
    const year = dt.getFullYear();
    const groups: { id: number; items?: { description: string; amount: number; entry_type: string }[] }[] = [];
    try {
      // /accounting pagina: hay que recorrer todas las páginas o se pierden los empleados de la pág. 2+.
      let page = 1, totalPages = 1;
      do {
        const r = await fetch(`${base}/accounting?month=${month}&year=${year}&page=${page}&page_size=100`, { headers: { auth_token: token, Accept: 'application/json' } });
        if (!r.ok) break;
        const j = await r.json();
        if (Array.isArray(j?.data)) groups.push(...j.data);
        totalPages = Number(j?.pagination?.total_pages) || 1;
        page++;
      } while (page <= totalPages);
    } catch { return []; }

    const mesOut: Record<string, unknown>[] = [];
    for (const g of groups) {
      // No filtramos por employeeId aquí: procesamos todos para calentar la caché completa en un barrido.
      const items = g.items || [];
      const amt = (re: RegExp) => { const it = items.find(x => re.test(x.description) && x.entry_type === 'credit'); return it ? Number(it.amount) || 0 : 0; };
      const haber = (re: RegExp) => { const it = items.find(x => re.test(x.description) && x.entry_type === 'debit'); return it ? Number(it.amount) || 0 : 0; };
      const haberes = items.filter(x => x.entry_type === 'debit' && !isEmployerCost(x.description));
      const descuentos = items.filter(x => x.entry_type === 'credit' && !/l[ií]quido/i.test(x.description) && !isEmployerCost(x.description));
      const liquidoItem = items.find(x => /l[ií]quido/i.test(x.description));
      const totalHaberes = sum(haberes);
      const totalDescuentos = sum(descuentos);
      mesOut.push({
        id: g.id * 100 + i,
        empleadoId: g.id,
        periodo: `${year}-${String(month).padStart(2, '0')}`,
        sueldoBruto: totalHaberes,
        sueldoBase: haber(/sueldo base/i),
        horasExtra: haber(/hora.*extra|sobretiempo/i),
        bonos: haber(/bono/i),
        gratificacion: haber(/gratificaci/i),
        descSalud: amt(/isapre|fonasa|salud/i),
        descAfp: amt(/previsi|afp/i),
        descCesantia: (items.find(x => x.entry_type === 'credit' && /cesant/i.test(x.description) && !isEmployerCost(x.description))?.amount) || 0,
        impuestoUnico: amt(/impuesto/i),
        otrosDescuentos: 0,
        totalHaberes,
        totalDescuentos,
        liquido: liquidoItem ? Number(liquidoItem.amount) || 0 : totalHaberes - totalDescuentos,
        estado: 'Pagado',
        fechaPago: null,
        items,
      });
    }
    return mesOut;
  }));
  const result = porMes.flat();

  // Persistir el barrido completo en la caché (no bloquea el return si falla).
  if (cache && result.length > 0) {
    try {
      const rows = result.map((l) => ({
        employee_id: Number(l.empleadoId),
        periodo: String(l.periodo),
        data: l,
        synced_at: new Date().toISOString(),
      }));
      await cache.from('buk_payroll_cache').upsert(rows, { onConflict: 'employee_id,periodo' });
    } catch { /* persistencia best-effort */ }
  }

  return employeeId ? result.filter((l) => Number(l.empleadoId) === employeeId) : result;
}

// ── Absences ──

export async function getAbsences(employeeId?: number) {
  if (useMock) {
    const items = employeeId
      ? MOCK_ABSENCES.filter(a => a.employee_id === employeeId)
      : MOCK_ABSENCES;
    return mapBukAbsences(items);
  }

  // Intentar Supabase
  try {
    const supabase = await createClient();
    let query = supabase.from('absences').select('*').order('fecha_inicio', { ascending: false });
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    const { data, error } = await query;

    const rows = data as unknown as Absence[] | null;
    if (!error && rows && rows.length > 0) {
      return rows.map(a => ({
        id: a.buk_id ?? 0,
        empleadoId: 0,
        tipo: a.tipo,
        inicio: a.fecha_inicio,
        fin: a.fecha_fin,
        dias: a.dias,
        estado: a.estado === 'aprobada' ? 'aprobada' as const
          : a.estado === 'rechazada' ? 'rechazada' as const
          : 'pendiente' as const,
        observaciones: a.observaciones ?? '',
      }));
    }
  } catch {
    // Supabase no disponible
  }

  // Fallback: BUK SDK
  const sdk = getBukSDK();
  const response = await sdk.absences.listAbsences(
    employeeId ? { employee_id: employeeId } : undefined
  );
  return response.data.map(a => ({
    id: a.id,
    empleadoId: a.employee_id,
    tipo: a.absence_subtype || a.absence_type,
    inicio: a.start_date,
    fin: a.end_date,
    dias: a.days,
    estado: a.status === 'approved' ? 'aprobada' as const
      : a.status === 'rejected' ? 'rechazada' as const
      : 'pendiente' as const,
    observaciones: a.observations || '',
  }));
}

export async function createAbsence(absenceData: Record<string, unknown>) {
  if (useMock) {
    return { success: true, id: Date.now() };
  }

  // Escribir en Supabase
  try {
    const supabase = await createClient();
    const insertData = {
      employee_id: absenceData.employee_id as string,
      tipo: absenceData.tipo as string,
      fecha_inicio: absenceData.fecha_inicio as string,
      fecha_fin: absenceData.fecha_fin as string,
      dias: absenceData.dias as number,
    };
    const { data: inserted, error } = await supabase
      .from('absences')
      .insert(insertData as never)
      .select()
      .single();

    if (!error && inserted) {
      const row = inserted as unknown as Absence;
      return { success: true, id: row.id };
    }
  } catch {
    // Fallback
  }

  return { success: false, error: 'Absence creation requires Supabase or specific SDK method' };
}

// ── Benefits ──

export async function getBenefits() {
  if (useMock) {
    return MOCK_BENEFITS;
  }

  // Intentar Supabase
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('benefits')
      .select('*')
      .eq('activo', true);

    const rows = data as unknown as Benefit[] | null;
    if (!error && rows && rows.length > 0) {
      return rows.map(b => ({
        id: 0,
        name: b.nombre,
        description: b.descripcion ?? '',
        amount: b.monto,
      }));
    }
  } catch {
    // Supabase no disponible
  }

  return [];
}


export async function getVacations(employeeId: number) {
  const token = process.env.BUK_API_TOKEN || '';
  const base = process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1/chile';
  try {
    const r = await fetch(`${base}/vacations?employee_id=${employeeId}`, { headers: { auth_token: token, Accept: 'application/json' } });
    if (!r.ok) return [];
    const j: any = await r.json();
    // El endpoint de Buk IGNORA el filtro employee_id (devuelve todas las vacaciones de la empresa),
    // asi que filtramos client-side por el employee_id real de cada registro.
    return (j?.data || [])
      .filter((v: any) => Number(v.employee_id) === Number(employeeId))
      .map((v: any) => ({ inicio: v.start_date, fin: v.end_date, dias: v.working_days ?? v.calendar_days, estado: v.status, tipo: v.type }));
  } catch { return []; }
}

export async function getMedicalLicenses(employeeId: number) {
  const token = process.env.BUK_API_TOKEN || '';
  const base = process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1/chile';
  const esLicencia = (v: any) => {
    const t = `${v.absence_type || ''} ${v.absence_subtype || ''} ${v.subtype || ''} ${v.type || ''} ${v.tipo || ''}`.toLowerCase();
    return /licen|m[eé]dic|enferm|isapre|reposo|accident|salud/.test(t) || v.absence_type === 'license';
  };
  try {
    const r = await fetch(`${base}/absences?employee_id=${employeeId}`, { headers: { auth_token: token, Accept: 'application/json' } });
    if (!r.ok) return [];
    const j: any = await r.json();
    // El endpoint suele ignorar el filtro employee_id; filtramos client-side y nos quedamos con licencias.
    return (j?.data || [])
      .filter((v: any) => Number(v.employee_id) === Number(employeeId))
      .filter(esLicencia)
      .map((v: any) => ({
        inicio: v.start_date || v.fecha_inicio || v.from || null,
        fin: v.end_date || v.fecha_fin || v.to || null,
        dias: Number(v.days ?? v.working_days ?? v.calendar_days ?? v.dias) || 0,
        estado: v.status || v.estado || '',
        tipo: v.absence_subtype || v.subtype || v.absence_type || v.type || v.tipo || 'Licencia médica',
        folio: v.folio || v.number || v.numero || '',
        observaciones: v.observations || v.observaciones || v.comment || '',
      }));
  } catch { return []; }
}
