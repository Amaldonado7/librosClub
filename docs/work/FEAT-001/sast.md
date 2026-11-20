# SAST — FEAT-001

## Metadata

- Architecture Type: Monolith (SPA React/Vite + API Express/PostgreSQL)
- Exposure Context: Public web app; backend `/api/auth/*` público, resto autenticado/admin
- Governance Loaded: Yes (`security.instructions.md`; sin `AGENTS.md` en el repo)
- Analysis Scope: parcial — archivos cambiados en `feat/FEAT-001-rediseno-visual` vs `mvp-3` (frontend + `librosclub-backend/src/controllers/authControllers.js`, `routes/auth.js`, su test y `package.json`), más auditoría de dependencias de ambos proyectos
- Mode: Audit
- Intentos: 2 (intento 1 BLOCKED por CVEs preexistentes de dependencias → triaje `audit/sec-auditor.json` → `npm audit fix` sin `--force` en ambos proyectos → intento 2)

## Executive Summary

**PASSED — Secure-Ready.** El código del ticket no introduce vulnerabilidades y las mitigaciones del threat model están implementadas correctamente. Tras `npm audit fix`, el backend queda con 0 vulnerabilidades. En el frontend quedan advisories cuyo único fix es un salto semver-major; todos están verificados como no alcanzables en producción (FALSE POSITIVE en el contexto de esta app).

| Severidad | Código del ticket | Dependencias (tras fix) |
|---|---|---|
| CRITICAL | 0 | 0 |
| HIGH | 0 | 0 explotables (1 FALSE POSITIVE: zod) |
| MEDIUM | 0 | 0 explotables (5 FALSE POSITIVE) |
| LOW | 0 | 0 |

## Passes

- **Pass A — Fuentes:** datos de club (`nombre`, `ubicacion`, `currentBookTitle`) desde API (UGC); `link`/`thumbnail` de Google Books y `cover_url` de la DB; inputs de formularios (AuthModal, AddBookForm, PremiumUpgradeModal); `req.body` en `authControllers`.
- **Pass B/C — Flujos y sinks:**
  - Popups Leaflet (`CercaTuyoTab.tsx:75-82`, `setContent`): todo string UGC pasa por `escapeHtml` (`&<>"'`); `members` y `distanceKm` se fuerzan a número. TM-001 mitigado.
  - `L.divIcon` (`CercaTuyoTab.tsx:18-24`, `29-31`): `color` es constante interna. Sin hallazgos en este sink.
  - "Ver más →" (`BookCoverCard.tsx:46-47`): `href = safeExternalUrl(link)` (solo `http:`/`https:` vía `new URL`), con `target="_blank"` + `rel="noopener noreferrer"`. TM-002 mitigado.
  - `<img src>` (CoverArt, AddBookForm, BookAdminRow, ExchangeTab): React escapa atributos; `javascript:` no ejecuta en `img src`. Sin hallazgos.
  - SQL en `authControllers.js`: queries parametrizadas (`$1..$3`). Sin hallazgos.
- **Pass D — Sanitización:** `escapeHtml` y `safeExternalUrl` correctos y cubiertos por tests (`src/lib/__tests__`). Sin `dangerouslySetInnerHTML`, `innerHTML` ni `eval` en el scope.
- **Pass E — AuthN/AuthZ:** refactor de `routes/auth.js` sin cambio de comportamiento (11 tests en `controllers/__tests__/authControllers.test.js`); `register` fuerza rol `user` ignorando `req.body.role`; `/upgrade` sigue detrás de `authMiddleware`. Sin hallazgos en este pass.
- **Pass F — Cripto y secretos:** bcrypt cost 10; JWT firmado con `process.env.JWT_SECRET` y verificado con secreto estático. Sin secrets nuevos; `.env` en `.gitignore`. TM-003: `cardNumber`/`cvv` de `PremiumUpgradeModal` no llegan a `fetch` ni a `localStorage` (`upgradeUser(token)` solo envía el token). Preexistente fuera de scope: `updatePasswords.js` (DT-01, deuda aceptada).
- **Pass G — Supply chain:** ver abajo. El ticket agrega carga de Google Fonts por `<link>` en `index.html` (CSS dinámico de Google; SRI no aplicable), riesgo LOW ya registrado en el threat model.

## Dependencias

### Backend — `npm audit --omit=dev`: 0 vulnerabilidades

`npm audit fix` (sin `--force`) actualizó express 4.22.x, body-parser, proxy-addr ≥ 2.0.8, jws/jwa, path-to-regexp, qs, ip-address/express-rate-limit. Cierra el único true positive del triaje (body-parser, DoS en cuerpos comprimidos, MEDIUM efectivo) y el CRITICAL de `proxy-addr` (no alcanzable sin `trust proxy`, ahora corregido igual).

### Frontend — restantes (único fix = semver-major)

| Sev. npm | Paquete | Disposición | Justificación verificada |
|---|---|---|---|
| high | zod (<4.6.6) | FALSE POSITIVE | 0 imports de `zod` en `src/`; no aparece en `dist/assets`. Fix = zod 4 (major). |
| moderate | react-router / react-router-dom (≤7.17) | FALSE POSITIVE | `BrowserRouter` declarativo sin data routers/loaders/SSR; todo `navigate`/`<Navigate>`/`<Link to>` usa literales (`/`, `/app`); `NavLink.tsx` no se importa. Fix = v7 (major). |
| moderate | glob, minimatch, sucrase | FALSE POSITIVE | Solo tooling de build (tailwind/postcss); 0 imports en `src/`; no forman parte del bundle servido. |

## Intento 3 — delta del loop (Bloque 5 + cobertura)

**PASSED — Secure-Ready** (producción sin cambios respecto del intento 2).

- `librosclub-frontend/public/favicon.svg`: SVG estático (`rect` + `circle`), sin `<script>`, `foreignObject`, `href`, `url(` ni referencias externas (salvo la declaración `xmlns`). Sin hallazgos.
- `librosclub-backend/src/services/googleBooksService.js`: solo se quita `orderBy=newest`; `topic`, `limit`, `page`, `lang` siguen pasando por `URLSearchParams.set` (encoding correcto) con los mismos clamps. Sin hallazgos.
- `librosclub-frontend/src/components/AuthModal.tsx`: `useEffect` que re-sincroniza `mode` y limpia `username`/`password` al abrir; sin sinks nuevos, credenciales no persistidas. Sin hallazgos.
- Tests nuevos (cobertura, T-B-02, T-U-14, T-U-15): solo mocks locales, sin red ni secretos (JWT de test `test-secret` en `process.env` del proceso de test).
- **Dependencias de desarrollo:** la devDependency agregada por el ticket (`@vitest/coverage-v8@3.2.4`) estaba afectada por advisories CRITICAL (vía `vitest`/`tinypool`); se actualizó junto con `vitest` a **3.2.7** (patch, `--save-exact`) → `@vitest/coverage-v8` sin advisories. Tests 160/160, cobertura 82.52 % líneas, lint 0 errores, build OK tras el bump.
- Advisories restantes solo en `devDependencies`, preexistentes en `mvp-3`, fix únicamente semver-major, no presentes en el bundle de producción:

| Sev. | Paquete | Disposición | Justificación |
|---|---|---|---|
| critical | vitest (≤4.1.10) | FALSE POSITIVE (dev) | El vector es el servidor de Vitest UI escuchando; el proyecto no usa `@vitest/ui` ni `--ui`. Fix = vitest 4 (major). |
| critical | tinypool | FALSE POSITIVE (dev) | Prototype pollution en opciones de worker: las opciones las arma Vitest desde config propia, sin input externo. |
| high | vite (≤6.4.3) | ACEPTADO (dev, LOW efectivo) | Path traversal en `.map` de deps optimizadas del **dev server**; no afecta el build estático de producción. Riesgo real solo mientras corre `npm run dev`, que hoy escucha en `host: "::"` (todas las interfaces, preexistente en `vite.config.js`). Ver GF-05. Fix = vite 8 (major). |

## Intento 4 — loop VERIFY→CODE (escalada a admin + audit fix)

**PASSED — Secure-Ready.**

- **Corregido (preexistente, CRITICAL efectivo):** `POST /api/users/register` insertaba el `role` recibido en el body sin validar (`usersControllers.js` en `mvp-3`), permitiendo que un cliente anónimo se registrara como `admin` (CWE-269, escalada vertical). `POST /api/users/login` emitía tokens con un payload distinto (`{ id, role }`, sin expiración). El frontend no usaba ninguna de las dos. Se eliminaron `routes/users.js`, `controllers/usersControllers.js` y su montaje y rate limit en `app.js`. Regresión: `src/__tests__/app.test.js` (404 en ambas rutas sin tocar la DB; falla contra el código de `mvp-3`).
- Pass E: el único `INSERT INTO public.users` restante es `authControllers.register`, con `role` fijo `'user'` (test en `authControllers.test.js`). Ningún otro handler toma `role` del body.
- Dependencias: backend `--omit=dev` 0. Frontend `--omit=dev`: 3 (zod high y react-router moderate, FALSE POSITIVE ya justificados). `npm audit fix` sin `--force` aplicado e idempotente; lo restante requiere saltos semver-major.

## Intento 5 — loop VERIFY→CODE (DAST-01, DAST-02, favicon)

**PASSED — Secure-Ready.**

- **DAST-01 corregido (preexistente, HIGH, CWE-248/CWE-20):** `clubsController` ejecutaba `getMiRol`/`isPremiumClub`/queries fuera de `try` en 9 handlers (`createClub`, `getClubDetail`, `setCurrentBook`, `addMeeting`, `deleteMeeting`, `createPost`, `deletePost`, `upgradeClub`, `setClubLocation`); un `:id` no numérico o un error de DB producía un `unhandledRejection` que terminaba el proceso. Fix: `router.param` con `validateIdParam` para `id`, `meetingId` y `postId` (entero positivo ≤ 2^31-1, si no 400 sin tocar la DB) y `asyncHandler` en las 13 rutas de `routes/clubs.js` (los rechazos llegan al error handler). Barrido estático de `src/controllers/*.js`: los únicos handlers con `await` fuera de `try` son los 9 de clubs, todos cubiertos.
- **DAST-02 corregido (preexistente):** nuevo `middlewares/errorHandler.js` registrado al final de `app.js`: JSON malformado → 400 `{message:'JSON inválido.'}`, origin rechazado por CORS → 403 `{message:'Origen no permitido.'}`, otros 4xx expuestos → mensaje genérico, resto → 500 `{message:'Error del servidor.'}`. Nunca devuelve stack ni rutas; el detalle se loguea solo del lado del servidor.
- Regresión: `src/__tests__/errorHandling.test.js` (9 tests, rojos contra el código previo): 5 rutas con ids inválidos → 400 sin queries y proceso vivo; error de DB → 500 genérico sin stack y proceso vivo; JSON malformado → 400 sin stack; origin malicioso → 403 sin `Access-Control-Allow-Origin`; origin local sigue permitido. Backend: 27/27.
- `public/favicon.svg`: flor amarilla sin fondo con contorno `#492710`; solo `circle`/`path`, sin `url(`, `href` ni contenido activo (T-U-14 actualizado).
- Dependencias sin cambios respecto del intento 4 (backend `--omit=dev` 0; frontend `--omit=dev` 3, FALSE POSITIVE).

## Governance Findings

- GF-01 (MEDIUM, preexistente): sin Content-Security-Policy en `librosclub-frontend/vercel.json`. Fuera de alcance; ticket de hardening recomendado.
- GF-02 (MEDIUM, preexistente): backend desplegado detrás de proxy (Railway) sin `app.set('trust proxy', 1)`: `loginLimiter` agrupa a todos los clientes en la IP del proxy (DoS de login con 10 requests). Ticket de hardening recomendado (prerrequisito `proxy-addr` ≥ 2.0.8 ya cumplido).
- GF-03 (LOW, preexistente): `librosclub-backend/node_modules` está versionado en git (1078 archivos), por lo que las actualizaciones de dependencias se reflejan en el diff.
- GF-04 (LOW): sin Dependabot/Renovate ni CI que audite dependencias.
- GF-05 (LOW, preexistente): el dev server de Vite escucha en todas las interfaces (`server.host: "::"` en `librosclub-frontend/vite.config.js`), exponiendo el advisory de `vite` a la red local mientras corre `npm run dev`. Recomendado: `host: "localhost"` o actualizar a vite ≥ 6.4.4/8 en un ticket de mantenimiento.

## Security Inquiries

- SI-01: ¿`VITE_API_URL` usa `https` en producción?
- SI-02: número de saltos de proxy en Railway (para configurar `trust proxy` en el ticket de hardening).
