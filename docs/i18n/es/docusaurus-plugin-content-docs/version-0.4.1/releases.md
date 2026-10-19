---
title: Versiones
sidebar_label: Versiones
---

# Versiones

moodle-mcp está en npm como [@falkenslab/moodle-mcp](https://www.npmjs.com/package/@falkenslab/moodle-mcp). Con `npx -y @falkenslab/moodle-mcp`, tu aplicación de IA arranca cada vez la última versión. Para quedarte en una versión, escríbela después del nombre: `npx -y @falkenslab/moodle-mcp@0.4.1`.

La documentación de cada versión se conserva: elígela en el menú de versiones de la parte de arriba de la página. Las notas completas están en [GitHub](https://github.com/falkenslab/moodle-mcp/releases).

## 0.4.1 (19 de octubre de 2026)

- **Vuelve a instalarse con agent-kit.** La 0.4.0 declaraba como dependencias dos paquetes que ya lleva dentro, así que agent-kit la rechazaba (y npx los descargaba para nada).
- **Copias de seguridad en tu ordenador.** `read_backup` dice qué contiene un `.mbz` sin restaurarlo, incluido lo que una restauración en otro sitio dejaría roto y lo que todavía nombra a alguien; `anonymize_backup` escribe una copia que no nombra a nadie ni a ningún sitio, para compartir una unidad.

## 0.4.0 (18 de octubre de 2026)

- **Unas 120 herramientas más**, 233 por defecto. Para montar cursos: capítulos de libros, páginas y saltos de lecciones, wikis, glosarios, bases de datos (campos, plantillas, preajustes y entradas), preguntas de feedback, rúbricas y guías de evaluación, insignias, todos los tipos de pregunta (Cloze, ordenación, arrastrar y soltar, calculadas…) con categorías y exportación. Para llevarlos: talleres de la entrega a la nota, resultados de consultas y encuestas, estadísticas de cuestionarios, finalización del curso, calificaciones importadas desde CSV, escalas y letras de calificación, grupos de una vez.
- **Herramientas avanzadas, a petición.** Bloques del curso, banco de contenido, BigBlueButton, competencias, notas sobre participantes y herramientas externas (LTI): 30 herramientas más, desactivadas salvo que pongas `MOODLE_MCP_ADVANCED=true`, para que no las pague cada chat. Consulta [Limitar al agente](./limits.md#herramientas-avanzadas).
- **También Moodle 4.5.** Funciona en Moodle 4.5, la versión de soporte extendido, además de en 5.x, con los temas Boost y Classic. Lo que le falta al Moodle de un sitio (la vista general de actividades en 4.5) se rechaza con un mensaje claro.
- **Comprobar antes de subir.** `validate_gift` comprueba preguntas GIFT y `validate_html` comprueba HTML antes de que lleguen a Moodle.
- **Plugins en Codex.** Los ajustes que una aplicación deja como `${…}` sin sustituir cuentan como no puestos, así que los plugins funcionan también en Codex; sin sitio, el agente te lo pide.
- El paquete de un SCORM se puede sustituir en su sitio, y las personas de todas las herramientas nuevas llegan a la IA como alias, como siempre.
- Con moodle-driver 0.10.

## 0.3.0 (14 de octubre de 2026)

- **Varios sitios Moodle en un servidor.** Dale los sitios de tu instituto y de tu universidad en `MOODLE_MCP_SITES`, o añade uno mientras hablas (`add_site`); el agente trabaja en uno cada vez y cambia cuando se lo pides (`list_sites`, `use_site`, `remove_site`). Cada sitio conserva su propio inicio de sesión. `MOODLE_URL` funciona como antes, como primer sitio. Consulta [Varios sitios](./several-sites.md).
- **Copiar contenido de cursos entre sitios.** `copy_between_sites` copia actividades, secciones o un curso entero de un sitio a otro, con la copia de seguridad y la restauración del propio Moodle, sin datos de personas y sin pasar por la IA, y te dice qué ha creado y qué queda por arreglar.
- **Copia de seguridad y restauración de parte de un curso.** `backup_course` admite las secciones o actividades que quieres guardar, sin datos de personas; `restore_course` las coloca en la sección que elijas y te dice qué ha creado y qué ha quedado roto.
- **Ocho listas largas más por páginas**: conversaciones, debates y sus mensajes, entregas, participantes, resultados de cuestionarios y bancos de preguntas.
- **El acceso de solo lectura conserva `download_file` y `export_grades`**, que solo leen Moodle y guardan un fichero en tu ordenador.
- **`MOODLE_URL` puede ser cualquier página de tu sitio**, como la dirección de un curso, como decía la documentación.
- Con moodle-driver 0.8, que además empieza cuestionarios con límite de tiempo.

## 0.2.0 (12 de octubre de 2026)

- **Listas largas por páginas.** Las notificaciones llegan de 30 en 30 y los registros del curso de 50 en 50, y el agente pide más cuando las necesita, así que una cuenta con mucha actividad ya no inunda a la IA con decenas de miles de caracteres. Además, cada entrada de los registros es más corta: la descripción larga de Moodle solo sale si se pide.
- **Leer las entregas no cambia nada.** Leer las entregas de una tarea ya no crea entregas vacías en Moodle. Sigue apareciendo en los registros de Moodle como que has visto las páginas de calificación, igual que con el calificador de Moodle.
- **Más claro para el agente.** Se explican todos los estados de una entrega (como `new`: empezada, todavía sin contenido), y se aclara que el progreso del curso y la finalización de las actividades solo llegan a los alumnos, en los cursos que los siguen.
- Con moodle-driver 0.7.

La primera versión.

- 137 herramientas sobre Moodle: cursos y contenido, el ciclo de vida del curso (copiar, hacer copia de seguridad, restaurar, importar, reiniciar), tareas y calificación (rúbricas, flujo de trabajo de calificación, prórrogas), cuestionarios y bancos de preguntas, el calificador, participantes, grupos y matriculaciones, informes y registros, foros, talleres, mensajes, el calendario y actividades como alumno (cuestionarios, tareas, encuestas, consultas, lecciones, H5P, SCORM).
- Inicias sesión tú mismo, en una ventana del navegador que abre. Nunca ve tu contraseña.
- Por defecto, el alumnado llega a la IA como alias. `block` mantiene sus datos fuera por completo, y `clear` muestra los nombres, para un modelo en tu propio ordenador.
- Límites que solo tú puedes relajar: un rol, el acceso de solo lectura y los ámbitos.
- Herramientas del navegador para lo que no cubre ninguna otra herramienta, como un plugin o el contenido de un paquete SCORM.

Probado con Moodle 5.x.
