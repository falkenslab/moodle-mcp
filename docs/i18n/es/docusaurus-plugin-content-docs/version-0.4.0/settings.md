---
title: Ajustes
sidebar_label: Ajustes
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Ajustes

Nada es obligatorio. Sin un sitio, el agente te pide uno la primera vez. Todo lo demás tiene un valor por defecto razonable.

## Dónde van los ajustes

Los ajustes son variables de entorno en la configuración de moodle-mcp de tu aplicación de IA:

<Tabs groupId="client">
<TabItem value="claude-code" label="Claude Code" default>

Un `-e NOMBRE=valor` por cada uno, al añadir el servidor:

```bash
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -- npx -y @falkenslab/moodle-mcp
```

Para cambiarlos después, `claude mcp remove moodle` y vuelve a añadirlo.

</TabItem>
<TabItem value="claude-desktop" label="Claude Desktop">

En el bloque `env` de `claude_desktop_config.json`, y después reinicia Claude Desktop:

```json
"env": {
  "MOODLE_URL": "https://campus.example.org",
  "MOODLE_MCP_ROLE": "teacher"
}
```

</TabItem>
<TabItem value="codex" label="Codex">

En la sección `[mcp_servers.moodle.env]` de `~/.codex/config.toml`:

```toml
[mcp_servers.moodle.env]
MOODLE_URL = "https://campus.example.org"
MOODLE_MCP_ROLE = "teacher"
```

</TabItem>
</Tabs>

Cada ajuste también puede ser un argumento de línea de comandos después del nombre del paquete (como `npx -y @falkenslab/moodle-mcp --role teacher`). Si se dan los dos, gana el argumento.

## Todos los ajustes

| Variable | Argumento | Por defecto | Qué hace |
| --- | --- | --- | --- |
| `MOODLE_URL` | `--url` | ninguno | Tu sitio Moodle, como `https://campus.example.org`. Vale cualquier página del sitio. |
| `MOODLE_MCP_SITES` | `--sites` | ninguno | Varios sitios, el primero activo: `nombre=url,…` o JSON. Consulta [Varios sitios](./several-sites.md). |
| `MOODLE_MCP_STUDENT_DATA` | `--student-data` | `pseudonymize` | Lo que ve la IA de otras personas: `block`, `pseudonymize` o `clear`. Consulta [Privacidad del alumnado](./privacy.md). |
| `MOODLE_MCP_ROLE` | `--role` | `all` | Solo las herramientas de un rol: `teacher`, `student` o `all`. Consulta [Limitar al agente](./limits.md#tu-rol). |
| `MOODLE_MCP_ACCESS` | `--access` | `write` | `read` deja solo las herramientas que no cambian nada. Consulta [Limitar al agente](./limits.md#solo-lectura). |
| `MOODLE_MCP_ADVANCED` | `--advanced` | `false` | `true` añade las herramientas avanzadas: BigBlueButton, competencias, herramientas externas (LTI), el banco de contenido, notas y bloques del curso. Consulta [Limitar al agente](./limits.md#herramientas-avanzadas). |
| `MOODLE_MCP_SCOPES` | `--scopes` | `all` | Los tipos de herramientas: un perfil o una lista de ámbitos. Consulta [Limitar al agente](./limits.md#ámbitos). |
| `MOODLE_MCP_PROFILE_DIR` | `--profile-dir` | `~/.moodle-mcp/profile` | La carpeta del perfil del navegador que guarda tu sesión (la del primer sitio, si hay varios). Dentro de un plugin de Claude Code, la guarda en su lugar la carpeta de datos del plugin. |
| `MOODLE_MCP_CHANNEL` | `--channel` | Edge, después Chrome, después Chromium | Qué navegador usar: `msedge`, `chrome` o `chromium`. |
| `MOODLE_MCP_HEADLESS` | `--headless` / `--headed` | `true` | `false` trabaja siempre con una ventana visible. Para iniciar sesión siempre se muestra una. |
| `MOODLE_MCP_DOWNLOAD_BROWSER` | `--no-download-browser` | `true` | `false` no descarga nunca Chromium cuando no hay Edge ni Chrome. |
| `MOODLE_MCP_TRAIL` | `--trail` | `realistic` | Las actividades hechas como alumno: `realistic` (páginas reales, al ritmo de un lector, para que Moodle registre las visitas y la finalización) o `fast`. |

Un ajuste vacío, o que tu aplicación pasa como un `${…}` sin sustituir (como hace Codex con los ajustes de un plugin), cuenta como no puesto: se aplica su valor por defecto, y `server_info` lista los que llegaron así. Sin sitio, el agente te pide la dirección de tu Moodle y la añade.

## Cambiar ajustes durante un chat

El agente puede cambiar algunos ajustes para el resto de la sesión, con su herramienta `configure`. Puede poner el sitio si no se dio ninguno, y puede hacer los límites más estrictos (menos herramientas, más privacidad), pero nunca más permisivos que tu configuración. Por ejemplo:

> En este chat, trabaja solo con el contenido del curso, nada sobre el alumnado.

## Compartir la sesión con moodle-driver

Si también usas el comando `moodle` de [moodle-driver](https://falkenslab.github.io/moodle-driver/), los dos pueden compartir un mismo inicio de sesión: apunta `MOODLE_MCP_PROFILE_DIR` al perfil del comando para tu sitio, `~/.moodle-driver/sites/<host>/profiles/<account>`. Un perfil solo puede estar abierto en un navegador a la vez, así que los dos no pueden usarlo al mismo tiempo.
