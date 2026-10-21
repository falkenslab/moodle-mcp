---
title: Apuntes para estudiar
sidebar_label: Apuntes para estudiar
---

# Apuntes para estudiar

**Claude Code** · como alumno · `MOODLE_MCP_ROLE=student`

El agente lee las páginas y los libros del curso, y los convierte en una hoja de estudio: las ideas clave y un ejemplo de cada una.

## Lo que pides

> Lee la página "Apuntes: bucles" y el libro "Libro: funciones" de mi curso de Moodle mcp-content, y hazme una hoja de estudio de una página con las ideas clave y un ejemplo de cada una.

## La sesión

<Screenshot app="Claude Code" session="study-notes" alt="Claude Code lee una página y un libro y escribe una hoja de estudio sobre bucles y funciones" />

Lo que hizo el agente:

1. **Encontró la página y el libro** en el curso (`get_course_structure`).
2. **Los leyó** (`get_activity_content`): el texto y el código de la página, y todos los capítulos del libro.
3. **Escribió la hoja de estudio**, y dijo dónde se quedaba corto el material del curso y qué ejemplos había añadido por su cuenta.

## El material del curso

La página que leyó el agente, tal como se ve en Moodle:

<Screenshot app="Moodle" src="/img/moodle/study-page.png" alt="La página Apuntes: bucles en Moodle" />

## Consejos

- **Pide un archivo**: en Claude Code o Codex, "guárdala como `loops.md`" escribe la hoja en tu carpeta.
- **Ponte a prueba**: "Hazme cinco preguntas sobre este tema, de una en una, y corrige mis respuestas."
- **También archivos**: los PDF y otros archivos del curso se pueden descargar y leer ("Resume el PDF del tema 2").
