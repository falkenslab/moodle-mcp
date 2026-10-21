---
title: Ajustes
sidebar_label: Ajustes
---

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Ajustes

Ninguno es obligatorio. Sin sitio, el agente te lo pide la primera vez. Todo lo demás tiene un valor por defecto razonable.

## En corto {#in-short}

Cada ajuste es una variable de entorno del servidor, o un argumento de línea de comandos después del nombre del paquete (entre paréntesis); si se dan los dos, gana el argumento. Cuando los valores son una elección, el valor por defecto va en negrita.

- **`MOODLE_URL`** (`--url`): Tu sitio Moodle. Sin él, el agente te lo pide.
  - Su dirección, como `https://campus.example.org`. Vale cualquier página del sitio.
- **`MOODLE_MCP_SITES`** (`--sites`): Varios sitios, cada uno con un nombre; el primero es donde empieza. Consulta [Varios sitios](./several-sites.md).
  - `nombre=dirección,…`, como `instituto=https://campus.miinstituto.org,uni=https://moodle.miuni.es`, o JSON.
- **`MOODLE_MCP_ROLE`** (`--role`): Qué herramientas recibe el agente, según el rol. Menos herramientas, mejor elegidas. Consulta [Limitar al agente](./limits.md#tu-rol).
  - **`all`**: todas.
  - `teacher`: las del profesorado.
  - `student`: las del alumnado.
- **`MOODLE_MCP_ACCESS`** (`--access`): Si el agente puede cambiar Moodle. Consulta [Limitar al agente](./limits.md#solo-lectura).
  - **`write`**: lee y cambia.
  - `read`: solo mira, nunca cambia nada.
- **`MOODLE_MCP_STUDENT_DATA`** (`--student-data`): Qué ve la IA de las demás personas. Consulta [Privacidad del alumnado](./privacy.md).
  - **`pseudonymize`**: alias como `A-7KQ2XM`, nunca nombres.
  - `block`: nada de ellas.
  - `clear`: sus nombres (solo para una IA en tu propio ordenador).
- **`MOODLE_MCP_SCOPES`** (`--scopes`): Los tipos de datos que pueden tocar sus herramientas. Consulta [Limitar al agente](./limits.md#ámbitos).
  - **`all`**: todo.
  - `content`: solo crear cursos, nunca el trabajo ni las notas del alumnado.
  - `teacher`, `student`: los tipos de un rol.
  - O una lista, como `content,communication`.
- **`MOODLE_MCP_CONFIRM`** (`--confirm`): Quién te pregunta antes de lo que no se puede deshacer, como borrar (próxima versión). Consulta [Limitar al agente](./limits.md#confirmar-lo-que-no-se-puede-deshacer).
  - **`elicit`**: te pregunta moodle-mcp, en tu app.
  - `client`: tu app ya te pregunta antes de cada herramienta.
- **`MOODLE_MCP_ADVANCED`** (`--advanced`): Las herramientas avanzadas. Consulta [Limitar al agente](./limits.md#herramientas-avanzadas).
  - **`false`**: fuera.
  - `true`: dentro: BigBlueButton, competencias, herramientas externas (LTI), el banco de contenidos, notas y bloques del curso.
- **`MOODLE_MCP_CHANNEL`** (`--channel`): En qué navegador trabaja.
  - Sin poner: **Edge, luego Chrome, luego Chromium**, el primero que encuentre.
  - `msedge`: Microsoft Edge.
  - `chrome`: Google Chrome.
  - `chromium`: Chromium, descargado la primera vez si hace falta.
  - `firefox`: el Firefox propio de Playwright, descargado la primera vez, nunca el que tengas instalado (próxima versión).
- **`MOODLE_MCP_HEADLESS`** (`--headless` / `--headed`): Si ves el navegador.
  - **`true`**: trabaja sin verse; solo se abre una ventana para iniciar sesión, o cuando pides verlo.
  - `false`: una ventana visible todo el tiempo.
- **`MOODLE_MCP_PROFILE_DIR`** (`--profile-dir`): La carpeta que guarda tu sesión (la del primer sitio, si hay varios). Dentro de un plugin de Claude Code, la guarda en su lugar la carpeta de datos del plugin.
  - Una carpeta; **`~/.moodle-mcp/profile`** por defecto.
- **`MOODLE_MCP_DOWNLOAD_BROWSER`** (`--no-download-browser`): Qué hacer si no hay Edge ni Chrome.
  - **`true`**: descargar Chromium.
  - `false`: no descargar nunca un navegador.
- **`MOODLE_MCP_TRAIL`** (`--trail`): Cómo se hacen las actividades como alumno.
  - **`realistic`**: páginas reales a ritmo de lectura, para que Moodle registre las visitas y la finalización.
  - `fast`: directo al resultado.

Un ajuste vacío, o que tu app pasa como un `${…}` sin sustituir, cuenta como no puesto: se aplica su valor por defecto, y `server_info` lista los que llegaron así.

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

O un `--env NOMBRE=valor` por cada uno, al añadirlo con `codex mcp add`.

</TabItem>
<TabItem value="agent-kit" label="agent-kit">

Las extensiones moodle-teacher y moodle-student piden los suyos al instalarlas: `sites`, `headless`, `access` y `student_data` (consulta [agent-kit](./getting-started/agent-kit.md#its-settings)). Un agente propio da cualquiera de estos en el `env` de su servidor.

</TabItem>
</Tabs>

## Cambiarlos después

| Dónde lo añadiste | Cómo cambiar un ajuste |
| --- | --- |
| Claude Code, con `claude mcp add` | `claude mcp remove moodle` y vuelve a añadirlo; o edita su `env` en `~/.claude.json` o `.mcp.json` y reconéctalo en `/mcp` |
| Claude Desktop | Edita `claude_desktop_config.json`, cierra Claude Desktop y vuelve a abrirlo |
| Codex | Edita `[mcp_servers.moodle.env]` en `~/.codex/config.toml`; lo toma una sesión nueva |
| agent-kit | `/extensions config moodle-teacher access=read` en el chat (se aplica en el momento), o `<agente> extension config moodle-teacher access=read` en un terminal |
| Cualquiera, durante un chat | Pídeselo al agente: consulta [Cambiar ajustes durante un chat](#cambiar-ajustes-durante-un-chat) |

## Cambiar ajustes durante un chat

El agente puede cambiar algunos ajustes para el resto de la sesión, con su herramienta `configure`. Puede poner el sitio si no se dio ninguno, y puede hacer los límites más estrictos (menos herramientas, más privacidad), pero nunca más permisivos que tu configuración. Por ejemplo:

> En este chat, trabaja solo con el contenido del curso, nada sobre el alumnado.

## Compartir la sesión con moodle-driver

Si también usas el comando `moodle` de [moodle-driver](https://falkenslab.github.io/moodle-driver/), los dos pueden compartir un mismo inicio de sesión: apunta `MOODLE_MCP_PROFILE_DIR` al perfil del comando para tu sitio, `~/.moodle-driver/sites/<host>/profiles/<account>`. Un perfil solo puede estar abierto en un navegador a la vez, así que los dos no pueden usarlo al mismo tiempo.
