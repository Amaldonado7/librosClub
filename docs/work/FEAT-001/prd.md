# PRD-FEAT-001: Rediseño visual según el canvas "Regalá un libro"

## Metadata

| Campo | Valor |
|---|---|
| Ticket | FEAT-001 |
| Jira | sin ticket |
| Iniciativa | Trabajo final Analista de Sistemas — LibrosClub |
| Estado | En revisión (loop correctivo PLAN→DEFINE) |
| Fecha | 2026-11-19 (actualizado 2026-11-19, loop 1) |
| Autor | MDD define-agent (con decisiones de la usuaria) |
| Loops PRD | 1 |

## Contexto y Problema

LibrosClub hoy usa una identidad visual (Lora + Space Mono, tarjetas con radio 0.75rem, estética genérica de Shadcn) que no coincide con el lenguaje visual del canvas "Regalá un libro", cuyas maquetas (App-Landing, App-Feed, App-Feed-Mobile) la usuaria aprobó como la dirección de marca del producto. Mientras la app y el canvas convivan con dos lenguajes distintos, el producto se percibe inconsistente y la futura sección `/regalo` (FEAT-002) no va a encajar con el resto de la app.

El problema que resuelve este PRD es **la inconsistencia visual**: llevar todas las pantallas existentes del frontend (`librosclub-frontend/`) al lenguaje del canvas, sin cambiar funcionalidad, datos, copy ni contratos de API.

**Actualización 2026-11-19 (loop correctivo PLAN→DEFINE, Loops PRD 1):** durante CODE/VERIFY aparecieron dos bugs preexistentes de la rama base `mvp-3` que impiden mostrar el rediseño funcionando (la tab Feed sale vacía porque `GET /api/google-books/feed` devuelve `items: []`, y `AuthModal` abre en el modo equivocado), y la usuaria decidió incorporar al mismo ticket el favicon con el sello floral y un conjunto de cambios de backend y de tooling sin cambio de comportamiento (refactor de auth con tests, `npm audit fix`, desversionar `node_modules`, tipado sin `any`, medición de cobertura). Evidencia: `docs/work/FEAT-001/deuda-tecnica.md` y `docs/work/FEAT-001/sast.md`. Este PRD se actualiza para que esos cambios queden trazados a requerimientos y criterios de aceptación.

Lenguaje visual de referencia (tomado de las maquetas aprobadas):

- **Tipografía:** Sorts Mill Goudy (cuerpo y títulos), IBM Plex Mono (etiquetas, botones, navegación, chips — en mayúsculas con tracking ~0.06–0.08em), Beth Ellen (acentos decorativos cortos). Reemplaza Lora y Space Mono.
- **Paleta:** se mantienen los tokens de `src/index.css` — forest `#5E5827`, terracotta `#91551F`, wood-dark `#492710`, sunlight `#F2D661`, warm-cream `#F7F0E2` — y se suman superficie de tarjeta `#FFFBF2` y bordes `#E2D6BA` / `#CFC3A6`.
- **Componentes:** botones rectos (radio 4px) en mono mayúscula; chips/pastillas con radio 999px; stickers rotados decorativos (ej. "Olor a libro nuevo", rotación entre -8° y 8°); tarjetas crema con borde 1.5px; portadas de libro con forma de lomo (radio `3px 8px 8px 3px` + sombra interna) y badge sunlight; sello/logo floral de LibrosClub (SVG) en hero, sidebar y header.

## Objetivos

1. Que el 100% de las pantallas y componentes en alcance usen el sistema visual del canvas (tipografía, paleta, formas).
2. Centralizar el lenguaje visual en tokens (CSS custom properties + `tailwind.config.ts`) y componentes base reutilizables, para que FEAT-002 (`/regalo`) lo consuma sin redefinirlo.
3. Mantener intacta la funcionalidad existente: ningún flujo (login, feed, búsqueda, catálogo, intercambio, clubes, cerca tuyo, gestión admin, premium) cambia su comportamiento.
4. Cumplir accesibilidad WCAG 2.1 AA en contraste, foco y tamaño de targets en todas las pantallas rediseñadas.
5. Corregir los dos bugs preexistentes que impiden demostrar el rediseño (Feed vacío y modo incorrecto de `AuthModal`) sin cambiar contratos de API.
6. Dejar verificados todos los endpoints del backend contra el entorno local, con usuario `user` y `admin`.

## Métricas de éxito

Sin métrica de outcome de negocio: es un rediseño visual de un trabajo final académico sin usuarios productivos ni analítica instalada. Se usan métricas de resultado verificables como proxy:

- Pantallas en alcance que pasan la revisión visual de la usuaria contra las maquetas: **100%** de las superficies listadas en RF-09 a RF-19.
- Puntaje de Accesibilidad de Lighthouse en `/` y `/app` (desktop y mobile): **≥ 90**.
- Regresiones funcionales detectadas en la verificación manual de flujos (RNF-06): **0**.
- Géneros del Feed que muestran resultados en la tab Feed: **10 de 10** (hoy 0 de 10).
- Rutas del backend que pasan el smoke contra el entorno local (RNF-10): **40 de 40**.

## Requerimientos Funcionales

### Base visual (tokens y componentes base)

- RF-01 [Must]: El frontend debe cargar exactamente tres familias tipográficas — Sorts Mill Goudy, IBM Plex Mono y Beth Ellen — y no debe cargar Lora ni Space Mono.
  *Motivo: tipografía es el rasgo más visible del canvas y la decisión ya está tomada.*
- RF-02 [Must]: El sistema de diseño debe asignar Sorts Mill Goudy a cuerpo de texto y títulos (`h1`–`h6`), IBM Plex Mono en mayúsculas con tracking ≥ 0.06em a botones, etiquetas, ítems de navegación y chips, y Beth Ellen solo a acentos decorativos de ≤ 4 palabras.
- RF-03 [Must]: El sistema de diseño debe exponer como tokens (CSS custom properties en `src/index.css` mapeadas en `tailwind.config.ts`) la superficie de tarjeta `#FFFBF2` y los bordes `#E2D6BA` y `#CFC3A6`, conservando con sus valores actuales los tokens forest, terracotta, wood-dark, sunlight y warm-cream.
- RF-04 [Must]: Los botones de la app deben renderizarse con radio de 4px y etiqueta en IBM Plex Mono mayúscula, y los chips/pastillas (filtros de género, badges de estado, plan) con radio 999px.
- RF-05 [Must]: Las tarjetas de contenido (libro, club, publicación, formularios en tarjeta) deben usar fondo `#FFFBF2` y borde de 1.5px en un color de borde del sistema.
- RF-06 [Must]: `BookCoverCard` debe mostrar la portada real (Google Books o `cover_url` de la DB) dentro de un marco con forma de lomo (radio `3px 8px 8px 3px` + sombra interna) y, cuando no haya imagen o la imagen falle al cargar, debe mostrar un bloque de color de la paleta con título y autor como fallback.
- RF-07 [Must]: La app debe incluir un componente reutilizable de sello/logo floral de LibrosClub en SVG, usado en el hero de la Landing, en la sidebar del Dashboard y en el header mobile del Dashboard.
- RF-08 [Should]: La app debe incluir un componente reutilizable de sticker decorativo (pastilla rotada entre -8° y 8°, IBM Plex Mono mayúscula, fondo sunlight o terracotta) marcado `aria-hidden="true"` cuando su texto sea puramente decorativo.

### Pantallas

- RF-09 [Must]: `LandingPage` (hero, funciones, planes y footer) debe adoptar la composición y estilos de la maqueta App-Landing, conservando su copy actual y agregando como único texto nuevo los stickers y acentos Beth Ellen de la maqueta.
- RF-10 [Must]: `AuthModal` debe adoptar el sistema visual (tarjeta crema, inputs con borde del sistema, botón primario recto mono, sello floral) sin cambiar campos, validaciones ni mensajes.
- RF-11 [Must]: La sidebar del Dashboard en desktop debe usar fondo wood-dark, ítems de navegación en IBM Plex Mono mayúscula y el ítem activo con fondo forest, según la maqueta App-Feed.
- RF-12 [Must]: El header del Dashboard (título y descripción de la tab activa) y la navegación mobile deben adoptar el estilo de las maquetas App-Feed y App-Feed-Mobile.
- RF-13 [Must]: La tab Feed debe mostrar los chips de género con el estilo pastilla, la grilla de portadas tipo lomo y el botón "Cargar más" con el estilo de la maqueta App-Feed.
- RF-14 [Must]: Las tabs Buscar y Libros disponibles deben adoptar el sistema visual (input de búsqueda, grilla de portadas tipo lomo, tarjetas, badges).
- RF-15 [Must]: Las tabs Clubes y Cerca tuyo deben adoptar el sistema visual (tarjetas, chips, botones, tipografía) sin cambiar su contenido.
- RF-16 [Must]: La tab Gestionar libros (admin) — `AddBookForm`, `BookAdminRow` en sus tres estados (normal / editando / confirmando borrado) y la sub-vista de solicitudes — debe adoptar el sistema visual.
- RF-17 [Must]: Los modales y paneles `PremiumUpgradeModal`, `RequestChatModal` y `ClubDetailSheet` deben adoptar el sistema visual.
- RF-18 [Should]: `EmptyState`, `BookCardSkeleton` (y demás skeletons) y los toasts deben adoptar el sistema visual; el skeleton de portada debe conservar la proporción 2:3 y la forma de lomo.
- RF-19 [Could]: `NotFound.tsx` y `Login.tsx` deben adoptar el sistema visual. *Nota: hoy no están montados en el router (`App.jsx` redirige `*` a `/` y el login real es `AuthModal`); ver Supuestos.*

### Estados de error y listados (contrato existente, solo cambia la presentación)

- RF-20 [Must]: Los estados de error existentes (toasts `variant: 'destructive'` ante fallas de carga de libros, búsqueda, solicitudes y acciones de intercambio; mensajes de error de login en `AuthModal`; fallo de carga de imagen de portada) deben conservar sus disparadores y mensajes actuales y renderizarse con el sistema visual.
- RF-21 [Must]: Los listados deben conservar su estrategia de paginación actual sin cambios: Feed de Google Books con `page` (base 0) y "Cargar más" que agrega resultados (`append`); Buscar con `page`/`pageSize`; Libros disponibles y Gestionar libros sin paginación (comportamiento actual del endpoint `GET /api/books`, fuera de alcance modificarlo).

### Agregados del loop correctivo 2026-11-19

- RF-22 [Must]: La app debe servir `librosclub-frontend/public/favicon.svg` con el sello floral de LibrosClub: flor amarilla `#F2D661` de 8 pétalos circulares alrededor de un anillo con centro hueco, sobre fondo verde oliva `#5E5827`, con el mismo dibujo que el componente `FloralSeal` (RF-07). `index.html` ya lo referencia como `/favicon.svg`.
  *Motivo: la pestaña del navegador es parte de la identidad visual; decisión de la usuaria.*
- RF-23 [Must]: `getGoogleFeed` de `librosclub-backend/src/services/googleBooksService.js` no debe enviar el parámetro `orderBy=newest` a Google Books, y debe conservar el ordenamiento en memoria por fecha de publicación descendente.
  *Motivo: bug preexistente en `mvp-3`; Google Books responde 0 resultados a `q=subject:<topic>` combinado con `orderBy=newest` (verificado: sin `orderBy` devuelve resultados), por eso la tab Feed sale vacía. Contrato de respuesta (`{ topic, limit, page, items[] }`) y paginación (`page`/`limit`) sin cambios. Errores sin cambios: si Google Books responde error, el endpoint devuelve `500 { message: 'Error al obtener feed de Google Books' }`.*
- RF-24 [Must]: `AuthModal` debe abrir siempre en el modo indicado por `defaultMode` (`'login'` o `'register'`) cada vez que pasa de cerrado a abierto, también al reabrirse.
  *Motivo: bug preexistente; el modal conserva el modo inicial, así que en la Landing "Iniciá sesión" abre "Crear cuenta" y en el Dashboard "Registrarse" abre "Iniciar sesión".*
- RF-25 [Must]: La lógica de login, registro y upgrade de `librosclub-backend/src/routes/auth.js` debe vivir en `librosclub-backend/src/controllers/authControllers.js`, con las mismas rutas (`POST /api/auth/login`, `POST /api/auth/register`, `PUT /api/auth/upgrade`), respuestas y códigos de estado: `400` (usuario o contraseña faltantes, o contraseña de menos de 6 caracteres en registro), `401` (credenciales inválidas, o token ausente/inválido/expirado en upgrade), `409` (usuario ya registrado), `201` (registro OK, con `{ token }`), `200` (login OK, con `{ token }`) y `500` (error del servidor). El registro debe asignar siempre el rol `user`, ignorando `req.body.role`.
- RF-26 [Must]: El backend debe incluir 11 tests de `authControllers` ejecutables con `node --test` mediante el script `npm test` de `librosclub-backend/package.json`.
- RF-27 [Must]: Las dependencias de backend y frontend deben actualizarse con `npm audit fix` sin `--force` (sin saltos semver-major), dejando el backend con 0 vulnerabilidades en `npm audit --omit=dev`.
- RF-28 [Must]: `librosclub-backend/node_modules` no debe estar versionado en git (ya figura en `.gitignore`).
- RF-29 [Must]: `librosclub-frontend/src/components/ExchangeTab.tsx`, `librosclub-frontend/src/components/ui/command.tsx` y `librosclub-frontend/src/utils/api.ts` no deben usar el tipo `any`, para que `npm run lint` termine con 0 errores.
- RF-30 [Should]: El frontend debe incluir la devDependency `@vitest/coverage-v8@3.2.4` y el script `test:coverage` (`vitest run --coverage`) para medir cobertura.

## Requerimientos No Funcionales

- RNF-01 (Contraste): Todo texto debe tener contraste ≥ 4.5:1 contra su fondo (≥ 3:1 para texto ≥ 24px o ≥ 18.66px bold, y para bordes de controles e indicadores de foco). Sunlight `#F2D661` no debe usarse como color de texto sobre fondos claros; solo como fondo con texto wood-dark `#492710`.
- RNF-02 (Targets táctiles): Todo elemento interactivo debe tener un área táctil ≥ 44×44 px en viewports ≤ 768px de ancho.
- RNF-03 (Foco visible): Todo elemento interactivo debe mostrar un indicador de foco con `:focus-visible` de al menos 2px de grosor y contraste ≥ 3:1 contra el fondo adyacente.
- RNF-04 (Etiquetas accesibles): El 100% de los botones solo-ícono deben tener `aria-label` (o texto visible para lectores de pantalla); los elementos decorativos (stickers, sello, ornamentos) deben ser `aria-hidden="true"`.
- RNF-05 (Responsive): Todas las pantallas en alcance deben renderizar sin scroll horizontal ni contenido superpuesto/recortado en anchos de viewport de 390, 768, 1024 y 1440 px.
- RNF-06 (No regresión): Los 11 flujos existentes (login, logout, Feed + cargar más, búsqueda, Libros disponibles, solicitar intercambio, aceptar/rechazar solicitud, Clubes + detalle, Cerca tuyo, alta/edición/borrado admin, upgrade Premium) deben completarse con 0 diferencias de comportamiento respecto de la rama base.
- RNF-07 (Performance de fuentes): Las fuentes deben cargarse con `font-display: swap`, con un máximo de 3 familias y 8 archivos de fuente (pesos/estilos) en total, y con `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com`.
- RNF-08 (Calidad de build): `npm run lint` debe terminar con 0 errores y `npm run build` con exit code 0 en `librosclub-frontend/`; `npm test` debe terminar con exit code 0 y 11 de 11 tests OK en `librosclub-backend/`.
- RNF-09 (Movimiento): Las animaciones decorativas nuevas (stickers, entradas con Framer Motion) deben respetar `prefers-reduced-motion: reduce` desactivándose o reduciendo su duración a ≤ 0.01s.
- RNF-10 (Verificación funcional del backend — pedido explícito de la usuaria): el 100% de las 40 rutas declaradas en `librosclub-backend/src/routes/` (auth 3, users 2, books 11, protected 2, google-books 2, exchanges 7, clubs 13) debe pasar un smoke contra el backend local (`npm run dev`, puerto 3000, PostgreSQL local), ejecutado con un usuario `user` y uno `admin`. Por ruta, el resultado esperado es: `2xx` con el rol autorizado; `401` sin token en rutas con `authMiddleware`; `403` con rol `user` en rutas con `allowRoles('admin')`; `400` en las validaciones documentadas (ej. `GET /api/google-books/search` sin `q`). Las escrituras (`POST`/`PUT`/`DELETE`) solo deben operar sobre datos de prueba que el propio smoke crea y luego borra, dejando 0 registros de prueba remanentes en la base.
- RNF-11 (Legibilidad del favicon): el favicon debe mantener contraste ≥ 3:1 entre la flor (`#F2D661`) y el fondo (`#5E5827`) y renderizar sus 8 pétalos y el anillo distinguibles a 16×16 y 32×32 px.

## Criterios de Aceptación

- AC-01 (RF-01, RNF-07): Dado el build de producción servido, cuando se inspeccionan las requests de red al cargar `/`, entonces se piden solo Sorts Mill Goudy, IBM Plex Mono y Beth Ellen (≤ 8 archivos de fuente), la URL de Google Fonts incluye `display=swap`, y no aparece ninguna request de Lora ni Space Mono.
- AC-02 (RF-02): Dado cualquier pantalla en alcance, cuando se inspecciona el `font-family` computado, entonces párrafos y `h1`–`h6` resuelven a Sorts Mill Goudy, botones/chips/ítems de navegación a IBM Plex Mono con `text-transform: uppercase` y `letter-spacing` ≥ 0.06em, y Beth Ellen solo aparece en elementos con ≤ 4 palabras.
- AC-03 (RF-03): Dado `src/index.css` y `tailwind.config.ts`, cuando se revisan los tokens, entonces existen tokens para `#FFFBF2`, `#E2D6BA` y `#CFC3A6` y los tokens forest, terracotta, wood-dark, sunlight y warm-cream conservan los valores HSL actuales.
- AC-04 (RF-04): Dado cualquier botón de la app, cuando se inspecciona su estilo computado, entonces `border-radius` es 4px y la etiqueta usa IBM Plex Mono mayúscula; dado cualquier chip de género o badge de estado, entonces su `border-radius` es ≥ 999px.
- AC-05 (RF-05): Dado una tarjeta de libro, club, publicación o formulario, cuando se inspecciona su estilo, entonces el fondo es `#FFFBF2` y el borde mide 1.5px con un color de borde del sistema.
- AC-06 (RF-06): Dado un libro con portada válida, cuando se renderiza `BookCoverCard`, entonces la imagen real se muestra con `border-radius: 3px 8px 8px 3px` y sombra interna; dado un libro sin `thumbnail` o cuya imagen dispara `onError`, entonces se muestra un bloque de color de la paleta con título y autor legibles (contraste ≥ 4.5:1).
- AC-07 (RF-07): Dado la Landing, el Dashboard desktop y el Dashboard mobile, cuando se cargan, entonces el sello floral SVG aparece en el hero, en la sidebar y en el header mobile respectivamente, renderizado por un único componente reutilizable.
- AC-08 (RF-08, RNF-04): Dado un sticker decorativo, cuando se inspecciona, entonces tiene `transform: rotate()` con ángulo entre -8° y 8°, usa IBM Plex Mono mayúscula y tiene `aria-hidden="true"`.
- AC-09 (RF-09): Dado `/` en 1440px y 390px, cuando la usuaria la compara con App-Landing, entonces hero, funciones, planes y footer coinciden en tipografía, paleta y composición, y el diff de textos de `LandingPage.tsx` contra la rama base solo agrega strings de stickers/acentos Beth Ellen.
- AC-10 (RF-10): Dado el `AuthModal` abierto, cuando se envía con credenciales válidas y con inválidas, entonces el login funciona igual que en la rama base, el mensaje de error es el mismo, y el modal usa tarjeta `#FFFBF2`, botón primario recto mono y el sello floral.
- AC-11 (RF-11): Dado el Dashboard en ≥ 1024px, cuando se selecciona cualquier tab, entonces la sidebar tiene fondo wood-dark, los ítems usan IBM Plex Mono mayúscula y solo el ítem activo tiene fondo forest.
- AC-12 (RF-12): Dado el Dashboard en 390px, cuando se navega entre tabs, entonces el header y la navegación mobile coinciden con App-Feed-Mobile y todas las tabs (incluida admin para rol admin) siguen siendo accesibles.
- AC-13 (RF-13, RF-21): Dado la tab Feed, cuando se selecciona un género y luego "Cargar más", entonces el chip activo se distingue visualmente (fondo forest), las portadas usan el marco lomo, y "Cargar más" agrega la página `page + 1` debajo de los resultados existentes igual que en la rama base.
- AC-14 (RF-14, RF-21): Dado las tabs Buscar y Libros disponibles, cuando se busca un término y se navega el catálogo, entonces input, grilla, tarjetas y badges usan el sistema visual y los resultados y su paginación son idénticos a los de la rama base.
- AC-15 (RF-15): Dado las tabs Clubes y Cerca tuyo, cuando se abren, entonces tarjetas, chips y botones usan el sistema visual y el contenido (textos, ítems, opciones de radio 5/10/20/50) es idéntico al de la rama base.
- AC-16 (RF-16): Dado un usuario admin en Gestionar libros, cuando agrega, edita y borra un libro, entonces `AddBookForm` y `BookAdminRow` en sus 3 estados usan el sistema visual y las operaciones producen el mismo resultado que en la rama base.
- AC-17 (RF-17): Dado `PremiumUpgradeModal`, `RequestChatModal` y `ClubDetailSheet` abiertos, cuando se inspeccionan, entonces usan superficie `#FFFBF2`, botones rectos mono y tipografía del sistema, y sus acciones se comportan igual que en la rama base.
- AC-18 (RF-18): Dado un estado de carga y un listado vacío, cuando se renderizan, entonces el skeleton de portada mantiene proporción 2:3 con forma de lomo, y `EmptyState` y los toasts usan tipografía y paleta del sistema.
- AC-19 (RF-19): Dado `NotFound.tsx` y `Login.tsx`, cuando se revisan sus estilos, entonces no referencian Lora, Space Mono ni el radio `--radius` de 0.75rem y usan los tokens del sistema.
- AC-20 (RF-20): Dado que la API devuelve error al cargar libros, al buscar y al cargar solicitudes, cuando ocurre el fallo, entonces se muestra el mismo toast destructivo con el mismo texto que en la rama base, estilizado con el sistema visual.
- AC-21 (RNF-01): Dado todas las pantallas en alcance, cuando se corre axe DevTools o Lighthouse, entonces hay 0 violaciones de `color-contrast` y ningún texto usa sunlight sobre fondo claro.
- AC-22 (RNF-02, RNF-05): Dado viewports de 390, 768, 1024 y 1440 px, cuando se recorre cada pantalla, entonces `document.documentElement.scrollWidth` ≤ ancho del viewport y, en ≤ 768px, todo elemento interactivo mide ≥ 44×44 px.
- AC-23 (RNF-03, RNF-04): Dado navegación solo con teclado, cuando se recorre cada pantalla con Tab, entonces cada elemento interactivo muestra foco visible de ≥ 2px, y la auditoría de Lighthouse no reporta `button-name` ni `link-name`.
- AC-24 (RNF-06): Dado el checklist de los flujos de RNF-06, cuando se ejecuta en la rama del ticket con usuario `user` y `admin`, entonces los 11 flujos se completan con el mismo resultado que en la rama base.
- AC-25 (RNF-08): Dado `librosclub-frontend/`, cuando se ejecutan `npm run lint` y `npm run build`, entonces lint reporta 0 errores y build termina con exit code 0.
- AC-26 (RNF-09): Dado el sistema operativo con "reducir movimiento" activado, cuando se carga la Landing y el Dashboard, entonces stickers y animaciones de entrada no se animan (duración ≤ 0.01s).
- AC-27 (RF-22, RNF-11): Dado el build servido, cuando se carga `/` y se inspecciona la pestaña del navegador, entonces el ícono es `/favicon.svg` (HTTP 200, `image/svg+xml`), muestra la flor `#F2D661` de 8 pétalos con anillo hueco sobre fondo `#5E5827`, y al rasterizarlo a 16×16 y 32×32 px los 8 pétalos y el anillo son distinguibles.
- AC-28 (RF-23): Dado el backend local, cuando se llama `GET /api/google-books/feed?topic=<g>&page=0` para cada uno de los 10 géneros del Feed (fiction, fantasy, romance, thriller, mystery, horror, history, biography, science, poetry), entonces cada respuesta es `200` con `items.length ≥ 1`, los `items` están ordenados por `publishedDate` descendente, y la URL enviada a Google Books no contiene el parámetro `orderBy`.
- AC-29 (RF-23, RF-13): Dado un usuario logueado en la tab Feed, cuando se selecciona cualquier género, entonces se muestran ≥ 1 portadas de libros y "Cargar más" agrega la página siguiente.
- AC-30 (RF-23): Dado que Google Books responde error, cuando se llama `GET /api/google-books/feed`, entonces la respuesta es `500` con `{ message: 'Error al obtener feed de Google Books' }` y la tab Feed muestra el toast destructivo existente.
- AC-31 (RF-24): Dado la Landing, cuando se hace click en "Iniciá sesión", se cierra el modal y luego se hace click en el botón de registro, entonces el modal abre primero en modo "Iniciar sesión" y después en modo "Crear cuenta"; dado el Dashboard, cuando se hace click en "Registrarse", entonces el modal abre en modo "Crear cuenta".
- AC-32 (RF-25, RF-26): Dado `librosclub-backend/`, cuando se ejecuta `npm test`, entonces los 11 tests de `authControllers` pasan, cubriendo los códigos `200`, `201`, `400`, `401`, `409` y `500` de RF-25 y el rol `user` forzado en registro, y `routes/auth.js` solo declara las rutas y delega en `authControllers`.
- AC-33 (RF-27): Dado `librosclub-backend/`, cuando se ejecuta `npm audit --omit=dev`, entonces reporta 0 vulnerabilidades; dado `librosclub-frontend/`, cuando se ejecuta `npm audit`, entonces los únicos advisories restantes son los listados como DT-06 en `deuda-tecnica.md` (fix solo semver-major), y `package.json` de ambos proyectos no tiene saltos de versión major respecto de la rama base.
- AC-34 (RF-28): Dado el branch del ticket, cuando se ejecuta `git ls-files librosclub-backend/node_modules | wc -l`, entonces el resultado es 0.
- AC-35 (RF-29, RNF-08): Dado `librosclub-frontend/`, cuando se buscan anotaciones `: any`, `as any` o `<any>` en `ExchangeTab.tsx`, `ui/command.tsx` y `utils/api.ts` y se ejecuta `npm run lint`, entonces hay 0 ocurrencias y lint reporta 0 errores.
- AC-36 (RF-30): Dado `librosclub-frontend/`, cuando se ejecuta `npm run test:coverage`, entonces termina con exit code 0 y emite un reporte de cobertura de `@vitest/coverage-v8` 3.2.4.
- AC-37 (RNF-10): Dado el backend local con PostgreSQL y un usuario `user` y uno `admin`, cuando se ejecuta el smoke sobre las 40 rutas, entonces el 100% devuelve el código esperado de RNF-10 (2xx autorizado, 401 sin token, 403 con rol insuficiente, 400 en validación), y al terminar la base tiene 0 registros creados por el smoke.
- AC-38 (RNF-08): Dado `librosclub-backend/`, cuando se ejecuta `npm test`, entonces termina con exit code 0 y 11 de 11 tests OK.

## Fuera de Alcance

- La sección `/regalo` "Regalá un libro" (test, recomendaciones, resultado, placa para historias) — va en FEAT-002.
- En backend (`librosclub-backend/`): endpoints nuevos, cambios de contrato de API (rutas, request, response, códigos de estado), schema de base de datos y lógica de negocio nueva. Sí entran los cambios sin cambio de comportamiento de RF-23 a RF-28. *(Ajustado en el loop 2026-11-19: antes excluía cualquier cambio de backend.)*
- Deuda técnica pendiente registrada en `docs/work/FEAT-001/deuda-tecnica.md`: DT-01 (contraseñas en texto plano en `updatePasswords.js`), DT-02 (`console.log` del rol), DT-04 (`trust proxy` en Railway), DT-05 (Content-Security-Policy) y DT-06 (actualizaciones semver-major de dependencias del frontend).
- Cambios de copy: se mantiene todo el texto actual; únicas excepciones son stickers y acentos decorativos Beth Ellen tomados de las maquetas.
- Secciones, pantallas, tabs o funcionalidades nuevas.
- Agregar paginación a `GET /api/books` (Libros disponibles / Gestionar libros).
- Modo oscuro: los tokens `.dark` existentes no se rediseñan ni se agrega un selector de tema.
- Montar en el router `NotFound.tsx`, `Login.tsx` o `ExchangeTab.tsx` (hoy no montados).
- Reemplazar las portadas reales por las portadas placeholder de color de las maquetas.
- Rediseño de los componentes Shadcn de `src/components/ui/` que la app no usa.

## Dependencias

- **Google Fonts** (servicio externo): provee Sorts Mill Goudy, IBM Plex Mono y Beth Ellen.
- **Maquetas del canvas "Regalá un libro"** (App-Landing, App-Feed, App-Feed-Mobile): referencia visual aprobada por la usuaria.
- **Sistema de tokens existente**: `librosclub-frontend/src/index.css` y `librosclub-frontend/tailwind.config.ts`.
- **Shadcn UI / Radix UI** (`src/components/ui/`, en particular `button`, `badge`, `card`, `dialog`, `sheet`, `input`, `toast`): componentes base que se re-estilan.
- **Framer Motion**: animaciones existentes y de stickers (RNF-09).
- **Componentes existentes afectados**: `LandingPage`, `AuthModal`, `Dashboard`, `LibrosDisponiblesTab`, `ClubesTab`, `CercaTuyoTab`, `ClubDetailSheet`, `AddBookForm`, `BookAdminRow`, `BookCoverCard`, `BookCard`, `BookCardSkeleton`, `EmptyState`, `PremiumUpgradeModal`, `RequestChatModal`, `Login`, `pages/NotFound`.
- **API de Google Books vía backend** (`/api/google-books/feed`, `/api/google-books/search`) y **`/api/books`**: proveen las portadas reales y los listados cuya paginación se conserva (RF-21).
- **`AuthContext`**: provee rol (`user`/`admin`) e `isPremium`, que determinan qué ítems de navegación y planes se muestran.
- **API pública de Google Books** (`https://www.googleapis.com/books/v1/volumes`), consumida por `librosclub-backend/src/services/googleBooksService.js`: RF-23 depende de que responda resultados a `q=subject:<topic>` sin `orderBy`.
- **Componente `FloralSeal`** (RF-07): fuente del dibujo del favicon (RF-22).
- **Rutas y middlewares del backend**: `librosclub-backend/src/routes/` (auth, users, books, protected, googleBooks, exchanges, clubs), `authMiddleware`, `allowRoles`, `optionalAuth`, `loginLimiter`; objeto del smoke de RNF-10.
- **Entorno local**: backend con `npm run dev` (puerto 3000), PostgreSQL local con las tablas de `CLAUDE.md` y `.env` con `JWT_SECRET` y `GOOGLE_BOOKS_API_KEY`; requerido por RNF-10 y AC-28.
- **Tooling de tests**: `node:test` (Node 18+) para el backend (RF-26) y `@vitest/coverage-v8@3.2.4` sobre Vitest 3 para el frontend (RF-30).
- **`npm audit`** y el registro de npm: RF-27.

## Supuestos y Preguntas Abiertas

- Supuesto: las maquetas App-Landing, App-Feed y App-Feed-Mobile son la referencia definitiva; las pantallas sin maqueta (AuthModal, Clubes, Cerca tuyo, admin, modales) se resuelven aplicando el mismo sistema por analogía.
- Supuesto: `NotFound.tsx` y `Login.tsx` no están montados en el router (el login real es `AuthModal`); se re-estilan con prioridad Could por consistencia, sin montarlos. `ExchangeTab.tsx` tampoco está montado y queda fuera del rediseño.
- Supuesto: Sorts Mill Goudy en Google Fonts solo ofrece peso 400 (normal + itálica); los títulos se jerarquizan por tamaño, no por peso.
- Supuesto: la verificación de no-regresión (RNF-06) es manual, porque el frontend no tiene tests de flujo (stack-profile).
- Supuesto: el `loginLimiter` (10 requests) no bloquea el smoke de RNF-10; si lo hace, el smoke espacia los logins o reutiliza tokens, sin desactivar el limiter.
- Pregunta abierta: ninguna bloqueante.

## Riesgos y Mitigaciones

- **Alcance grande (~4.200 líneas en 18 componentes + `ui/`)**: el ticket toca casi todo el frontend. Mitigación: implementar en bloques (base visual → Landing/Auth → Dashboard y tabs → modales/estados). **Decisión de scope (2026-11-19):** se propuso subdividir en FEAT-001a/b/c (base visual / Landing + Auth / Dashboard + modales); la usuaria decidió mantener un solo ticket y un único PR, implementado en ese orden de bloques.
- **Regresiones funcionales al reescribir markup**: Mitigación: cambios limitados a clases/estilos y estructura de presentación; checklist de RNF-06 contra la rama base.
- **Contraste insuficiente con sunlight y bordes claros**: Mitigación: RNF-01 restringe sunlight a fondo; validación con axe/Lighthouse (AC-21).
- **Legibilidad de Sorts Mill Goudy en tamaños chicos de mobile**: Mitigación: cuerpo mínimo 16px en ≤ 768px; IBM Plex Mono para textos de UI chicos.
- **FOUT/CLS por cambio de fuentes**: Mitigación: `display=swap`, `preconnect` y tope de 8 archivos (RNF-07). Aceptado: algo de FOUT inicial es preferible a texto invisible.
- **Re-estilar `src/components/ui/` impacta componentes no listados**: Mitigación: limitar cambios a los componentes ui que la app usa y verificar con build + recorrido de pantallas.
- **Loop correctivo PLAN→DEFINE (2026-11-19)**: Motivo: decisiones de la usuaria tomadas durante CODE/VERIFY (favicon, fix del Feed vacío, fix del modo de `AuthModal`, cambios de backend y tooling sin cambio de comportamiento, smoke de todos los endpoints) que no estaban trazadas en el PRD. Decisión: se incorporan como RF-22 a RF-30, RNF-10, RNF-11 y AC-27 a AC-38, y se mantiene **un solo ticket y un único PR**. Mitigación del crecimiento de alcance: los agregados son acotados (1 parámetro de query, 1 efecto de React, 1 asset, refactor cubierto por tests).
- **Google Books cambia de nuevo su comportamiento ante `subject:`**: si eso pasa, el Feed vuelve a salir vacío sin cambio de código. Mitigación: AC-28 verifica los 10 géneros contra la API real. Aceptado: dependencia externa sin SLA, fuera de nuestro control.
- **El smoke de escrituras ensucia la base local**: Mitigación: RNF-10 exige crear y borrar sus propios datos de prueba y verificar 0 remanentes (AC-37); nunca correrlo contra la base de producción.
- **Refactor de auth rompe login/registro**: Mitigación: 11 tests de `authControllers` (RF-26) + smoke de las rutas de auth (RNF-10).
