---
title: Ajustes
sidebar_label: Ajustes
---

# Ajustes

Ninguno es obligatorio: sin sitio, el agente te lo pide la primera vez, y todo lo demás tiene un valor por defecto razonable. Cada ajuste es una variable de entorno del servidor, que se pone donde lo añadiste ([Claude Code](./getting-started/claude-code.md), [Claude Desktop](./getting-started/claude-desktop.md), [Codex](./getting-started/codex.md), [agent-kit](./getting-started/agent-kit.md)), o un argumento de línea de comandos después del nombre del paquete (`npx -y @falkenslab/moodle-mcp --role teacher`); si se dan los dos, gana el argumento.

## De un vistazo

| Ajuste | Por defecto | Para |
| --- | --- | --- |
| [`MOODLE_URL`](#moodle_url) | ninguno: el agente lo pide | Tu sitio Moodle |
| [`MOODLE_MCP_SITES`](#moodle_mcp_sites) | ninguno | Varios sitios |
| [`MOODLE_MCP_COURSES`](#moodle_mcp_courses) | todos los cursos | Solo estos cursos, tus aulas |
| [`MOODLE_MCP_ROLE`](#moodle_mcp_role) | `all` | Las herramientas de docente o de alumno |
| [`MOODLE_MCP_ACCESS`](#moodle_mcp_access) | `write` | Solo lectura, o leer y cambiar |
| [`MOODLE_MCP_SCOPES`](#moodle_mcp_scopes) | `all` | Los tipos de datos que puede tocar |
| [`MOODLE_MCP_STUDENT_DATA`](#moodle_mcp_student_data) | `pseudonymize` | Qué ve la IA de las demás personas |
| [`MOODLE_MCP_ADVANCED`](#moodle_mcp_advanced) | `false` | Las herramientas avanzadas |
| [`MOODLE_MCP_CONFIRM`](#moodle_mcp_confirm) | `elicit` | Quién te pregunta antes de lo que no se puede deshacer |
| [`MOODLE_MCP_CHANNEL`](#moodle_mcp_channel) | Edge, Chrome, Chromium | Qué navegador |
| [`MOODLE_MCP_HEADLESS`](#moodle_mcp_headless) | `true` | Si ves el navegador |
| [`MOODLE_MCP_PROFILE_DIR`](#moodle_mcp_profile_dir) | `~/.moodle-mcp/profile` | Dónde se guarda tu sesión |
| [`MOODLE_MCP_DOWNLOAD_BROWSER`](#moodle_mcp_download_browser) | `true` | Descargar un navegador si no hay ninguno |
| [`MOODLE_MCP_TRAIL`](#moodle_mcp_trail) | `realistic` | Cómo se hacen las actividades como alumno |

Abajo, cada uno: sus valores (el de por defecto en negrita), un ejemplo, y si el agente puede cambiarlo durante un chat. Solo puede hacerlo más estricto, con su herramienta `configure`, nunca más laxo que lo que pusiste; pídeselo con tus palabras, como "en este chat, solo lectura".

## Tu sitio y tus cursos

### `MOODLE_URL` {#moodle_url}

Tu sitio Moodle, `--url`. Vale cualquier página suya: la dirección del sitio, la de un curso, la página de acceso.

- Su dirección, como `https://campus.example.org`.
- **Sin poner**: el agente te la pide la primera vez, y la guarda entre los sitios del servidor.

`MOODLE_URL=https://campus.example.org`. **En un chat**: el agente puede cambiar a otro de tus sitios (`use_site`), o añadir uno si no tienes [aulas](#moodle_mcp_courses).

### `MOODLE_MCP_SITES` {#moodle_mcp_sites}

Varios sitios, cada uno con un nombre, `--sites`; el primero es donde empieza, y cada uno guarda su propia sesión. Consulta [Varios sitios](./several-sites.md).

- `nombre=dirección`, separados por comas: `instituto=https://campus.miinstituto.org,uni=https://moodle.miuni.es`.
- O JSON: `{"instituto": "https://campus.miinstituto.org"}`.
- **Sin poner**: solo el sitio de `MOODLE_URL`, o los que añada el agente cuando se lo pidas.

**En un chat**: cambiar entre ellos (`use_site`), añadir uno ("añade el Moodle de mi universidad").

### `MOODLE_MCP_COURSES` {#moodle_mcp_courses}

Los únicos cursos en los que trabaja el agente, tus aulas, `--courses`; sus sitios se añaden, así que no necesitas ni `MOODLE_URL` ni `MOODLE_MCP_SITES`. Consulta [Aulas](./limits.md#aulas).

- Sus URL, separadas por comas: `https://campus.miinstituto.org/course/view.php?id=12,https://moodle.miuni.es/course/view.php?id=7`.
- **Sin poner**: todos tus cursos.

Con aulas, otro curso, y todo lo que no se haya leído en un aula, se rechaza; las herramientas del navegador, los mensajes y las notificaciones se apagan. **En un chat**: menos aulas, nunca más.

## Qué puede hacer el agente

### `MOODLE_MCP_ROLE` {#moodle_mcp_role}

Qué herramientas recibe el agente, según lo que haces en Moodle, `--role`. Menos herramientas, mejor elegidas. Consulta [Tu rol](./limits.md#tu-rol).

- **`all`**: todas, para dar clase y para estudiar.
- `teacher`: crear y gestionar cursos, calificar, personas, informes, foros y mensajes.
- `student`: leer cursos, hacer actividades, tus notas y tareas pendientes, foros y mensajes.

`MOODLE_MCP_ROLE=teacher`. **En un chat**: de `all` a un rol, nunca al revés.

### `MOODLE_MCP_ACCESS` {#moodle_mcp_access}

Si el agente puede cambiar Moodle, `--access`. Consulta [Solo lectura](./limits.md#solo-lectura).

- **`write`**: lee y cambia: califica, publica, crea.
- `read`: solo mira; las herramientas que cambian algo no están.

`MOODLE_MCP_ACCESS=read`. **En un chat**: de `write` a `read`, nunca al revés.

### `MOODLE_MCP_SCOPES` {#moodle_mcp_scopes}

Los tipos de datos que pueden tocar sus herramientas, `--scopes`: un perfil, o una lista de ámbitos. Consulta [Ámbitos](./limits.md#ámbitos).

- **`all`**: todo.
- `content`: solo crear cursos (actividades, secciones, bancos de preguntas, rúbricas, el calendario, la configuración del calificador), nunca el trabajo ni las notas del alumnado.
- `teacher`, `student`: los tipos que necesita un rol.
- Una lista, como `content,communication`, de: `content`, `student-data`, `grading`, `communication`, `as-student`, `browser`.

`MOODLE_MCP_SCOPES=content`. **En un chat**: menos, nunca más.

### `MOODLE_MCP_STUDENT_DATA` {#moodle_mcp_student_data}

Qué ve la IA de las demás personas, `--student-data`. Consulta [Privacidad del alumnado](./privacy.md).

- **`pseudonymize`**: alias como `A-7KQ2XM`, nunca sus nombres ni sus ids de Moodle; los nombres, correos y similares en lo que escribieron se sustituyen.
- `block`: nada de ellas: las herramientas sobre datos de otras personas no están.
- `clear`: sus nombres, como los muestra Moodle. Solo para una IA en tu propio ordenador.

**En un chat**: solo más estricto (`clear`, luego `pseudonymize`, luego `block`).

### `MOODLE_MCP_ADVANCED` {#moodle_mcp_advanced}

Las herramientas avanzadas, `--advanced`: áreas que usa poca gente, apagadas para que cada chat no pague sus descripciones. Consulta [Herramientas avanzadas](./limits.md#herramientas-avanzadas).

- **`false`**: fuera.
- `true`: dentro: bloques del curso, banco de contenido, BigBlueButton, competencias, notas sobre participantes y herramientas externas (LTI).

**En un chat**: no; solo tú las enciendes.

### `MOODLE_MCP_CONFIRM` {#moodle_mcp_confirm}

Quién te pregunta antes de lo que no se puede deshacer (borrar, dar de baja, reiniciar un curso, restaurar sobre uno), `--confirm`. Consulta [Confirmar lo que no se puede deshacer](./limits.md#confirmar-lo-que-no-se-puede-deshacer).

- **`elicit`**: te pregunta el propio moodle-mcp, en tu aplicación, con diez minutos para contestar. En una aplicación que no puede preguntar (sin elicitación MCP), esas herramientas se rechazan.
- `client`: tu aplicación ya te pregunta antes de cada herramienta, así que moodle-mcp no lo hace; para esas aplicaciones sin elicitación.

**En un chat**: no; solo tú lo pones.

## El navegador

### `MOODLE_MCP_CHANNEL` {#moodle_mcp_channel}

En qué navegador trabaja moodle-mcp, `--channel`.

- **Sin poner**: Edge, luego Chrome, luego Chromium, el primero que encuentre.
- `msedge`: Microsoft Edge. `chrome`: Google Chrome.
- `chromium`: Chromium, descargado la primera vez si hace falta.
- `firefox`: el Firefox propio de Playwright, descargado la primera vez, nunca el que tengas instalado.

`MOODLE_MCP_CHANNEL=firefox`. **En un chat**: no.

### `MOODLE_MCP_HEADLESS` {#moodle_mcp_headless}

Si ves el navegador, `--headless` o `--headed`.

- **`true`**: trabaja sin verse; solo se abre una ventana para iniciar sesión, o cuando pides verlo ([Ver lo que hace el agente](./getting-started/watching.md)).
- `false`: una ventana visible todo el tiempo.

**En un chat**: sí, en los dos sentidos.

### `MOODLE_MCP_PROFILE_DIR` {#moodle_mcp_profile_dir}

La carpeta que guarda tu sesión en el primer sitio, `--profile-dir`; los demás sitios guardan la suya en la carpeta de datos del servidor. Un perfil solo puede estar abierto en un navegador a la vez: dos sesiones usando moodle-mcp a la vez en un mismo sitio necesitan una carpeta cada una.

- Una carpeta; **`~/.moodle-mcp/profile`** por defecto. Dentro de un plugin de Claude Code, la carpeta de datos del plugin.

**En un chat**: sí, para esa sesión.

### `MOODLE_MCP_DOWNLOAD_BROWSER` {#moodle_mcp_download_browser}

Qué hacer si no hay Edge ni Chrome, `--no-download-browser`.

- **`true`**: descargar Chromium, una vez.
- `false`: no descargar nunca un navegador; sin ninguno, lo dice.

**En un chat**: no.

### `MOODLE_MCP_TRAIL` {#moodle_mcp_trail}

Cómo se hacen las actividades como alumno, `--trail`.

- **`realistic`**: por las páginas reales, a ritmo de lectura, para que Moodle registre las visitas y la finalización como las de una persona.
- `fast`: directo al resultado.

**En un chat**: sí.

Un ajuste vacío, o que tu aplicación pasa como un `${…}` sin sustituir, cuenta como no puesto: se aplica su valor por defecto, y `server_info` lista los que llegaron así.

## Cambiarlos después

| Dónde lo añadiste | Cómo |
| --- | --- |
| Claude Code | `claude mcp remove moodle` y vuelve a añadirlo, con el mismo ámbito; o edita su `env` y reconéctalo en `/mcp` |
| Claude Desktop | Edita `claude_desktop_config.json`, cierra Claude Desktop y vuelve a abrirlo |
| Codex | Edita `[mcp_servers.moodle.env]` donde lo configuraste; lo toma una sesión nueva |
| agent-kit | `/extensions config moodle-teacher access=read` en el chat, o `<agente> extension config …` en un terminal |
| Cualquiera, durante un chat | Pídeselo al agente, dentro de lo que permite cada ajuste de arriba |

## Compartir la sesión con moodle-driver

Si también usas la línea de comandos `moodle` de [moodle-driver](https://falkenslab.github.io/moodle-driver/), las dos pueden compartir una sesión: apunta `MOODLE_MCP_PROFILE_DIR` al perfil de la línea de comandos para tu sitio, `~/.moodle-driver/sites/<host>/profiles/<cuenta>`. Un perfil solo puede estar abierto en un navegador a la vez, así que las dos no pueden usarlo al mismo tiempo.
