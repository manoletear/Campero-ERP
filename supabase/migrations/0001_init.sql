-- 0001_init.sql — schema base de Campero ERP
-- Decisiones de dominio: ver CONTEXT.md y docs/adr/0001-empresa-como-entidad.md,
-- docs/adr/0002-regimen-tributario-temporal.md

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ============================================================
-- Empresa (ver ADR 0001 — sí se modela como tabla, aunque hoy
-- solo exista la fila de Campero)
-- ============================================================
create table empresas (
  id uuid primary key default gen_random_uuid(),
  rut text not null unique,
  razon_social text not null,
  nombre_fantasia text,
  direccion text,
  fecha_constitucion date,
  fecha_inicio_actividades date,
  created_at timestamptz not null default now()
);

-- Régimen tributario en el tiempo (ver ADR 0002 — no es una columna
-- fija, porque ya sabemos que puede cambiar: 14A hoy, posible
-- Pro Pyme 14D N°3 desde 2027).
create table empresa_regimen_historial (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  regimen text not null check (regimen in ('14A', '14D3')),
  vigente_desde date not null,
  vigente_hasta date,
  motivo text,
  created_at timestamptz not null default now(),
  constraint solo_un_regimen_abierto_por_empresa
    exclude using gist (empresa_id with =) where (vigente_hasta is null)
);

-- ============================================================
-- Colaboradores y contratos
-- ============================================================
create table colaboradores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  rut text not null,
  nombres text not null,
  apellidos text not null,
  email text,
  fecha_nacimiento date,
  created_at timestamptz not null default now(),
  unique (empresa_id, rut)
);

create table contratos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id),
  cargo text not null,
  tipo_contrato text not null default 'indefinido',
  fecha_inicio date not null,
  fecha_termino date,
  motivo_termino text,
  jornada_horas_semana numeric(4,1) not null,
  sueldo_base numeric(12,0) not null,
  created_at timestamptz not null default now()
);

-- Anexos de contrato (ej. cambio de jornada 45→42 horas sin
-- rebaja de sueldo) — historial de modificaciones, no se pisa el contrato.
create table contrato_anexos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id),
  fecha_vigencia date not null,
  campo_modificado text not null,
  valor_anterior text,
  valor_nuevo text,
  motivo text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Períodos y liquidaciones
-- ============================================================
create table periodos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  anio int not null,
  mes int not null check (mes between 1 and 12),
  created_at timestamptz not null default now(),
  unique (empresa_id, anio, mes)
);

create table liquidaciones (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id),
  periodo_id uuid not null references periodos(id),
  sueldo_imponible numeric(12,0) not null,
  afp_monto numeric(12,0) not null,
  salud_monto numeric(12,0) not null,
  sis_monto numeric(12,0) not null,
  seguro_cesantia_monto numeric(12,0) not null default 0,
  impuesto_unico numeric(12,0) not null default 0,
  liquido_pagar numeric(12,0) not null,
  pdf_url text,
  generado_en timestamptz not null default now(),
  unique (contrato_id, periodo_id)
);

create table previred_envios (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references periodos(id) unique,
  archivo_url text,
  estado text not null default 'generado' check (estado in ('generado', 'enviado', 'pagado')),
  enviado_en timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- F29 / IVA mensual (ver ADR 0003 — nivel agregado por período,
-- no factura por factura; ver CONTEXT.md para el detalle de cada campo)
-- ============================================================
create table f29_periodos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  periodo_id uuid not null references periodos(id) unique,

  folio_sii text,
  tipo_declaracion text not null default 'primitiva'
    check (tipo_declaracion in ('primitiva', 'rectificatoria')),

  -- Ventas del período (base para IVA débito)
  ventas_afectas numeric(12,0) not null default 0,
  ventas_exentas numeric(12,0) not null default 0,
  iva_debito_fiscal numeric(12,0) not null default 0,

  -- Compras del período (base para IVA crédito)
  compras_afectas numeric(12,0) not null default 0,
  iva_credito_fiscal numeric(12,0) not null default 0,

  -- Remanente de crédito fiscal (cuando el crédito supera al débito,
  -- se arrastra al período siguiente — por eso periodo_id es unique y
  -- el remanente_anterior de un período = remanente_siguiente del anterior)
  remanente_credito_anterior numeric(12,0) not null default 0,
  remanente_credito_siguiente numeric(12,0) not null default 0,

  -- PPM (Pago Provisional Mensual, Art. 84 LIR) — la tasa varía en el
  -- tiempo según lo fije el SII, por eso se guarda la tasa vigente
  -- para ESTE período, no en una tabla aparte.
  ppm_tasa numeric(5,3) not null default 0,
  ppm_monto numeric(12,0) not null default 0,

  -- Retención de impuesto único de 2ª categoría de las liquidaciones
  -- del mismo período (se declara en el mismo F29) — informativo, el
  -- monto real vive en `liquidaciones`.
  retencion_impuesto_unico numeric(12,0) not null default 0,

  total_a_pagar numeric(12,0) not null default 0,
  estado text not null default 'registrado'
    check (estado in ('registrado', 'presentado', 'pagado')),
  fecha_presentacion date,

  created_at timestamptz not null default now()
);

-- ============================================================
-- ESQUELETO — pendiente de validar con Manuel, NO dar por
-- definitivo. Campos y flujo real de RAI/SAC no se han
-- diseñado en sesión de dominio todavía (ver CONTEXT.md).
-- ============================================================

create table rai_sac_stub (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id),
  anio_tributario int not null,
  -- TODO: definir estructura real (ver corrección de la sesión: el SAC
  -- no es un solo número, son varios códigos del F22 — 1300/1301/1305/1308/1335/1345).
  notas text,
  created_at timestamptz not null default now(),
  unique (empresa_id, anio_tributario)
);

-- ============================================================
-- RLS — todas las tablas restringidas a usuarios autenticados
-- que existan en la lista de acceso. Simple porque es single-tenant
-- de 3 personas, no un sistema multiusuario complejo.
-- ============================================================
create table usuarios_permitidos (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id),
  colaborador_id uuid references colaboradores(id),
  email text not null,
  created_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'empresas', 'empresa_regimen_historial', 'colaboradores', 'contratos',
    'contrato_anexos', 'periodos', 'liquidaciones', 'previred_envios',
    'f29_periodos', 'rai_sac_stub', 'usuarios_permitidos'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy allow_usuarios_permitidos on %I for all using (exists (select 1 from usuarios_permitidos up where up.auth_user_id = auth.uid()))',
      t
    );
  end loop;
end $$;
