# 0002 — Régimen tributario como historial temporal, no columna fija

**Estado:** Aceptado (decisión de Claude, no confirmada explícitamente por Manuel — revisar)

## Contexto

Campero está en régimen 14A (General Semi Integrado). Existe una evaluación abierta
(ver ficha tributaria del proyecto "Contabilidad Panguipulli") de pasarse a Pro Pyme
14D N°3 antes de la ventana enero-abril 2027.

## Decisión

`empresa_regimen_historial` es una tabla de historial (empresa_id, regimen, vigente_desde,
vigente_hasta), no una columna `regimen` en `empresas`. Un constraint de exclusión impide
tener dos regímenes abiertos (`vigente_hasta is null`) a la vez para la misma empresa.

## Por qué

- El régimen no es un dato estático — es exactamente el tipo de cosa que cambia y que
  además hay que poder consultar históricamente ("¿qué régimen tenía Campero en el AT2025
  cuando declaró ese F22?"). Una columna simple pierde esa historia en el momento del cambio.
- Las liquidaciones y el cálculo de depreciación instantánea (solo disponible en 14D N°3)
  dependen de qué régimen estaba vigente en la fecha del hecho, no del régimen actual.

## Riesgo / pendiente

Esta decisión la tomé yo (Claude) sin habérsela puesto explícitamente a Manuel como
pregunta — la marco como ADR igual porque cumple los tres criterios (difícil de revertir,
no obvia, trade-off real), pero corresponde confirmarla con él antes de darla por cerrada
del todo.
