# DAST — FIX-001 (mdd:pentest-lite)

- **Resultado:** **PASSED.** 0 vulnerabilidades explotables.
- **Objetivo:** backend local `http://localhost:3000` (Node 20, `trust proxy` = 1, PostgreSQL local). Configuración de deploy del frontend revisada en `librosclub-frontend/vercel.json`; los headers reales de Vercel se verifican en el preview del PR (T-M-01, usuaria). Producción no se tocó.
- **Script:** pruebas HTTP con `urllib` (sin dependencias), usando IPs de documentación (RFC 5737) en `X-Forwarded-For` para no agotar el límite de la IP local.

## Cobertura por categoría

| ID | Categoría | Resultado | Evidencia |
|---|---|---|---|
| F-DAST-01 | Autenticación | ✅ | Login inválido → 401 genérico; JWT `alg:none` con `role:admin` → 401. Sin cookies de sesión (JWT en `localStorage`). |
| F-DAST-02 | Autorización | ✅ | `/admin-only` y `POST /books` sin token → 401; `POST /api/users/register` con `role:admin` → 404 (ruta eliminada en FEAT-001). |
| F-DAST-03 | Inyección | ✅ | SQLi en login → 401 sin token; `?title=' OR 1=1 --` → 200 con 0 resultados (queries parametrizadas). |
| F-DAST-04 | Transporte | ⚠️ no evaluable en local | El backend emite HSTS (helmet); en producción la API usa `https://librosclub-production.up.railway.app` y Vercel ya manda HSTS. TLS depende de Railway/Vercel. |
| F-DAST-05 | Rate limiting (foco del fix) | ✅ | Misma IP (`203.0.113.77`): el 11.º login → 429 y register comparte el límite (429). Otra IP (`198.51.100.88`) → 401: buckets separados por cliente. `X-Forwarded-For: 203.0.113.77, 198.51.100.89` → 401 con `RateLimit-Remaining: 9`: con 1 salto se toma la última dirección (la que agrega el proxy), no la que el cliente pone adelante. |
| F-DAST-06 | File upload | N/A | Sin endpoints de upload. |
| F-DAST-07 | CORS | ✅ | `Origin: https://evil.example.com` → 403 JSON `Origen no permitido.` sin `Access-Control-Allow-Origin`; `http://localhost:8080` → ACAO específico. |
| F-DAST-08 | Error handling | ✅ | JSON malformado → 400 `JSON inválido.`; `/clubs/abc` → 400; ruta inexistente → 404 sin stack. `/api/health` respondió 200 al final de la corrida. |

## Headers

| Check | Backend (`:3000`, helmet) | Frontend (`vercel.json`) |
|---|---|---|
| CSP | ✅ | ✅ (declarada; T-03) |
| HSTS | ✅ `max-age=31536000; includeSubDomains` | ✅ (ya enviado por Vercel) |
| X-Content-Type-Options | ✅ `nosniff` | ✅ |
| Referrer-Policy | ✅ `no-referrer` | ✅ `strict-origin-when-cross-origin` |
| X-Frame-Options | ✅ `SAMEORIGIN` | ✅ `DENY` + `frame-ancestors 'none'` |
| X-Powered-By | ✅ ausente | — |

## Observaciones

- **TM-01 (aceptado por diseño):** en local no hay proxy delante, así que un cliente que manda `X-Forwarded-For` elige su `req.ip`. Es el comportamiento esperado de `trust proxy` = 1 sin proxy; en Railway el edge agrega la IP real como último salto. No es explotable mientras el servicio se exponga solo por el dominio de Railway (SI-01).
- **Límite de login local:** las pruebas usaron IPs de documentación; el bucket de la IP local quedó con 9 intentos disponibles (no se agotó).

## Dependencias de runtime

- Backend `npm audit --omit=dev`: 0.
- Frontend `npm audit --omit=dev`: 3 (zod, react-router), FALSE POSITIVE ya triados en FEAT-001.
