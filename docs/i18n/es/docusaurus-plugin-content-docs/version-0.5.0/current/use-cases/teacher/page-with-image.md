---
title: Una página con una imagen
sidebar_label: Una página con una imagen
---

# Una página con una imagen

**Claude Code** · como docente · ajustes por defecto

El agente escribe una página para tu curso y sube a ella una imagen de tu ordenador, para que forme parte de la página y no sea un enlace.

## Lo que pides

> En mi curso de Moodle mcp-content, crea una página oculta llamada "Cómo funciona un bucle for" en la primera sección, con una explicación breve para principiantes y este diagrama dentro: /home/teacher/Pictures/for-loop.png

Indica la ruta completa de la imagen en tu ordenador, como `C:\Users\you\Pictures\diagram.png` en Windows.

## La sesión

<Screenshot app="Claude Code" session="page-with-image" alt="Claude Code crea la página con el diagrama y comprueba que se ha subido" />

Lo que hizo el agente:

1. **Reconoció la imagen.** Claude Code convirtió la ruta del fichero en una imagen adjunta (`[Image #1]`), así que Claude también pudo ver el diagrama y explicarlo.
2. **Encontró la primera sección del curso** (`get_course_structure`).
3. **Creó la página** con una explicación que sigue los pasos del diagrama, y la imagen subida dentro (`create_activity`).
4. **Comprobó el resultado** volviendo a leer la página (`get_activity_content`), te dio su enlace y te avisó de que en esa sección ya había otra página sobre el mismo tema, sin tocarla.

## El resultado en Moodle

<Screenshot app="Moodle" src="/img/moodle/page-with-image.png" alt="La página nueva en Moodle con la explicación y el diagrama" />

## Consejos

- **Cualquier recurso**: etiquetas, URL, archivos, carpetas con varios archivos, libros. "Crea una carpeta con estos tres PDF" los sube.
- **Las restricciones y la finalización** van en la misma petición: "visible a partir del lunes", "solo después de completar el cuestionario", "marcar como hecha al verla".
- **Edítala después**: "Añade un segundo ejemplo a la página Cómo funciona un bucle for" cambia la página sin crear otra.
