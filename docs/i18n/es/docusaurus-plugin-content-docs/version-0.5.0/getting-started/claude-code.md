---
title: Configurar Claude Code
sidebar_label: Claude Code
---

# Configurar Claude Code

[Claude Code](https://claude.com/claude-code) es Claude en tu terminal, o en VS Code y otros editores; todos comparten la misma configuración. Si aún no lo tienes, sigue antes [su guía de instalación](https://docs.claude.com/en/docs/claude-code/setup).

## Empezar

En un terminal, con **la dirección de tu sitio Moodle** en lugar de `https://campus.example.org`:

<Terminal title="Terminal">{`
$ claude mcp add moodle --scope user -e MOODLE_URL=https://campus.example.org -- npx -y @falkenslab/moodle-mcp
Added stdio MCP server moodle with command: npx -y @falkenslab/moodle-mcp to user config
$ claude mcp list
moodle: npx -y @falkenslab/moodle-mcp - ✔ Connected
`}</Terminal>

- `moodle` es el nombre del servidor: sus herramientas le llegan a Claude como `mcp__moodle__…`.
- `--scope user` lo deja en todas las carpetas; la siguiente sección tiene otras opciones.
- Cada `-e NOMBRE=valor` es un [ajuste](../settings.md). Sin `MOODLE_URL`, Claude te pide tu sitio la primera vez.
- `npx -y @falkenslab/moodle-mcp` descarga y arranca la última versión; `@falkenslab/moodle-mcp@0.5.0` se queda en una.

Después arranca Claude Code y pide **"Lista mis cursos de Moodle"**. La primera vez se abre una ventana del navegador en la página de acceso de tu Moodle: inicia sesión como siempre ([Iniciar sesión la primera vez](./first-login.md)). Dentro de Claude Code, `/mcp` muestra los servidores y sus herramientas.

También puedes pedirle a Claude Code, en una conversación, que ejecute ese comando por ti: el servidor estará en tu siguiente conversación.

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

## Mientras lo usas

**Claude Code te pregunta antes de cada llamada a una herramienta**, con su nombre y lo que va a enviar: *Yes* cada vez, o *Yes, and don't ask again* para una de la que te fíes. Para aprobar de una vez las herramientas que solo leen Moodle, añádelas a tu configuración (`~/.claude/settings.json`); en moodle-mcp empiezan por `get_` o `list_`:

```json
{
  "permissions": {
    "allow": ["mcp__moodle__get_*", "mcp__moodle__list_*"],
    "ask": ["mcp__moodle__get_lesson_page"]
  }
}
```

La línea `ask` es la única excepción: como alumno, abrir una página de una lección registra tu avance en ella.

`mcp__moodle__*` aprobaría todas las herramientas, también las que cambian Moodle: solo con acceso de solo lectura (`MOODLE_MCP_ACCESS=read`), donde ninguna puede.

**Lo que no se puede deshacer te lo vuelve a preguntar** el propio moodle-mcp: antes de borrar una actividad, dar de baja a alguien o reiniciar un curso, una pregunta en Claude Code dice qué va a pasar, y no se hace nada hasta que dices que sí. Tienes diez minutos para contestar. Consulta [Confirmar lo que no se puede deshacer](../limits.md#confirmar-lo-que-no-se-puede-deshacer).

## Cambiarlo o quitarlo

`claude mcp get moodle` muestra su configuración y dónde está guardada. Para cambiar un ajuste, quítalo y vuelve a añadirlo con los valores nuevos, con el ámbito con el que lo añadiste:

```bash
claude mcp remove moodle --scope user
```

O edítalo a mano: un servidor `project` está en el `.mcp.json` de la carpeta; los `user` y `local`, en `~/.claude.json` (`%USERPROFILE%\.claude.json` en Windows), el fichero propio de Claude Code, arriba del todo bajo `mcpServers` y bajo la entrada de la carpeta en `projects`. El mismo bloque en cualquiera de ellos:

```json title=".mcp.json"
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp"],
      "env": { "MOODLE_URL": "https://campus.example.org", "MOODLE_MCP_ROLE": "teacher" }
    }
  }
}
```

Claude Code lo lee al arrancar, o cuando reconectas el servidor en `/mcp`.
