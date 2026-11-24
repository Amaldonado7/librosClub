# PRD-DISC-001-01: Catálogo de regalo y motor de recomendación

## Metadata

| Campo | Valor |
|---|---|
| Ticket | DISC-001 |
| Jira | sin ticket |
| Iniciativa | Regalá un libro (PRD 1 de 4) |
| Estado | Borrador |
| Fecha | 2026-11-24 |
| Autor | Ariadna Maldonado |
| Loops PRD | 2 |

## Contexto y Problema

"Regalá un libro" (`/regalo`) le propone a quien tiene que regalar un test de 8 preguntas sobre quien recibe el regalo y le devuelve tres libros con el motivo de cada elección y una dedicatoria sugerida (canvas "Regalá un libro", pantalla 4 · Resultado). Hoy LibrosClub no tiene de dónde sacar esas recomendaciones: la tabla `books` es el catálogo general (sin etiquetas de gusto, edad ni tono, sin "por qué" ni dedicatoria) y Google Books no permite controlar la calidad ni que los libros se consigan en Argentina.

Se decidió (concepto DISC-001, 2026-11-24) recomendar a partir de un **catálogo curado propio**, con reglas explícitas sobre las respuestas, sin IA ni costo por uso. Este PRD cubre ese catálogo y el endpoint que elige los tres libros; la interfaz del test es el PRD 2.

## Objetivos

- Tener un catálogo de libros para regalar, separado del catálogo general, con la información que muestra el resultado y las etiquetas que usa la recomendación.
- Exponer un endpoint público que, dadas las 8 respuestas, devuelva siempre 3 libros adecuados a la edad de quien recibe, de forma predecible y explicable.
- Que cada libro recomendado traiga un link para comprarlo en una tienda argentina.

## Métricas de éxito

- **Pertinencia percibida:** en una prueba con al menos 10 personas que hacen el test pensando en alguien real, al menos 7 responden que regalarían alguno de los 3 libros sugeridos.
- **Cobertura:** el 100% de las combinaciones posibles de respuestas (5 edades × 4 niveles de lectura × 4 ganchos × 4 tipos × 3 largos × 3 tonos = 2.880) devuelve 3 libros distintos aptos para la edad elegida, verificado por un test automatizado.

## Requerimientos Funcionales

**Catálogo**

- RF-01 [Must]: Crear la tabla `public.gift_books` mediante la migración `librosclub-backend/migrations/002_create_gift_books.sql`, separada de `public.books`, con: `id`, `title`, `author`, `cover_url` (opcional), `cover_color` (hex, respaldo cuando no hay portada), `genre_label` (etiqueta visible, ej. "Misterio cozy"), `why` (por qué se eligió), `dedication` (dedicatoria sugerida), `share_quote` (frase corta sobre el libro para la placa de historias, máximo 120 caracteres), `age_ranges`, `reading_levels`, `hooks`, `kinds`, `length`, `tones`, `active` y `created_at`/`updated_at`.
- RF-02 [Must]: Restringir las etiquetas de cada libro a los valores cerrados de la tabla "Valores de las respuestas" (abajo); `length` admite `corto` (hasta 200 páginas), `mediano` (201–400) o `largo` (más de 400). Un valor fuera de la lista es rechazado por la base.
- RF-03 [Must]: Cargar una semilla (`003_seed_gift_books.sql`) con al menos 60 libros reales que se consiguen en Argentina, con al menos 6 libros activos por cada rango de edad.
- RF-04 [Should]: En la semilla, para cada rango de edad existe al menos un libro por cada valor de `hooks` y al menos uno por cada valor de `kinds`.

**Recomendación**

- RF-05 [Must]: Exponer `POST /api/gift/recommendations`, público (sin token), que recibe las 8 respuestas en el cuerpo JSON.
- RF-06 [Must]: Validar que las 8 respuestas estén presentes y pertenezcan a sus valores cerrados; si no, responder 400 con un mensaje en español que nombre la primera respuesta faltante o inválida.
- RF-07 [Must]: Considerar solo libros con `active = true` cuyo `age_ranges` incluya la edad respondida (filtro duro: nunca se recomienda un libro fuera del rango de edad elegido, salvo la relajación de RF-10).
- RF-08 [Must]: Puntuar cada libro candidato: +3 si `hooks` incluye el gancho; +3 si `kinds` incluye el tipo; +2 si `tones` incluye el tono; largo: +2 si coincide exacto, +1 si es adyacente (`corto`↔`mediano`), 0 si la respuesta es `indistinto`; +1 si `reading_levels` incluye el nivel de lectura.
- RF-09 [Must]: Devolver exactamente 3 libros distintos, ordenados por puntaje descendente; ante empate, por `id` ascendente, de modo que las mismas respuestas devuelvan siempre el mismo resultado.
- RF-10 [Must]: Si hay menos de 3 candidatos en el rango de edad, completar con libros activos del rango adyacente en este orden: `chico`→`adolescente`, `adolescente`→`joven`, `joven`→`adulto`, `adulto`→`joven`, `mayor`→`adulto`. Si aun así hay menos de 3, responder 503 con `{"error": "No hay suficientes libros para recomendar en este momento."}`.
- RF-11 [Should]: No incluir dos libros del mismo autor en un resultado, mientras haya otro candidato disponible.
- RF-12 [Must]: Incluir en cada libro devuelto `buyUrl`, la búsqueda de "título autor" en Buscalibre Argentina, armada en el servidor y codificada para URL: `https://www.buscalibre.com.ar/libros/search?q=<título%20autor>`.
- RF-13 [Must]: Aceptar `relationship` y `occasion` solo para validarlas y devolverlas en la respuesta (`profile`); no influyen en el puntaje.
- RF-14 [Must]: No guardar en la base las respuestas, el resultado ni datos de quien hace el test.

### Valores de las respuestas

| Campo | Pregunta | Valores |
|---|---|---|
| `relationship` | ¿Para quién es? | `mama`, `papa`, `pareja`, `amigo`, `hermano`, `hijo`, `otro` |
| `occasion` | ¿Qué ocasión? | `cumpleanos`, `navidad`, `dia_madre_padre`, `aniversario`, `porque_si` |
| `age` | ¿Qué edad tiene? | `chico` (hasta 12), `adolescente` (13–17), `joven` (18–30), `adulto` (31–60), `mayor` (más de 60) |
| `readingLevel` | ¿Cuánto lee? | `casi_nunca`, `vacaciones`, `mensual`, `devora` |
| `hook` | ¿Qué lo engancha de una historia? | `amor`, `misterio`, `humor`, `anime_manga` |
| `kind` | ¿Ficción o realidad? | `novela`, `historia_real`, `aprender`, `poesia` |
| `length` | ¿Qué largo? | `corto`, `mediano`, `indistinto` |
| `tone` | ¿Qué tono? | `liviano`, `emotivo`, `intenso` |

### Contrato del endpoint

Pedido:

```json
POST /api/gift/recommendations
{
  "relationship": "mama", "occasion": "navidad", "age": "mayor",
  "readingLevel": "vacaciones", "hook": "humor", "kind": "novela",
  "length": "corto", "tone": "liviano"
}
```

Respuesta 200:

```json
{
  "profile": { "relationship": "mama", "occasion": "navidad" },
  "books": [
    {
      "id": 12,
      "title": "Antes de que se enfríe el café",
      "author": "Toshikazu Kawaguchi",
      "genreLabel": "Ficción japonesa",
      "coverUrl": null,
      "coverColor": "#5E5827",
      "why": "Es cortito, tierno y se lee en dos tardes...",
      "dedication": "Para que lo leas con un cafecito y te acuerdes de mí en cada capítulo.",
      "shareQuote": "Cortito, tierno y perfecto para leer con un cafecito un domingo tranqui.",
      "buyUrl": "https://www.buscalibre.com.ar/libros/search?q=Antes%20de%20que%20se%20enfr%C3%ADe%20el%20caf%C3%A9%20Toshikazu%20Kawaguchi"
    }
  ]
}
```

(`books` siempre tiene 3 elementos; el ejemplo muestra uno.) Sin paginación: el resultado es de tamaño fijo.

### Condiciones de Error

| Código | Cuándo | Cuerpo |
|---|---|---|
| 400 | Falta una respuesta | `{"error": "Falta la respuesta: age."}` |
| 400 | Valor fuera de la lista | `{"error": "Respuesta inválida: tone."}` |
| 400 | JSON malformado | `{"error": "JSON inválido."}` (manejador existente) |
| 413 | El cuerpo supera 2 KB (RNF-03) | `{"error": "El pedido es demasiado grande."}` |
| 429 | Se superó el límite de pedidos | `{"error": "Demasiadas solicitudes. Probá de nuevo en unos minutos."}` |
| 503 | Menos de 3 libros disponibles tras la relajación | `{"error": "No hay suficientes libros para recomendar en este momento."}` |
| 500 | Error inesperado (ej. base caída) | `{"error": "Error del servidor."}` sin detalles internos (manejador existente) |

## Requerimientos No Funcionales

- RNF-01: El endpoint responde en menos de 300 ms (p95) con 200 libros activos en la tabla, medido contra la base local.
- RNF-02: Límite de 30 pedidos por IP cada 15 minutos al endpoint (express-rate-limit, con `trust proxy` = 1 ya configurado); el pedido 31 recibe 429.
- RNF-03: El cuerpo del pedido acepta como máximo 2 KB; uno mayor recibe 413.
- RNF-04: El 100% de las consultas a `gift_books` usan parámetros (sin concatenar valores del usuario en SQL).
- RNF-05: Cobertura de tests del motor de recomendación y del controlador: al menos 90% de líneas y 80% de ramas.
- RNF-06: Ninguna respuesta de error expone stack traces, nombres de tablas ni mensajes de PostgreSQL.

## Criterios de Aceptación

- AC-01 (RF-01): Dado una base sin `gift_books`, cuando se ejecuta la migración 002, entonces la tabla existe con todas las columnas de RF-01 y ejecutarla una segunda vez no falla.
- AC-02 (RF-02): Dado la tabla creada, cuando se inserta un libro con `tones = '{alegre}'`, entonces la base rechaza la inserción.
- AC-22 (RF-01): Dado la tabla creada, cuando se inserta un libro con `share_quote` de 121 caracteres o vacía, entonces la base rechaza la inserción; con 120 caracteres la acepta.
- AC-03 (RF-03): Dado la semilla aplicada, cuando se cuentan los libros activos, entonces hay al menos 60, y al menos 6 por cada rango de edad.
- AC-04 (RF-04): Dado la semilla aplicada, cuando se agrupan los libros activos por rango de edad, entonces cada rango tiene al menos un libro para cada `hook` y para cada `kind`.
- AC-05 (RF-05): Dado un pedido sin header `Authorization` con las 8 respuestas válidas, cuando se llama al endpoint, entonces responde 200.
- AC-06 (RF-06): Dado un pedido sin `age`, cuando se llama al endpoint, entonces responde 400 con `{"error": "Falta la respuesta: age."}`.
- AC-07 (RF-06): Dado un pedido con `tone: "alegre"`, cuando se llama al endpoint, entonces responde 400 con `{"error": "Respuesta inválida: tone."}`.
- AC-08 (RF-07): Dado `age: "chico"`, cuando se llama al endpoint con cualquier combinación del resto de las respuestas, entonces los 3 libros tienen `chico` en su `age_ranges`.
- AC-09 (RF-07): Dado un libro con `active = false` que tendría el mayor puntaje, cuando se llama al endpoint con respuestas que lo favorecen, entonces ese libro no aparece.
- AC-10 (RF-08, RF-09): Dado un catálogo de prueba con puntajes conocidos, cuando se llama al endpoint, entonces el orden de los 3 libros coincide con el puntaje calculado según RF-08, y ante empate el de menor `id` va primero.
- AC-11 (RF-09): Dado las mismas 8 respuestas, cuando se llama al endpoint dos veces, entonces ambas respuestas tienen los mismos 3 libros en el mismo orden.
- AC-12 (RF-09, métrica de cobertura): Dado la semilla aplicada, cuando se evalúan las 2.880 combinaciones de respuestas que puntúan, entonces todas devuelven 3 libros distintos aptos para la edad elegida.
- AC-13 (RF-10): Dado un catálogo de prueba con solo 2 libros activos para `chico` y 5 para `adolescente`, cuando se pide con `age: "chico"`, entonces devuelve los 2 de `chico` primero y completa con 1 de `adolescente`.
- AC-14 (RF-10): Dado un catálogo de prueba con 2 libros activos en total, cuando se llama al endpoint, entonces responde 503 con el mensaje de RF-10.
- AC-15 (RF-11): Dado un catálogo de prueba donde los dos mejores puntajes son del mismo autor y hay un tercer candidato de otro autor, cuando se llama al endpoint, entonces el resultado incluye solo uno de los dos libros de ese autor.
- AC-16 (RF-12): Dado un libro "Antes de que se enfríe el café" de Toshikazu Kawaguchi, cuando se lo devuelve, entonces su `buyUrl` es exactamente la del ejemplo del contrato.
- AC-17 (RF-13): Dado dos pedidos idénticos salvo `relationship` y `occasion`, cuando se llama al endpoint, entonces ambos devuelven los mismos libros y `profile` refleja los valores enviados.
- AC-18 (RF-14): Dado un pedido válido, cuando se completa la respuesta, entonces no se ejecutó ningún INSERT/UPDATE en la base (verificado con la base mockeada).
- AC-19 (RNF-02): Dado 30 pedidos desde la misma IP en 15 minutos, cuando se hace el pedido 31, entonces responde 429 con el mensaje de Condiciones de Error; desde otra IP responde 200.
- AC-20 (RNF-06): Dado que la consulta a la base falla, cuando se llama al endpoint, entonces responde 500 con `{"error": "Error del servidor."}` y el cuerpo no contiene "gift_books" ni texto del error de PostgreSQL.
- AC-21 (RNF-03): Dado un pedido de 3 KB, cuando se llama al endpoint, entonces responde 413 con `{"error": "El pedido es demasiado grande."}`.

## Fuera de Alcance

- Interfaz del test, pantalla de carga y resultado en `/regalo` (PRD 2).
- Placa para historias y compartir (PRD 3).
- Alta, edición y desactivación de libros desde el panel de admin (PRD 4); hasta entonces el catálogo se mantiene por migraciones.
- Precio de referencia y cualquier integración de precios o stock con tiendas (Won't: decidido para no mostrar datos desactualizados).
- Recomendación con IA o redacción personalizada del "por qué" y la dedicatoria (Won't).
- Guardar respuestas, resultados o historial de regalos; links públicos a un resultado (Won't).
- Variar los resultados entre corridas con las mismas respuestas (se prioriza que sea predecible).

## Dependencias

- Backend Express existente: `asyncHandler`, `errorHandler` y `express-rate-limit` con `trust proxy` = 1 (FIX-001).
- PostgreSQL con soporte de arrays (`text[]`), ya usado por el proyecto.
- Convención de migraciones SQL numeradas en `librosclub-backend/migrations/` (existe `001_add_book_type.sql`).
- Buscalibre Argentina (`www.buscalibre.com.ar`) como tienda externa de destino de `buyUrl` (RF-12); el sistema solo arma el link, no consulta su API.
- Hosting del backend en producción (Railway) activo para que el endpoint esté disponible fuera de local.

## Supuestos y Preguntas Abiertas

- Supuesto: la URL de búsqueda de Buscalibre Argentina (`/libros/search?q=`) sigue funcionando; se verifica a mano antes de implementar.
- Supuesto: las migraciones se aplican a mano en cada base (local y producción), como `001_add_book_type.sql`.
- Supuesto: la curaduría de los 60 libros (títulos, "por qué", dedicatorias y frases para compartir) la revisa la autora antes de cargar la semilla.
- Pregunta abierta: ninguna bloqueante.

## Riesgos y Mitigaciones

- **Libros recomendados que ya no se consiguen en Argentina:** mitigación — el link lleva a una búsqueda (no a una ficha fija) y el admin podrá desactivarlos (PRD 4).
- **Resultados repetitivos con un catálogo chico:** mitigación — RF-04 garantiza variedad por edad, y el catálogo crece desde el panel de admin.
- **Abuso del endpoint público:** mitigación — límite por IP (RNF-02) y tamaño máximo de cuerpo (RNF-03).
- **Backend de producción caído (Railway sin plan):** aceptado — no bloquea el desarrollo ni las pruebas locales; se resuelve antes de publicar la sección.
