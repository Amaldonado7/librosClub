# Verify report — FEAT-001 (mdd:verify-module), pasada 4

- **Resultado:** PASSED (0 FAIL, 2 WARN, 4 INFO).
- **Fecha:** 2026-11-19
- **Contexto:** re-dispatch tras dos loops VERIFY → CODE:
  - El primero eliminó las rutas legadas `/api/users` y aplicó `npm audit fix` en el frontend.
  - El segundo corrigió los hallazgos del DAST de la pasada 3 (ver `sast.md`, intento 5):
    - DAST-01: `validateIdParam` en `id`/`meetingId`/`postId` y `asyncHandler` en las 13 rutas de clubs.
    - DAST-02: `middlewares/errorHandler.js` responde JSON sin stack.
    - Favicon: la flor amarilla sola, con contorno `#492710` y sin fondo (decisión de la usuaria).
- **Árbol verificado:** branch `feat/FEAT-001-rediseno-visual`, base `mvp-3`, working tree + index (sin commits). Diff: `docs/work/FEAT-001/diff.patch` (82 archivos, 13 112 líneas). Incluye los untracked vía `--no-index`. Excluye `docs/` y los 1078 archivos de `librosclub-backend/node_modules` quitados del índice.
- **Caché `tests-full`:** MISS. Se corrió la suite completa. No se persistió: `mwdd-gate-cache.py write` escribe `.mdd/state.json`, que este agente no puede tocar.

## 1. Regresión global, cobertura y calidad (números medidos)

Node v20.19.5.

| Chequeo | Resultado |
|---|---|
| `npm test` frontend | **23 archivos, 160/160**, exit 0 |
| `npm run test:coverage` frontend | exit 0. `@vitest/coverage-v8` 3.2.7. Total (include/exclude de `vite.config.js`): líneas 82.52%, ramas 87.98%, funciones 63.48% |
| `npm test` backend | **27/27**, exit 0: incluye `authControllers` (11), `googleBooksService` (4), `app.test` y `errorHandling.test` (regresiones de `/api/users`, DAST-01 y DAST-02) |
| Cobertura backend (lcov de `node --test`, cruzado con `git diff -U0 mvp-3`; los archivos nuevos cuentan completos) | Código nuevo o modificado: líneas **132/139 = 94.96%**, ramas **34/42 = 80.95%**, funciones **9/9 = 100%**. Por archivo: `authControllers` L 79/84, R 19/22 · `errorHandler` L 16/18, R **6/11** · `validateIdParam` 100% · `asyncHandler` 100% · `routes/clubs.js` 100% |
| `npm run lint` | **0 errores**, 12 warnings preexistentes |
| `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `npm run build` | exit 0. Genera `dist/favicon.svg` |

**Cobertura del código nuevo o modificado del frontend (F-VER-03).** Se cruzó el `coverage-final.json` de v8 con `git diff -U0 mvp-3`; los archivos nuevos cuentan completos:

- Statements: 987/1002 = **98.50%**
- Ramas: 119/128 = **92.97%**
- Funciones: 17/19 = **89.47%**

## 2. Criterios de aceptación

Leyenda: ✅ test automatizado o comando ejecutado en esta pasada · ◐ en parte · ⏳ pendiente de verificación manual de la usuaria (sin resultado reportado).

| AC | Evidencia | Estado |
|---|---|---|
| AC-01 | T-U-01. Falta la red (T-M-01) | ◐ ⏳ |
| AC-02, AC-05 | T-M-09 | ⏳ |
| AC-03, 06, 07, 08, 10, 11, 13, 19, 20, 31 | T-U correspondientes, en verde | ✅ |
| AC-04, 12, 14, 15, 16, 17, 18, 26 | tests automatizados en verde; falta la parte de estilo computado o visual (T-M-03/08/09) | ◐ ⏳ |
| AC-09 | T-U-08. Falta la revisión visual (T-M-03) | ◐ ⏳ |
| AC-21, 22, 23, 24 | T-M-04/05/06/07 | ⏳ |
| AC-25 | lint 0 errores, build exit 0 | ✅ |
| AC-27 | T-U-14 (versión sin fondo) y `dist/favicon.svg` generado. Falta la pestaña y el rasterizado a 16/32 px sobre pestaña clara y oscura | ◐ ⏳ (INFO: sin fondo) |
| AC-28 | T-B-02 + `curl` a los 10 géneros (pasada 2: 10 ítems por género, orden descendente). El código del feed no cambió en este loop | ✅ |
| AC-29, AC-30 | T-U-10, T-B-02(c). Falta T-M-13 (UI logueada y API key inválida) | ◐ ⏳ |
| AC-32 | T-B-01 11/11; `routes/auth.js` solo delega; el smoke confirma el rol forzado a `user` | ✅ |
| AC-33 | Backend `npm audit --omit=dev` → 0. Frontend: `npm audit fix --dry-run` (sin `--force`) no propone ningún `change` de versión y el lockfile queda idéntico (`cmp`). Quedan 14 advisories (3 en `--omit=dev`) que solo se corrigen con un salto semver-major; la usuaria los aceptó sin documentar | ✅ (criterio de la usuaria) |
| AC-34 | `git ls-files librosclub-backend/node_modules \| wc -l` → 0 | ✅ |
| AC-35 | 0 ocurrencias de `any` en los 3 archivos; lint 0 errores | ✅ |
| AC-36 | `npm run test:coverage` exit 0, reporte v8 | ✅ (INFO: 3.2.7) |
| AC-37 | Smoke de 38 rutas con `user` y anónimo: **79 OK / 0 FAIL / 8 pendientes admin**, 0 remanentes (§5) | ◐ ⏳ falta admin |
| AC-38 | backend `npm test` exit 0, 18/18 (incluye los 11 de `authControllers`) | ✅ |

## 3. Tareas del spec

Los Bloques 1-5 y la tarea 4.5 están implementados. Se verificó contra el código en las pasadas 2 y 3.

En este loop, el backend además eliminó `routes/users.js`, `controllers/usersControllers.js` y su montaje y limiter en `app.js`. La regresión `src/__tests__/app.test.js` cubre ese cambio, y el smoke lo verificó en vivo.

## 4. Reglas

| Regla | Resultado |
|---|---|
| F-VER-01 | ✅ Ningún AC automatizable falla. Los ⏳ quedan pendientes de la usuaria (§6) |
| F-VER-02 | ✅ |
| F-VER-03 | ✅ frontend (diff) 98.50 / 92.97 / 89.47 · backend (diff) 94.96 / 80.95 / 100 |
| F-VER-04 | ✅ |
| F-VER-05 | ✅ |
| F-VER-06 | ✅ T-U-01..T-U-15, T-U-03a, T-B-01, T-B-02 y la regresión de `app` |
| W-VER-01 | ⚠️ preexistente: `BookCard.tsx` no tiene callers y `ExchangeTab.tsx` no está montado |
| W-VER-02 | ⚠️ `authControllers.js` ramas 86.36%; `middlewares/errorHandler.js` ramas 54.55% (6/11: no se testea la rama `headersSent` ni la de 4xx con `expose`) |
| W-VER-03 | — |

**INFO (decisión de la usuaria: no se actualizan PRD ni spec):**

- vitest y `@vitest/coverage-v8` están en 3.2.7, no 3.2.4.
- Hay 160 tests, no 154.
- Hay 38 rutas, no 40, por la eliminación de `/api/users`.
- El favicon es la flor sin fondo y con contorno `#492710`, no "sobre fondo verde oliva" (RF-22, AC-27, RNF-11). T-U-14 está actualizado y en verde. El contraste flor/contorno es wood-dark contra sunlight, 9.21:1.

## 5. Smoke de 38 rutas (RNF-10 · AC-37 · T-M-11)

- **Script:** `docs/work/FEAT-001/smoke/smoke-routes.mjs` + `teardown.sql`. Resultado crudo en `smoke/results.json` (generado 2026-11-19T23:43:01Z).
- **Matriz:** auth 3, books 11, protected 2, google-books 2, exchanges 7, clubs 13. El usuario B se crea por `POST /api/auth/register`.
- **Guardas:** fail-closed (host local para la API y para la base).
- **Logins:** 5 de 7, sin `429`.
- **Regresiones** (no cuentan en las 38; las 7 dieron OK):
  - `POST /api/users/register` con `role:"admin"` → 404, 0 filas creadas.
  - `POST /api/users/login` → 404.
  - DAST-01, verificando `/api/health` = 200 después de cada request:
    - `GET /api/clubs/abc` → 400.
    - `DELETE /api/clubs/1/meetings/x` → 400.
    - `DELETE /api/clubs/1/posts/1%20OR%201=1` → 400.
  - DAST-02:
    - JSON malformado → 400 `application/json`, sin stack.
    - `Origin` malicioso → 403 JSON, sin stack y sin ACAO.
- **Resultado (rol `user` y anónimo):**
  - 77 chequeos de ruta OK, **0 FAIL**, 8 pendientes admin.
  - 30 de las 38 rutas quedan completamente OK.
  - Las rutas 8, 10, 13, 14, 15, 16, 18 y 21 tienen OK los casos 401 y 403; solo les falta el caso admin.
- **Backend `:3000`:** siguió respondiendo durante todo el smoke.
- **Teardown:** transaccional, con remanentes en **0** en las 10 tablas.

**Pendiente: correr con las credenciales admin de la usuaria.** Desde la raíz del repo, ≥ 15 min después de la última corrida:

```bash
SMOKE_ADMIN_USERNAME='<usuario admin local>' SMOKE_ADMIN_PASSWORD='<contraseña>' \
  node docs/work/FEAT-001/smoke/smoke-routes.mjs
```

Exit 0 significa todos los chequeos OK y 0 remanentes. Cubre `GET /admin-only`, `GET /books/requests`, `POST /books`, `PUT /books/requests/:reqId`, `POST /books/requests/:reqId/messages` (2xx tras aceptar), `PUT /books/:id`, `DELETE /books/:id` y `GET /exchanges/admin`.

## 6. Pendiente de verificación manual de la usuaria

No se ejecutó nada de esta sección y no se reporta ningún resultado. El backend corre en `:3000` y Vite dev en `:8080`. Para el build de producción: `npm run build && npm run preview` (`:4173`).

- [ ] **T-M-03 (AC-09, AC-12):** `/` y `/app` en 390, 768, 1024 y 1440 px contra App-Landing, App-Feed y App-Feed-Mobile. Además, `git diff mvp-3 -- librosclub-frontend/src/components/LandingPage.tsx`: los únicos textos nuevos tienen que ser los de D-01.
- [ ] **T-M-01 (AC-01):** Network > Font: solo las 3 familias, ≤ 8 archivos, `display=swap`, sin Lora ni Space Mono.
- [ ] **T-M-10 (AC-27):** el favicon en la pestaña, y rasterizado a 16×16 y 32×32 (`rsvg-convert -w 16 -h 16 librosclub-frontend/public/favicon.svg -o /tmp/f16.png`, ídem con 32): los 8 pétalos y el anillo tienen que distinguirse.
- [ ] **T-M-04 (AC-21):** axe y Lighthouse en `/` y en cada tab de `/app` (desktop y mobile, también con los modales abiertos): 0 violaciones de `color-contrast` y Accesibilidad ≥ 90.
- [ ] **T-M-05 (AC-22):** `scrollWidth <= innerWidth` en los 4 anchos. En ≤ 768 px, todo elemento interactivo ≥ 44×44 (script de consola en la sección T-M-05 del spec).
- [ ] **T-M-06 (AC-23):** foco con teclado (solo Tab): foco visible ≥ 2 px en todo elemento interactivo. Lighthouse sin `button-name` ni `link-name`.
- [ ] **T-M-08 (AC-26):** con "Reducir movimiento" activado en el SO, Landing y Dashboard sin animaciones de entrada.
- [ ] **T-M-09 (AC-02, 04, 05, 14-18):** DevTools > Computed en tabs y modales: superficie `rgb(255, 251, 242)`, borde de 1.5px, botones con radio 4px en mono uppercase, chips con radio ≥ 999px, títulos en Goudy.
- [ ] **T-M-13 (AC-29, 30):** logueada, los 10 géneros muestran portadas y "Cargar más" funciona. Con API key inválida (la usuaria reinicia el backend): `500` y un toast destructivo.
- [ ] **T-M-07 (AC-24):** los 11 flujos de RNF-06 con `user` y `admin` contra `mvp-3`: login válido; login inválido; registro; logout; Feed + "Cargar más"; búsqueda; Libros disponibles + solicitar; aceptar y rechazar + chat; Clubes + detalle y Cerca tuyo (radios 5, 10, 20 y 50; popup con HTML en el nombre se ve literal); alta, edición y borrado admin; upgrade Premium. Login, registro y upgrade importan especialmente por el refactor de auth y por RF-24.
- [ ] **T-M-11 (AC-37), rol admin:** correr el comando de §5.

### Tabla de resultados del smoke

| # | Método | Ruta | Rol | Esperado | Obtenido | Resultado | Nota |
|---|---|---|---|---|---|---|---|
| 2 | POST | `/auth/register` | anon | 201 | 201 | OK | crea usuario A (role:"admin" en body debe ignorarse) |
| 2 | POST | `/auth/register` | anon | 400 | 400 | OK | contraseña de 3 caracteres |
| 1 | POST | `/auth/login` | user | 200 | 200 | OK |  |
| 2 | POST | `/auth/register` | anon | role=user | role=user | OK | RF-25: rol forzado a user |
| 1 | POST | `/auth/login` | anon | 401 | 401 | OK | contraseña incorrecta |
| 3 | PUT | `/auth/upgrade` | anon | 401 | 401 | OK |  |
| 3 | PUT | `/auth/upgrade` | user | 200 | 200 | OK | solo modifica al usuario smoke A |
| 2 | POST | `/auth/register` | anon | 201 | 201 | OK | crea usuario B (segunda parte) |
| legacy | POST | `/users/register` | anon (role:"admin") | 404 | 404 | OK | ruta eliminada; filas creadas=0 |
| legacy | POST | `/users/login` | anon | 404 | 404 | OK | ruta eliminada |
| legacy | GET | `/clubs/abc` | user | 400 | 400 | OK | DAST-01: /api/health después=200 |
| legacy | DELETE | `/clubs/1/meetings/x` | user | 400 | 400 | OK | DAST-01: /api/health después=200 |
| legacy | DELETE | `/clubs/1/posts/1%20OR%201=1` | user | 400 | 400 | OK | DAST-01: /api/health después=200 |
| legacy | POST | `/clubs (JSON malformado)` | user | 400 | 400 | OK | DAST-02: JSON sin stack |
| legacy | GET | `/health (Origin malicioso)` | anon | 403 | 403 | OK | DAST-02: CORS 403 JSON sin stack |
| 17 | GET | `/protected` | anon | 401 | 401 | OK |  |
| 17 | GET | `/protected` | user | 200 | 200 | OK |  |
| 18 | GET | `/admin-only` | anon | 401 | 401 | OK |  |
| 18 | GET | `/admin-only` | user | 403 | 403 | OK |  |
| 18 | GET | `/admin-only` | admin | 200 | - | PENDIENTE | pendiente: correr con credenciales admin de la usuaria |
| 19 | GET | `/google-books/feed?topic=fiction&page=0` | anon | 200 | 200 | OK | items=10 |
| 20 | GET | `/google-books/search` | anon | 400 | 400 | OK | sin q |
| 20 | GET | `/google-books/search?q=borges` | anon | 200 | 200 | OK |  |
| 6 | GET | `/books/feed` | anon | 200 | 200 | OK |  |
| 7 | GET | `/books` | anon | 200 | 200 | OK |  |
| 8 | GET | `/books/requests` | anon | 401 | 401 | OK |  |
| 8 | GET | `/books/requests` | user | 403 | 403 | OK |  |
| 8 | GET | `/books/requests` | admin | 200 | - | PENDIENTE | pendiente: correr con credenciales admin de la usuaria |
| 9 | GET | `/books/my-requests` | anon | 401 | 401 | OK |  |
| 9 | GET | `/books/my-requests` | user | 200 | 200 | OK |  |
| 10 | POST | `/books` | anon | 401 | 401 | OK |  |
| 10 | POST | `/books` | user | 403 | 403 | OK |  |
| 10 | POST | `/books` | admin | 201 | - | PENDIENTE | pendiente: correr con credenciales admin de la usuaria |
| 11 | POST | `/books/:id/request` | anon | 401 | 401 | OK |  |
| 11 | POST | `/books/:id/request` | user | 2xx | 201 | OK | sobre el libro smoke |
| 12 | GET | `/books/requests/:reqId/messages` | anon | 401 | 401 | OK |  |
| 12 | GET | `/books/requests/:reqId/messages` | user | 200 | 200 | OK |  |
| 14 | PUT | `/books/requests/:reqId` | anon | 401 | 401 | OK |  |
| 14 | PUT | `/books/requests/:reqId` | user | 403 | 403 | OK |  |
| 14 | PUT | `/books/requests/:reqId` | admin | 200 | - | PENDIENTE | pendiente: correr con credenciales admin de la usuaria |
| 13 | POST | `/books/requests/:reqId/messages` | anon | 401 | 401 | OK |  |
| 13 | POST | `/books/requests/:reqId/messages` | user | 400 | 400 | OK | solicitud pendiente: regla de negocio "chat solo para aceptadas" (el 2xx requiere aceptación admin) |
| 13 | POST | `/books/requests/:reqId/messages` | admin | 2xx (tras aceptación admin) | - | PENDIENTE | pendiente: correr con credenciales admin de la usuaria |
| 15 | PUT | `/books/:id` | anon | 401 | 401 | OK |  |
| 15 | PUT | `/books/:id` | user | 403 | 403 | OK |  |
| 15 | PUT | `/books/:id` | admin | 200 | - | PENDIENTE | pendiente: correr con credenciales admin de la usuaria |
| 16 | DELETE | `/books/:id` | anon | 401 | 401 | OK |  |
| 16 | DELETE | `/books/:id` | user | 403 | 403 | OK |  |
| 16 | DELETE | `/books/:id` | admin | 200 | - | PENDIENTE | pendiente: correr con credenciales admin de la usuaria |
| 21 | GET | `/exchanges/admin` | anon | 401 | 401 | OK |  |
| 22 | GET | `/exchanges/my` | anon | 401 | 401 | OK |  |
| 23 | PUT | `/exchanges/requests/:id` | anon | 401 | 401 | OK |  |
| 24 | GET | `/exchanges` | anon | 401 | 401 | OK |  |
| 25 | POST | `/exchanges` | anon | 401 | 401 | OK |  |
| 26 | DELETE | `/exchanges/:id` | anon | 401 | 401 | OK |  |
| 27 | POST | `/exchanges/:id/request` | anon | 401 | 401 | OK |  |
| 21 | GET | `/exchanges/admin` | user | 403 | 403 | OK |  |
| 21 | GET | `/exchanges/admin` | admin | 200 | - | PENDIENTE | pendiente: correr con credenciales admin de la usuaria |
| 25 | POST | `/exchanges` | user | 201 | 201 | OK | publicación smoke del usuario B |
| 24 | GET | `/exchanges` | user | 200 | 200 | OK | incluye la publicación smoke |
| 27 | POST | `/exchanges/:id/request` | user | 2xx | 201 | OK |  |
| 22 | GET | `/exchanges/my` | user | 200 | 200 | OK | incluye la solicitud entrante |
| 23 | PUT | `/exchanges/requests/:requestId` | user (no dueño) | 403 | 403 | OK |  |
| 23 | PUT | `/exchanges/requests/:requestId` | user (dueño) | 200 | 200 | OK |  |
| 26 | DELETE | `/exchanges/:id` | user (no dueño) | 404 | 404 | OK | el controller responde 404 "No encontrada o sin permiso" |
| 26 | DELETE | `/exchanges/:id` | user (dueño) | 200 | 200 | OK |  |
| 28 | GET | `/clubs` | anon | 200 | 200 | OK |  |
| 29 | GET | `/clubs/nearby?lat=-34.6&lng=-58.4&radius=5` | anon | 200 | 200 | OK |  |
| 29 | GET | `/clubs/nearby` | anon | 400 | 400 | OK | sin lat/lng |
| 30 | POST | `/clubs` | anon | 401 | 401 | OK |  |
| 31 | POST | `/clubs/:id/join` | anon | 401 | 401 | OK |  |
| 32 | DELETE | `/clubs/:id/leave` | anon | 401 | 401 | OK |  |
| 33 | GET | `/clubs/:id` | anon | 401 | 401 | OK |  |
| 34 | PUT | `/clubs/:id/current-book` | anon | 401 | 401 | OK |  |
| 35 | PUT | `/clubs/:id/location` | anon | 401 | 401 | OK |  |
| 36 | PUT | `/clubs/:id/upgrade` | anon | 401 | 401 | OK |  |
| 37 | POST | `/clubs/:id/meetings` | anon | 401 | 401 | OK |  |
| 38 | DELETE | `/clubs/:id/meetings/:meetingId` | anon | 401 | 401 | OK |  |
| 39 | POST | `/clubs/:id/posts` | anon | 401 | 401 | OK |  |
| 40 | DELETE | `/clubs/:id/posts/:postId` | anon | 401 | 401 | OK |  |
| 30 | POST | `/clubs` | user | 201 | 201 | OK |  |
| 31 | POST | `/clubs/:id/join` | user | 2xx | 201 | OK | segundo usuario |
| 33 | GET | `/clubs/:id` | user (admin del club) | 200 | 200 | OK |  |
| 34 | PUT | `/clubs/:id/current-book` | user (club free) | 403 | 403 | OK | gating Premium documentado |
| 36 | PUT | `/clubs/:id/upgrade` | user (admin del club) | 200 | 200 | OK |  |
| 34 | PUT | `/clubs/:id/current-book` | user (club premium) | 2xx | 200 | OK |  |
| 35 | PUT | `/clubs/:id/location` | user (admin del club) | 2xx | 200 | OK |  |
| 37 | POST | `/clubs/:id/meetings` | user (admin del club) | 2xx | 201 | OK |  |
| 38 | DELETE | `/clubs/:id/meetings/:meetingId` | user (admin del club) | 2xx | 200 | OK |  |
| 39 | POST | `/clubs/:id/posts` | user (miembro) | 2xx | 201 | OK |  |
| 40 | DELETE | `/clubs/:id/posts/:postId` | user (autor) | 2xx | 200 | OK |  |
| 32 | DELETE | `/clubs/:id/leave` | user (miembro) | 2xx | 200 | OK |  |

Generado: 2026-11-19T23:43:01Z · base http://localhost:3000/api
