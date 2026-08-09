# Campero ERP

Sistema interno de contabilidad, tributación y remuneraciones. **Multi-entidad** (uso interno,
no es producto para terceros): administra dos contribuyentes, ambos 14A con contabilidad
completa — **Campero Ltda** (RUT 77.488.690-7) y **René Aravena Riffo** (RUT 6.836.579-1).

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

## Estado actual (2026-08-04)

Schema y datos base ya viven en un Supabase real; falta la capa de app.

- [x] Motor de payroll, BUK, contratos, PDFs — portado y sin dependencias rotas.
- [x] Shell de Next.js mínimo (`src/app/layout.tsx`, `page.tsx`) — sin auth ni contenido real.
- [x] **Schema multi-entidad** — `supabase/migrations/20260804000001_init_multi_entidad_tributario.sql`:
      28 tablas con `entidad_id` en la raíz + RLS por entidad. Entidades, actividades, régimen
      histórico, socios/participaciones, ejercicios/períodos, **registros empresariales
      (RAI/REX/CPT/DDAN) + SAC desglosado por código**, retiros, F22, F29, bienes raíces,
      contribuciones, arriendos (con marca de relacionado), activo fijo/depreciación,
      remuneraciones, y acceso/RLS. Ver ADRs 0002-0004. **Aplicado al Supabase de Campero.**
- [x] **Seed inicial** — `20260804000002_seed_entidades.sql`: Campero + René con saldos
      iniciales (RAI Campero $15.594.809, SAC por código, F22 AT2025/AT2026, activo fijo,
      contratos socios). Registros de René = placeholder (falta desglose de su F22).
- [ ] **Verificar SAC** de Campero línea por línea contra el F22 (`verificado_vs_f22=false`).
- [ ] Auth — `src/lib/auth/context.tsx` viene del modelo multi-empleador de Poppins; adaptar
      al modelo `usuarios_permitidos` + `usuario_entidades` (acceso por entidad).
- [x] Proyecto Supabase propio creado (`ubeznuaenthtmszngfrk`) — no se reutilizó el de Poppins.
- [ ] **Hosting sin decidir** — el repo trae config de Cloudflare Workers (`wrangler.jsonc`,
      OpenNext), pero se evaluó mover a Vercel. Decidir antes del deploy.

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
