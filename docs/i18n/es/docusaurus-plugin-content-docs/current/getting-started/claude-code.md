---
title: Configurar Claude Code
sidebar_label: Claude Code
---

# Configurar Claude Code

[Claude Code](https://claude.com/claude-code) es Claude en tu terminal, o en VS Code y otros editores. Si aún no lo tienes, sigue primero [su guía de instalación](https://docs.claude.com/en/docs/claude-code/setup).

## 1. Añade moodle-mcp

Abre un terminal y ejecuta este comando, con **la dirección de tu sitio Moodle** en lugar de `https://campus.example.org`:

<Terminal title="Terminal">{`
$ claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added stdio MCP server moodle with command: npx -y @falkenslab/moodle-mcp to user config
`}</Terminal>

Qué significa cada parte:

- `moodle` es el nombre que le das al servidor. Las herramientas aparecen en Claude como herramientas de `moodle`.
- `--scope user` lo deja disponible en cualquier carpeta en la que abras Claude Code. Es una de varias formas: consulta [Dónde configurarlo](#where-to-set-it-up).
- `-e MOODLE_URL=…` es tu sitio. Puedes quitarlo, y Claude te pedirá el sitio la primera vez.
- `npx -y @falkenslab/moodle-mcp` descarga y arranca la última versión.

También puedes pedirle al propio Claude Code, en una conversación, que ejecute ese comando por ti: el servidor estará en tu siguiente conversación.

## 2. Comprueba que está

<Terminal title="Terminal">{`
$ claude mcp list
Checking MCP server health…

moodle: npx -y @falkenslab/moodle-mcp - ✔ Connected
`}</Terminal>

Deberías ver `moodle` con `✔ Connected`, junto a los demás servidores que tengas.

La primera vez, `npx` descarga moodle-mcp, así que puede tardar unos segundos.

## 3. Arranca Claude y pruébalo

Arranca Claude Code en cualquier carpeta y pide:

> Lista mis cursos de Moodle.

La primera vez se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre. [Iniciar sesión la primera vez](./first-login.md) explica qué pasa después.

Dentro de Claude Code, el comando `/mcp` muestra los servidores y sus herramientas, y te deja volver a conectar uno.

## Aprobar las llamadas a herramientas

Claude Code te pregunta antes de cada llamada a una herramienta, y te muestra su nombre y lo que va a enviar. Puedes responder *Yes* cada vez, o *Yes, and don't ask again* para una herramienta de la que te fíes.

Para aprobar de una vez por todas las herramientas que solo leen Moodle, añádelas a tu configuración. Por ejemplo, en `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["mcp__moodle__list_courses", "mcp__moodle__get_course_structure", "mcp__moodle__list_assignments"]
  }
}
```

Deja fuera de esa lista las herramientas que cambian Moodle (calificar, publicar, crear), para que Claude siga preguntándote antes de usarlas.

:::tip Menos herramientas, mejores respuestas
Si solo das clase, o solo estudias, dile a moodle-mcp tu rol: Claude recibe solo las herramientas para ese rol y las elige mejor. Añade `-e MOODLE_MCP_ROLE=teacher` (o `student`) al comando del paso 1. Consulta [Limitar lo que puede hacer el agente](../limits.md).
:::

## Dónde configurarlo {#where-to-set-it-up}

Claude Code guarda un servidor en uno de tres sitios, su **ámbito** (*scope*), que decide en qué carpetas está:

| Ámbito | Dónde está | Se guarda en | Compartido |
| --- | --- | --- | --- |
| `user` | En todas las carpetas en las que abras Claude Code | `~/.claude.json` | No |
| `local` (por defecto) | Solo en la carpeta donde lo añadiste | `~/.claude.json`, bajo esa carpeta | No |
| `project` | Solo en esa carpeta, para quien la abra | `.mcp.json` en la carpeta | Sí, si la carpeta es un repositorio |

Si el mismo nombre está en más de uno, gana el de la propia carpeta: primero `local`, luego `project` y luego `user`. Cuatro formas de aprovecharlo, iguales para docentes y alumnos; solo cambia el rol: `MOODLE_MCP_ROLE=teacher` o `student` deja las herramientas de lo que haces.

### En todas partes

Usas Claude Code sobre todo para tus cursos, y quieres Moodle a mano lo abras donde lo abras.

```bash
claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=teacher -- npx -y @falkenslab/moodle-mcp
```

- **Por qué**: una sola configuración para todos tus cursos y sitios; nada que recordar.
- **Ojo**: también está en tus otros proyectos. Claude Code carga las herramientas solo cuando las necesita, y las que cambian Moodle te preguntan antes, pero si también programas con Claude Code quizá prefieras alguna de las siguientes.

### Una carpeta para Moodle

Usas Claude Code también para otras cosas, y quieres Moodle solo donde trabajas en tus cursos: una carpeta como `~/moodle`, con tus apuntes, rúbricas o exámenes.

```bash
cd ~/moodle
claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_ROLE=student -- npx -y @falkenslab/moodle-mcp
```

- **Por qué**: Moodle se queda fuera de tus otros proyectos; abres Claude Code en esa carpeta cuando lo quieres.
- **Ojo**: en cualquier otra carpeta, moodle-mcp no está.

### Un aula por carpeta

Tienes una carpeta por curso (los materiales de una asignatura como docente, tus apuntes como alumno) y quieres que el agente de cada una trabaje **solo en ese curso**: un [aula](../limits.md#aulas).

```bash
cd ~/cursos/programacion-1
claude mcp add moodle --scope project -e MOODLE_MCP_COURSES=https://campus.example.org/course/view.php?id=12 -e MOODLE_MCP_ROLE=teacher -- npx -y @falkenslab/moodle-mcp
```

- **Por qué**: desde ahí el agente no puede tocar otro curso, ni por error con un nombre parecido o la copia del año pasado; el sitio sale de la URL del curso.
- **¿`project` o `local`?** `--scope project` escribe `.mcp.json` en la carpeta. Si es un repositorio que compartes con el resto del profesorado del curso, al abrirlo tendrán la misma configuración: Claude Code les pide a cada uno que la aprueben la primera vez, y cada uno inicia sesión con su propia cuenta. `.mcp.json` no guarda ninguna contraseña, solo la URL del curso y los ajustes. Para una carpeta que solo usas tú, quita `--scope project`.

### En todas partes, y un aula donde importa

Las dos a la vez: moodle-mcp en todas partes (`user`) y, en la carpeta de un curso, un servidor con el **mismo nombre**, `moodle`, limitado a esa aula (`project` o `local`). En esa carpeta gana el aula; en las demás, el general.

:::caution Una sesión cada vez
Todas estas configuraciones comparten tu sesión en un sitio, guardada en un perfil del navegador. Dos sesiones de Claude Code usando moodle-mcp a la vez en el mismo sitio, desde dos carpetas, no pueden abrirlo las dos: la segunda no consigue arrancar el navegador. Cierra una, o dale a una carpeta su propio perfil con `-e MOODLE_MCP_PROFILE_DIR=…` (e inicia sesión una vez allí).
:::

## A mano: el fichero de configuración

Claude Code lee sus servidores de dos ficheros:

- `.mcp.json` en la carpeta de un proyecto: solo ahí, y puede ir en el repositorio del proyecto. Claude Code te pide que confíes en él la primera vez. Es donde escribe `--scope project`;
- `~/.claude.json` (`%USERPROFILE%\.claude.json` en Windows): bajo `mcpServers`, arriba del todo, en todas las carpetas (`--scope user`); bajo la entrada de una carpeta en `projects`, solo en esa carpeta (el ámbito por defecto, `local`). Es el fichero propio de Claude Code, con muchas más cosas: para estos dos, mejor `claude mcp add`.

```json title=".mcp.json"
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

Los demás [ajustes](../settings.md) van en `env`. Claude Code lee el fichero al arrancar, o cuando reconectas el servidor en `/mcp`.

## Cambiarlo o quitarlo

`claude mcp get moodle` muestra su configuración y dónde está guardada. Para cambiar un ajuste, edita su `env` en el fichero, o quita el servidor y vuelve a añadirlo con los valores nuevos, con el mismo ámbito con el que lo añadiste:

```bash
claude mcp remove moodle --scope user
```

Para usar una versión concreta en lugar de la última, escríbela después del nombre del paquete: `@falkenslab/moodle-mcp@0.5.0`.
