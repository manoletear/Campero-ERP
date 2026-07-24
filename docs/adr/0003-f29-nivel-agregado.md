# 0003 — F29 a nivel agregado por período, no factura por factura

**Estado:** Aceptado (decisión de Claude, luz verde de Manuel para avanzar con IVA/F29 —
2026-07-23; el detalle de campos no se revisó línea por línea con él)

## Contexto

Había que decidir cómo entra la información de IVA al sistema: ¿se registra cada factura
de venta/compra individualmente y el F29 se calcula sumando (como haría un ERP contable
completo), o se registran directamente los totales mensuales que van al formulario, tal
como Manuel los obtiene hoy de la Carpeta Tributaria / Libro de Compra-Venta?

## Decisión

`f29_periodos` guarda los totales agregados por período (ventas afectas/exentas, débito
fiscal, compras afectas, crédito fiscal, remanente, PPM), uno por período — no hay tablas
de facturas individuales todavía.

## Por qué

- Es exactamente el nivel de detalle que Manuel maneja hoy (saca los totales del portal
  SII/Buk, no factura por factura desde cero).
- Evita construir un sub-libro de compras/ventas completo (con proveedores, clientes,
  folios de factura, etc.) cuando no está claro que se necesite — eso es una app de
  facturación aparte, no lo que se pidió.
- Es reversible sin perder trabajo: si más adelante se quiere trazabilidad factura por
  factura, se agregan tablas `facturas_venta` / `facturas_compra` y `f29_periodos` pasa a
  ser una vista o un resumen calculado, sin tocar lo ya construido.

## Riesgo / pendiente

Los nombres y tipos de campo (`ventas_afectas`, `iva_debito_fiscal`, etc.) siguen la
terminología del propio Formulario 29, pero no se revisaron línea por línea con Manuel —
confirmar contra un F29 real de Campero antes de usar esto en producción.
