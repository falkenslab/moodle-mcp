---
title: Privacidad del alumnado
sidebar_label: Privacidad del alumnado
---

# Privacidad del alumnado

Cuando un agente de IA lee un curso, lee sobre personas: quién ha entregado, qué ha escrito, sus notas, sus mensajes en los foros. Con moodle-mcp, por defecto, **la IA nunca conoce sus nombres**. Ve a cada persona como un alias del tipo `A-7KQ2XM`, y solo tú puedes convertirlo de nuevo en un nombre, en tu ordenador.

<Screenshot app="Claude Code" session="grading" alt="Claude Code proponiendo una nota para un alumno al que solo conoce como A-8FT4A1" />

## Los tres niveles

Un solo ajuste decide qué recibe la IA sobre otras personas (alumnos y compañeros): `MOODLE_MCP_STUDENT_DATA`. Solo lo pones tú, en la configuración de tu aplicación de IA. El agente puede hacerlo más estricto durante una sesión, nunca más permisivo.

| Nivel | Qué recibe la IA | Úsalo… |
| --- | --- | --- |
| `pseudonymize` (por defecto) | Las personas como alias, nunca sus nombres ni sus ids de Moodle. Se sustituyen los nombres, correos, teléfonos, números de DNI/NIE y cuentas bancarias (IBAN) que aparezcan en lo que escriben. | Con cualquier IA, incluidas las de la nube como Claude y Codex |
| `block` | Ninguna herramienta que lea datos de otras personas o decida sobre ellas. Solo el contenido del curso, las cifras globales y tus propios datos. | Cuando los datos del alumnado no deben llegar a la IA en absoluto |
| `clear` | Los nombres tal como los muestra Moodle (nunca correos ni campos del perfil) | Solo con un modelo de IA que se ejecute en tu propio ordenador |

Por ejemplo, para bloquear del todo los datos del alumnado en Claude Code:

<Terminal>{`$ claude mcp add moodle -e MOODLE_URL=https://campus.example.org -e MOODLE_MCP_STUDENT_DATA=block -- npx -y @falkenslab/moodle-mcp`}</Terminal>

## Alias

Cada persona tiene siempre el mismo alias, en todos los cursos y en todas las sesiones. Así el agente puede decirte "A-7KQ2XM no ha entregado", tú puedes apuntarlo, y la semana que viene sigue siendo el mismo alumno.

Para ver quién es un alias, ejecuta esto en **tu propio** terminal (no a través del agente):

<Terminal>{`$ npx @falkenslab/pseudonym whois A-7KQ2XM`}</Terminal>

Para convertir en nombres todos los alias de un texto, por ejemplo unas notas que el agente ha escrito para ti:

<Terminal>{`$ npx @falkenslab/pseudonym reveal notes.md`}</Terminal>

### De dónde salen los alias

Los alias salen de una clave secreta que hay en tu ordenador, junto con una lista de las personas encontradas hasta ahora. Están en `%APPDATA%\pseudonym` en Windows y en `~/.config/pseudonym` en macOS y Linux, y nunca se envían a ningún sitio.

- **Haz una copia de seguridad de la clave.** Si se pierde, todos los alias cambian, y tus notas ya no corresponden a nadie:

  <Terminal>{`$ npx @falkenslab/pseudonym key export`}</Terminal>

- **Mantén al agente lejos de ella.** Un agente que pueda leer esa carpeta o ejecutar el comando `pseudonym` podría consultar los alias. En Claude Code, prohíbe ambas cosas en tu configuración (`~/.claude/settings.json`):

  ```json
  {
    "permissions": {
      "deny": ["Read(~/.config/pseudonym/**)", "Read(~/AppData/Roaming/pseudonym/**)", "Bash(pseudonym:*)", "Bash(npx @falkenslab/pseudonym:*)"]
    }
  }
  ```

### Sin clave {#plain-storage}

Por defecto, la lista de personas está cifrada con esa clave. Si el sistema ya protege la carpeta (una cuenta de usuario solo para esto, un contenedor, un disco cifrado), puedes guardar la lista como un archivo legible, `directory.json`, sin clave:

- **Nada que perder.** No hay clave de la que hacer copia: los alias están en el propio archivo.
- **Nada oculto.** Quien pueda leer esa carpeta ve quién es cada alias, con sus nombres y correos a la vista.

Para usarlo, añade `PSEUDONYM_STORAGE=plain` a los ajustes de moodle-mcp, como cualquier otro ajuste (en Claude Code, `-e PSEUDONYM_STORAGE=plain`), y ponlo también en el terminal donde ejecutes `pseudonym`. Una carpeta que ya tiene una lista cifrada no cambia sola: moodle-mcp se detiene y lo dice. Para convertirla, conservando todos los alias:

<Terminal>{`$ npx @falkenslab/pseudonym migrate --to plain`}</Terminal>

Las personas que solo se conocían por su correo no pueden pasar: reciben un alias nuevo la próxima vez que aparezcan. La [guía de almacenamiento](https://falkenslab.github.io/pseudonym/es/docs/guides/storage) de pseudonym explica las dos formas paso a paso.

## Qué debes saber de `pseudonymize`

- **Cubre todas las herramientas, errores incluidos.** Además de lo que hace cada herramienta, todo lo que devuelve una herramienta pasa por el mismo filtro de camino a la IA.
- **Es seudonimización, no anonimato.** Lo que las personas escriben sobre sí mismas puede seguir identificándolas. Las direcciones postales, las fechas de nacimiento y los nombres de personas que moodle-mcp aún no ha encontrado no se detectan en el texto libre.
- **El alumnado nunca ve los alias.** Si el agente escribe un alias en un comentario de retroalimentación, un mensaje del foro o un mensaje privado, moodle-mcp se niega a enviarlo, porque el alumno lo leería tal cual. En su lugar, el agente se dirige al alumno de "tú".
- **Algunas cosas necesitan `clear`**, porque su contenido no se puede filtrar: los archivos que han entregado otras personas, una exportación de notas, una copia de seguridad de un curso con sus usuarios y las capturas de pantalla de páginas sobre personas. Con `pseudonymize`, el agente no puede abrirlos.
- **Volver atrás no hace que la IA olvide.** Si pasas de `clear` a `pseudonymize`, los nombres que la IA ya vio pueden seguir en el historial o la memoria de tu aplicación de IA. Usa `clear` solo en una configuración aparte, que nunca compartas con una IA en la nube.

## Lo que moodle-mcp no hace nunca

- Nunca guarda ni envía tu contraseña: inicias sesión tú mismo.
- Nunca envía nada a nadie salvo a tu sitio Moodle. Lo único que llega a la IA es lo que devuelven las herramientas.
- Los registros del curso nunca incluyen direcciones IP, en ningún nivel.
