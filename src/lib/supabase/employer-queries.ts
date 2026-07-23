import { createClient } from './client';

// Dashboard
export async function getDashboardEmpleador(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('v_dashboard_empleador').select('*').eq('empleador_id', empleadorId).single();
  return data;
}

// Tareas del día
export async function getTareasHoy(empleadorId: string, fecha?: string) {
  const supabase = createClient();
  const targetDate = fecha || new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('tareas')
    .select('*, trabajadores(nombre, apellido_paterno)')
    .eq('empleador_id', empleadorId)
    .eq('fecha', targetDate)
    .order('hora_inicio');
  return data || [];
}

export async function updateTareaEstado(tareaId: string, estado: string) {
  const supabase = createClient();
  const updates: any = { estado };
  if (estado === 'completada') updates.fecha_completada = new Date().toISOString();
  const { data } = await supabase.from('tareas').update(updates).eq('id', tareaId).select().single();
  return data;
}

export async function createTarea(empleadorId: string, tarea: { titulo: string; descripcion?: string; categoria?: string; prioridad?: string; trabajador_id?: string; fecha?: string; hora_inicio?: string; hora_fin?: string }) {
  const supabase = createClient();
  const { data } = await supabase.from('tareas').insert({ ...tarea, empleador_id: empleadorId }).select().single();
  return data;
}

// Resumen tareas del día (from view)
export async function getResumenTareasDia(empleadorId: string, fecha?: string) {
  const supabase = createClient();
  const targetDate = fecha || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('v_tareas_dia').select('*').eq('empleador_id', empleadorId).eq('fecha', targetDate).single();
  return data;
}

// Solicitudes
export async function getSolicitudes(empleadorId: string, estado?: string) {
  const supabase = createClient();
  let query = supabase.from('solicitudes_empleado').select('*, trabajadores(nombre, apellido_paterno)').eq('empleador_id', empleadorId).order('created_at', { ascending: false });
  if (estado) query = query.eq('estado', estado);
  const { data } = await query;
  return data || [];
}

export async function updateSolicitudEstado(solicitudId: string, estado: 'aprobada' | 'rechazada') {
  const supabase = createClient();
  const { data } = await supabase.from('solicitudes_empleado').update({ estado, fecha_respuesta: new Date().toISOString() }).eq('id', solicitudId).select().single();
  return data;
}

// Listas de compras
export async function getListasCompras(empleadorId: string, estado?: string) {
  const supabase = createClient();
  let query = supabase.from('listas_compras').select('*').eq('empleador_id', empleadorId).order('created_at', { ascending: false });
  if (estado) query = query.eq('estado', estado);
  const { data } = await query;
  return data || [];
}

// Single query with join — replaces N+1 pattern of getListasCompras + N×getItemsLista
export async function getListasConItems(empleadorId: string, estado?: string) {
  const supabase = createClient();
  let query = supabase.from('listas_compras').select('*, items_lista_compras(*)').eq('empleador_id', empleadorId).order('created_at', { ascending: false });
  if (estado) query = query.eq('estado', estado);
  const { data } = await query;
  return (data || []).map((l: any) => ({ ...l, items: l.items_lista_compras || [] }));
}

export async function getItemsLista(listaId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('items_lista_compras').select('*').eq('lista_id', listaId).order('created_at');
  return data || [];
}

export async function toggleItemComprado(itemId: string, comprado: boolean) {
  const supabase = createClient();
  const { data } = await supabase.from('items_lista_compras').update({ comprado }).eq('id', itemId).select().single();
  return data;
}

export async function getComprasActivas(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('v_compras_activas').select('*').eq('empleador_id', empleadorId);
  return data || [];
}

export async function createListaCompras(empleadorId: string, nombre: string) {
  const supabase = createClient();
  const { data } = await supabase.from('listas_compras').insert({ empleador_id: empleadorId, nombre, estado: 'abierta' }).select().single();
  return data;
}

export async function createItemLista(listaId: string, nombre: string, cantidad?: string, unidad?: string) {
  const supabase = createClient();
  const { data } = await supabase.from('items_lista_compras').insert({ lista_id: listaId, nombre, cantidad, unidad }).select().single();
  return data;
}

export async function deleteLista(listaId: string) {
  const supabase = createClient();
  await supabase.from('items_lista_compras').delete().eq('lista_id', listaId);
  await supabase.from('listas_compras').delete().eq('id', listaId);
}

export async function deleteItemLista(itemId: string) {
  const supabase = createClient();
  await supabase.from('items_lista_compras').delete().eq('id', itemId);
}

export async function cerrarLista(listaId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('listas_compras').update({ estado: 'cerrada', fecha_cierre: new Date().toISOString() }).eq('id', listaId).select().single();
  return data;
}

export async function createListaFromPlantilla(empleadorId: string, plantilla: { nombre: string; items: string[] }) {
  const supabase = createClient();
  const { data: lista } = await supabase.from('listas_compras').insert({ empleador_id: empleadorId, nombre: plantilla.nombre, estado: 'abierta', plantilla: true }).select().single();
  if (lista && plantilla.items.length > 0) {
    const items = plantilla.items.map(nombre => ({ lista_id: lista.id, nombre, comprado: false }));
    await supabase.from('items_lista_compras').insert(items);
  }
  return lista;
}

// Recordatorios
export async function getRecordatorios(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('recordatorios').select('*').eq('empleador_id', empleadorId).order('hora');
  return data || [];
}

export async function toggleRecordatorioActivo(recordatorioId: string, activo: boolean) {
  const supabase = createClient();
  const { data } = await supabase.from('recordatorios').update({ activo }).eq('id', recordatorioId).select().single();
  return data;
}

// Marcajes
export async function getMarcajesHoy(empleadorId: string, fecha?: string) {
  const supabase = createClient();
  const targetDate = fecha || new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('marcajes_horario').select('*, trabajadores(nombre, apellido_paterno)').eq('empleador_id', empleadorId).eq('fecha', targetDate);
  return data || [];
}

export async function registrarMarcaje(empleadorId: string, trabajadorId: string, tipo: 'entrada' | 'salida') {
  const supabase = createClient();
  const hoy = new Date().toISOString().split('T')[0];
  const ahora = new Date().toTimeString().split(' ')[0].substring(0, 5);

  if (tipo === 'entrada') {
    const { data } = await supabase.from('marcajes_horario').upsert({ trabajador_id: trabajadorId, empleador_id: empleadorId, fecha: hoy, hora_entrada: ahora }, { onConflict: 'trabajador_id,fecha' }).select().single();
    return data;
  } else {
    const { data } = await supabase.from('marcajes_horario').update({ hora_salida: ahora }).eq('trabajador_id', trabajadorId).eq('fecha', hoy).select().single();
    return data;
  }
}

// Pagos
export async function getPagos(empleadorId: string, periodo?: string) {
  const supabase = createClient();
  let query = supabase.from('pagos_empleador').select('*, trabajadores(nombre, apellido_paterno)').eq('empleador_id', empleadorId).order('created_at', { ascending: false });
  if (periodo) query = query.eq('periodo', periodo);
  const { data } = await query;
  return data || [];
}

export async function getPuntosAcumulados(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('pagos_empleador').select('puntos_acumulados').eq('empleador_id', empleadorId).eq('estado', 'pagado');
  return data?.reduce((sum: number, p: any) => sum + (p.puntos_acumulados || 0), 0) || 0;
}

// Noticias
export async function getNoticiasLegales(categoria?: string) {
  const supabase = createClient();
  let query = supabase.from('noticias_legales').select('*').eq('activa', true).order('fecha_publicacion', { ascending: false }).limit(10);
  if (categoria) query = query.eq('categoria', categoria);
  const { data } = await query;
  return data || [];
}

// Empleador perfil
export async function getEmpleadorPerfil(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('empleadores').select('*').eq('id', empleadorId).single();
  return data;
}

export async function getFamiliares(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('familiares_empleador').select('*').eq('empleador_id', empleadorId).order('tipo');
  return data || [];
}

export async function getMascotas(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('mascotas_empleador').select('*').eq('empleador_id', empleadorId);
  return data || [];
}

export async function getVivienda(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('viviendas_empleador').select('*').eq('empleador_id', empleadorId).single();
  return data;
}

export async function getPreferenciasTrabajo(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('preferencias_trabajo').select('*').eq('empleador_id', empleadorId).single();
  return data;
}

// Plantillas
export async function getPlantillasCompras(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('plantillas_lista_compras').select('*').or(`es_global.eq.true,empleador_id.eq.${empleadorId}`);
  return data || [];
}

// Tarjetas
export async function getTarjetaPrincipal(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('tarjetas_cliente')
    .select('*')
    .eq('empleador_id', empleadorId)
    .eq('es_principal', true)
    .single();
  return data;
}

export async function saveTarjeta(empleadorId: string, tarjeta: {
  bin: string;
  ultimos_4: string;
  banco: string;
  tipo_tarjeta: string;
  categoria: string;
  programa_puntos: string;
  tasa_puntos: number;
}) {
  const supabase = createClient();
  // Deactivate existing principal
  await supabase
    .from('tarjetas_cliente')
    .update({ es_principal: false })
    .eq('empleador_id', empleadorId)
    .eq('es_principal', true);

  const { data } = await supabase
    .from('tarjetas_cliente')
    .insert({ ...tarjeta, empleador_id: empleadorId, activa: true, es_principal: true })
    .select()
    .single();
  return data;
}

// Onboarding state
export async function getOnboardingState(empleadorId: string) {
  const supabase = createClient();

  const [tarjeta, cuentas, pagos] = await Promise.all([
    supabase.from('tarjetas_cliente').select('id').eq('empleador_id', empleadorId).limit(1),
    supabase.from('cuentas_pago').select('id').eq('empleador_id', empleadorId).eq('activa', true).limit(1),
    supabase.from('pagos_empleador').select('id').eq('empleador_id', empleadorId).eq('estado', 'pagado').limit(1),
  ]);

  return {
    tarjeta_registrada: (tarjeta.data?.length || 0) > 0,
    primera_cuenta_agregada: (cuentas.data?.length || 0) > 0,
    primer_pago_realizado: (pagos.data?.length || 0) > 0,
    plan_seleccionado: true, // starter is default
  };
}
