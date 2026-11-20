# DAST — FEAT-001 (mdd:pentest-lite), pasada 2

- **Resultado:** **PASSED**. 0 vulnerabilidades explotables: 57/57 checks del backend OK, más los checks del frontend.
- **Fecha:** 2026-11-19, corrida 23:59:01–23:59:05 UTC.
- **Objetivo:** backend local `http://localhost:3000` (proceso de la usuaria, PostgreSQL local, `NODE_ENV` sin definir) y Vite dev en `:8080`, más el análisis estático de `dist/` y `vercel.json`. No se detuvo ni se reinició ningún proceso. `/api/health` respondió 200 antes, durante (después de cada sonda de DAST-01) y después de la corrida.
- **Contexto:** la pasada 1 (en la misma fecha) encontró dos problemas, corregidos en CODE (`sast.md`, intento 5):
  - **DAST-01:** cualquier usuario autenticado tumbaba el proceso con `GET /api/clubs/abc`, por una promesa rechazada sin manejar en `clubsController`.
  - **DAST-02:** había stack traces con rutas absolutas en las respuestas de error.
  - Esta pasada re-verifica ambos y re-ejecuta la cobertura completa.
- **Datos de prueba:** prefijo `smoke_feat001_` (usuarios 15 y 16, club 9, publicación 7). Se borraron con `smoke/teardown.sql` en una sola transacción. Remanentes: 0 en `users`, `clubs`, `club_members`, `club_posts`, `club_meetings`, `exchange_listings` y `exchange_requests`.
- **Efecto colateral esperado:** la prueba de F-DAST-05 agota el `loginLimiter` de `:3000` hasta las ~00:14 UTC. Login y registro responden 429 hasta entonces.

## Re-verificación de los hallazgos de la pasada 1

| Hallazgo | Sonda | Resultado |
|---|---|---|
| DAST-01 (DoS) | `GET /api/clubs/abc`, `DELETE /api/clubs/:id/meetings/x`, `DELETE /api/clubs/:id/posts/1%20OR%201=1`, `PUT /api/clubs/99999999999/upgrade`, `GET /api/clubs/-1`, `GET /api/clubs/1.5`, todas con token `user` | ✅ todas responden **400** "Identificador inválido.", sin stack, y `/api/health` sigue en **200** después de cada una |
| DAST-02 (stack traces) | `POST /api/clubs` con JSON malformado; `GET /api/health` con `Origin: https://evil.example.com` | ✅ **400** `{"message":"JSON inválido."}` y **403** `{"message":"Origen no permitido."}`, ambos `application/json`, sin stack, sin rutas y sin `Access-Control-Allow-Origin` |

El smoke de 38 rutas (23:43 UTC, `verify-report.md` §5) también verificó DAST-01 y DAST-02 en vivo, con health 200.

## Cobertura por categoría (sección 5.1)

| ID | Categoría | Resultado | Evidencia |
|---|---|---|---|
| F-DAST-01 | Autenticación | ✅ | Ver el detalle debajo de la tabla. |
| F-DAST-02 | Autorización | ✅ | Ver el detalle debajo de la tabla. |
| F-DAST-03 | Inyección | ✅ | Ver el detalle debajo de la tabla. |
| F-DAST-04 | Transporte | ⚠️ no evaluable en local | El entorno local es HTTP. El backend emite HSTS (`max-age=31536000; includeSubDomains`). TLS ≥ 1.2 y los cipher suites dependen de Railway y Vercel (SI-01 de `sast.md`). |
| F-DAST-05 | Rate limiting | ✅ | `loginLimiter` (`RateLimit-Policy: 10;w=900`) devuelve 429 en login, y `register` comparte el límite (429). DT-04 (`trust proxy` en Railway) sigue como deuda aceptada. |
| F-DAST-06 | File upload | N/A | No hay endpoints de upload. Las portadas son URLs. |
| F-DAST-07 | CORS | ✅ | Ver el detalle debajo de la tabla. |
| F-DAST-08 | Error handling | ✅ | DAST-01 y DAST-02 corregidos (tabla de arriba). El 404 de una ruta inexistente no filtra detalles. `errorHandler` responde 500 genérico y deja el detalle solo en `console.error`. |

**F-DAST-01, autenticación:**

- El JWT tiene `exp` de 7 días.
- Se rechazan con 401:
  - un token `alg:none` con `role:admin`;
  - un payload alterado (`role:admin`) con la firma original;
  - un token malformado;
  - el esquema `Basic`.
- No hay enumeración de usuarios: usuario inexistente y contraseña incorrecta dan el mismo 401 "Credenciales inválidas.".
- No hay cookies de sesión (el JWT vive en `localStorage`), así que los flags de cookie no aplican.
- Logout solo del lado del cliente, sin revocación del token: informativo.

**F-DAST-02, autorización:**

- Horizontal. El usuario B:
  - no ve el detalle del club de A (403);
  - no lo sube a premium, no lo mueve, no borra posts ajenos, no crea reuniones ni cambia el libro actual (403 en todos los casos);
  - no borra la publicación de A (404);
  - no acepta su propia solicitud (403).
- A no puede solicitar su propio libro (400).
- `/exchanges/my` y `/books/my-requests` de B no exponen datos de A.
- Vertical: `user` recibe 403 en `/admin-only`, `/books/requests`, `POST /books`, `/exchanges/admin`, `DELETE /books/:id` y `PUT /books/<id inyectado>`.
- `POST /api/users/register` con `role:admin` → 404 (ruta eliminada).
- `auth/register` ignora el `role` del body (lo confirma el smoke).

**F-DAST-03, inyección:**

- SQLi:
  - `' OR '1'='1` y objetos `{$ne:null}` en login → 401 sin token.
  - `?title=' OR 1=1 --` → 0 filas.
  - `'; DROP TABLE books; --` no se ejecuta.
  - `lat` y `radius` inyectados en `/clubs/nearby` no tienen efecto (`parseFloat` y parámetros `$n`).
  - `status` inválido → 400.
  - Ids de ruta inyectados en clubs → 400 (`validateIdParam`).
- XSS reflejado: la respuesta de `/google-books/search` es `application/json` con `nosniff`.
- Stored XSS: la API guarda el texto tal cual y responde JSON. El frontend lo renderiza como texto React y escapa el popup de Leaflet con `escapeHtml` (T-U-09). `href` externos pasan por `safeExternalUrl` (T-U-06) con `noopener noreferrer`.
- Header injection: CRLF en la query no inyecta `Set-Cookie`.
- Command injection: no hay `child_process` ni `exec` en `src/`.

**F-DAST-07, CORS:**

- `https://evil.example.com` → 403 JSON sin ACAO.
- `http://localhost.evil.com` y `null` → sin ACAO.
- `http://localhost:8080` → ACAO específico con credentials (nunca `*`).

## Headers (W-DAST)

| Check | Backend | Frontend (Vercel / Vite) |
|---|---|---|
| W-DAST-01 HSTS | ✅ | depende de Vercel (no verificado) |
| W-DAST-02 CSP | ✅ (helmet) | ⚠️ ausente en `vercel.json` (DT-05 / GF-01, aceptado) |
| W-DAST-03 X-Content-Type-Options | ✅ `nosniff` | depende de Vercel |
| W-DAST-04 Referrer-Policy | ✅ `no-referrer` | depende de Vercel |
| W-DAST-05 versión del servidor | ✅ sin `X-Powered-By` | — |

**Vite dev (`:8080`):** `/@fs/etc/passwd` y `/@fs/<repo>/librosclub-backend/.env` → 403 Restricted. El advisory de `vite`, que solo se corrige con un salto major, está aceptado por la usuaria (AC-33). DT-07 (`host: "::"`) sigue vigente.

**Build (`dist/`):**

- `favicon.svg` es estático, sin script ni referencias externas (T-U-14).
- `dangerouslySetInnerHTML` aparece solo en `ui/chart.tsx`, que la app no usa.
- El único `target="_blank"` lleva `rel="noopener noreferrer"`.

## Dependencias de runtime

- Backend: `npm audit --omit=dev` da 0.
- Frontend: `--omit=dev` da 3 advisories (zod, react-router) que solo se corrigen con un salto major. Los aceptó la usuaria (AC-33).
- `npm audit fix` sin `--force` es idempotente: el lockfile queda sin cambios.

## Resumen

- Backend: 57 checks, 57 OK.
- Frontend: los checks de dev server y build, OK.
- F-DAST-04 (transporte) no se pudo evaluar en local: depende de la infraestructura de producción. F-DAST-06 (uploads) no aplica.
- Vulnerabilidades explotables: **0**.
- WARN y deuda aceptada: CSP del frontend (DT-05), `trust proxy` (DT-04), dev server de Vite (DT-07), logout sin revocación del JWT.
