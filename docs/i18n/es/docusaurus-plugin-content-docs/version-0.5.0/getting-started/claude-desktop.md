---
title: Configurar Claude Desktop
sidebar_label: Claude Desktop
---

# Configurar Claude Desktop

[Claude Desktop](https://claude.ai/download) es la app de Claude para Windows y macOS. Añades moodle-mcp a su fichero de configuración una vez, y está en todos los chats.

## Empezar

1. En Claude Desktop, ve a **Settings** (en Windows, el menú ☰ → *File* → *Settings*; en macOS, *Claude* → *Settings*), elige **Developer** y pulsa **Edit Config**. Abre la carpeta con `claude_desktop_config.json` (`%APPDATA%\Claude` en Windows, `~/Library/Application Support/Claude` en macOS): abre ese fichero con un editor de texto.
2. Pega esto, con **la dirección de tu sitio Moodle** en lugar de `https://campus.example.org`. Si el fichero ya tiene servidores bajo `mcpServers`, añade el bloque `"moodle": { … }` junto a ellos, con una coma entre bloques.

   ```json title="claude_desktop_config.json"
   {
     "mcpServers": {
       "moodle": {
         "command": "npx",
         "args": ["-y", "@falkenslab/moodle-mcp"],
         "env": { "MOODLE_URL": "https://campus.example.org" }
       }
     }
   }
   ```

3. Cierra Claude Desktop del todo (en Windows, también desde el icono junto al reloj) y vuelve a abrirlo. En un chat nuevo, el botón de **herramientas** (los deslizadores bajo el cuadro de mensaje) lista `moodle` con sus herramientas; si no, consulta [Solución de problemas](../troubleshooting.md): lo habitual es una coma o unas comillas que faltan.
4. Pide **"Lista mis cursos de Moodle"**. La primera vez se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre ([Iniciar sesión la primera vez](./first-login.md)).

Cada línea de `env` es un [ajuste](../settings.md). Sin `MOODLE_URL`, Claude te pide tu sitio la primera vez.

## Qué darle

Claude Desktop tiene una sola configuración para todos los chats, así que la elección es qué recibe moodle-mcp ahí. Tres habituales, iguales para docentes y alumnos; solo cambia el rol: `"MOODLE_MCP_ROLE": "teacher"` o `"student"` deja las herramientas de lo que haces.

### Todo tu sitio

El bloque de [Empezar](#empezar), con tu rol:

```json
"env": { "MOODLE_URL": "https://campus.example.org", "MOODLE_MCP_ROLE": "teacher" }
```

- **Por qué**: todo lo que haces en Moodle, desde cualquier chat.
- **Ojo**: el agente ve todos tus cursos, también los del año pasado.

### Solo tus aulas

Los cursos de este año, por su URL, en uno o varios sitios: los sitios salen de las URL, así que no hay `MOODLE_URL`.

```json
"env": {
  "MOODLE_MCP_COURSES": "https://campus.example.org/course/view.php?id=12,https://campus.example.org/course/view.php?id=15",
  "MOODLE_MCP_ROLE": "teacher"
}
```

- **Por qué**: el agente no puede tocar otro curso, ni por error con un nombre parecido. Consulta [Aulas](../limits.md#aulas).
- **Ojo**: un curso nuevo es una URL más en la lista, y un reinicio.

### Un asistente de solo lectura

Para preguntar por tus cursos (qué hay pendiente, cómo va la clase) sin que el agente pueda cambiar nada:

```json
"env": { "MOODLE_URL": "https://campus.example.org", "MOODLE_MCP_ACCESS": "read" }
```

- **Por qué**: puedes darle *Allow always* a todas las herramientas sin preocuparte, porque ninguna cambia Moodle.
- **Ojo**: para calificar, publicar o crear, vuelve a cambiarlo.

Se combinan: aulas y solo lectura a la vez, por ejemplo.

## Mientras lo usas

**Claude te pide permiso la primera vez que usa cada herramienta**: *Allow once* o *Allow always*. Deja las que cambian Moodle (calificar, publicar, crear) en *Allow once*, salvo que el acceso sea de solo lectura.

**Lo que no se puede deshacer te lo vuelve a preguntar** el propio moodle-mcp, antes de borrar una actividad, dar de baja a alguien o reiniciar un curso: no se hace nada hasta que dices que sí, y tienes diez minutos para contestar. Tu aplicación tiene que admitir estas preguntas (elicitación MCP); si no, esas herramientas se rechazan con un mensaje que lo dice. Consulta [Confirmar lo que no se puede deshacer](../limits.md#confirmar-lo-que-no-se-puede-deshacer).

## Cambiarlo o quitarlo

Edita el bloque `env` de `claude_desktop_config.json`, o quita el bloque `"moodle"`, y después cierra Claude Desktop y vuelve a abrirlo.
