---
title: Una encuesta de fin de unidad
sidebar_label: Una encuesta de fin de unidad
---

# Una encuesta de fin de unidad

**Claude Code** · como docente · ajustes por defecto

El agente crea una encuesta (feedback) anónima con las preguntas que describes, eligiendo para cada una el tipo de pregunta que necesita Moodle: una valoración, una elección, una respuesta abierta.

## Lo que pides

> En mi curso de Moodle mcp-content, crea una encuesta (feedback) oculta y anónima llamada "¿Qué tal la unidad 1?" al final de la primera sección, con tres preguntas: lo clara que ha sido la unidad, del 1 al 5; qué actividad ayudó más (los apuntes, el cuestionario o el foro); y una abierta para sugerencias. Dime primero qué vas a crear.

Y después:

> Sí, créala.

## La sesión

<Screenshot app="Claude Code" session="feedback-survey" alt="Claude Code planifica la encuesta y sus preguntas, la crea y comprueba el resultado" />

Lo que hizo el agente:

1. **Describió lo que iba a crear** sin cambiar nada: una encuesta oculta y anónima al final de la sección 1, la pregunta del 1 al 5 como opción múltiple con valoración (para que el informe dé la media), una elección de respuesta única y una respuesta de texto largo. Preguntó si por "primera sección" te referías a la General.
2. **Creó la actividad** cuando le diste el visto bueno, oculta y anónima.
3. **Añadió las tres preguntas** en orden, ninguna obligatoria, como había propuesto.
4. **Comprobó en Moodle cómo quedó** y te dijo qué revisar antes de enseñarla: no tiene fechas de apertura ni de cierre, cada persona responde una vez y el alumnado no ve la página de resultados.

## El resultado en Moodle

<Screenshot app="Moodle" src="/img/moodle/feedback.png" alt="Las tres preguntas de la encuesta en Moodle: una valoración del 1 al 5, una elección de actividad y una respuesta abierta" />

## Consejos

- **Responde a las preguntas del agente**, o dile que siga con lo que propone: en cualquier caso te dice lo que eligió.
- **Fechas y finalización** van en la misma petición: "abierta de lunes a viernes", "completada al enviarla".
- **Reutilízala**: "guárdala como plantilla" conserva las preguntas para la encuesta de la siguiente unidad.
