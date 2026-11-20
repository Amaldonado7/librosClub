# FIX-PLAN FIX-001: Hardening de seguridad del backend y deploy

| Campo | Valor |
|---|---|
| Ticket | FIX-001 |
| Jira | sin ticket |
| Tier | FIX |
| Branch | `fix/FIX-001-hardening-seguridad` (desde `main`) |
| PRD relacionado | `docs/work/FEAT-001/prd.md` (Fuera de Alcance: deuda pendiente) |
| Origen | `docs/work/FEAT-001/deuda-tecnica.md` — DT-01, DT-02, DT-04, DT-05, DT-07 |
| Loops Spec | 0 |
| Fecha | 2026-11-20 |

## Problema

FEAT-001 dejó registrada deuda de seguridad preexistente que no entraba en su alcance:

1. **DT-01** — `librosclub-backend/src/updatePasswords.js` contiene en texto plano las contraseñas de dos usuarios y está versionado y publicado en el remoto.
2. **DT-02** — `librosclub-backend/src/middlewares/roleMiddleware.js:6` hace `console.log` del rol del usuario en cada request autorizada (ruido y filtrado de datos de sesión a logs).
3. **DT-04** — el backend corre en Railway detrás de un reverse proxy sin `trust proxy`: `req.ip` es la IP del proxy, por lo que `loginLimiter` (10 req / 15 min en `/api/auth/login` y `/api/auth/register`) agrupa a **todos** los clientes en un solo bucket. Con 10 requests cualquiera bloquea login y registro para todos (DoS de autenticación).
4. **DT-05** — el frontend publicado en Vercel (`https://librosclub.vercel.app`) solo envía `Strict-Transport-Security`; no tiene Content-Security-Policy ni `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` ni `Permissions-Policy` (verificado con `curl -I`).
5. **DT-07** — el dev server de Vite escucha en todas las interfaces (`server.host: "::"`), exponiendo el advisory de path traversal de `vite` (dev-only) a la red local.

## Causa raíz

| Deuda | Causa raíz |
|---|---|
| DT-01 | Script de mantenimiento con credenciales literales commiteado; 0 callers (no lo usa código, `package.json` ni `railway.toml`). |
| DT-02 | Log de depuración que quedó en código productivo. |
| DT-04 | Express no confía en `X-Forwarded-For` sin `trust proxy`; detrás del proxy de Railway `req.ip` deja de identificar al cliente y `express-rate-limit` keyea por `req.ip`. |
| DT-05 | `librosclub-frontend/vercel.json` solo define `rewrites`; no hay bloque `headers`. |
| DT-07 | `vite.config.js` fija `server.host: "::"` (valor por defecto de la plantilla original). |

## Archivos a Modificar

- `librosclub-backend/src/updatePasswords.js` (borrar)
- `librosclub-backend/src/middlewares/roleMiddleware.js`
- `librosclub-backend/src/app.js`
- `librosclub-frontend/vercel.json`
- `librosclub-frontend/vite.config.js`
- `librosclub-backend/src/__tests__/trustProxy.test.js` (nuevo)
- `librosclub-backend/src/middlewares/__tests__/roleMiddleware.test.js` (nuevo)
- `librosclub-frontend/src/test/deploy-config.test.ts` (nuevo)

## Solución

### Paso 1 — DT-01: eliminar `updatePasswords.js`
- [ ] Borrar `librosclub-backend/src/updatePasswords.js`.
- [ ] Verificar 0 referencias (`grep -rn updatePasswords librosclub-backend --exclude-dir=node_modules`).
- Fuera del código (acción de la usuaria): rotar las contraseñas de esos dos usuarios en toda base real; borrar el archivo no las quita del historial de git.
- **Errores:** no aplica (no hay runtime). Si algún proceso externo lo invocaba, fallaría con `MODULE_NOT_FOUND` → no hay ninguno (verificado).

### Paso 2 — DT-02: quitar el log del rol
- [ ] Eliminar el `console.log` y su comentario en `roleMiddleware.js`; el comportamiento (403 `{ message: 'Acceso denegado' }` sin rol permitido, `next()` con rol permitido) no cambia.
- [ ] `allowRoles.js` (sibling duplicado, sin log) no se toca en este fix.
- **Errores:** sin cambios: usuario ausente o rol no permitido → 403 `{ message: 'Acceso denegado' }`.

### Paso 3 — DT-04: `trust proxy`
- [ ] `app.set('trust proxy', 1)` en `librosclub-backend/src/app.js`, inmediatamente después de crear la app y antes de `helmet`, `cors` y los limiters.
- [ ] Con 1 salto, Express toma como `req.ip` la última dirección que agrega el proxy de Railway: el cliente no puede elegir su IP enviando `X-Forwarded-For` propio.
- [ ] El valor `1` asume un solo proxy delante del backend (decisión de la usuaria). Si Railway agregara más saltos, se ajusta el número.
- **Errores:** sin cambios de contrato: al superar el límite, `429 { message: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' }` ahora por cliente; `express-rate-limit` 8 no emite el error de validación `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` porque `trust proxy` queda configurado.

### Paso 4 — DT-05: headers de seguridad en Vercel
- [ ] Agregar a `librosclub-frontend/vercel.json` un bloque `headers` con `source: "/(.*)"`, conservando `rewrites` tal cual.
- [ ] `Content-Security-Policy`:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://librosclub-production.up.railway.app https://nominatim.openstreetmap.org; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests`
- [ ] `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self), camera=(), microphone=()`.
- Fuentes verificadas para cada directiva:
  - `script-src 'self'`: el build de Vite solo carga `/assets/*.js` (sin scripts inline).
  - `style-src 'unsafe-inline'`: Radix, Framer Motion y Leaflet aplican estilos inline; Google Fonts por `<link>` en `index.html`.
  - `img-src https:` + `upgrade-insecure-requests`: portadas de Google Books (`http://books.google.com/...`, se piden por https), `cover_url` cargadas por usuarios y tiles `https://{s}.tile.openstreetmap.org`.
  - `connect-src`: API de producción (`VITE_API_URL` del bundle publicado: `https://librosclub-production.up.railway.app/api`) y `nominatim.openstreetmap.org` (geocoding en `ClubesTab` y `ClubDetailSheet`).
  - `Permissions-Policy geolocation=(self)`: "Cerca tuyo" usa `navigator.geolocation`.
- **Errores:** una directiva incompleta bloquea el recurso en el navegador (error de CSP en consola) sin afectar al backend. Mitigación: verificar el preview de Vercel del PR (consola sin violaciones de CSP en `/`, `/app`, Feed, Buscar, Clubes, Cerca tuyo) antes de mergear.

### Paso 5 — DT-07: Vite dev server solo en localhost
- [ ] `server.host: "localhost"` en `librosclub-frontend/vite.config.js` (puerto 8080 sin cambios).
- **Errores:** acceder al dev server desde otro dispositivo de la red deja de funcionar (comportamiento buscado).

## Dependencias entre pasos

- Pasos 1, 2, 4 y 5 son independientes entre sí.
- Paso 3 no depende de otros pasos; su test (T-01) usa `app.js` completo, por lo que se escribe después del Paso 3.
- Los tests de contrato (T-03, T-04) dependen de los Pasos 4 y 5.
- Orden sugerido: 1 → 2 → 3 → 4 → 5, cada uno con su test antes del cambio (TDD).

## Tests

| ID | Archivo | Qué verifica | Regresión |
|---|---|---|---|
| T-01 | `librosclub-backend/src/__tests__/trustProxy.test.js` | Sobre `/api/auth/login` (db mockeada vía `require.cache`): 10 intentos con `X-Forwarded-For: 203.0.113.10` → el 11.º da 429; un request con `X-Forwarded-For: 198.51.100.20` sigue respondiendo 401 (bucket separado). Con `trust proxy` desactivado, el segundo cliente también recibiría 429. | Sí: falla antes del fix (mismo bucket para todos). |
| T-02 | `librosclub-backend/src/middlewares/__tests__/roleMiddleware.test.js` | Rol permitido → `next()`; sin usuario o rol no permitido → 403 `{ message: 'Acceso denegado' }`; en ningún caso se llama a `console.log`. | Sí: falla antes del fix (se loguea el rol). |
| T-03 | `librosclub-frontend/src/test/deploy-config.test.ts` | `vercel.json` conserva el rewrite SPA y define para `/(.*)` la CSP con cada directiva listada (incluido el origen de la API y nominatim, sin `'unsafe-eval'` ni `*` en `script-src`/`connect-src`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` y `Permissions-Policy` con `geolocation=(self)`. | Sí: falla antes del fix (no hay headers). |
| T-04 | `librosclub-frontend/src/test/deploy-config.test.ts` | `vite.config.js` declara `host: "localhost"` y no `"::"`. | Sí: falla antes del fix. |
| T-05 | verificación estática | `librosclub-backend/src/updatePasswords.js` no existe y no tiene referencias. | Sí. |
| T-M-01 | manual (preview de Vercel) | Consola del navegador sin violaciones de CSP en `/` y `/app` (Feed con portadas, Buscar, Clubes, Cerca tuyo con mapa y geolocalización, login). | — |

Suites existentes que deben seguir verdes: backend `npm test` (27), frontend `npm test` (160), `npm run lint` (0 errores), `npm run build`.

## Riesgo de regresión

**Medio.**
- CSP incompleta → recursos bloqueados en producción (fuentes, portadas, API). Mitigado por la verificación de fuentes de cada directiva, T-03 y T-M-01 en el preview de Vercel antes del merge.
- `trust proxy` con un número de saltos distinto del real → o el límite vuelve a agrupar clientes (si hay más saltos) o el cliente puede elegir su IP (si no hay proxy). Mitigado por la decisión explícita (1 salto en Railway) y T-01.
- Pasos 1, 2 y 5: riesgo bajo (código sin callers, log, configuración de desarrollo).

## Rollback

Revertir el commit del fix. Todos los cambios son de configuración o eliminación de código sin estado: no hay migraciones ni datos afectados. La rotación de contraseñas (fuera del código) no se revierte.
