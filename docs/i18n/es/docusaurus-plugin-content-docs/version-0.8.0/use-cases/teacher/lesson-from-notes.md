---
title: Una lección a partir de tus apuntes
sidebar_label: Una lección a partir de tus apuntes
---

# Una lección a partir de tus apuntes

**Claude Code** · como docente · ajustes por defecto

El agente convierte una página de apuntes en una lección de Moodle: una página por idea, cada una acabando con una pregunta, donde si se acierta se avanza y si se falla se vuelve a releer.

## Lo que pides

<Prompt>{`En mi curso de Moodle mcp-content, convierte la página "Apuntes: bucles" en una lección corta y oculta llamada "Bucles, paso a paso" en la primera sección: una página por idea, cada una acabando con una pregunta; si acierta pasa a la siguiente página, y si falla vuelve a la página que lo explica. Cuéntame el plan antes de crear nada.`}</Prompt>

Y, después de leer el plan:

<Prompt>{`Me parece bien, créala.`}</Prompt>

## La sesión

<Screenshot app="Claude Code" session="lesson-from-notes" alt="Claude Code planifica la lección a partir de los apuntes, la crea y revisa sus páginas" />

Lo que hizo el agente:

1. **Leyó los apuntes** y encontró tres ideas: qué es un bucle, el bucle `for` con su ejemplo y el bucle `while`.
2. **Propuso un plan** antes de cambiar nada: una página por idea, con la pregunta y sus respuestas en una tabla, y a dónde salta cada una. Avisó de que corregiría el ejemplo de código, que en los apuntes tenía un `\n` literal, y preguntó por la sección, por el formato de las páginas y por la nota.
3. **Creó la lección oculta y sus tres páginas** cuando le diste el visto bueno, cada respuesta con un mensaje breve y su salto: a la página siguiente, o de vuelta a la misma.
4. **Revisó las páginas** y vio que el filtro de emoticonos de Moodle había convertido el `(n)` de `range(n)` en un icono; lo corrigió poniendo la *n* en cursiva y comprobó que ya salía bien.

## El resultado en Moodle

<Screenshot app="Moodle" src="/img/moodle/lesson.png" alt="Las páginas de la lección en la vista de edición de Moodle, con cada respuesta, su mensaje y su salto" />

## Consejos

- **Di cómo debe ramificarse.** "Si falla, vuelve", "si falla, va a una explicación extra", "la lección termina tras la última pregunta": el agente pone el salto de cada respuesta.
- **También páginas de contenido.** Pide "una página de contenido antes de cada pregunta" y la explicación y la pregunta irán en páginas separadas.
- **Con nota o de práctica.** Una lección se califica sobre 100 por defecto; di "una lección de práctica, sin nota" si lo prefieres.
- **Intentos por pregunta.** Moodle permite por defecto un solo intento por pregunta y después pasa a la siguiente aunque se haya fallado; pide "intentos ilimitados" para que el salto de vuelta funcione siempre.
- **Pruébala como alumno** antes de enseñarla: abre su enlace en la vista previa de Moodle, o pide al agente que la haga visible cuando esté lista.
