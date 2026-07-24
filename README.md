# Campero ERP

Sistema interno de contabilidad y remuneraciones de Sociedad Comercial Agrícola e Inversiones
Campero Limitada (RUT 77.488.690-7). Single-tenant: no es un producto para vender a terceros.

## Origen del código

Este repo parte de una poda de [Poppins](https://github.com/manoletear/Poppins)
(commit `5659ec2`), la SaaS de cumplimiento laboral para empleadores de casa particular.
Se trajo **solo el motor de cálculo**, sin nada de la capa comercial ni del modelo de datos
de Poppins:

**Se heredó (sin cambios en la lógica):**
- `src/lib/payroll-cl` — motor de liquidación chilena (AFP, salud, SIS, seguro cesantía,
  impuesto único), generador de PDF de liquidación y finiquito, generador de archivo Previred.
- `src/lib/buk` y `src/lib/buk-sdk` — integración con la API de BUK (para bajar colaboradores
  y liquidaciones).
- `src/lib/contratos` — generación de PDF de contratos y anexos.
- `src/lib/supabase`, `src/lib/auth` (parcial), `src/lib/audit`, `src/lib/validaciones`,
  utilidades varias (`utils.ts`, `formatters.ts`, `dias-habiles.ts`).
- `src/components/ui` — primitivos de UI (shadcn-style).
- Config base: Next.js 16 + Cloudflare Workers (via OpenNext) + Tailwind 4.

**NO se trajo (específico de la Poppins comercial, no aplica a Campero):**
- Todo lo de "hogar" (empleador doméstico, familia, mascotas), el portal de la trabajadora,
  el panel admin de Poppins, pagos/suscripciones (Flow), CRM, landing/marketing, academia,
  asistente legal.
- Las migraciones de Supabase de Poppins — **no sirven tal cual**: el propio equipo de Poppins
  documentó que el repo nunca tuvo los `CREATE TABLE` base, solo `ALTER`s incrementales sobre
  tablas creadas a mano en el dashboard. No hay un schema limpio que copiar.
- `src/lib/payroll` (a diferencia de `payroll-cl`) — código muerto, cero referencias en la app,
  no se portó.
- Branding de Poppins (fuentes, colores, copy de marketing).

## Estado actual (segundo commit)

Esto es un esqueleto, no una app funcional todavía:

- [x] Motor de payroll, BUK, contratos, PDFs — portado y sin dependencias rotas (verificado
      que ningún import apunta a código descartado).
- [x] Shell de Next.js mínimo (`src/app/layout.tsx`, `page.tsx`) — sin auth ni contenido real.
- [x] **Schema base de datos** — `supabase/migrations/0001_init.sql`: empresas (con historial
      de régimen tributario), colaboradores, contratos + anexos, períodos, liquidaciones,
      envíos a Previred, F29 mensual (agregado, no factura por factura), usuarios permitidos
      + RLS. Ver ADRs 0001-0003 en `docs/adr/`. Probado contra Postgres real (11 tablas,
      constraint de "un solo régimen abierto" verificado). **No aplicada todavía a ningún
      proyecto Supabase real** — falta crear el proyecto y correr la migración.
- [ ] **RAI/SAC** — solo existe como tabla esqueleto (`rai_sac_stub`) para no romper las
      foreign keys de otras tablas. Los campos reales todavía no están diseñados con
      Manuel — no usar tal cual.
- [ ] Auth — `src/lib/auth/context.tsx` tiene lógica de Poppins acoplada a su modelo
      multi-empleador; hay que revisarla y simplificarla para un solo tenant.
- [ ] Proyecto Supabase propio — **no reutilizar el de Poppins** (`sczxyejqooqthxcxksah`).
- [ ] Cuenta/proyecto Cloudflare propio para el deploy — ver `wrangler.jsonc`, tiene
      placeholders `REPLACE_ME` donde antes iban los IDs de Poppins.

## Setup

```bash
npm install
cp .env.local.example .env.local   # completar con el Supabase NUEVO de Campero
# crear el proyecto en supabase.com, luego aplicar supabase/migrations/0001_init.sql
npm run dev
```

## Próximos pasos sugeridos

1. Crear el proyecto Supabase de Campero y aplicar `0001_init.sql`.
2. Confirmar con Manuel los ADR 0002 y 0003 (régimen como historial, F29 agregado) — se
   decidieron con luz verde general pero sin revisar cada campo con él.
3. Revisar `f29_periodos` contra un F29 real de Campero antes de usarlo para declarar.
4. Diseñar RAI/SAC en sesión de dominio aparte (el hueco real que queda).
5. Adaptar `src/lib/auth` a single-tenant.
6. Primera pantalla real: listar colaboradores + generar liquidación del mes.
