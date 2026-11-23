# Code Map — librosClub

Mapa estructural del código, mantenido incrementalmente por la fase PLAN
(Paso 6, Verificación de Impacto). Complementa, no reemplaza, la
verificación de impacto de cada PLAN: es un punto de partida barato, no
una fuente de verdad ciega.

Editable a mano: cualquier dev o el arch-auditor puede corregir una
entrada directamente. Una corrección manual no se pisa sola.

Última actualización: 2026-11-19 (FEAT-001, reentrada PLAN)

## Índice

- [BookCoverCard — card de portada unificada](#bookcovercard--card-de-portada-unificada)
- [buttonVariants — botón base Shadcn y consumidores](#buttonvariants--botón-base-shadcn-y-consumidores)
- [UGC HTML sinks — puntos donde datos externos llegan a HTML/URL crudos](#ugc-html-sinks--puntos-donde-datos-externos-llegan-a-htmlurl-crudos)
- [Botones solo-ícono — controles sin texto visible](#botones-solo-ícono--controles-sin-texto-visible)
- [googleBooksService — proxy de Google Books](#googlebooksservice--proxy-de-google-books)
- [AuthModal — modal de login/registro compartido](#authmodal--modal-de-loginregistro-compartido)
- [authControllers — login, registro y upgrade](#authcontrollers--login-registro-y-upgrade)

## BookCoverCard — card de portada unificada

- **Tipo:** módulo
- **Fuente:** LLM (PLAN, Paso 6)
- **Fingerprint:** bf58408a9e1deb6c2ac094949f71ccc7912a8ca7a9614593df0d5e3c85414fff
- **Última actualización:** 2026-11-19 — FEAT-001

### Estructura (determinístico — hechos verificables por grep/AST)

**Siblings / implementaciones paralelas:**
- `librosclub-frontend/src/components/BookCardSkeleton.tsx` — skeleton 2:3 de la misma card (`BookCardSkeleton`, `BooksGridSkeleton`)
- `librosclub-frontend/src/components/BookCard.tsx` — adapter `Book` (DB) → `BookCoverCard`; sin callers en la app

**Callers:**
- `librosclub-frontend/src/components/Dashboard.tsx:295` — grilla del Feed (Google Books)
- `librosclub-frontend/src/components/Dashboard.tsx:403` — grilla de Buscar
- `librosclub-frontend/src/components/LibrosDisponiblesTab.tsx:91` — catálogo DB
- `librosclub-frontend/src/components/BookCard.tsx:16` — adapter

**Exports / imports:**
- `BookCoverCard.tsx` exporta `default BookCoverCard` y `interface BookCoverCardProps`; no hay barrel en `src/components/`
- `BookCardSkeleton.tsx` exporta `default BookCardSkeleton` y `BooksGridSkeleton` (usado en `Dashboard.tsx` y `LibrosDisponiblesTab.tsx`)

### Patrón (requiere criterio — interpretación, no hecho verificable mecánicamente)

Las grillas de portadas repiten la misma clase de grid en Feed, Buscar, Libros disponibles y `BooksGridSkeleton`; FEAT-001 las unifica con la grilla de la maqueta. Cualquier cambio de layout de portadas debe tocar los cuatro lugares. FEAT-001 (spec) centraliza: la grilla en la clase `.cover-grid` y la portada (imagen + `onError` + fallback de paleta + sombra de lomo `.cover-spine::after`) en `src/components/brand/CoverArt.tsx`, que consumen `BookCoverCard`, `BookCardSkeleton`, `Dashboard` (Tus solicitudes), `BookAdminRow`, `AddBookForm` y `ClubDetailSheet`. Cambios de layout o de fallback de portadas van ahí, no en cada consumidor.

### Notas (edición humana libre)

<!-- no generar contenido acá; si la entrada ya existía, preservar lo que haya -->

## buttonVariants — botón base Shadcn y consumidores

- **Tipo:** interfaz
- **Fuente:** LLM (PLAN, Paso 6)
- **Fingerprint:** 563a332e14cb58700ddf43a80c7c5797b447f7747d3948a3c055e7aa9c24c2f0
- **Última actualización:** 2026-11-19 — FEAT-001

### Estructura (determinístico — hechos verificables por grep/AST)

**Siblings / implementaciones paralelas:**
- `librosclub-frontend/src/components/ui/button.tsx` — define `buttonVariants` (cva) y `Button`
- `librosclub-frontend/src/components/ui/pagination.tsx` — consume `ButtonProps`, `buttonVariants`
- `librosclub-frontend/src/components/ui/calendar.tsx` — consume `buttonVariants`
- `librosclub-frontend/src/components/ui/alert-dialog.tsx` — consume `buttonVariants`
- `librosclub-frontend/src/components/ui/carousel.tsx` — consume `Button`
- `librosclub-frontend/src/components/ui/sidebar.tsx` — consume `Button`

**Exports / imports:**
- `Button` lo importan: `AddBookForm`, `AuthModal`, `BookAdminRow`, `CercaTuyoTab`, `ClubDetailSheet`, `ClubesTab`, `Dashboard`, `ExchangeTab` (no montado), `LandingPage`, `LibrosDisponiblesTab`, `Login`, `PremiumUpgradeModal`, `RequestChatModal`
- `ui/` usados por la app montada: `button`, `input`, `textarea`, `label`, `dialog`, `sheet`, `separator`, `toast`/`toaster`, `sonner`, `tooltip` (`TooltipProvider`), `card` (solo `Login.tsx`). `badge` no tiene consumidores.
- Variantes en uso: `ghost`, `outline` y default; `hero`, `hero-outline`, `warm` sin usos (referencian clases inexistentes).

### Patrón (requiere criterio — interpretación, no hecho verificable mecánicamente)

Los componentes de pantalla sobreescriben estilos del botón con `className` (colores `amber-*`, alturas `h-9 w-9`, `font-mono`). Re-estilar la base no alcanza: hay que limpiar esos overrides por archivo para que el sistema visual se aplique.

### Notas (edición humana libre)

<!-- no generar contenido acá; si la entrada ya existía, preservar lo que haya -->

## UGC HTML sinks — puntos donde datos externos llegan a HTML/URL crudos

- **Tipo:** patrón
- **Fuente:** LLM (PLAN, Paso 6)
- **Fingerprint:** 028ba85166ba61544d4f330888d90b0a09d3295491d720f633403e39aef8c605
- **Última actualización:** 2026-11-19 — FEAT-001

### Estructura (determinístico — hechos verificables por grep/AST)

**Callers:**
- `librosclub-frontend/src/components/CercaTuyoTab.tsx:72` — `L.popup().setContent(templateString)` interpola `club.nombre`, `club.ubicacion`, `club.currentBookTitle` (HTML de Leaflet)
- `librosclub-frontend/src/components/CercaTuyoTab.tsx:21` — `L.divIcon({ html })` con colores constantes (sin datos de usuario)
- `librosclub-frontend/src/components/BookCoverCard.tsx:68` — `href={link}` con URL de Google Books (`target="_blank"`)

### Patrón (requiere criterio — interpretación, no hecho verificable mecánicamente)

La app no usa `dangerouslySetInnerHTML`; el único sink HTML con contenido generado por usuarios es el popup de Leaflet. FEAT-001 introduce `lib/escape-html.ts` y `lib/safe-url.ts` como helpers canónicos: todo HTML armado a mano debe pasar valores por `escapeHtml`, y todo `href` externo por `safeExternalUrl`.

### Notas (edición humana libre)

<!-- no generar contenido acá; si la entrada ya existía, preservar lo que haya -->

## Botones solo-ícono — controles sin texto visible

- **Tipo:** patrón
- **Fuente:** LLM (PLAN, Paso 6)
- **Fingerprint:** f84d63c0981d282a949c94b8ba3d01d6d9bb9b53c6ed555d95e9fe7b552f4ea7
- **Última actualización:** 2026-11-19 — FEAT-001

### Estructura (determinístico — hechos verificables por grep/AST)

**Callers:**
- `librosclub-frontend/src/components/Dashboard.tsx:743` — toggle de menú (`size="icon"`, sin `aria-label`)
- `librosclub-frontend/src/components/Dashboard.tsx:512` — Actualizar (solo `title`)
- `librosclub-frontend/src/components/Dashboard.tsx:542` — Aceptar / Rechazar / Abrir chat (solo `title`)
- `librosclub-frontend/src/components/ClubesTab.tsx:309` — Ubicar en mapa (solo `title`)
- `librosclub-frontend/src/components/ClubDetailSheet.tsx:595` — enviar post (`Send`, `h-9 w-9`)
- `librosclub-frontend/src/components/RequestChatModal.tsx:119` — enviar mensaje (`Send`, `h-9 w-9`)
- `librosclub-frontend/src/components/PremiumUpgradeModal.tsx:75` — cierre `X` sin nombre accesible
- `librosclub-frontend/src/components/BookAdminRow.tsx` — Editar / Eliminar / Guardar / Cancelar (íconos lucide)

### Patrón (requiere criterio — interpretación, no hecho verificable mecánicamente)

Los botones solo-ícono usan `title` en lugar de `aria-label` y tamaños de 36px o menos. La convención que fija FEAT-001: `aria-label` igual al `title` actual y `h-11 w-11 md:h-9 md:w-9`.

### Notas (edición humana libre)

<!-- no generar contenido acá; si la entrada ya existía, preservar lo que haya -->

## googleBooksService — proxy de Google Books

- **Tipo:** módulo
- **Fuente:** LLM (PLAN, Paso 6)
- **Fingerprint:** 03f44f0cf61add32d620e985cb54f96d38415d937dd7df4c498827064b8358d2
- **Última actualización:** 2026-11-19 — FEAT-001

### Estructura (determinístico — hechos verificables por grep/AST)

**Siblings / implementaciones paralelas:**
- `librosclub-backend/src/services/googleBooksService.js` — `getGoogleFeed` (`q=subject:<topic>`, sort en memoria por `publishedDate` desc) y `searchVolumes` (sin `orderBy`); ambas arman la URL con `URLSearchParams` y leen `GOOGLE_BOOKS_API_KEY`

**Callers:**
- `librosclub-backend/src/controllers/googleBooksControllers.js:17` — `getGoogleFeed` detrás de caché en memoria (`utils/cache`, TTL `GOOGLE_BOOKS_CACHE_TTL_MS`); error → `500 { message: 'Error al obtener feed de Google Books' }`
- `librosclub-backend/src/routes/googleBooks.js:7` — `GET /api/google-books/feed`; `:10` — `GET /api/google-books/search`

**Exports / imports:**
- `exports.getGoogleFeed`, `exports.searchVolumes`; importa `node-fetch` v2 (CommonJS), que los tests mockean vía `require.cache[require.resolve('node-fetch')]`

### Patrón (requiere criterio — interpretación, no hecho verificable mecánicamente)

FEAT-001 (Bloque 5.2) quita `orderBy=newest` del feed porque con `q=subject:` Google devolvía `items: []`; el orden lo da el sort en memoria. La caché del controller puede servir un resultado vacío previo hasta reiniciar el proceso.

### Notas (edición humana libre)

<!-- no generar contenido acá; si la entrada ya existía, preservar lo que haya -->

## AuthModal — modal de login/registro compartido

- **Tipo:** módulo
- **Fuente:** LLM (PLAN, Paso 6)
- **Fingerprint:** 7a8071544cad21b760314c087750f6c88b6a3a92907e8a35e34eba8a473001a9
- **Última actualización:** 2026-11-19 — FEAT-001

### Estructura (determinístico — hechos verificables por grep/AST)

**Callers:**
- `librosclub-frontend/src/components/LandingPage.tsx:342` — `<AuthModal open={authOpen} defaultMode={authMode} onSuccess={() => navigate('/app')}>`; `openAuth('login'|'register')`
- `librosclub-frontend/src/components/Dashboard.tsx:851` — `<AuthModal open={authModalOpen} defaultMode={authModalMode}>`; `:118` `openAuthModal(mode)` desde la sidebar (Iniciar sesión / Registrarse), `LibrosDisponiblesTab` y `ClubesTab` (`onAuthRequired`)

**Exports / imports:**
- `default AuthModal`, props `{ open, onClose, defaultMode?, onSuccess? }`; usa `ui/dialog`, `authAPI`, `useAuth`, `useToast`, `FloralSeal`
- Test: `librosclub-frontend/src/components/__tests__/AuthModal.test.tsx`

### Patrón (requiere criterio — interpretación, no hecho verificable mecánicamente)

Ambos callers dejan el modal montado y alternan `open`, así que el estado interno sobrevive entre aperturas: cualquier estado derivado de props (`defaultMode`) debe re-sincronizarse al pasar a abierto (FEAT-001 Bloque 5.3).

### Notas (edición humana libre)

<!-- no generar contenido acá; si la entrada ya existía, preservar lo que haya -->

## authControllers — login, registro y upgrade

- **Tipo:** módulo
- **Fuente:** LLM (PLAN, Paso 6)
- **Fingerprint:** 2cf5c516c2bcf7cbf42d2b964c58dd62e22d1f8be55596006e61aaa2b27d9f0b
- **Última actualización:** 2026-11-19 — FEAT-001

### Estructura (determinístico — hechos verificables por grep/AST)

**Siblings / implementaciones paralelas:**
- `librosclub-backend/src/controllers/usersControllers.js` — `register`/`login` legacy montados en `/api/users/*` (no tocados por FEAT-001)

**Callers:**
- `librosclub-backend/src/routes/auth.js:6` — `POST /login`, `:7` `POST /register`, `:8` `PUT /upgrade` (con `authMiddleware`)
- `librosclub-backend/src/app.js:71` — `loginLimiter` montado en `/api/auth/login`, `/api/auth/register`, `/api/users/login`, `/api/users/register` (instancia compartida, 10 req / 15 min por IP)

**Exports / imports:**
- `exports.login`, `exports.register`, `exports.upgrade`; importa `config/db`, `bcryptjs`, `jsonwebtoken`
- Test: `librosclub-backend/src/controllers/__tests__/authControllers.test.js` (11 tests, `node --test`, mock de `config/db` vía `require.cache`)

### Patrón (requiere criterio — interpretación, no hecho verificable mecánicamente)

Patrón routes → controllers del resto del backend; los tests de backend mockean módulos CommonJS inyectando en `require.cache` antes del `require` del módulo bajo test (mismo patrón para `node-fetch` en `googleBooksService`).

### Notas (edición humana libre)

<!-- no generar contenido acá; si la entrada ya existía, preservar lo que haya -->
