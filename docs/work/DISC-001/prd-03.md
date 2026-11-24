# PRD-DISC-001-03: Placa para historias y compartir

## Metadata

| Campo | Valor |
|---|---|
| Ticket | DISC-001 |
| Jira | sin ticket |
| Iniciativa | Regalá un libro (PRD 3 de 4) |
| Estado | Borrador |
| Fecha | 2026-11-24 |
| Autor | Ariadna Maldonado |
| Loops PRD | 1 |

## Contexto y Problema

El resultado del test (PRD 2) le sirve a quien regala, pero hoy termina ahí: no hay forma de mostrar el regalo elegido ni de que otras personas descubran "Regalá un libro". El canvas diseña una placa vertical de 1080×1920 (pantalla 5) pensada para historias de Instagram o WhatsApp, con el libro elegido, una frase, el logo y el llamado "¿Y vos qué le regalás?".

Se decidió (concepto DISC-001) que la placa se genere en el navegador, sin guardar nada en el servidor, que en el celular abra el menú de compartir y en la computadora se descargue, y que muestre el dominio real del sitio, `librosclub.vercel.app`. Cada placa compartida es difusión gratuita de LibrosClub.

## Objetivos

- Que quien terminó el test pueda compartir su regalo en historias con dos toques desde el celular.
- Que cada placa lleve a nuevas personas a `/regalo`.
- No guardar datos ni imágenes en el servidor.

## Métricas de éxito

- **Uso:** en la prueba de usuarios del PRD 2 (al menos 10 personas), al menos 3 tocan "Compartir en historias" y llegan al menú de compartir o a la descarga.
- **Calidad:** al menos 8 de 10 personas califican la placa con 4 o 5 en una escala de 1 a 5 a la pregunta "¿La subirías a tus historias?".
- **Tiempo:** el 100% de las placas generadas en esa prueba aparecen en menos de 3 segundos desde el toque.

## Requerimientos Funcionales

**Acceso**

- RF-01 [Must]: Mostrar en la pantalla de resultado (PRD 2) el botón "Compartir en historias", entre los libros y "Hacer el test para otra persona", como en el canvas.

**Contenido de la placa**

- RF-02 [Must]: Generar una imagen PNG de exactamente 1080 × 1920 px con el diseño de la pantalla 5 del canvas (fondo, colores, tipografías y elementos decorativos de FEAT-001).
- RF-03 [Must]: Mostrar arriba "MI REGALO PARA {DESTINATARIO}" y debajo "según LibrosClub", con el destinatario según la tabla "Destinatario en la placa".
- RF-04 [Must]: Mostrar el primer libro del resultado (el de mayor puntaje) con su portada, título y autor.
- RF-05 [Must]: Cuando ese libro no tiene `coverUrl`, o la portada no se puede cargar, dibujar en su lugar un libro del color `coverColor` con el título y el autor.
- RF-06 [Must]: Mostrar debajo del libro, entre comillas, la frase para compartir de ese libro (`shareQuote`, máximo 120 caracteres según el PRD 1), como en el canvas.
- RF-07 [Must]: Mostrar abajo el logo de LibrosClub, el texto "¿Y vos qué le regalás?" y la dirección "librosclub.vercel.app".

**Compartir**

- RF-08 [Must]: Al tocar "Compartir en historias", si el navegador permite compartir archivos, abrir el menú de compartir nativo con la imagen `librosclub-regalo.png`.
- RF-09 [Should]: Incluir en lo compartido el texto "Mirá el libro que elegí para regalar. ¿Y vos qué le regalás?" y el enlace `https://librosclub.vercel.app/regalo`, cuando la app de destino lo acepte.
- RF-10 [Must]: Si el navegador no permite compartir archivos (por ejemplo, en la computadora), descargar la imagen como `librosclub-regalo.png`.
- RF-11 [Must]: Mientras se genera la imagen, deshabilitar el botón y mostrar el texto "Preparando tu placa…".
- RF-12 [Must]: Si la persona cierra el menú de compartir sin elegir una app, volver a la pantalla de resultado sin mostrar ningún error.
- RF-13 [Must]: Si la generación de la imagen falla, mostrar el aviso "No pudimos preparar la placa. Probá de nuevo." y volver a habilitar el botón.
- RF-14 [Could]: Permitir elegir cuál de los 3 libros va en la placa antes de compartir; por defecto, el primero.

### Destinatario en la placa

| `relationship` | Texto |
|---|---|
| `mama` | MAMÁ |
| `papa` | PAPÁ |
| `pareja` | MI PAREJA |
| `amigo` | MI AMIGO O AMIGA |
| `hermano` | MI HERMANO O HERMANA |
| `hijo` | MI HIJO O HIJA |
| `otro` | ALGUIEN ESPECIAL |

### Condiciones de Error

| Situación | Comportamiento |
|---|---|
| La portada no carga o no permite usarse en la imagen | Se dibuja el libro de color `coverColor` (RF-05); no se muestra error |
| La persona cancela el menú de compartir | Vuelve al resultado sin aviso (RF-12) |
| Falla la generación de la imagen | Aviso "No pudimos preparar la placa. Probá de nuevo." (RF-13) |
| El navegador no permite compartir archivos | Descarga la imagen (RF-10) |

## Requerimientos No Funcionales

- RNF-01: La placa se genera en menos de 3 segundos en Chrome con la CPU limitada 4× (DevTools), y en menos de 1 segundo sin limitar, en una computadora de desarrollo.
- RNF-02: El PNG generado pesa como máximo 2 MB.
- RNF-03: El código de generación se carga recién al tocar "Compartir en historias" (lazy loading) y su chunk pesa como máximo 40 KB comprimido con gzip.
- RNF-04: La generación funciona con la Content Security Policy vigente de `vercel.json` sin agregar orígenes nuevos.
- RNF-05: La imagen no se envía a ningún servidor: 0 pedidos de red salen al generar y compartir, salvo la carga de la portada del libro.
- RNF-06: Cobertura de tests de los componentes y funciones nuevas: al menos 80% de líneas y 80% de ramas.
- RNF-07: Las tipografías de marca aparecen en la placa: la imagen se dibuja recién cuando las 3 fuentes (Sorts Mill Goudy, IBM Plex Mono y Beth Ellen) terminaron de cargar, con un límite de espera de 2 segundos.

## Criterios de Aceptación

- AC-01 (RF-01): Dado la pantalla de resultado, cuando se renderiza, entonces el botón "Compartir en historias" aparece después del tercer libro y antes de "Hacer el test para otra persona".
- AC-02 (RF-02): Dado un resultado, cuando se genera la placa, entonces el archivo es un PNG de 1080 × 1920 px.
- AC-03 (RF-03): Dado `relationship = mama`, cuando se genera la placa, entonces contiene los textos "MI REGALO PARA MAMÁ" y "según LibrosClub".
- AC-04 (RF-03): Dado `relationship = otro`, cuando se genera la placa, entonces contiene "MI REGALO PARA ALGUIEN ESPECIAL".
- AC-05 (RF-04): Dado un resultado cuyo primer libro es "Antes de que se enfríe el café" de Toshikazu Kawaguchi, cuando se genera la placa, entonces muestra ese título y ese autor, y no los de los otros dos libros.
- AC-06 (RF-05): Dado un primer libro con `coverUrl = null` y `coverColor = "#492710"`, cuando se genera la placa, entonces el libro se dibuja de ese color con su título y autor.
- AC-07 (RF-05): Dado un primer libro cuya portada responde con error, cuando se genera la placa, entonces la placa se genera igual con el libro de color y no aparece ningún aviso.
- AC-08 (RF-06): Dado un primer libro con `shareQuote = "Cortito, tierno y perfecto para leer con un cafecito un domingo tranqui."`, cuando se genera la placa, entonces esa frase aparece completa entre comillas y la dedicatoria no aparece.
- AC-09 (RF-06): Dado un primer libro con una `shareQuote` de 120 caracteres, cuando se genera la placa, entonces la frase aparece completa, sin cortes, dentro del área de texto de la placa.
- AC-10 (RF-07): Dado cualquier resultado, cuando se genera la placa, entonces contiene el logo, "¿Y vos qué le regalás?" y "librosclub.vercel.app".
- AC-11 (RF-08): Dado un navegador donde `navigator.canShare({ files })` devuelve `true`, cuando se toca "Compartir en historias", entonces se llama a `navigator.share` con un archivo `librosclub-regalo.png` de tipo `image/png`.
- AC-12 (RF-09): Dado el mismo navegador, cuando se toca "Compartir en historias", entonces la llamada a `navigator.share` incluye el texto y la URL de RF-09.
- AC-13 (RF-10): Dado un navegador sin `navigator.canShare` o donde devuelve `false`, cuando se toca "Compartir en historias", entonces se descarga un archivo `librosclub-regalo.png` y no se llama a `navigator.share`.
- AC-14 (RF-11): Dado que la generación está en curso, cuando se mira el botón, entonces está deshabilitado y dice "Preparando tu placa…"; al terminar vuelve a "Compartir en historias".
- AC-15 (RF-12): Dado que `navigator.share` rechaza con `AbortError`, cuando la persona cierra el menú, entonces se sigue viendo el resultado y no aparece ningún aviso.
- AC-16 (RF-13): Dado que la generación de la imagen lanza un error, cuando se toca "Compartir en historias", entonces aparece "No pudimos preparar la placa. Probá de nuevo." y el botón queda habilitado.
- AC-17 (RF-14): Dado que se eligió el segundo libro, cuando se genera la placa, entonces muestra el título y el autor del segundo libro.
- AC-18 (RNF-03): Dado el build de producción, cuando se carga el resultado sin tocar "Compartir en historias", entonces el chunk de generación no se descargó; al tocarlo, se descarga un chunk de ≤ 40 KB gzip.
- AC-19 (RNF-04, RNF-05): Dado el preview de Vercel con la CSP vigente, cuando se genera y comparte la placa, entonces la consola no muestra violaciones de Content Security Policy y la pestaña Network no muestra pedidos salvo la portada.

## Fuera de Alcance

- Publicar directamente en Instagram mediante su integración para historias (deep link o API de Meta) (Won't).
- Guardar la placa o el resultado en el servidor, o generar un link público al resultado (Won't, decisión del concepto).
- Placas en otros formatos (cuadrado para feed, horizontal) (Won't en esta versión).
- Mostrar los 3 libros en la placa; muestra uno solo, como el canvas.
- El test, el resultado y la recomendación (PRD 2 y PRD 1).

## Dependencias

- PRD 2 de DISC-001: pantalla de resultado, de donde salen el vínculo y los 3 libros.
- PRD 1 de DISC-001: campos `title`, `author`, `coverUrl`, `coverColor` y `shareQuote` de cada libro.
- API Web Share nivel 2 del navegador (`navigator.canShare` / `navigator.share` con archivos) y Canvas del navegador para dibujar la imagen.
- Content Security Policy de `librosclub-frontend/vercel.json` (FIX-001): `img-src` permite `https:`, `data:` y `blob:`; `font-src` permite `fonts.gstatic.com`.
- Tipografías de marca de FEAT-001 cargadas desde Google Fonts.
- Dominio `librosclub.vercel.app` como dirección pública del sitio.

## Supuestos y Preguntas Abiertas

- Supuesto: las portadas que vengan de Google Books u otros sitios pueden no permitir usarse dentro de una imagen generada (CORS); por eso RF-05 cubre ese caso con el libro de color.
- Supuesto: Safari en iPhone y Chrome en Android permiten compartir archivos PNG desde una página HTTPS, que es como está publicado el sitio.
- Decidido (2026-11-24): la frase de la placa sale de un campo propio del catálogo, `share_quote`, agregado al PRD 1, para respetar el canvas.

## Riesgos y Mitigaciones

- **Portadas externas bloqueadas por CORS:** la placa sale sin la foto real de la portada. Mitigación: libro de color con título y autor (RF-05), que respeta el estilo del canvas.
- **Fuentes que no terminan de cargar:** la placa sale con tipografías del sistema. Mitigación: espera de hasta 2 s a las fuentes (RNF-07) y prueba visual en la verificación.
- **Navegadores sin compartir archivos:** mitigación: descarga como alternativa (RF-10).
- **Que la imagen muestre algo privado:** aceptado, riesgo bajo: la placa solo muestra el vínculo genérico ("MAMÁ") y el libro, sin nombres ni datos personales.
