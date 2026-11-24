# PRD-DISC-001-02: Test "Regalá un libro" en /regalo

## Metadata

| Campo | Valor |
|---|---|
| Ticket | DISC-001 |
| Jira | sin ticket |
| Iniciativa | Regalá un libro (PRD 2 de 4) |
| Estado | Borrador |
| Fecha | 2026-11-24 |
| Autor | Ariadna Maldonado |
| Loops PRD | 0 |

## Contexto y Problema

El PRD 1 define el catálogo de regalo y el endpoint que elige tres libros a partir de 8 respuestas, pero no hay ninguna pantalla donde una persona pueda responderlas y ver el resultado. El canvas "Regalá un libro" ya diseña ese flujo mobile en cuatro pantallas: 1 · Inicio, 2 · Pregunta del test, 3 · Buscando el libro y 4 · Resultado.

Se decidió (concepto DISC-001) que el test sea una sección pública del mismo sitio, `/regalo`, sin iniciar sesión, y que funcione como puerta de entrada a LibrosClub. Este PRD cubre esa interfaz; la placa para historias es el PRD 3.

## Objetivos

- Que alguien que no conoce LibrosClub llegue a `/regalo`, responda las 8 preguntas y vea tres libros para regalar, sin crear cuenta.
- Respetar el diseño aprobado del canvas (textos, orden de pantallas, estilo de FEAT-001).
- Convertir parte de esas visitas en registros en LibrosClub.

## Métricas de éxito

- **Finalización:** en una prueba con al menos 10 personas que no conocen el sitio, al menos 8 llegan al resultado sin ayuda.
- **Tiempo:** la mediana del tiempo desde "Empezar el test" hasta ver el resultado es menor a 2 minutos en esa misma prueba (lo que promete la pantalla de inicio).
- **Intención de compra:** al menos 5 de esas 10 personas tocan "Comprar" en alguno de los libros.

## Requerimientos Funcionales

**Acceso**

- RF-01 [Must]: Agregar la ruta pública `/regalo` al router de la aplicación, accesible sin iniciar sesión.
- RF-02 [Should]: Agregar un acceso a `/regalo` desde la landing (`/`) y desde el sidebar del dashboard (`/app`).

**Pantalla 1 · Inicio**

- RF-03 [Must]: Mostrar la pantalla de inicio del canvas: título "El libro justo para cada persona", el texto "Contanos cómo es quien recibe el regalo y te elegimos tres libros que se consiguen en Argentina.", el botón "Empezar el test" y la leyenda "8 preguntas · menos de 2 minutos".
- RF-04 [Must]: Al tocar "Empezar el test", mostrar la pregunta 1 con todas las respuestas vacías.

**Pantalla 2 · Preguntas**

- RF-05 [Must]: Mostrar las 8 preguntas de a una, en el orden y con las opciones de la tabla "Preguntas y opciones", con selección única.
- RF-06 [Must]: Mostrar en cada pregunta el indicador "PREGUNTA N DE 8" y una barra de 8 segmentos que marca las respondidas, la actual y las pendientes.
- RF-07 [Must]: Desde la pregunta 3 en adelante, mostrar arriba del enunciado la línea "pensá en {destinatario}…", con el destinatario según la tabla "Destinatario por vínculo".
- RF-08 [Must]: Deshabilitar el botón "Siguiente" hasta que haya una opción elegida en la pregunta actual.
- RF-09 [Must]: Con el botón "Volver", ir a la pregunta anterior conservando la opción ya elegida; en la pregunta 1, volver a la pantalla de inicio.
- RF-10 [Must]: Al tocar "Siguiente" en la pregunta 8, pasar a la pantalla "Buscando el libro" y pedir la recomendación a `POST /api/gift/recommendations` con las 8 respuestas (contrato del PRD 1).

**Pantalla 3 · Buscando el libro**

- RF-11 [Must]: Mostrar la pantalla de carga del canvas ("Buscando entre los estantes…" y "Estamos eligiendo tres libros que tengan la onda de {destinatario}.") durante al menos 1,5 segundos, aunque la respuesta llegue antes.
- RF-12 [Must]: Cortar la espera a los 10 segundos sin respuesta y mostrar el error de conexión de la tabla "Condiciones de Error".

**Pantalla 4 · Resultado**

- RF-13 [Must]: Mostrar el encabezado con el vínculo y la ocasión ("PARA {VÍNCULO} · {OCASIÓN}", ej. "PARA MAMÁ · NAVIDAD"), el título "Tres libros para {destinatario}" y la leyenda "elegidos con cariño".
- RF-14 [Must]: Mostrar los 3 libros devueltos, en el orden recibido, cada uno con portada, etiqueta de género, título, autor, "por qué" y "Dedicatoria sugerida".
- RF-15 [Must]: Cuando un libro no tiene `coverUrl`, mostrar en su lugar un bloque del color `coverColor` con el título del libro.
- RF-16 [Must]: Mostrar en cada libro el botón "Comprar", que abre `buyUrl` en una pestaña nueva sin dar acceso a la página de origen (`rel="noopener noreferrer"`).
- RF-17 [Must]: Mostrar el botón "Hacer el test para otra persona", que borra las respuestas y vuelve a la pantalla de inicio.
- RF-18 [Must]: Si no hay sesión iniciada, mostrar debajo de los libros una invitación a sumarse a LibrosClub con el botón "Registrarme", que abre el modal de autenticación existente en modo registro.
- RF-19 [Should]: Si hay sesión iniciada, reemplazar la invitación por el enlace "Ir a LibrosClub", que lleva a `/app`.
- RF-20 [Could]: Mostrar en cada dedicatoria un botón "Copiar dedicatoria" que la copia al portapapeles y confirma con el texto "¡Copiada!".

**Errores**

- RF-21 [Must]: Ante un error de la recomendación, mostrar el mensaje y la acción de la tabla "Condiciones de Error" en lugar del resultado, sin perder las respuestas.

### Preguntas y opciones

| # | Pregunta | Opciones (texto visible → valor enviado) |
|---|---|---|
| 1 | ¿Para quién es el regalo? | Mi mamá → `mama` · Mi papá → `papa` · Mi pareja → `pareja` · Un amigo o amiga → `amigo` · Mi hermano o hermana → `hermano` · Mi hijo o hija → `hijo` · Otra persona → `otro` |
| 2 | ¿Para qué ocasión? | Cumpleaños → `cumpleanos` · Navidad → `navidad` · Día de la madre o del padre → `dia_madre_padre` · Aniversario → `aniversario` · Porque sí → `porque_si` |
| 3 | ¿Qué edad tiene? | Hasta 12 → `chico` · Entre 13 y 17 → `adolescente` · Entre 18 y 30 → `joven` · Entre 31 y 60 → `adulto` · Más de 60 → `mayor` |
| 4 | ¿Cuánto lee? | Casi nunca → `casi_nunca` · Solo en vacaciones → `vacaciones` · Un libro por mes → `mensual` · Devora libros → `devora` |
| 5 | ¿Qué le engancha más de una historia? | Que los personajes se enamoren → `amor` · Descubrir quién fue → `misterio` · Reírse y pasarla bien → `humor` · Es fan del anime y el manga → `anime_manga` |
| 6 | ¿Ficción o realidad? | Novelas → `novela` · Historias reales → `historia_real` · Aprender algo nuevo → `aprender` · Poesía → `poesia` |
| 7 | ¿Qué largo prefiere? | Cortito → `corto` · Ni muy corto ni muy largo → `mediano` · Le da igual → `indistinto` |
| 8 | ¿Qué tono busca? | Liviano, para pasarla bien → `liviano` · Emotivo, que lo toque → `emotivo` · Intenso, que no pueda soltarlo → `intenso` |

### Destinatario por vínculo

| Valor | Destinatario (RF-07, RF-11, RF-13) | Encabezado (RF-13) |
|---|---|---|
| `mama` | tu mamá | MAMÁ |
| `papa` | tu papá | PAPÁ |
| `pareja` | tu pareja | TU PAREJA |
| `amigo` | tu amigo o amiga | TU AMIGO O AMIGA |
| `hermano` | tu hermano o hermana | TU HERMANO O HERMANA |
| `hijo` | tu hijo o hija | TU HIJO O HIJA |
| `otro` | esa persona | ALGUIEN ESPECIAL |

Las ocasiones en el encabezado usan el texto visible de la pregunta 2 en mayúsculas (ej. `dia_madre_padre` → "DÍA DE LA MADRE O DEL PADRE").

### Condiciones de Error

| Respuesta del endpoint | Mensaje | Acción |
|---|---|---|
| 400 | "Algo salió mal con tus respuestas." | Botón "Empezar de nuevo" (vuelve al inicio y borra respuestas) |
| 413 | "Algo salió mal con tus respuestas." | Botón "Empezar de nuevo" |
| 429 | "Hiciste muchos tests seguidos. Probá de nuevo en unos minutos." | Botón "Reintentar" (reenvía las mismas respuestas) |
| 503 | "Ahora no tenemos libros para recomendar. Probá más tarde." | Botón "Reintentar" |
| 500, sin conexión o más de 10 s | "No pudimos buscar libros ahora. Revisá tu conexión y probá de nuevo." | Botón "Reintentar" |

## Requerimientos No Funcionales

- RNF-01: La pantalla de inicio de `/regalo` logra un puntaje de Accesibilidad de Lighthouse ≥ 90 en modo mobile.
- RNF-02: El código de `/regalo` se carga en un chunk aparte (lazy loading) de como máximo 60 KB comprimido con gzip, sin aumentar el bundle inicial de `/` ni de `/app`.
- RNF-03: Todas las opciones y botones tienen un área táctil de al menos 44 × 44 px.
- RNF-04: El flujo se usa sin scroll horizontal desde 320 px de ancho; en pantallas de más de 600 px el contenido se centra con un ancho máximo de 480 px.
- RNF-05: Cobertura de tests de los componentes nuevos de `/regalo`: al menos 80% de líneas y 80% de ramas (umbral vigente del frontend).
- RNF-06: El flujo completo se puede hacer solo con teclado; al cambiar de pregunta, el foco pasa al enunciado de la nueva pregunta.

## Criterios de Aceptación

- AC-01 (RF-01): Dado un visitante sin sesión, cuando entra a `/regalo`, entonces ve la pantalla de inicio y no se abre el modal de login.
- AC-02 (RF-02): Dado la landing y el dashboard, cuando se los renderiza, entonces cada uno tiene un enlace visible con `href="/regalo"`.
- AC-03 (RF-03): Dado la pantalla de inicio, cuando se renderiza, entonces muestra los textos exactos de RF-03 y el botón "Empezar el test".
- AC-04 (RF-04): Dado que se completó un test y se volvió al inicio, cuando se toca "Empezar el test", entonces la pregunta 1 no tiene ninguna opción seleccionada.
- AC-05 (RF-05): Dado la pregunta 5, cuando se renderiza, entonces muestra el enunciado y las 4 opciones exactas de la tabla, y elegir una deselecciona la anterior.
- AC-06 (RF-06): Dado la pregunta 5, cuando se renderiza, entonces muestra "PREGUNTA 5 DE 8", 4 segmentos completos, 1 actual y 3 pendientes.
- AC-07 (RF-07): Dado `relationship = mama`, cuando se muestra la pregunta 5, entonces arriba del enunciado aparece "pensá en tu mamá…"; en las preguntas 1 y 2 esa línea no aparece.
- AC-08 (RF-08): Dado una pregunta sin opción elegida, cuando se renderiza, entonces "Siguiente" está deshabilitado; al elegir una opción, se habilita.
- AC-09 (RF-09): Dado la pregunta 4 respondida con "Un libro por mes", cuando se avanza a la 5 y se toca "Volver", entonces la pregunta 4 muestra "Un libro por mes" seleccionada.
- AC-10 (RF-09): Dado la pregunta 1, cuando se toca "Volver", entonces se muestra la pantalla de inicio.
- AC-11 (RF-10): Dado las 8 preguntas respondidas, cuando se toca "Siguiente" en la 8, entonces se hace exactamente un `POST /api/gift/recommendations` con los 8 valores de la tabla y se muestra "Buscando entre los estantes…".
- AC-12 (RF-11): Dado que el endpoint responde en 200 ms, cuando se termina el test, entonces la pantalla de carga se ve al menos 1,5 segundos antes del resultado.
- AC-13 (RF-12): Dado que el endpoint no responde, cuando pasan 10 segundos, entonces se muestra "No pudimos buscar libros ahora. Revisá tu conexión y probá de nuevo." con el botón "Reintentar".
- AC-14 (RF-13): Dado `relationship = mama` y `occasion = navidad`, cuando se muestra el resultado, entonces el encabezado dice "PARA MAMÁ · NAVIDAD" y el título "Tres libros para tu mamá".
- AC-15 (RF-14): Dado una respuesta con 3 libros, cuando se muestra el resultado, entonces se ven los 3 en el mismo orden, cada uno con etiqueta, título, autor, "por qué" y "Dedicatoria sugerida".
- AC-16 (RF-15): Dado un libro con `coverUrl = null` y `coverColor = "#91551F"`, cuando se muestra, entonces su portada es un bloque de ese color con el título del libro.
- AC-17 (RF-16): Dado un libro con `buyUrl`, cuando se inspecciona su botón "Comprar", entonces es un enlace a `buyUrl` con `target="_blank"` y `rel="noopener noreferrer"`.
- AC-18 (RF-17): Dado el resultado, cuando se toca "Hacer el test para otra persona", entonces se muestra la pantalla de inicio y las respuestas anteriores quedan borradas.
- AC-19 (RF-18): Dado un visitante sin sesión en el resultado, cuando toca "Registrarme", entonces se abre el modal de autenticación en modo registro.
- AC-20 (RF-19): Dado un usuario con sesión iniciada en el resultado, cuando se renderiza, entonces no aparece "Registrarme" y aparece "Ir a LibrosClub" con `href="/app"`.
- AC-21 (RF-20): Dado un resultado, cuando se toca "Copiar dedicatoria" en un libro, entonces el portapapeles contiene esa dedicatoria y se muestra "¡Copiada!".
- AC-22 (RF-21): Dado que el endpoint responde 429, cuando termina el test, entonces se muestra "Hiciste muchos tests seguidos. Probá de nuevo en unos minutos." y "Reintentar" reenvía las mismas 8 respuestas.
- AC-23 (RF-21): Dado que el endpoint responde 400, cuando termina el test, entonces se muestra "Algo salió mal con tus respuestas." y "Empezar de nuevo" vuelve al inicio sin respuestas.
- AC-24 (RF-21): Dado que el endpoint responde 503, cuando termina el test, entonces se muestra "Ahora no tenemos libros para recomendar. Probá más tarde." con "Reintentar".
- AC-25 (RNF-02): Dado el build de producción, cuando se inspeccionan los chunks, entonces `/regalo` está en un chunk separado de ≤ 60 KB gzip y el chunk inicial no incluye sus componentes.
- AC-26 (RNF-04): Dado un viewport de 320 px de ancho, cuando se recorren las 4 pantallas, entonces no hay scroll horizontal.
- AC-27 (RNF-06): Dado el test en curso, cuando se avanza de pregunta con el teclado, entonces el foco queda en el enunciado de la nueva pregunta.

## Fuera de Alcance

- Botón "Compartir en historias" y la placa 1080×1920 (PRD 3).
- Catálogo, puntaje y endpoint de recomendación (PRD 1).
- Gestión del catálogo desde el panel de admin (PRD 4).
- Precio de referencia en cada libro (Won't, decisión del concepto).
- Guardar el progreso al recargar la página o una URL por pregunta: al recargar, el test vuelve al inicio (Won't en esta versión).
- Guardar resultados, historial de regalos o asociarlos a la cuenta (Won't).
- Analítica de uso (eventos, embudo); las métricas se miden con la prueba de usuarios.

## Dependencias

- PRD 1 de DISC-001: endpoint `POST /api/gift/recommendations`, sus valores cerrados y sus códigos de error.
- Router de la aplicación (`src/App.jsx`), cliente de API (`src/utils/api.ts`, base `VITE_API_URL`).
- Autenticación existente: `AuthContext` (sesión) y `AuthModal` (modo registro).
- Estilo visual de FEAT-001 (tokens en `src/index.css`, fuentes y componentes base).
- Landing (`LandingPage.tsx`) y sidebar del dashboard (`Dashboard.tsx`) para los accesos de RF-02.
- Buscalibre Argentina como destino de "Comprar" (link armado por el PRD 1).
- Backend de producción activo (Railway) para que el test funcione fuera de local.

## Supuestos y Preguntas Abiertas

- Verificado: `AuthModal` acepta `defaultMode = 'register'`, así que se puede abrir en modo registro desde `/regalo`.
- Supuesto: la CSP de `vercel.json` ya permite las llamadas a la API (`connect-src` incluye Railway) y los links externos no requieren cambios.
- Pregunta abierta: ninguna bloqueante.

## Riesgos y Mitigaciones

- **Backend caído en producción:** el test se ve pero siempre termina en error. Mitigación: el error tiene mensaje y "Reintentar" (RF-21); se resuelve el hosting antes de publicar la sección.
- **El test se percibe largo en el celular:** mitigación: una pregunta por pantalla, progreso visible y el botón "Volver" que conserva respuestas; se valida con la métrica de tiempo.
- **Textos con género ("tu amigo o amiga") se sienten forzados:** aceptado en esta versión por simplicidad; se revisa con la prueba de usuarios.
