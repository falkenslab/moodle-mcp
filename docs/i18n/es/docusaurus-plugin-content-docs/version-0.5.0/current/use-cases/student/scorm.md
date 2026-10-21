---
title: Una actividad SCORM
sidebar_label: Una actividad SCORM
---

# Una actividad SCORM

**Codex** · como alumno · `MOODLE_MCP_ROLE=student`

Los paquetes SCORM son lecciones interactivas que se ejecutan dentro del reproductor de Moodle, cada una con su propio diseño. moodle-mcp abre el reproductor como lo harías tú, y el agente recorre las pantallas del paquete con las herramientas del navegador.

## Lo que pides

> En mi curso de Moodle mcp-content, haz la actividad SCORM "SCORM MCP (prueba)" en un intento nuevo, respondiendo sus preguntas lo mejor que puedas, y después dime qué nota ha registrado Moodle.

## La sesión

<Screenshot app="Codex" session="scorm" alt="Codex abre un intento SCORM nuevo, responde a sus preguntas en el reproductor e informa de una nota del 100 %" />

Lo que hizo el agente:

1. **Leyó el estado de la actividad** (`get_scorm`): los intentos permitidos y hechos, y el método de calificación.
2. **Abrió un intento nuevo** en el reproductor SCORM de Moodle (`open_scorm`).
3. **Recorrió el paquete** con las herramientas del navegador (`browser_snapshot` para leer la pantalla, `browser_click` y `browser_type` para responder).
4. **Leyó la nota que registró Moodle** (`get_scorm`).

## El resultado en Moodle

<Screenshot app="Moodle" src="/img/moodle/scorm.png" alt="La actividad SCORM en Moodle con la nota del intento" />

## Consejos

- **Al ritmo de una persona**: por defecto, las actividades hechas como alumno van página a página y con pausas, para que Moodle las registre como lo haría contigo. Consulta [`MOODLE_MCP_TRAIL`](../../settings.md).
- **Tu aprendizaje, tu decisión**: un agente puede hacer una actividad por ti, pero eres tú quien debería aprender con ella. Pídele que te guíe por las preguntas: "Abre la actividad SCORM y ayúdame con cada pregunta, sin responder por mí."
- **Cuestionarios, lecciones, encuestas, consultas y H5P** tienen sus propias herramientas, así que no necesitan el navegador.
