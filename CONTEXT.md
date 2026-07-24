# Glosario — Campero ERP

Este documento define los términos del dominio, tal como se han acordado hasta ahora.
No contiene detalles de implementación — eso vive en el código y en los ADRs (`docs/adr/`).

## Términos resueltos

- **Campero**: Sociedad Comercial Agrícola e Inversiones Campero Limitada, RUT 77.488.690-7.
  Único tenant de este ERP.

- **Empresa** (entidad de datos): sí existe como tabla (`empresas`), aunque hoy tenga una
  sola fila. Ver ADR 0001. Decisión de Manuel, confirmada explícitamente.

- **Régimen tributario**: se modela como historial temporal (`empresa_regimen_historial`),
  no como columna fija — porque ya sabemos que cambia (14A hoy, candidato a Pro Pyme 14D N°3
  desde 2027). Ver ADR 0002. **Esta la decidió Claude sin ponérsela a Manuel explícitamente
  como pregunta — pendiente de confirmar con él, no darla por 100% cerrada.**

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

## Términos pendientes de definir (no inventar sin confirmar con Manuel)

Existe una tabla esqueleto (`rai_sac_stub`) solo para no bloquear las foreign keys de otras
tablas — sus campos reales NO están diseñados todavía.

- **RAI / SAC**: registros del sistema de rentas empresariales (Art. 14 LIR). Definidos
  conceptualmente en la ficha tributaria del proyecto "Contabilidad Panguipulli", pero el
  SAC real de Campero se compone de varios códigos del F22 (1300/1301/1305/1308/1335/1345),
  no de un solo número — el modelo de datos tiene que reflejar eso, no aplanarlo a un campo.

## Mapa de directorio

```
/
├── CONTEXT.md              ← este archivo
├── README.md                ← estado del proyecto, qué se heredó de Poppins y qué falta
├── docs/adr/
│   ├── 0001-empresa-como-entidad.md
│   ├── 0002-regimen-tributario-temporal.md
│   └── 0003-f29-nivel-agregado.md
├── src/
│   ├── lib/                  ← motor de payroll, BUK, contratos, etc. (heredado de Poppins)
│   └── app/                  ← shell mínimo de Next.js (placeholder, sin auth real todavía)
└── supabase/migrations/
    └── 0001_init.sql          ← schema base: empresas, colaboradores, contratos, periodos,
                                  liquidaciones, previred_envios, f29_periodos + stub RAI/SAC
```
