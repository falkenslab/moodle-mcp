---
title: Copiar entre sitios Moodle
sidebar_label: Copiar entre sitios
---

# Copiar entre sitios Moodle

**Claude Code** · como docente · dos sitios en `MOODLE_MCP_SITES`

Si das clase en más de un Moodle, el agente puede copiar contenido de un curso de uno a otro: una actividad, una sección o un curso entero. moodle-mcp lo hace con la copia de seguridad y la restauración del propio Moodle, así que el contenido llega con sus ajustes y sus ficheros, sin datos de personas y sin pasar por la IA.

## Prepararlo

Dale a moodle-mcp los dos sitios, cada uno con un nombre corto (consulta [Varios sitios](../../several-sites.md)):

<Terminal>{`
$ claude mcp add moodle -e MOODLE_MCP_SITES=school=https://campus.example.org,uni=https://moodle.uni.example.es -- npx -y @falkenslab/moodle-mcp
`}</Terminal>

La primera vez que el agente usa cada sitio, inicias sesión en él en la ventana del navegador que abre.

:::note Sobre esta sesión
Nuestro entorno de pruebas tiene un solo Moodle, así que en esta sesión `school` y `uni` son el mismo Moodle de pruebas con dos nombres, cada uno con su propia sesión, y la petición lo dice: si no, el agente se da cuenta de que los dos son el mismo sitio y pide la dirección real del segundo. Con dos sitios reales, pídelo igual que aquí, sin esa primera frase.
:::

## Lo que pides

> Para esta demostración, mis sitios Moodle «school» y «uni» son el mismo Moodle de pruebas con dos nombres. Copia la página "Apuntes: bucles" de mi curso mcp-content en «school» al mismo curso en «uni», al final de su última sección. Dime antes qué vas a hacer.

Después: "Sí, adelante."

## La sesión

<Screenshot app="Claude Code" session="copy-between-sites" alt="Claude Code planifica la copia de una página entre dos sitios Moodle y la copia tras tu confirmación" />

Lo que hizo el agente:

1. **Encontró el curso, la página y la última sección**, solo leyendo (`get_course_structure`), sin cambiar nada todavía.
2. **Explicó su plan y esperó** tu confirmación: qué iba a copiar, de dónde a dónde, y que con dos nombres para un mismo Moodle el curso acabaría con dos copias de la página.
3. **Copió la página** (`copy_between_sites`): una copia de seguridad solo de esa página en `school`, anónima y sin datos de personas, restaurada al final de la última sección del curso en `uni`. El fichero de la copia se quedó en este ordenador y se borró después.
4. **Comprobó el resultado** volviendo a leer el curso, y te dijo qué había creado (el id de la nueva página), que Moodle no dio avisos y que `school` seguía siendo el sitio activo.

## El resultado en Moodle

La página copiada al final de la última sección del curso:

<Screenshot app="Moodle" src="/img/moodle/copied-page.png" alt="La página copiada al final de la última sección del curso en Moodle" />

## Consejos

- **Más de una cosa a la vez**: "Copia las secciones 2 y 3", o "copia el curso entero en un curso nuevo de la categoría Programación". Las secciones llegan como secciones nuevas después de la que elijas.
- **Revisa lo que te dice**: una actividad que dependía de algo que no se copió (una restricción sobre otra actividad, un enlace a ella) aparece en la lista para que la arregles en el sitio nuevo.
- **Dentro de un mismo sitio**, el agente copia con la importación del propio Moodle (`import_activities`, `copy_course`).
