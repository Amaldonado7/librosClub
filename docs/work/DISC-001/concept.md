# Concepto: Regalá un libro

| Métrica | Valor |
|---------|-------|
| Ticket | DISC-001 |
| Fecha | 2026-11-24 |
| Estado | Cerrado |

## Visión

Que cualquier persona que no sabe qué libro regalar responda un test corto sobre quien recibe el regalo y obtenga tres libros que se consiguen en Argentina, con el motivo de cada elección y una dedicatoria sugerida, y que pueda compartir el resultado en historias.

## Problema / Oportunidad

- Elegir un libro para otra persona es difícil: no sabés qué leyó, qué le gusta ni qué está disponible.
- LibrosClub hoy sirve a quien ya lee (catálogo, búsqueda, intercambio). "Regalá un libro" suma a quien **no** necesariamente lee pero tiene que regalar, y funciona como puerta de entrada al club.
- La placa para historias hace que cada resultado sea difusión gratuita del sitio ("¿Y vos qué le regalás?").

## Usuarios Objetivo

- **Quien regala** (principal): puede no ser lector; quiere resolver rápido (menos de 2 minutos) y con una elección que quede bien. Usa principalmente el celular.
- **Quien llega por una historia compartida**: ve la placa en Instagram, entra al sitio y hace el test para otra persona.
- **Usuarios actuales de LibrosClub**: pueden usarlo para regalar a alguien de su entorno.

## Funcionalidades Candidatas

Según el diseño aprobado (canvas "Regalá un libro", flujo mobile de 5 pantallas):

1. **Inicio** (`/regalo`): presentación ("El libro justo para cada persona"), botón "Empezar el test", "8 preguntas · menos de 2 minutos".
2. **Test de 8 preguntas** con barra de progreso, volver atrás y opciones de selección única; las preguntas se personalizan con el vínculo ("pensá en tu mamá…").
3. **Pantalla de carga** ("Buscando entre los estantes…").
4. **Resultado**: encabezado con destinatario y ocasión ("Para mamá · Navidad"), 3 libros con portada, etiqueta de género, autor, por qué se eligió, dedicatoria sugerida, precio de referencia y botón "Comprar"; acciones "Compartir en historias" y "Hacer el test para otra persona".
5. **Placa para historias** (1080×1920): libro principal, frase, logo y llamado a la acción con la URL del sitio.

## Restricciones y Consideraciones

- Debe vivir en el mismo sitio como sección `/regalo` y con el estilo visual ya aplicado en FEAT-001.
- Stack actual: React + Vite en Vercel, Express + PostgreSQL. El backend de producción (Railway) está caído hasta que se resuelva el hosting.
- Fuente de datos de libros disponible hoy: Google Books API (ya integrada) y el catálogo propio en la base.
- "Se consiguen en Argentina", "precio de referencia" y "Comprar" requieren una fuente de precios/disponibilidad que hoy no existe.
- Proyecto final de Analista de Sistemas: priorizar alcance demostrable y costo bajo.

## Decisiones Tomadas

- 2026-11-19: "Regalá un libro" es una sección del mismo sitio (`/regalo`), no un sitio aparte — mantiene una sola marca y reutiliza auth, API y deploy.
- 2026-11-19: El estilo visual del canvas se adoptó para toda la app (FEAT-001, mergeado).
- 2026-11-24: Recomendación por **catálogo curado + reglas**: una lista propia de libros etiquetados (gustos, edad, largo, tono) donde las respuestas filtran y puntúan; el "por qué" y la dedicatoria se escriben en el catálogo. Sin IA ni costo por uso; resultados predecibles y defendibles en la tesis.
- 2026-11-24: "Comprar" abre la **búsqueda del libro en una tienda argentina**; no hay integración de precios en tiempo real.
- 2026-11-24: El test es **público, sin iniciar sesión**; al final se invita a registrarse en LibrosClub.
- 2026-11-24: "Compartir en historias" **genera la placa 1080×1920 en el navegador** y abre el menú de compartir nativo del celular; en computadora descarga la imagen. No se guardan resultados en la base.

- 2026-11-24: Las **8 preguntas** (selección única): 1) ¿Para quién es? (mamá, papá, pareja, amigo/a, hermano/a, hijo/a, otro); 2) ¿Qué ocasión? (cumple, Navidad, día de la madre/padre, aniversario, porque sí); 3) ¿Qué edad tiene? (chico, adolescente, 18–30, 30–60, 60+); 4) ¿Cuánto lee? (casi nunca, en vacaciones, uno por mes, devora libros); 5) ¿Qué lo engancha de una historia? (amor, misterio, reírse, anime/manga); 6) ¿Ficción o realidad? (novelas, historias reales, aprender algo, poesía); 7) ¿Qué largo? (cortito, mediano, le da igual); 8) ¿Qué tono? (liviano, emotivo, intenso). Las preguntas 1 y 2 personalizan los textos; las 3 a 8 filtran y puntúan el catálogo. El detalle fino de opciones se ajusta en el PRD.
- 2026-11-24: El catálogo curado es una **lista propia de libros para regalar**, separada de `books`: arranca con ~60 libros cargados por semilla y el admin lo mantiene (agregar, editar, desactivar) desde "Gestionar libros".
- 2026-11-24: "Comprar" abre la **búsqueda del título en Buscalibre Argentina**, sin mostrar precio (se elimina "precio de referencia" del diseño para no mostrar datos desactualizados).

- 2026-11-24: La placa para historias muestra **librosclub.vercel.app** (el dominio real del sitio) en lugar de "librosclub.com" del diseño.
- 2026-11-24: División en 4 PRDs aprobada; orden de implementación 1 → 2 → 3 → 4.
- 2026-11-24: La frase de la placa sale de un campo propio del catálogo, `share_quote` (máx. 120 caracteres), para respetar el canvas; se agregó al PRD 1 y lo usa el PRD 3.
- 2026-11-24: El admin desactiva libros en vez de borrarlos, y el sistema impide dejar un rango de edad con menos de 3 libros activos (PRD 4).

## Preguntas Abiertas

- Ninguna bloqueante. Se refinan en cada PRD.

## PRDs Identificados

| # | Título | Archivo | Estado |
|---|--------|---------|--------|
| 1 | Catálogo de regalo y motor de recomendación | prd-01.md | validated |
| 2 | Test "Regalá un libro" en /regalo | prd-02.md | validated |
| 3 | Placa para historias y compartir | prd-03.md | validated |
| 4 | Gestión admin del catálogo de regalo | prd-04.md | validated |
