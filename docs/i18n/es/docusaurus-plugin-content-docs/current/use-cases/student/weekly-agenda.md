---
title: Tu agenda semanal
sidebar_label: Tu agenda semanal
---

# Tu agenda semanal

**Codex** · como alumno · `MOODLE_MCP_ROLE=student`

El agente revisa todos tus cursos en busca de lo que tienes que entregar y te dice lo que aún te queda por hacer.

## Lo que pides

> ¿Qué tengo que entregar en Moodle en las próximas dos semanas, en todos mis cursos? Ordénalo por fecha y dime qué me queda por hacer.

## La sesión

<Screenshot app="Codex" session="weekly-agenda" alt="Codex lista las tareas y el examen de las próximas dos semanas, y lo que queda por hacer" />

Lo que hizo el agente:

1. **Leyó tus fechas de entrega** en todos tus cursos (`list_deadlines`).
2. **Revisó cada tarea y el resumen de actividades de cada curso** (`get_assignment`, `get_activities_overview`) para distinguir lo que ya está hecho de lo que queda por hacer.
3. **Respondió por fechas**: una tarea vencida y sin entregar en otro curso, una ya entregada y calificada, y otra por entregar antes del 20 de octubre, con lo que pide cada una.

## Lo mismo, en Moodle

El calendario de Moodle también muestra un examen el 23 de octubre. No es una entrega, así que el agente no lo incluyó: pide «entregas y eventos del calendario» para tener las dos cosas.

<Screenshot app="Moodle" src="/img/moodle/upcoming.png" alt="Los próximos eventos de Moodle: dos tareas y un examen" />

## Consejos

- **Cada mañana**: "¿Qué tengo para hoy y mañana?" o "¿Qué ha cambiado en mis cursos desde ayer?"
- **Detalles**: "¿Qué pide exactamente la Práctica 2?" lee las instrucciones y los archivos de la tarea.
- **Solo las herramientas de alumno**: con `MOODLE_MCP_ROLE=student`, el agente recibe 83 herramientas en lugar de 235, y trabaja más rápido y mejor. Consulta [Limitar al agente](../../limits.md#tu-rol).
