---
title: Versiones
sidebar_label: Versiones
---

# Versiones

moodle-mcp está en npm como [@falkenslab/moodle-mcp](https://www.npmjs.com/package/@falkenslab/moodle-mcp). Con `npx -y @falkenslab/moodle-mcp`, tu aplicación de IA arranca cada vez la última versión. Para quedarte en una versión, escríbela después del nombre: `npx -y @falkenslab/moodle-mcp@0.11.1`.

El sitio muestra la documentación de la última versión, y la de la siguiente en *Próxima*, en el menú de versiones de la parte de arriba de la página. La de una versión anterior está en el repositorio, en su etiqueta (`docs/content/` en [v0.3.0](https://github.com/falkenslab/moodle-mcp/tree/v0.3.0/docs/content), por ejemplo). Las notas completas están en [GitHub](https://github.com/falkenslab/moodle-mcp/releases).

## 0.11.1 (13 de noviembre de 2026)

- **Las respuestas de emparejamiento por arrastre se guardan.** Cuando el agente hacía un cuestionario por ti, una pregunta de emparejamiento por arrastre podía darse por respondida y luego calificarse como sin responder. Ahora la respuesta se guarda, o el agente sabe que no se guardó.
- **Las preguntas CodeRunner y las páginas de emparejamiento de las lecciones se leen mejor.** El agente ve ahora el enunciado de una pregunta CodeRunner, con cada hueco nombrado donde va, y a qué elemento corresponde cada desplegable de una página de emparejamiento de una lección.

## 0.11.0 (12 de noviembre de 2026)

- **Asistencia.** El agente puede preparar las sesiones de una actividad de Asistencia (una, o cada semana los días que digas hasta una fecha), tomar asistencia y leer el informe, con los porcentajes de cada alumno. Los alumnos aparecen como alias, salvo que hayas elegido ver sus nombres.
- **El formulario de evaluación de un taller.** El agente puede definir el formulario que rellenan los evaluadores, para cualquier estrategia de calificación: aspectos con sus calificaciones y pesos, afirmaciones o una rúbrica con sus niveles.
- **Las columnas de un tablero.** Un tablero nuevo trae tres columnas llamadas "Heading": ahora el agente puede ponerles nombre, añadir, bloquear y quitar columnas. No quita una columna con notas salvo que se lo pidas, y entonces lo confirmas tú.
- **Preguntas para encuestas y cuestionarios offline.** El agente puede añadir preguntas a una encuesta (texto, opciones, escalas de valoración, saltos de página…) y preguntas del banco a un cuestionario offline, y crear sus formularios para imprimir.
- **Secciones ocultas.** Una sección nueva se puede añadir oculta, para que los alumnos no la vean hasta que la muestres.
- **Una pregunta más clara antes de borrar una actividad.** Ahora dice qué actividad es y qué se va con ella: el contenido de una página, las entregas y calificaciones de una tarea, en lugar de la misma lista para todo.

## 0.10.0 (11 de noviembre de 2026)

- **Cuestionarios página a página, como los harías tú.** Cuando el agente hace un cuestionario por ti, ahora recorre el intento página a página, así que Moodle registra una visita por página en lugar de todo el intento otra vez en cada paso. Después de la última página, ve el resumen de todas las preguntas antes de enviarlo. Una aplicación construida sobre moodle-mcp que esperaba todas las preguntas de una vez ahora lee las páginas una a una: `start_quiz_attempt` y `get_quiz_attempt` dan una página, con cuántas hay.
- **El navegador puede parecer uno normal.** Sin ventana, Edge y Chrome dicen `HeadlessChrome` en cada petición, y los administradores de Moodle pueden verlo en los registros del sitio. Con `MOODLE_MCP_USER_AGENT=browser`, dicen lo que dice tu navegador con ventana ([ajustes](./settings.md#moodle_mcp_user_agent)). Está desactivado salvo que lo pongas.
- **Comprobaciones de HTML más seguras.** El HTML que el agente envía a Moodle se comprueba con un analizador más reciente, con diecinueve arreglos de seguridad.

## 0.9.0 (10 de noviembre de 2026)

- **El agente puede calificar los archivos que entregaron los alumnos.** `save_submission_files` guarda en tu ordenador las entregas de una tarea, una carpeta por alias y con nombres de archivo neutros, después de preguntarte. En los archivos de texto plano, los nombres se sustituyen por alias; un nombre escrito dentro de un PDF, un documento o una imagen no se oculta ([detalles](./privacy.md)).
- **Mensajes claros cuando falla el navegador.** Si el navegador se cierra o falla durante una tarea, el agente lo dice en lugar de echarle la culpa a Moodle, y la siguiente petición lo vuelve a abrir. En Windows, una carpeta de perfil con una ruta muy larga aparece como la causa probable de que el navegador no arranque ([qué hacer](./troubleshooting.md)).
- **Otro navegador tras varios fallos, si quieres.** Con `MOODLE_MCP_SWITCH_AFTER_CRASHES`, moodle-mcp prefiere otro navegador que tengas instalado después de ese número de fallos ([ajustes](./settings.md#moodle_mcp_switch_after_crashes)). Está desactivado salvo que lo pongas.
- **El agente pregunta antes de mover el perfil del navegador**, porque tendrías que volver a iniciar sesión.

## 0.8.0 (8 de noviembre de 2026)

- **Un enlace a Moodle con cada acción.** El resultado de cada herramienta lleva ahora la dirección de la página de Moodle que muestra lo que hizo, para que las aplicaciones construidas sobre moodle-mcp pongan un enlace «Ver en Moodle» bajo la acción. Una creación da lo que creó, no el formulario con el que se creó. Mientras los datos de los demás se seudonimizan o se bloquean, ninguna dirección nombra a una persona ([detalles](./getting-started/watching.md#comprobar-el-resultado-en-moodle)).
- **La ventana termina en el resultado.** Cuando pides ver el navegador, casi todas las herramientas lo dejan ahora en la página que muestra su resultado.

## 0.7.0 (28 de octubre de 2026)

- **La pregunta antes de lo que no se puede deshacer, en tu idioma.** En un ordenador en español, moodle-mcp pregunta «Borrar la actividad… No se puede deshacer. ¿Seguimos?»; si no, en inglés, como antes. Sigue la configuración de idioma del ordenador (`LANG`, `LC_MESSAGES`, `LC_ALL`), que agent-kit también da a sus extensiones, y `server_info` dice qué idioma usa.
- **Alias sin clave, si quieres.** Con pseudonym 0.3, la lista de personas que hay detrás de los alias puede guardarse como un archivo legible en lugar de cifrado (`PSEUDONYM_STORAGE=plain`), para una carpeta que tu sistema ya protege. Cifrada sigue siendo lo normal, y tus alias no cambian. La [página de privacidad](./privacy.md#plain-storage) explica cuándo conviene.

## 0.6.0 (25 de octubre de 2026)

- **Actividades H5P a partir de un paquete.** `list_h5p_content_types` dice qué tipos de contenido H5P puede ejecutar tu sitio (y si puedes instalar más), para que el agente lo sepa antes de crear un paquete; `create_activity` crea con él la actividad H5P, con sus ajustes de seguimiento y calificación.
- **Guías de configuración más sencillas**, en lenguaje llano: instálalo con el comando más corto y después ajústalo a ti paso a paso (si das clase o estudias, los nombres de tu alumnado, solo lectura, los cursos de este año), con dónde guarda cada aplicación su configuración. Los comandos se muestran en una ventana de terminal, y las peticiones de ejemplo tal como se las escribirías al agente.
- **Claude Desktop** muestra la pregunta de moodle-mcp antes de lo que no se puede deshacer, igual que Claude Code y Codex.
- Con moodle-driver 0.13 y playwright-core 1.64.1.

## 0.5.0 (21 de octubre de 2026)

- **Aulas: solo los cursos que le des.** `MOODLE_MCP_COURSES` da las URL de tus cursos, en uno o varios sitios, y el agente solo trabaja ahí: otros cursos se rechazan, y también todo lo que no haya leído en uno de ellos, porque los ids de Moodle son únicos en todo el sitio. Las listas de varios cursos solo muestran tus aulas. Consulta [Aulas](./limits.md#aulas).
- **Lo que no se puede deshacer te pregunta.** Antes de borrar, dar de baja, reiniciar un curso o restaurar sobre uno, moodle-mcp te pregunta él mismo, en tu aplicación, y la IA no puede saltarse la pregunta; tienes diez minutos para contestar. Claude Code y Codex lo admiten. **En una aplicación que no puede preguntar (sin elicitación MCP), estas herramientas se rechazan**, salvo que te pregunte antes de cada herramienta y pongas `MOODLE_MCP_CONFIRM=client`. Consulta [Confirmar lo que no se puede deshacer](./limits.md#confirmar-lo-que-no-se-puede-deshacer).
- **Firefox.** `MOODLE_MCP_CHANNEL=firefox` funciona con el Firefox propio de Playwright, descargado la primera vez.
- **Los tipos de pregunta que ofrece un sitio.** `list_question_types` los lista como el selector del banco de preguntas, con los plugins marcados, para que el agente sepa cuáles puede usar antes de montar un cuestionario.
- **Nuevos casos de uso**: una lección a partir de tus apuntes, el glosario de la clase, una encuesta de fin de unidad y qué preguntas de un cuestionario arreglar según sus estadísticas.
- **El sitio, renovado**, con el estilo de Falken's Lab: la configuración para agentes hechos con agent-kit, y todos los ajustes en corto, con cada valor explicado.
- Con moodle-driver 0.12.

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
