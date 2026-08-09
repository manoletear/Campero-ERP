-- 0001_init.sql — schema base de Campero ERP (modelo multi-entidad tributario)
--
-- Reemplaza la versión single-tenant anterior. Decisión Manuel 2026-08-03:
-- el ERP administra DOS entidades (Campero Ltda 77.488.690-7 y René Aravena
-- Riffo 6.836.579-1), ambas 14A con contabilidad completa. Ver docs/adr y
-- CONTEXT.md. Fuentes de saldo inicial: ficha tributaria Campero (22-07-2026)
-- e informe tributario René v2 (08-05-2026).
--
-- No aplicado aún a ningún proyecto Supabase real.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ============================================================
-- ENTIDADES — el ERP es multi-entidad. Cada contribuyente
-- administrado (sociedad o persona natural) es una entidad.
-- `entidad_id` es la raíz de todo el modelo y del RLS.
-- ============================================================
create table entidades (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('sociedad', 'persona_natural')),
  rut text not null unique,
  razon_social text not null,           -- o nombre completo si persona natural
  nombre_fantasia text,
  giro_principal text,                  -- actividad usada como giro principal en F22
  segmento_sii text,                    -- ej. 'Pequeña Empresa'
  email_sii text,
  direccion text,
  comuna text,
  fecha_constitucion date,
  fecha_inicio_actividades date,
  created_at timestamptz not null default now()
);

-- Actividades económicas (códigos CIIU) vigentes por entidad. Una entidad
-- tiene varias; sirve para validar giro vs gasto y afectación IVA.
create table entidad_actividades (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  codigo text not null,                 -- ej. '181109', '601000', '681012'
  glosa text not null,
  afecta_iva boolean not null default false,
  vigente_desde date,
  vigente_hasta date,
  es_principal boolean not null default false,
  unique (entidad_id, codigo)
);

-- Régimen tributario en el tiempo (ver ADR 0002). Historial, no columna fija:
-- 14A hoy en ambas, candidato a 14D N°3 (Pro Pyme) desde 2027 en Campero.
create table entidad_regimen_historial (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  regimen text not null check (regimen in ('14A', '14D3', 'renta_presunta')),
  vigente_desde date not null,
  vigente_hasta date,
  motivo text,
  created_at timestamptz not null default now(),
  constraint solo_un_regimen_abierto_por_entidad
    exclude using gist (entidad_id with =) where (vigente_hasta is null)
);

-- ============================================================
-- SOCIOS y participación (para sociedades). Campero tiene 3
-- socios al 33%. Base para imputar retiros y % de utilidades.
-- ============================================================
create table socios (
  id uuid primary key default gen_random_uuid(),
  rut text not null unique,
  nombres text not null,
  apellidos text not null,
  email text,
  created_at timestamptz not null default now()
);

create table participaciones (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  socio_id uuid not null references socios(id),
  capital_enterado numeric(14,0) not null default 0,
  pct_capital numeric(5,2) not null,
  pct_utilidades numeric(5,2) not null,
  vigente_desde date not null,
  vigente_hasta date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PERÍODOS (mes) y EJERCICIOS (año). El ejercicio comercial N
-- se declara en el año tributario N+1 (2025 → AT2026).
-- ============================================================
create table ejercicios (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  anio_comercial int not null,
  anio_tributario int not null,         -- = anio_comercial + 1
  estado text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  created_at timestamptz not null default now(),
  unique (entidad_id, anio_comercial),
  constraint at_es_comercial_mas_uno check (anio_tributario = anio_comercial + 1)
);

create table periodos (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  anio int not null,
  mes int not null check (mes between 1 and 12),
  estado text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  created_at timestamptz not null default now(),
  unique (entidad_id, anio, mes)
);

-- ============================================================
-- REGISTROS DE RENTAS EMPRESARIALES (Art. 14 LIR) — el núcleo
-- del proyecto. Un snapshot por entidad + año tributario.
-- ============================================================
create table registros_empresariales (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  anio_tributario int not null,
  rai numeric(14,0) not null default 0,          -- Rentas Afectas a Impuestos
  rex numeric(14,0) not null default 0,          -- Rentas Exentas / no gravadas
  cpt numeric(14,0) not null default 0,          -- Capital Propio Tributario (código 1145)
  capital_pagado numeric(14,0) not null default 0,
  ddan numeric(14,0) not null default 0,         -- Dif. Deprec. Acelerada-Normal (tributa al retiro)
  notas text,
  created_at timestamptz not null default now(),
  unique (entidad_id, anio_tributario)
);

-- SAC desglosado POR CÓDIGO, TASA y AÑO DE ORIGEN. No se aplana a un número:
-- si algún día se migra a 14D N°3, los créditos 27% y 25% no se pueden mezclar.
-- Campero AT2026: 1300, 1301, 1305, 1308, 1335, 1345.
create table sac_detalle (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references registros_empresariales(id) on delete cascade,
  codigo_f22 text not null,                      -- '1300','1301','1305','1308','1335','1345'
  tasa_idpc numeric(5,2) not null,               -- 27.00 / 25.00
  anio_origen int,                               -- año del ejercicio que generó el crédito
  monto numeric(14,0) not null default 0,
  verificado_vs_f22 boolean not null default false,
  created_at timestamptz not null default now()
);

-- Retiros de socios, imputados en orden RAI → REX → capital, con el
-- crédito SAC asociado (a la tasa correspondiente).
create table retiros (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  socio_id uuid not null references socios(id),
  fecha date not null,
  monto numeric(14,0) not null,
  imputa_rai numeric(14,0) not null default 0,
  imputa_rex numeric(14,0) not null default 0,
  imputa_capital numeric(14,0) not null default 0,
  credito_sac numeric(14,0) not null default 0,
  tasa_credito numeric(5,2),
  created_at timestamptz not null default now()
);

-- ============================================================
-- F22 anual — resumen de la Declaración de Renta por entidad y
-- año tributario. Amarra con F29 (PPM) y con los registros RRE.
-- ============================================================
create table f22_declaraciones (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  anio_tributario int not null,
  fecha_presentacion date,
  ingresos_giro numeric(14,0) not null default 0,
  remuneraciones numeric(14,0) not null default 0,
  costo_directo numeric(14,0) not null default 0,
  rli numeric(14,0) not null default 0,
  idpc numeric(14,0) not null default 0,          -- RLI × tasa vigente
  ppm_ejercicio numeric(14,0) not null default 0,
  total_activo numeric(14,0) not null default 0,
  total_pasivo numeric(14,0) not null default 0,
  activo_inmovilizado numeric(14,0) not null default 0,
  resultado_tipo text check (resultado_tipo in ('a_pagar', 'devolucion', 'sin_movimiento')),
  resultado_monto numeric(14,0) not null default 0,
  created_at timestamptz not null default now(),
  unique (entidad_id, anio_tributario)
);

-- ============================================================
-- F29 / IVA mensual (ver ADR 0003 — nivel agregado por período).
-- Campero y René facturan exento (arriendo): hoy sin IVA débito,
-- pero el modelo soporta afecto para cuando se migre (Art 8 g DL 825).
-- ============================================================
create table f29_periodos (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  periodo_id uuid not null references periodos(id) on delete cascade unique,

  folio_sii text,
  tipo_declaracion text not null default 'primitiva'
    check (tipo_declaracion in ('primitiva', 'rectificatoria')),
  forma_pago text,                                -- ej. 'PEL'

  ventas_afectas numeric(14,0) not null default 0,
  ventas_exentas numeric(14,0) not null default 0,
  iva_debito_fiscal numeric(14,0) not null default 0,
  compras_afectas numeric(14,0) not null default 0,
  iva_credito_fiscal numeric(14,0) not null default 0,
  remanente_credito_anterior numeric(14,0) not null default 0,
  remanente_credito_siguiente numeric(14,0) not null default 0,

  -- PPM (Art 84 LIR) — tasa por período porque el SII la reajusta.
  ppm_tasa numeric(6,3) not null default 0,
  ppm_monto numeric(14,0) not null default 0,

  -- Retención impuesto único 2ª categoría (Art 74 N°1) de las
  -- liquidaciones del mismo período — informativo, el real vive en liquidaciones.
  retencion_impuesto_unico numeric(14,0) not null default 0,

  total_a_pagar numeric(14,0) not null default 0,
  estado text not null default 'registrado'
    check (estado in ('registrado', 'presentado', 'pagado')),
  fecha_presentacion date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BIENES RAÍCES — René tiene 30 propiedades; Campero administra
-- inmuebles (arriendo exento). Base para contribuciones, arriendo
-- e IVA Art 8 g). El tipo_uso define tratamiento tributario.
-- ============================================================
create table propiedades (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  rol_sii text,                                   -- rol de avalúo
  comuna text,
  direccion text,
  tipo_uso text not null default 'otro'
    check (tipo_uso in ('comercial', 'habitacional', 'agricola', 'eriazo', 'otro')),
  avaluo_fiscal numeric(14,0),
  destino_sii text,
  afecta_iva boolean not null default false,      -- Art 8 g) si tiene instalaciones comerciales
  genera_renta boolean not null default true,     -- eriazos no rentan → contribución no deducible
  created_at timestamptz not null default now()
);

create table contribuciones (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references propiedades(id) on delete cascade,
  anio int not null,
  cuota int not null check (cuota between 1 and 4),
  monto numeric(14,0) not null default 0,
  vencimiento date,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagada', 'vencida', 'convenio')),
  created_at timestamptz not null default now(),
  unique (propiedad_id, anio, cuota)
);

-- Contratos de arriendo. La arrendataria puede ser otra entidad del ERP
-- (René → Campero, 4 contratos): entonces es operación con relacionados
-- (Art 41 E LIR, DJ 1907).
create table contratos_arriendo (
  id uuid primary key default gen_random_uuid(),
  entidad_arrendador_id uuid not null references entidades(id) on delete cascade,
  propiedad_id uuid references propiedades(id),
  arrendatario_rut text,
  arrendatario_entidad_id uuid references entidades(id),  -- no null si es relacionado interno
  monto_mensual numeric(14,0) not null default 0,
  afecto_iva boolean not null default false,
  es_relacionado boolean not null default false,
  vigente_desde date,
  vigente_hasta date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACTIVO FIJO y depreciación. Campero: antena (~$63-64M).
-- René: camioneta Dodge RAM ($49M). Método depende del régimen
-- vigente (instantánea solo en 14D N°3).
-- ============================================================
create table activos_fijos (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  descripcion text not null,
  categoria text,                                 -- 'antena', 'vehiculo', 'equipo', 'inmueble'
  fecha_compra date,
  es_nuevo boolean,
  valor_adquisicion numeric(14,0) not null default 0,
  metodo_depreciacion text not null default 'normal'
    check (metodo_depreciacion in ('normal', 'acelerada', 'instantanea')),
  vida_util_meses int,
  saldo_depreciable numeric(14,0) not null default 0,
  created_at timestamptz not null default now()
);

create table depreciaciones (
  id uuid primary key default gen_random_uuid(),
  activo_fijo_id uuid not null references activos_fijos(id) on delete cascade,
  anio int not null,
  monto numeric(14,0) not null default 0,
  tipo text not null default 'normal' check (tipo in ('normal', 'acelerada', 'instantanea')),
  genera_ddan boolean not null default false,     -- acelerada > normal → DDAN
  created_at timestamptz not null default now(),
  unique (activo_fijo_id, anio, tipo)
);

-- ============================================================
-- REMUNERACIONES — colaboradores, contratos, liquidaciones,
-- Previred. El motor de cálculo vive en src/lib/payroll-cl.
-- Sirve a ambas entidades (matemática chilena es la misma).
-- ============================================================
create table colaboradores (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references entidades(id) on delete cascade,
  rut text not null,
  nombres text not null,
  apellidos text not null,
  email text,
  fecha_nacimiento date,
  es_socio boolean not null default false,        -- sueldo empresarial de socio
  created_at timestamptz not null default now(),
  unique (entidad_id, rut)
);

create table contratos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  cargo text not null,
  tipo_contrato text not null default 'indefinido',
  fecha_inicio date not null,
  fecha_termino date,
  motivo_termino text,
  jornada_horas_semana numeric(4,1) not null,
  sueldo_base numeric(12,0) not null,
  excluido_jornada_art22 boolean not null default false,   -- gerentes sin fiscalización superior
  created_at timestamptz not null default now()
);

create table contrato_anexos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  fecha_vigencia date not null,
  campo_modificado text not null,
  valor_anterior text,
  valor_nuevo text,
  motivo text,
  created_at timestamptz not null default now()
);

create table liquidaciones (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  periodo_id uuid not null references periodos(id) on delete cascade,
  sueldo_imponible numeric(12,0) not null,
  afp_monto numeric(12,0) not null,
  salud_monto numeric(12,0) not null,
  sis_monto numeric(12,0) not null default 0,
  seguro_cesantia_monto numeric(12,0) not null default 0,
  impuesto_unico numeric(12,0) not null default 0,
  liquido_pagar numeric(12,0) not null,
  pdf_url text,
  generado_en timestamptz not null default now(),
  unique (contrato_id, periodo_id)
);

create table previred_envios (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references periodos(id) on delete cascade unique,
  archivo_url text,
  estado text not null default 'generado' check (estado in ('generado', 'enviado', 'pagado')),
  enviado_en timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACCESO / RLS — usuarios y a qué entidades pueden acceder.
-- Multi-entidad: un usuario ve solo las entidades asignadas.
-- ============================================================
create table usuarios_permitidos (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id),
  email text not null,
  nombre text,
  created_at timestamptz not null default now()
);

create table usuario_entidades (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios_permitidos(id) on delete cascade,
  entidad_id uuid not null references entidades(id) on delete cascade,
  rol text not null default 'contador' check (rol in ('admin', 'contador', 'lector')),
  unique (usuario_id, entidad_id)
);

-- Helper: ¿el usuario actual puede ver esta entidad?
create or replace function puede_ver_entidad(e uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from usuarios_permitidos up
    join usuario_entidades ue on ue.usuario_id = up.id
    where up.auth_user_id = auth.uid()
      and ue.entidad_id = e
  );
$$;

-- ============================================================
-- RLS — habilitado en todas las tablas. Las tablas con
-- entidad_id se filtran por acceso a esa entidad; las tablas
-- hijas resuelven la entidad vía su tabla padre.
-- ============================================================
alter table entidades enable row level security;
create policy sel_entidades on entidades for all
  using (puede_ver_entidad(id)) with check (puede_ver_entidad(id));

-- Tablas con entidad_id directo.
do $$
declare t text;
begin
  for t in select unnest(array[
    'entidad_actividades', 'entidad_regimen_historial', 'participaciones',
    'ejercicios', 'periodos', 'registros_empresariales', 'retiros',
    'f22_declaraciones', 'f29_periodos', 'propiedades',
    'activos_fijos', 'colaboradores'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy rls_%1$s on %1$s for all using (puede_ver_entidad(entidad_id)) with check (puede_ver_entidad(entidad_id))',
      t
    );
  end loop;
end $$;

-- contratos_arriendo: la entidad es el arrendador; también visible a la
-- entidad arrendataria interna (René → Campero).
alter table contratos_arriendo enable row level security;
create policy rls_contratos_arriendo on contratos_arriendo for all
  using (puede_ver_entidad(entidad_arrendador_id)
         or (arrendatario_entidad_id is not null and puede_ver_entidad(arrendatario_entidad_id)))
  with check (puede_ver_entidad(entidad_arrendador_id));

-- Tablas hijas — resuelven entidad vía el padre.
alter table sac_detalle enable row level security;
create policy rls_sac_detalle on sac_detalle for all
  using (exists (select 1 from registros_empresariales r where r.id = registro_id and puede_ver_entidad(r.entidad_id)));

alter table contribuciones enable row level security;
create policy rls_contribuciones on contribuciones for all
  using (exists (select 1 from propiedades p where p.id = propiedad_id and puede_ver_entidad(p.entidad_id)));

alter table depreciaciones enable row level security;
create policy rls_depreciaciones on depreciaciones for all
  using (exists (select 1 from activos_fijos a where a.id = activo_fijo_id and puede_ver_entidad(a.entidad_id)));

alter table contratos enable row level security;
create policy rls_contratos on contratos for all
  using (exists (select 1 from colaboradores c where c.id = colaborador_id and puede_ver_entidad(c.entidad_id)));

alter table contrato_anexos enable row level security;
create policy rls_contrato_anexos on contrato_anexos for all
  using (exists (select 1 from contratos ct join colaboradores c on c.id = ct.colaborador_id
                 where ct.id = contrato_id and puede_ver_entidad(c.entidad_id)));

alter table liquidaciones enable row level security;
create policy rls_liquidaciones on liquidaciones for all
  using (exists (select 1 from contratos ct join colaboradores c on c.id = ct.colaborador_id
                 where ct.id = contrato_id and puede_ver_entidad(c.entidad_id)));

alter table previred_envios enable row level security;
create policy rls_previred_envios on previred_envios for all
  using (exists (select 1 from periodos p where p.id = periodo_id and puede_ver_entidad(p.entidad_id)));

-- Tablas globales (no atadas a una entidad): socios y el propio registro
-- de usuarios. Visibles a cualquier usuario permitido.
alter table socios enable row level security;
create policy rls_socios on socios for all
  using (exists (select 1 from usuarios_permitidos up where up.auth_user_id = auth.uid()));

alter table usuarios_permitidos enable row level security;
create policy rls_usuarios_permitidos on usuarios_permitidos for all
  using (auth_user_id = auth.uid());

alter table usuario_entidades enable row level security;
create policy rls_usuario_entidades on usuario_entidades for all
  using (exists (select 1 from usuarios_permitidos up where up.id = usuario_id and up.auth_user_id = auth.uid()));
