---
title: Solución de problemas
sidebar_label: Solución de problemas
---

# Solución de problemas

## La aplicación de IA no muestra moodle-mcp

- **Comprueba Node.js.** En un terminal, `node --version` debe mostrar `v20` o superior. Si acabas de instalar Node.js, reinicia la aplicación de IA (en Windows, cierra sesión y vuelve a entrar si sigue sin encontrarlo).
- **En Windows, usa `cmd /c`.** El comando debe ser `cmd` con los argumentos `/c npx -y @falkenslab/moodle-mcp`, como en las guías de [Claude Code](./getting-started/claude-code.md), [Claude Desktop](./getting-started/claude-desktop.md) y [Codex](./getting-started/codex.md).
- **Claude Desktop: revisa el archivo.** Si falta una coma o unas comillas en `claude_desktop_config.json`, no se carga ningún servidor. Pega el archivo en un validador de JSON, corrígelo y reinicia Claude Desktop del todo.
- **Codex: dale tiempo.** El primer arranque descarga moodle-mcp. Pon `startup_timeout_sec = 120` como en la [guía de Codex](./getting-started/codex.md#3-dale-tiempo-para-arrancar).
- **Mira los registros.** En Claude Code, `claude mcp list` y el comando `/mcp` muestran el error. Claude Desktop escribe sus registros en `%APPDATA%\Claude\logs` (Windows) o `~/Library/Logs/Claude` (macOS), en `mcp-server-moodle.log`.

## La ventana de acceso no deja de aparecer

- Inicia sesión en la ventana que se abre y espera a que se cierre sola. Te espera 5 minutos.
- Si se abre otra vez en cada petición, puede que tu sitio cierre las sesiones al cerrar el navegador. Marca *Recordarme* en la página de acceso, si tu sitio lo tiene.
- Después de actualizar moodle-mcp, puede que un perfil necesite un inicio de sesión más, porque la biblioteca del navegador a veces cambia dónde guarda la sesión.

## "Descargando un navegador"

No hay Edge ni Chrome en tu ordenador, así que moodle-mcp está descargando Chromium (unos 180 MB), una sola vez. Vuelve a intentarlo en un minuto o dos. Para usar un navegador que ya tengas, pon `MOODLE_MCP_CHANNEL`.

## No se puede abrir ninguna ventana

En un servidor o en un contenedor sin pantalla, la ventana de acceso no se puede abrir. Inicia sesión en un ordenador con pantalla y copia esa carpeta de perfil (`~/.moodle-mcp/profile`) al servidor, o apunta `MOODLE_MCP_PROFILE_DIR` a ella.

## El perfil está en uso

Otro programa tiene el perfil abierto: una segunda aplicación de IA con moodle-mcp, o el comando de moodle-driver. Ciérralo, o da a cada uno su propio perfil con `MOODLE_MCP_PROFILE_DIR`.

## El agente dice que no puede hacer algo

- **Puede que tus límites dejen fuera una herramienta.** Pregúntale al agente por los límites actuales de moodle-mcp y compáralos con [Limitar al agente](./limits.md).
- **Puede que tu cuenta de Moodle no tenga permiso.** moodle-mcp solo puede hacer lo que puede hacer tu cuenta en Moodle. Prueba lo mismo en tu navegador.
- **Puede que los datos del alumnado estén bloqueados o seudonimizados.** Algunas cosas, como los archivos que han entregado los alumnos, necesitan `clear`. Consulta [Privacidad del alumnado](./privacy.md).

## Una herramienta tarda demasiado, o se agota el tiempo

Algunas tareas de Moodle son lentas: una copia de seguridad de un curso, importar muchas preguntas, calificar muchas entregas. Las actividades hechas como alumno van a propósito al ritmo de un lector ([`MOODLE_MCP_TRAIL`](./settings.md)). En Codex, sube `tool_timeout_sec`. En Claude Code, pon la variable de entorno `MCP_TOOL_TIMEOUT` (en milisegundos) antes de arrancarlo.

## Otra cosa

[Abre una incidencia](https://github.com/falkenslab/moodle-mcp/issues) con lo que pediste, lo que pasó y tu versión de Moodle. No incluyas nombres ni nada sobre tus alumnos.
