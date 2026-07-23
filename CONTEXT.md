# Glosario — Campero ERP

Este documento define los términos del dominio, tal como se han acordado hasta ahora.
No contiene detalles de implementación — eso vive en el código y en los ADRs (`docs/adr/`).

## Términos resueltos

- **Campero**: Sociedad Comercial Agrícola e Inversiones Campero Limitada, RUT 77.488.690-7.
  Único tenant de este ERP (ver ADR pendiente sobre alcance single-tenant vs multi-tenant —
  el nombre del repo ya asume single-tenant, pero no se ha registrado formalmente por qué).

- **Colaborador**: persona con sueldo empresarial en Campero. Hoy son tres: Manuel Aravena
  Linnebrink, Carmen Aravena Linnebrink y Erica Linnebrink Jaramillo (esta última aún sin
  formalizar). Distinto del concepto "trabajador de casa particular" de Poppins — acá son
  socios con contrato de trabajo por su rol operativo real en la empresa (medios, comercial,
  gerencia), no empleados domésticos.

- **Liquidación**: el cálculo mensual de sueldo de un colaborador (imponible, AFP, salud, SIS,
  seguro cesantía, impuesto único, líquido a pagar). El motor de cálculo se heredó de Poppins
  (`src/lib/payroll-cl`) sin cambios — la matemática de remuneraciones chilena es la misma
  para cualquier empleador.

- **Previred**: el archivo mensual de cotizaciones previsionales que se sube a Previred.cl.
  El generador (`src/lib/payroll-cl/previred-generator.ts`) también se heredó de Poppins.

## Términos pendientes de definir (no inventar sin confirmar con Manuel)

- **IVA / F29**: no existe ningún concepto de esto en el código heredado de Poppins — Poppins
  nunca necesitó declarar IVA propio de sus clientes, solo gestionaba sus remuneraciones. Para
  Campero hay que definir desde cero: qué es un "período F29" acá, qué datos se guardan
  (débito, crédito, PPM), y si el ERP solo los registra o si además los declara ante el SII.

- **RAI / SAC**: registros del sistema de rentas empresariales (Art. 14 LIR). Definidos
  conceptualmente en la ficha tributaria del proyecto "Contabilidad Panguipulli", pero sin
  modelo de datos propio todavía.

- **Empresa** (como entidad de datos, no como concepto de negocio): ¿existe una tabla
  `empresas` aunque haya una sola fila (Campero), o se asume implícito en todo el schema?
  No decidido — impacta si este ERP alguna vez se reutiliza para otro cliente.

## Mapa de directorio

```
/
├── CONTEXT.md              ← este archivo
├── README.md                ← estado del proyecto, qué se heredó de Poppins y qué falta
├── docs/adr/                 ← decisiones arquitectónicas (aún vacío)
├── src/
│   ├── lib/                  ← motor de payroll, BUK, contratos, etc. (heredado de Poppins)
│   └── app/                  ← shell mínimo de Next.js (placeholder, sin schema ni auth reales)
└── supabase/                 ← vacío por ahora — el schema se diseña desde cero (ver README)
```
