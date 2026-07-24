# 0001 — Modelar "empresa" como tabla, aunque hoy tenga una sola fila

**Estado:** Aceptado (decisión de Manuel, 2026-07-23, vía conversación con Claude)

## Contexto

Campero ERP es single-tenant (una sola empresa: Campero). La alternativa más simple era
no modelar "empresa" como entidad — hardcodear el RUT de Campero en el código y dejar que
todas las demás tablas (colaboradores, períodos, etc.) no lleven `empresa_id`.

## Decisión

Se crea una tabla `empresas` con una sola fila, y toda tabla relevante lleva `empresa_id`
como FK.

## Por qué

- El régimen tributario de Campero no es constante: hoy es 14A, es candidato a Pro Pyme
  14D N°3 desde 2027. Modelarlo requiere una entidad "empresa" a la que atarle ese
  historial (ver ADR 0002).
- Si Campero ERP se reutiliza para otro cliente de Manuel más adelante, el cambio es
  agregar una fila, no rediseñar el schema.
- El costo de tenerla ahora es mínimo (un join adicional en las queries).

## Alternativa descartada

No tener tabla `empresas` y hardcodear el RUT/razón social en el código de la app. Más
simple hoy, pero obliga a un rediseño completo si algo de lo anterior cambia.
