-- 0002_seed_entidades.sql — datos iniciales de las dos entidades.
-- Fuentes: ficha tributaria Campero (22-07-2026) e informe tributario René v2 (08-05-2026).
-- Correr después de 0001. Idempotente NO — correr una sola vez sobre BD limpia.
-- Los montos sin fuente exacta van en 0 con nota; verificar antes de declarar.

do $$
declare
  v_campero  uuid;
  v_rene     uuid;
  v_erica    uuid;
  v_manuel   uuid;
  v_carmen   uuid;
  v_reg_camp uuid;
  v_col_man  uuid;
  v_col_car  uuid;
  v_ctr_man  uuid;
  v_ctr_car  uuid;
begin
  -- ---------- ENTIDADES ----------
  insert into entidades (tipo, rut, razon_social, giro_principal, segmento_sii, email_sii, direccion, comuna, fecha_constitucion, fecha_inicio_actividades)
  values ('sociedad', '77.488.690-7', 'SOC COMERCIAL AGRICOLA E INVERSIONES CAMPERO LIMITADA',
          'Otras actividades de impresión N.C.P. (181109)', 'Pequeña Empresa', 'camperoerica@gmail.com',
          'Martínez de Rozas #435', 'Panguipulli', '2000-08-25', '2000-09-15')
  returning id into v_campero;

  insert into entidades (tipo, rut, razon_social, giro_principal, segmento_sii, email_sii, direccion, comuna)
  values ('persona_natural', '6.836.579-1', 'RENE ALEJANDRO ARAVENA RIFFO',
          'Compra, venta y alquiler de inmuebles (681012)', 'Pequeña Empresa', 'camperoerica@gmail.com',
          'M. de Rozas #440', 'Panguipulli')
  returning id into v_rene;

  -- ---------- RÉGIMEN (ambas 14A) ----------
  insert into entidad_regimen_historial (entidad_id, regimen, vigente_desde, motivo)
  values (v_campero, '14A', '2000-09-15', 'régimen general semi integrado, contabilidad completa');
  insert into entidad_regimen_historial (entidad_id, regimen, vigente_desde, motivo)
  values (v_rene, '14A', '2024-01-01', 'empresario individual contab. completa — VERIFICAR fecha real de inicio de régimen');

  -- ---------- ACTIVIDADES CAMPERO (6) ----------
  insert into entidad_actividades (entidad_id, codigo, glosa, afecta_iva, vigente_desde, es_principal) values
    (v_campero, '181109', 'Otras actividades de impresión N.C.P.', true,  '2016-08-22', true),
    (v_campero, '601000', 'Transmisiones de radio',                true,  '2000-09-15', false),
    (v_campero, '602000', 'Programación y transmisiones de televisión', true, '2000-09-15', false),
    (v_campero, '681011', 'Alquiler inmuebles amoblados/equipos',  true,  '2021-04-18', false),
    (v_campero, '681012', 'Compra, venta y alquiler de inmuebles', false, '2013-04-25', false),
    (v_campero, '731001', 'Servicios de publicidad',               true,  '2016-08-22', false);
  -- ---------- ACTIVIDAD RENE ----------
  insert into entidad_actividades (entidad_id, codigo, glosa, afecta_iva, es_principal) values
    (v_rene, '681012', 'Compra, venta y alquiler de inmuebles (factura exenta tipo 34)', false, true);

  -- ---------- SOCIOS + PARTICIPACIONES (Campero, 33% c/u) ----------
  insert into socios (rut, nombres, apellidos) values ('6.170.053-6',  'Erica Ester',      'Linnebrink Jaramillo') returning id into v_erica;
  insert into socios (rut, nombres, apellidos) values ('10.891.877-2', 'Manuel Alejandro', 'Aravena Linnebrink')  returning id into v_manuel;
  insert into socios (rut, nombres, apellidos) values ('15.261.819-0', 'Carmen Liliana',   'Aravena Linnebrink')  returning id into v_carmen;

  insert into participaciones (entidad_id, socio_id, capital_enterado, pct_capital, pct_utilidades, vigente_desde) values
    (v_campero, v_erica,  3000000, 33.00, 33.00, '2000-08-25'),
    (v_campero, v_manuel, 3000000, 33.00, 33.00, '2000-08-25'),
    (v_campero, v_carmen, 3000000, 33.00, 33.00, '2000-08-25');

  -- ---------- EJERCICIOS ----------
  insert into ejercicios (entidad_id, anio_comercial, anio_tributario, estado) values
    (v_campero, 2024, 2025, 'cerrado'),
    (v_campero, 2025, 2026, 'cerrado'),
    (v_rene,    2025, 2026, 'cerrado');

  -- ---------- REGISTROS EMPRESARIALES (saldo inicial) ----------
  -- Campero AT2026 (al 31-12-2025): RAI y CPT de la ficha.
  insert into registros_empresariales (entidad_id, anio_tributario, rai, rex, cpt, capital_pagado, ddan, notas)
  values (v_campero, 2026, 15594809, 0, 8976921, 9000000, 0,
          'RAI y CPT (código 1145) desde ficha. REX y DDAN por confirmar. SAC en sac_detalle.')
  returning id into v_reg_camp;

  -- SAC Campero AT2026 por código (todos tasa 27%, sin verificar línea a línea vs F22).
  insert into sac_detalle (registro_id, codigo_f22, tasa_idpc, monto, verificado_vs_f22) values
    (v_reg_camp, '1300', 27.00,  634960, false),
    (v_reg_camp, '1301', 27.00,  630748, false),
    (v_reg_camp, '1305', 27.00, 6605870, false),
    (v_reg_camp, '1308', 27.00, 6601658, false),
    (v_reg_camp, '1335', 27.00, 2941616, false),
    (v_reg_camp, '1345', 27.00, 2941616, false);

  -- René AT2026: el informe no desglosa RAI/SAC/CPT — placeholder a completar del F22.
  insert into registros_empresariales (entidad_id, anio_tributario, rai, rex, cpt, capital_pagado, ddan, notas)
  values (v_rene, 2026, 0, 0, 0, 0, 0,
          'PENDIENTE: extraer RAI/SAC/CPT/DDAN del F22 de René. Patrimonio contable informado $675.905.730. Retiros 2025 $24.530.000.');

  -- ---------- F22 ----------
  insert into f22_declaraciones (entidad_id, anio_tributario, fecha_presentacion, ingresos_giro, remuneraciones, costo_directo, rli, idpc, total_activo, total_pasivo, activo_inmovilizado, resultado_tipo, resultado_monto) values
    (v_campero, 2025, '2025-05-09', 102436902, 61615310, 22599008, 14206849,  3835849, 146913759, 99971100, 63423607, 'devolucion', 1266464),
    (v_campero, 2026, '2026-04-30', 112167634, 65067070, 20095106, 24466187,  6605870, 151619231, 97591379, 63836453, 'a_pagar',    1943794);
  -- René AT2026 (activo/pasivo/inmov no informados → 0).
  insert into f22_declaraciones (entidad_id, anio_tributario, ingresos_giro, remuneraciones, costo_directo, rli, idpc, ppm_ejercicio, resultado_tipo, resultado_monto)
  values (v_rene, 2026, 146701972, 56205825, 46095562, 1961919, 529718, 8544485, 'devolucion', 8014767);

  -- ---------- ACTIVO FIJO ----------
  -- Antena: valor por confirmar; activo inmovilizado total AT2026 $63.836.453 (antena + equipos). Vida normal 12 años.
  insert into activos_fijos (entidad_id, descripcion, categoria, valor_adquisicion, metodo_depreciacion, vida_util_meses)
  values (v_campero, 'Antena de transmisión TV/radio (valor por confirmar)', 'antena', 0, 'normal', 144);
  -- Camioneta: hoy ~4,4% anual; candidata a depreciación instantánea Art 31 N°5 bis.
  insert into activos_fijos (entidad_id, descripcion, categoria, valor_adquisicion, metodo_depreciacion, vida_util_meses)
  values (v_rene, 'Camioneta Dodge RAM 1500 Heavy Duty', 'vehiculo', 49195830, 'normal', 84);

  -- ---------- COLABORADORES + CONTRATOS (Campero, sueldos dic-2025) ----------
  insert into colaboradores (entidad_id, rut, nombres, apellidos, es_socio) values
    (v_campero, '10.891.877-2', 'Manuel Alejandro', 'Aravena Linnebrink', true) returning id into v_col_man;
  insert into colaboradores (entidad_id, rut, nombres, apellidos, es_socio) values
    (v_campero, '15.261.819-0', 'Carmen Liliana', 'Aravena Linnebrink', true) returning id into v_col_car;
  -- Erica: socia y rep legal, sin sueldo empresarial aún (plan: Gerente General).
  insert into colaboradores (entidad_id, rut, nombres, apellidos, es_socio)
  values (v_campero, '6.170.053-6', 'Erica Ester', 'Linnebrink Jaramillo', true);

  insert into contratos (colaborador_id, cargo, fecha_inicio, jornada_horas_semana, sueldo_base)
  values (v_col_man, 'Supervisión Planificación de Propiedades', '2020-11-01', 45.0, 1957000) returning id into v_ctr_man;
  insert into contratos (colaborador_id, cargo, fecha_inicio, jornada_horas_semana, sueldo_base)
  values (v_col_car, 'Asesora Comercial y Cobranza', '2021-04-01', 30.0, 1810234) returning id into v_ctr_car;

  raise notice 'Seed OK. Campero=% Rene=%', v_campero, v_rene;
end $$;
