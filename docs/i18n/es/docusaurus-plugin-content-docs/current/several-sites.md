---
title: Varios sitios Moodle
sidebar_label: Varios sitios
---

# Varios sitios Moodle

Un mismo moodle-mcp puede trabajar con varios sitios Moodle: el de tu centro y el de tu universidad, el del curso pasado y el de este, o dos cuentas en el mismo sitio (tu cuenta de profesor y un alumno de prueba). Los conoce todos y trabaja en **uno cada vez, el sitio activo**; tú le dices al agente cuándo cambiar.

## Configurar tus sitios

Dalos en `MOODLE_MCP_SITES`, como lista o como JSON. El primero es el activo al arrancar.

<Terminal>{`
$ claude mcp add moodle -e MOODLE_MCP_SITES=centro=https://campus.example.org,uni=https://moodle.uni.example.es -- npx -y @falkenslab/moodle-mcp
`}</Terminal>

- **Una lista:** sitios separados por comas, cada uno `nombre=url`, o solo su URL, que le da como nombre su host (`https://campus.example.org` es el sitio `campus.example.org`).
- **JSON:** `{"centro": "https://campus.example.org", "uni": {"url": "https://moodle.uni.example.es"}}`. Cómodo en un fichero de configuración; en la línea de comandos, la lista es más fácil de escribir.
- Los nombres son cortos: letras, números, puntos y guiones. Dos cuentas en un mismo sitio son dos sitios con nombres distintos: `profesor=https://campus.example.org,alumno=https://campus.example.org`.

`MOODLE_URL` sigue funcionando, sola o junto a `MOODLE_MCP_SITES`: su sitio va primero.

## Cambiar de sitio

Pídelo con tus palabras:

> Cambia al Moodle de la universidad.

El agente llama a `use_site`, y desde entonces todas las herramientas trabajan en ese sitio. La primera vez que usas un sitio, se abre una ventana del navegador para que inicies sesión allí, igual que con el primero. Cada sitio guarda su propia sesión.

Para verlos todos:

> ¿Qué sitios Moodle conoces?

## Añadir un sitio mientras trabajas

No hace falta cambiar la configuración para añadir un sitio: pídeselo al agente.

> Añade el sitio Moodle https://moodle.uni.example.es, como «uni».

El sitio se guarda para las siguientes sesiones. Para olvidarlo, y borrar su sesión:

> Quita el sitio «uni».

El agente te pregunta antes. Los sitios de tu configuración solo se quitan ahí.

## Dónde se guardan las sesiones

Cada sitio tiene su propio perfil de navegador, y por tanto su propia sesión:

- El primer sitio conserva el de siempre, `~/.moodle-mcp/profile` (o `MOODLE_MCP_PROFILE_DIR`): si ya usabas moodle-mcp, no tienes que volver a iniciar sesión.
- El de cada sitio más está en `~/.moodle-mcp/sites/<nombre>/profile`, y los sitios que añadiste mientras trabajabas están en `~/.moodle-mcp/sites.json`.
- Cuando moodle-mcp funciona dentro de un plugin de Claude Code, todo eso va en la carpeta de datos del propio plugin, y se borra con él.

## Privacidad y límites

- **El alumnado es anónimo en todos los sitios.** Cada sitio tiene sus propios alias: nadie de un sitio queda enlazado con nadie de otro.
- **Tus límites valen igual para todos los sitios**: el rol, el acceso de solo lectura, los ámbitos y el nivel de datos del alumnado son del servidor, no de un sitio. Consulta [Limitar al agente](./limits.md).
