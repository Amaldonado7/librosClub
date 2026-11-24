# PRD-DISC-001-04: Gestión admin del catálogo de regalo

## Metadata

| Campo | Valor |
|---|---|
| Ticket | DISC-001 |
| Jira | sin ticket |
| Iniciativa | Regalá un libro (PRD 4 de 4) |
| Estado | Borrador |
| Fecha | 2026-11-24 |
| Autor | Ariadna Maldonado |
| Loops PRD | 0 |

## Contexto y Problema

El catálogo de regalo (`gift_books`, PRD 1) arranca con unos 60 libros cargados por semilla. Después de eso, cualquier cambio (sumar un libro nuevo, corregir una dedicatoria, sacar un libro que ya no se consigue) obliga a escribir una migración SQL y desplegar. Eso deja la calidad de las recomendaciones en manos de quien sabe programar, no de quien cura los libros.

Se decidió (concepto DISC-001) que el rol `admin` mantenga el catálogo desde "Gestionar libros", la sección de administración que ya existe en el dashboard para el catálogo general.

## Objetivos

- Que un admin pueda agregar, editar, desactivar y reactivar libros de regalo sin tocar código.
- Que ningún cambio del admin deje al test sin libros suficientes para recomendar.
- Mantener el mismo estilo y la misma forma de trabajo que la gestión de libros existente.

## Métricas de éxito

- **Autonomía:** el 100% de los cambios al catálogo de regalo posteriores a la semilla se hacen desde el panel, sin migraciones nuevas, durante el primer mes de uso.
- **Tiempo de carga:** un admin agrega un libro nuevo con todos sus campos en menos de 3 minutos (medido en una prueba con la autora y un usuario admin de prueba).
- **Disponibilidad del test:** 0 respuestas 503 del endpoint de recomendación causadas por desactivaciones del admin.

## Requerimientos Funcionales

**Acceso**

- RF-01 [Must]: Agregar en "Gestionar libros" una sub-pestaña "Libros para regalar", visible solo para el rol `admin`, junto a la gestión existente del catálogo general.
- RF-02 [Must]: Proteger todos los endpoints de este PRD con autenticación y rol `admin`; sin token responden 401 y con otro rol 403.

**Listado**

- RF-03 [Must]: Listar los libros de regalo, activos e inactivos, paginados de a 20 y ordenados por título ascendente, mostrando título, autor, etiqueta de género, rangos de edad y estado (Activo/Inactivo).
- RF-04 [Should]: Filtrar el listado por texto (coincidencia parcial, sin distinguir mayúsculas, en título o autor) y por estado (Todos/Activos/Inactivos).
- RF-05 [Should]: Mostrar arriba del listado la cantidad de libros activos por rango de edad (ej. "Hasta 12: 9 · 13–17: 11 · …"), marcando en color de alerta los rangos con menos de 6.

**Alta y edición**

- RF-06 [Must]: Permitir crear un libro de regalo con un formulario que incluye todos los campos de `gift_books` del PRD 1: título, autor, portada (URL opcional), color de portada, etiqueta de género, por qué, dedicatoria, frase para compartir, rangos de edad, niveles de lectura, ganchos, tipos, largo y tonos. Los libros nuevos se crean activos.
- RF-07 [Must]: Mostrar las etiquetas de filtrado como opciones cerradas (casillas para las de selección múltiple, selector para el largo) con los textos visibles de la tabla "Preguntas y opciones" del PRD 2.
- RF-08 [Must]: Mostrar una vista previa de la portada (imagen o bloque de color con el título) mientras se completa el formulario, igual que el formulario de libros existente.
- RF-09 [Must]: Permitir editar todos los campos de un libro existente desde el listado.
- RF-10 [Must]: Validar en el servidor los campos de alta y edición según la tabla "Validaciones" y responder 400 con el primer error en español.
- RF-11 [Must]: Rechazar con 409 el alta o la edición que deje dos libros con el mismo título y autor (sin distinguir mayúsculas ni espacios al inicio o final).

**Desactivar y reactivar**

- RF-12 [Must]: Permitir desactivar un libro desde el listado, con un paso de confirmación; un libro inactivo deja de aparecer en las recomendaciones pero no se borra.
- RF-13 [Must]: Rechazar con 409 la desactivación (o la edición de rangos de edad) que deje algún rango de edad con menos de 3 libros activos, indicando el rango afectado.
- RF-14 [Must]: Permitir reactivar un libro inactivo desde el listado.

### Contrato de los endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/gift/books?page=1&pageSize=20&q=café&status=all` | Listado paginado. `page` ≥ 1 (default 1), `pageSize` 1–50 (default 20), `q` opcional (máx. 100 caracteres), `status` = `all`, `active` o `inactive` (default `all`) |
| GET | `/api/gift/books/stats` | Activos por rango de edad: `{"chico": 9, "adolescente": 11, "joven": 14, "adulto": 16, "mayor": 10}` |
| POST | `/api/gift/books` | Alta; devuelve 201 con el libro creado |
| PUT | `/api/gift/books/:id` | Edición completa; devuelve 200 con el libro actualizado |
| PATCH | `/api/gift/books/:id/status` | Cuerpo `{"active": false}` o `{"active": true}`; devuelve 200 con el libro |

Respuesta del listado:

```json
{
  "items": [
    { "id": 12, "title": "Antes de que se enfríe el café", "author": "Toshikazu Kawaguchi",
      "genreLabel": "Ficción japonesa", "ageRanges": ["adulto", "mayor"], "active": true }
  ],
  "page": 1, "pageSize": 20, "total": 61, "totalPages": 4
}
```

### Validaciones

| Campo | Regla | Mensaje (400) |
|---|---|---|
| `title`, `author` | Obligatorios, 1–200 caracteres | "El título es obligatorio." / "El autor es obligatorio." |
| `genreLabel` | Obligatorio, 1–40 caracteres | "La etiqueta de género es obligatoria." |
| `why` | Obligatorio, 1–400 caracteres | "El por qué es obligatorio." |
| `dedication` | Obligatoria, 1–200 caracteres | "La dedicatoria es obligatoria." |
| `shareQuote` | Obligatoria, 1–120 caracteres | "La frase para compartir debe tener hasta 120 caracteres." |
| `coverUrl` | Opcional; si viene, URL `https://` de hasta 500 caracteres | "La portada debe ser una URL https." |
| `coverColor` | Obligatorio, color hex `#RRGGBB` | "El color de portada no es válido." |
| `ageRanges`, `readingLevels`, `hooks`, `kinds`, `tones` | Al menos un valor, todos dentro de los valores cerrados del PRD 1 | "Elegí al menos un rango de edad." (y equivalentes por campo) / "Valor inválido en hooks." |
| `length` | Uno de `corto`, `mediano`, `largo` | "El largo no es válido." |

### Condiciones de Error

| Código | Cuándo | Ejemplo de cuerpo |
|---|---|---|
| 400 | Campo inválido o parámetro de listado fuera de rango | `{"error": "La portada debe ser una URL https."}` |
| 400 | `id` no numérico o fuera de rango | `{"error": "Identificador inválido."}` (validador existente) |
| 401 | Sin token o token inválido | Respuesta existente de `authMiddleware` |
| 403 | Usuario sin rol `admin` | Respuesta existente de `allowRoles` |
| 404 | El libro no existe | `{"error": "Libro no encontrado."}` |
| 409 | Título y autor duplicados | `{"error": "Ya existe un libro con ese título y autor."}` |
| 409 | Desactivación o edición deja un rango con menos de 3 activos | `{"error": "No se puede: quedarían menos de 3 libros activos para 'Hasta 12'."}` |
| 500 | Error inesperado | `{"error": "Error del servidor."}` (manejador existente) |

## Requerimientos No Funcionales

- RNF-01: El listado responde en menos de 300 ms (p95) con 500 libros en la tabla, medido contra la base local.
- RNF-02: El 100% de las consultas usa parámetros; la búsqueda `q` no se concatena en SQL.
- RNF-03: Todo texto cargado por el admin se muestra en pantalla como texto (escapado), nunca como HTML.
- RNF-04: El formulario se completa solo con teclado y cada campo tiene su etiqueta visible asociada; puntaje de Accesibilidad de Lighthouse ≥ 90 en la sub-pestaña.
- RNF-05: Cobertura de tests del backend y de los componentes nuevos: al menos 80% de líneas y 80% de ramas.

## Criterios de Aceptación

- AC-01 (RF-01): Dado un usuario `admin` en "Gestionar libros", cuando se renderiza, entonces ve la sub-pestaña "Libros para regalar"; dado un usuario `user`, no la ve.
- AC-02 (RF-02): Dado un pedido a `POST /api/gift/books` sin token, cuando se procesa, entonces responde 401; con token de rol `user`, responde 403.
- AC-03 (RF-03): Dado 45 libros en la tabla, cuando se pide `GET /api/gift/books?page=3`, entonces responde 5 ítems, `total: 45` y `totalPages: 3`, ordenados por título.
- AC-04 (RF-03): Dado `pageSize=51` o `page=0`, cuando se pide el listado, entonces responde 400.
- AC-05 (RF-04): Dado un libro "Antes de que se enfríe el café", cuando se pide `q=CAFÉ`, entonces aparece en los resultados; con `status=inactive` y el libro activo, no aparece.
- AC-06 (RF-05): Dado 5 libros activos para `chico`, cuando se muestra la sub-pestaña, entonces el contador de "Hasta 12" muestra 5 en color de alerta.
- AC-07 (RF-06): Dado un formulario completo y válido, cuando el admin lo envía, entonces el endpoint responde 201, el libro aparece en el listado como Activo y en las recomendaciones que le correspondan.
- AC-08 (RF-07): Dado el formulario de alta, cuando se renderiza, entonces "Rangos de edad" muestra 5 casillas con "Hasta 12", "Entre 13 y 17", "Entre 18 y 30", "Entre 31 y 60" y "Más de 60".
- AC-09 (RF-08): Dado un formulario sin portada y con color `#91551F`, cuando se escribe el título, entonces la vista previa muestra un bloque de ese color con el título escrito.
- AC-10 (RF-09): Dado un libro existente, cuando el admin cambia su dedicatoria y guarda, entonces el endpoint responde 200 y la recomendación devuelve la dedicatoria nueva.
- AC-11 (RF-10): Dado un alta con `shareQuote` de 121 caracteres, cuando se envía, entonces responde 400 con "La frase para compartir debe tener hasta 120 caracteres." y el formulario muestra ese mensaje.
- AC-12 (RF-10): Dado un alta con `coverUrl = "javascript:alert(1)"`, cuando se envía, entonces responde 400 con "La portada debe ser una URL https.".
- AC-13 (RF-10): Dado un alta con `hooks = ["terror"]`, cuando se envía, entonces responde 400 con "Valor inválido en hooks.".
- AC-14 (RF-11): Dado un libro "Orgullo y prejuicio" de "Jane Austen", cuando se da de alta " orgullo y prejuicio " de "JANE AUSTEN", entonces responde 409 con "Ya existe un libro con ese título y autor.".
- AC-15 (RF-12): Dado un libro activo y otros 5 activos en su rango, cuando el admin lo desactiva y confirma, entonces aparece como Inactivo y ya no se devuelve en recomendaciones.
- AC-16 (RF-12): Dado el diálogo de confirmación abierto, cuando el admin cancela, entonces el libro sigue Activo.
- AC-17 (RF-13): Dado exactamente 3 libros activos para `chico`, cuando el admin intenta desactivar uno de ellos, entonces responde 409 con el mensaje que nombra "Hasta 12" y el libro sigue activo.
- AC-18 (RF-13): Dado exactamente 3 libros activos para `chico`, cuando el admin edita uno y le quita `chico` de sus rangos, entonces responde 409 y el libro no cambia.
- AC-19 (RF-14): Dado un libro inactivo, cuando el admin lo reactiva, entonces aparece como Activo y vuelve a poder ser recomendado.
- AC-20 (RNF-03): Dado un libro con `why = "<img src=x onerror=alert(1)>"`, cuando se muestra en el listado o en el formulario, entonces el texto aparece literal y no se ejecuta ningún script.
- AC-21 (RF-09): Dado `PUT /api/gift/books/9999` sobre un id inexistente, cuando se procesa, entonces responde 404 con "Libro no encontrado.".

## Fuera de Alcance

- Borrar libros de forma definitiva (Won't: desactivar alcanza y conserva el historial).
- Subir imágenes de portada al servidor; solo se acepta una URL https (Won't).
- Importar o exportar el catálogo en CSV o planillas (Won't en esta versión).
- Historial de cambios o auditoría de quién editó cada libro (Won't en esta versión).
- Previsualizar qué recomendaría el test con un perfil de respuestas (Won't en esta versión).
- Cambios en la gestión del catálogo general (`books`).

## Dependencias

- PRD 1 de DISC-001: tabla `gift_books`, sus campos (incluida `share_quote`) y valores cerrados; el endpoint de recomendación que usa los libros activos.
- PRD 2 de DISC-001: textos visibles de las opciones ("Preguntas y opciones").
- Backend existente: `authMiddleware`, `allowRoles('admin')`, `validateIdParam`, `asyncHandler` y `errorHandler`.
- Frontend existente: sección "Gestionar libros" del dashboard (`Dashboard.tsx`), `AddBookForm` y `BookAdminRow` como referencia de estilo y comportamiento; `AuthContext` para el rol.
- Cliente de API del frontend (`src/utils/api.ts`).

## Supuestos y Preguntas Abiertas

- Supuesto: el panel lo usan pocos admins (1 o 2), así que no se manejan ediciones simultáneas del mismo libro: gana la última que se guarda.
- Pregunta abierta: ninguna bloqueante.

## Riesgos y Mitigaciones

- **Un admin desactiva demasiados libros y el test se queda sin recomendaciones:** mitigación: mínimo de 3 activos por rango de edad (RF-13) y contador con alerta por debajo de 6 (RF-05).
- **Datos cargados con errores (etiquetas mal elegidas) empeoran las recomendaciones:** mitigación: opciones cerradas con los mismos textos que ve quien hace el test (RF-07) y edición rápida desde el listado (RF-09).
- **Texto malicioso en campos libres:** mitigación: validación de longitudes y URL https en el servidor (RF-10) y salida escapada (RNF-03).
