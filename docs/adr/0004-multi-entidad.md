# 0004 — ERP multi-entidad (supera ADR 0001)

**Estado:** Aceptado (decisión de Manuel, 2026-08-03/04)

## Contexto

El ADR 0001 asumió single-tenant (una sola empresa: Campero). En la práctica Manuel
administra la contabilidad completa de DOS contribuyentes, ambos en régimen 14A con
contabilidad completa:

- **Campero Ltda** (RUT 77.488.690-7) — sociedad. Giro real medios (antena TV/radio),
  inmobiliario y publicidad. Tres socios al 33%.
- **René Aravena Riffo** (RUT 6.836.579-1) — persona natural, empresario individual. Giro
  inmobiliario (30 propiedades, arriendo exento tipo 34).

No son el mismo contribuyente y hay operaciones entre ellos (René arrienda 4 inmuebles a
Campero, ~$18,16M/año) que caen en normas de relacionados (Art. 41 E LIR, DJ 1907). Un
modelo single-tenant no puede sostener esto.

## Decisión

El modelo es multi-entidad. La tabla se llama `entidades` (con columna `tipo`:
`sociedad` | `persona_natural`) y **toda tabla del dominio lleva `entidad_id`** como raíz.
El RLS es por entidad: un usuario ve solo las entidades que tiene asignadas vía
`usuario_entidades` (función `puede_ver_entidad(uuid)`).

Se descartó el `usuarios_permitidos` single-tenant del schema original.

## Por qué

- Dos contribuyentes reales, con régimen, giros y registros empresariales propios.
- Operaciones con relacionados entre ambos exigen tenerlos en el mismo sistema, distinguidos.
- El costo es bajo: `entidad_id` + RLS por entidad; el modelo ya lo asume desde la raíz.

## Consecuencias

- Cada entidad tiene su propio `entidad_regimen_historial`, `registros_empresariales`,
  `sac_detalle`, `f22_declaraciones`, `f29_periodos`, activos, propiedades y colaboradores.
- Los módulos tributarios aplican a ambas (las dos son 14A completo). Diferencias reales:
  Campero es sociedad con socios/retiros; René es empresario individual con 30 propiedades
  y usa depreciación acelerada (DDAN).
- `contratos_arriendo` guarda `arrendatario_entidad_id` + `es_relacionado` para captar la
  relación René → Campero.

## Alternativa descartada

Mantener single-tenant y crear un segundo despliegue/BD para René. Duplica infraestructura,
impide cruzar las operaciones con relacionados y multiplica el mantenimiento.
