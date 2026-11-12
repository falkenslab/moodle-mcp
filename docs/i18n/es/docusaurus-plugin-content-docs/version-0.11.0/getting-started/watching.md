---
title: Ver lo que hace el agente
sidebar_label: Ver al agente
---

# Ver lo que hace el agente

El agente trabaja en Moodle sin ventana, para no molestarte. Cuando quieras ver qué está haciendo, pide:

<Prompt>{`Enséñame el navegador.`}</Prompt>

Se abre una ventana del navegador, ya con la sesión iniciada, y cada paso del agente aparece en ella: la página del curso, la entrega que lee, el formulario que rellena. Es una buena forma de conocer moodle-mcp, o de revisar una tarea de la que no estés seguro.

Para volver a trabajar en segundo plano:

<Prompt>{`Oculta el navegador.`}</Prompt>

Cerrar tú la ventana hace lo mismo.

## Comprobar el resultado en Moodle

Cada herramienta que crea algo le da al agente su enlace, así que puedes pedírselo:

<Prompt>{`Dame el enlace al cuestionario que acabas de crear.`}</Prompt>

Si construyes una aplicación sobre moodle-mcp: el resultado de cada herramienta lleva en `_meta.page` la dirección de la página de Moodle que muestra lo que hizo, para que tu aplicación ponga un enlace bajo la acción («Ver en Moodle»). Una creación da lo que creó, una edición el elemento que cambió y una lectura la página que lee. Una herramienta sin esa página no da ninguna, y mientras los datos de los demás se seudonimizan o se bloquean ninguna dirección nombra a una persona. El texto que lee el agente no cambia.

Y todo lo que hace el agente queda en Moodle como si lo hubieras hecho tú: en el curso, en el calificador y en los registros de Moodle, a tu nombre.

## Mientras trabaja

- **Pregunta antes.** El agente tiene instrucciones de confirmarlo contigo antes de cualquier cosa que cambie Moodle: una nota, un mensaje en un foro, un mensaje privado, una actividad nueva. Tu aplicación de IA también puede pedirte que apruebes cada llamada a una herramienta.
- **Te dice lo que no ha podido hacer.** Si una herramienta no está disponible (por los [límites](../limits.md) que hayas puesto), o Moodle ha rechazado algo, el agente te dice por qué.
- **Va al ritmo de un alumno cuando actúa como alumno.** Las actividades que hace como alumno (una lección, un cuestionario, un paquete SCORM) se leen página a página y con pausas, para que Moodle las registre como lo haría con una persona. Consulta [`MOODLE_MCP_TRAIL`](../settings.md).
