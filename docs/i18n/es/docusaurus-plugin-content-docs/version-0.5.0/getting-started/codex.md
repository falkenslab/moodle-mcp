---
title: Configurar Codex
sidebar_label: Codex
---

# Configurar Codex

[Codex](https://developers.openai.com/codex) es el agente de programación de OpenAI, en tu terminal (Codex CLI), en VS Code y en la app de Codex; todos comparten la misma configuración.

## Empezar

En un terminal, con **la dirección de tu sitio Moodle** en lugar de `https://campus.example.org`:

<Terminal title="Terminal">{`
$ codex mcp add moodle --env MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added global MCP server 'moodle'.
`}</Terminal>

Eso escribe una sección `[mcp_servers.moodle]` en el fichero de Codex, `~/.codex/config.toml` (`%USERPROFILE%\.codex\config.toml` en Windows). Ábrelo y añade dos líneas a esa sección: Codex espera 10 segundos a que arranque un servidor y 60 a que termine una herramienta, mientras que el primer arranque descarga moodle-mcp y algunas tareas de Moodle (una copia de seguridad, un cuestionario largo) tardan minutos.

```toml
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
startup_timeout_sec = 120
tool_timeout_sec = 600

[mcp_servers.moodle.env]
MOODLE_URL = "https://campus.example.org"
```

Cada línea bajo `[mcp_servers.moodle.env]` es un [ajuste](../settings.md), como `MOODLE_MCP_ROLE = "teacher"`. Sin `MOODLE_URL`, el agente te pide tu sitio la primera vez.

Después arranca Codex (`codex`) y pide **"Lista mis cursos de Moodle"**. La primera vez se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre ([Iniciar sesión la primera vez](./first-login.md)). Dentro de Codex, `/mcp` lista los servidores y sus herramientas.

## Dónde configurarlo {#where-to-set-it-up}

Codex lee su configuración de tres sitios, cada uno por encima del anterior:

| Dónde | Cuándo se aplica | Fichero |
| --- | --- | --- |
| La tuya | Siempre | `~/.codex/config.toml` |
| La de un proyecto | En esa carpeta, una vez que confías en ella | `.codex/config.toml` en la carpeta |
| Un perfil | Cuando arrancas Codex con `-p <nombre>` | `~/.codex/<nombre>.config.toml` |

Un `[mcp_servers.moodle]` en el fichero de un proyecto o en un perfil cambia el de tu configuración. Cuatro formas de aprovecharlo, iguales para docentes y alumnos; solo cambia el rol: `MOODLE_MCP_ROLE = "teacher"` o `"student"` deja las herramientas de lo que haces.

### En todas partes

Usas Codex sobre todo para tus cursos: la configuración de [Empezar](#empezar), en tu propio fichero, está en todas las carpetas.

- **Por qué**: una sola configuración para todos tus cursos y sitios.
- **Ojo**: también está en tus otros proyectos; las herramientas que cambian Moodle te preguntan antes.

### Un aula por proyecto

Tienes una carpeta por curso y quieres que el agente de cada una trabaje **solo en ese curso**: un [aula](../limits.md#aulas). En la carpeta, un `.codex/config.toml`:

```toml title=".codex/config.toml"
[mcp_servers.moodle]
command = "npx"
args = ["-y", "@falkenslab/moodle-mcp"]
startup_timeout_sec = 120
tool_timeout_sec = 600

[mcp_servers.moodle.env]
MOODLE_MCP_COURSES = "https://campus.example.org/course/view.php?id=12"
MOODLE_MCP_ROLE = "teacher"
```

- **Por qué**: desde ahí el agente no puede tocar otro curso; el sitio sale de la URL del curso. En un repositorio que compartes con el resto del profesorado del curso, tienen la misma configuración, y cada uno inicia sesión con su propia cuenta: el fichero no guarda ninguna contraseña.
- **Ojo**: Codex solo aplica el fichero de un proyecto cuando confías en la carpeta, como te pregunta la primera vez que lo abres ahí. Si tu propio fichero también tiene un servidor `moodle`, los ajustes suyos que este no pone siguen valiendo: deja el general sin `MOODLE_URL`, o llama a este de otra forma.

### Un perfil por aula

Los materiales de tu curso no están en una carpeta, o quieres elegir el aula al arrancar: un perfil por curso, `~/.codex/programacion-1.config.toml`, con las mismas líneas que el fichero del proyecto de arriba.

```bash
codex -p programacion-1
```

- **Por qué**: el aula va con el comando, estés en la carpeta que estés.
- **Ojo**: sin `-p`, Codex arranca con tu propio fichero, tenga lo que tenga.

### Sin moodle-mcp por defecto

Deja moodle-mcp fuera de tu propio fichero y ponlo solo en proyectos o perfiles: Codex arranca sin Moodle, y eliges el curso con la carpeta o con `-p`.

:::caution Una sesión cada vez
Todas estas configuraciones comparten tu sesión en un sitio, guardada en un perfil del navegador. Dos sesiones de Codex usando moodle-mcp a la vez en el mismo sitio no pueden abrirlo las dos: la segunda no consigue arrancar el navegador. Cierra una, o dale a un aula su propia carpeta de perfil con `MOODLE_MCP_PROFILE_DIR` (e inicia sesión una vez allí).
:::

## Mientras lo usas

**Codex te pregunta antes de cada llamada a una herramienta de moodle-mcp** (*Allow*, *Allow for this session*, *Always allow* o *Cancel*). Para que ejecute las herramientas de moodle-mcp sin preguntar, añade esta línea a la sección `[mcp_servers.moodle]`, solo si te parece bien que el agente cambie Moodle por su cuenta; es más seguro con acceso de solo lectura (`MOODLE_MCP_ACCESS = "read"`):

```toml
default_tools_approval_mode = "approve"
```

**Lo que no se puede deshacer te lo vuelve a preguntar** el propio moodle-mcp: después de la pregunta de Codex, una segunda dice qué va a pasar (True o False), y no se hace nada hasta que dices que sí. Tienes diez minutos para contestar, dentro de los 600 segundos de `tool_timeout_sec`. Consulta [Confirmar lo que no se puede deshacer](../limits.md#confirmar-lo-que-no-se-puede-deshacer).

:::note `codex exec`
En las ejecuciones no interactivas (`codex exec`) nadie puede contestar: Codex cancela las herramientas que cambian Moodle salvo con `default_tools_approval_mode = "approve"`, y la pregunta del propio moodle-mcp tampoco se puede contestar.
:::

## Cambiarlo o quitarlo

Edita la sección `[mcp_servers.moodle.env]` donde lo configuraste: lo toma una sesión nueva. Para quitarlo de tu propio fichero:

```bash
codex mcp remove moodle
```

Del fichero de un proyecto o de un perfil, borra sus secciones `[mcp_servers.moodle]`.
