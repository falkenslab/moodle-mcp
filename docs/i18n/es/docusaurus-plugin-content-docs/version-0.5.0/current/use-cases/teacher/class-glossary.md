---
title: El glosario de la clase
sidebar_label: El glosario de la clase
---

# El glosario de la clase

**Codex** · como docente · ajustes por defecto

Tu alumnado define las palabras de la unidad en un glosario que espera tu aprobación. El agente revisa cada definición pendiente, te dice cuáles están bien y qué falla en las demás, y solo aprueba lo que tú digas.

## Lo que pides

> En el glosario "Glosario de la clase" de mi curso mcp-content, ¿qué entradas están esperando mi aprobación? Revisa cada definición: dime cuáles están bien y qué falla en las demás. No apruebes nada todavía.

Y después:

> Aprueba las correctas y deja esperando la incorrecta.

## La sesión

<Screenshot app="Codex" session="class-glossary" alt="Codex revisa tres entradas pendientes del glosario y aprueba las dos correctas" />

Lo que hizo el agente:

1. **Encontró el curso y el glosario** (`list_courses`, `get_course_structure`).
2. **Leyó las entradas pendientes de aprobación** (`list_glossary_entries`): "Iteración", "Contador" y "Bucle infinito".
3. **Revisó cada definición**: dos bien, con la nota de que un contador también puede disminuir; "Bucle infinito" mal, porque decía que el bucle se ejecuta una sola vez, y explicó qué es un bucle infinito. No aprobó nada.
4. **Aprobó las dos correctas** cuando se lo dijiste (`set_glossary_entry_approved`), y comprobó que "Bucle infinito" seguía siendo la única pendiente.

## El resultado en Moodle

<Screenshot app="Moodle" src="/img/moodle/glossary.png" alt="El glosario en Moodle con las dos entradas aprobadas y una todavía pendiente de aprobación" />

## Consejos

- **Quién escribió qué sigue siendo privado.** El agente ve al alumnado como alias; las definiciones sí le llegan, porque son el trabajo que tiene que revisar.
- **Rellénalo tú también**: "Añade las cinco palabras clave de la unidad 2, con una definición breve cada una" las añade; "Exporta el glosario" te da un fichero para reutilizarlo en otro curso.
