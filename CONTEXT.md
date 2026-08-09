# Glosario — Campero ERP

Este documento define los términos del dominio, tal como se han acordado hasta ahora.
No contiene detalles de implementación — eso vive en el código y en los ADRs (`docs/adr/`).

> **Actualización 2026-08-04:** el ERP pasó a **multi-entidad** (decisión de Manuel).
> Administra DOS contribuyentes: Campero Ltda (77.488.690-7) y René Aravena Riffo
> (6.836.579-1), ambos 14A con contabilidad completa. El schema se reescribió
> (`supabase/migrations/`) con `entidad_id` en la raíz y se aplicó al Supabase de
> Campero. Ver ADR 0004. El ADR 0001 (single-tenant) queda superado.

## Términos resueltos

- **Entidad**: cada contribuyente administrado. Tabla `entidades` (tipo `sociedad` o
  `persona_natural`). Hoy dos filas: Campero y René. `entidad_id` es la raíz de todo el
  modelo y del RLS. Ver ADR 0004 (supera ADR 0001).

- **Campero**: Soc. Comercial Agrícola e Inversiones Campero Limitada, RUT 77.488.690-7.
  Sociedad 14A. Giro real: medios (antena TV/radio), inmobiliario, publicidad (NO agrícola,
  pese al nombre). Tres socios al 33% (Erica, Manuel, Carmen).

- **René Aravena Riffo**: RUT 6.836.579-1, persona natural, empresario individual 14A con
  contabilidad completa. Giro inmobiliario (30 propiedades, arriendo exento tipo 34).
  Arrienda 4 inmuebles a Campero → operación con relacionados (Art 41 E, DJ 1907).

- **Régimen tributario**: se modela como historial temporal (`entidad_regimen_historial`),
  no como columna fija — porque ya sabemos que cambia (14A hoy en ambas, Campero candidato a
  Pro Pyme 14D N°3 desde 2027). Ver ADR 0002.

- **Colaborador**: persona con sueldo empresarial en Campero. Hoy son tres: Manuel Aravena
  Linnebrink, Carmen Aravena Linnebrink y Erica Linnebrink Jaramillo (esta última aún sin
  formalizar). Distinto del concepto "trabajador de casa particular" de Poppins — acá son
  socios con contrato de trabajo por su rol operativo real en la empresa (medios, comercial,
  gerencia), no empleados domésticos.

- **Contrato**: uno por colaborador, con historial de anexos (`contrato_anexos`) para
  cambios como jornada o cargo, sin perder el registro de qué decía antes (ej. el anexo de
  Manuel 45→42 horas, sin rebaja de sueldo).

- **Período**: un mes calendario de una empresa (`periodos`, único por empresa+año+mes) —
  la unidad sobre la que se calculan liquidaciones y (a futuro) IVA.

- **Liquidación**: el cálculo mensual de sueldo de un colaborador (imponible, AFP, salud, SIS,
  seguro cesantía, impuesto único, líquido a pagar), una por contrato+período. El motor de
  cálculo se heredó de Poppins (`src/lib/payroll-cl`) sin cambios — la matemática de
  remuneraciones chilena es la misma para cualquier empleador.

- **Previred**: el archivo mensual de cotizaciones previsionales que se sube a Previred.cl,
  uno por período (`previred_envios`). El generador
  (`src/lib/payroll-cl/previred-generator.ts`) también se heredó de Poppins.

- **Usuario permitido**: quién puede entrar al sistema (`usuarios_permitidos`, liga
  `auth.users` con `colaboradores`). Simple porque son 3 personas, no un sistema de roles
  complejo.

## Términos resueltos (con luz verde de Manuel, no revisados campo por campo)

- **F29 / período de IVA**: `f29_periodos`, uno por período, a nivel agregado (no factura
  por factura — ver ADR 0003). Guarda ventas afectas/exentas, IVA débito y crédito fiscal,
  remanente de crédito (se arrastra al período siguiente), PPM (tasa + monto, la tasa se
  guarda por período porque el SII la reajusta en el tiempo), retención de impuesto único
  del mismo período (informativo — el monto real vive en `liquidaciones`), y estado
  (registrado/presentado/pagado). **Los nombres de campo siguen la terminología del propio
  formulario pero no se revisaron línea por línea contra un F29 real de Campero — hacerlo
  antes de usar esto para declarar de verdad.**

- **Registros de rentas empresariales (Art. 14 LIR)**: ya diseñados (el `rai_sac_stub`
  quedó eliminado). `registros_empresariales` guarda RAI, REX, CPT (código 1145), capital
  y DDAN por entidad + año tributario. El SAC va desglosado en `sac_detalle` por código F22
  (1300/1301/1305/1308/1335/1345), tasa (27/25) y año de origen — nunca aplanado a un número.
  Campero AT2026: RAI $15.594.809 (seed cargado). **Pendiente:** verificar el SAC línea por
  línea contra el F22 (`verificado_vs_f22`), y extraer los registros de René de su F22.

## Mapa de directorio

```
/
├── CONTEXT.md               ← este archivo
├── README.md                ← estado del proyecto, qué se heredó de Poppins y qué falta
├── docs/adr/
│   ├── 0001-empresa-como-entidad.md   (SUPERADO por 0004)
│   ├── 0002-regimen-tributario-temporal.md
│   ├── 0003-f29-nivel-agregado.md
│   └── 0004-multi-entidad.md
├── src/
│   ├── lib/                 ← motor de payroll, BUK, contratos, etc. (heredado de Poppins)
│   └── app/                 ← shell mínimo de Next.js (placeholder, sin auth real todavía)
└── supabase/migrations/
    ├── 20260804000001_init_multi_entidad_tributario.sql  ← schema: 28 tablas + RLS por entidad
    └── 20260804000002_seed_entidades.sql                 ← seed Campero + René (saldos iniciales)
```
