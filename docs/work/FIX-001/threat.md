# Threat Model — FIX-001: Hardening de seguridad del backend y deploy

## Metadata

- Architecture Type: Monolith (SPA React/Vite en Vercel + API Express/PostgreSQL en Railway)
- Exposure Context: Public Internet (SPA y `/api/auth/*`); resto Authenticated Users / Admin
- Governance Loaded: Yes (`security.instructions.md`; sin `AGENTS.md` en el repo)
- Specification Completeness: High (`docs/work/FIX-001/fix.md`)
- Analysis Confidence Level: High (salvo el número de saltos de proxy en Railway: Medium)

## Executive Summary

**PASSED — Secure-Ready.** El fix reduce superficie: elimina credenciales versionadas (DT-01), quita datos de sesión de los logs (DT-02), hace efectivo el rate limiting de autenticación detrás del proxy (DT-04), agrega CSP y headers anti-clickjacking/sniffing en el frontend (DT-05) y cierra el dev server a localhost (DT-07). No introduce endpoints, datos ni flujos nuevos. Vectores analizados: 6. Riesgos: C:0 H:0 M:2 L:3. Identity Model Risk: Low (sin cambios en autenticación/autorización).

## Critical Architectural Risks

Ninguno.

## Fase 1 — Activos

| Activo | Sensibilidad | Límites que cruza |
|---|---|---|
| Credenciales de usuarios (contraseñas en `updatePasswords.js`) | High | Repositorio ↔ cualquiera con acceso al remoto |
| JWT en `localStorage` del navegador | High | Client ↔ Server (Vercel ↔ Railway) |
| Disponibilidad de login/registro | Medium | Public Internet ↔ API |
| IP del visitante | Low | Navegador ↔ hosts de imágenes de terceros |
| Logs del backend (rol de usuario) | Low | API ↔ observabilidad de Railway |

## Fase 2 — Límites de confianza

- **TB-01 Client ↔ Proxy de Railway ↔ API Express:** cruzan credenciales, JWT y la cabecera `X-Forwarded-For`; la identidad del cliente para rate limiting se deriva de `req.ip`.
- **TB-02 Navegador ↔ Vercel (SPA):** documento, scripts y estilos; los headers de seguridad los define `vercel.json`.
- **TB-03 Navegador ↔ terceros (Google Fonts, Google Books, OSM tiles, nominatim, URLs de portadas de usuarios):** recursos cargados por la SPA; gobernados por la CSP.
- **TB-04 Repositorio git ↔ público con acceso al remoto:** secretos versionados.
- **TB-05 Máquina de desarrollo ↔ red local:** dev server de Vite.

## Fase 3 — STRIDE

| Límite | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| TB-01 | TM-01 (IP del cliente) | — | — | TM-05 (log del rol, mitigado) | TM-01 | — |
| TB-02 | — | — | — | — | — | — |
| TB-03 | — | — | — | TM-03, TM-04 | — | — |
| TB-04 | TM-02 | — | — | TM-02 | — | TM-02 |
| TB-05 | — | — | — | Mitigado por DT-07 | — | — |

TB-02: sin amenazas nuevas; la CSP (`script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`) reduce el impacto de un XSS sobre el JWT en `localStorage` y elimina clickjacking.

## Fase 4 — Identidad y autorización

Sin cambios: autenticación por JWT (`authMiddleware`), autorización por rol (`allowRoles` / `roleMiddleware`), rol forzado a `user` en registro. El fix solo quita un log de `roleMiddleware`; la decisión de autorización no cambia.

## Fase 5 — Flujos de datos

- Cifrado en tránsito: SPA por HTTPS (HSTS de Vercel ya presente); API de producción `https://librosclub-production.up.railway.app` (resuelve SI-01 de FEAT-001); `upgrade-insecure-requests` sube a HTTPS las portadas `http://` de Google Books.
- Logging: se elimina el log del rol por request.

## Fase 6 — Supply chain / terceros

Sin dependencias nuevas. La CSP restringe `connect-src` a la API y nominatim; `img-src https:` sigue amplio por las portadas de usuarios (TM-03).

## Fase 7 — Operacional

`trust proxy` depende de la topología de Railway (TM-01). La rotación de las contraseñas filtradas es una acción operativa fuera del código (TM-02).

## Detailed Threats

### [TM-01] `trust proxy` con un número de saltos distinto del real
- Severidad: MEDIUM
- Confianza: MEDIUM
- Límite de confianza: TB-01
- Activo afectado: disponibilidad de login/registro
- Exposición: Public
- Movimiento lateral: No
- Categoría STRIDE: Spoofing / Denial of Service

#### Debilidad arquitectural
`app.set('trust proxy', 1)` asume exactamente un proxy delante de Express. Con más saltos, `req.ip` sería una IP intermedia y el limiter volvería a agrupar clientes; sin proxy (acceso directo), `req.ip` saldría del `X-Forwarded-For` que manda el cliente.

#### Escenario de explotación
Si el servicio fuera accesible sin pasar por el edge de Railway, un atacante rotaría `X-Forwarded-For` en cada request para evadir el límite de 10 intentos y hacer fuerza bruta de contraseñas.

#### Impacto de negocio
Fuerza bruta de credenciales (con más saltos: vuelve el DoS de login de DT-04).

#### Mitigación recomendada
Mantener 1 salto (Railway expone el servicio solo por su edge; decisión de la usuaria) y verificarlo con T-01 en el código. Como control operativo, no exponer el puerto del contenedor fuera del dominio de Railway. Security Inquiry SI-01 abajo.

### [TM-02] Credenciales históricas en el repositorio
- Severidad: MEDIUM
- Confianza: HIGH
- Límite de confianza: TB-04
- Activo afectado: credenciales de dos usuarios
- Exposición: cualquiera con acceso al remoto
- Movimiento lateral: No
- Categoría STRIDE: Spoofing / Information Disclosure / Elevation of Privilege

#### Debilidad arquitectural
Borrar `updatePasswords.js` (Paso 1) no quita las contraseñas del historial de git.

#### Escenario de explotación
Quien lea el historial obtiene usuario y contraseña y entra como esos usuarios si siguen vigentes.

#### Impacto de negocio
Acceso a cuentas existentes, incluido un posible admin.

#### Mitigación recomendada
Rotar las contraseñas de esos usuarios en toda base real (acción de la usuaria, fuera del código). Reescribir el historial no se recomienda (rompe clones y no invalida copias ya descargadas). **Riesgo residual aceptado hasta la rotación.**

### [TM-03] `img-src https:` permite píxeles de seguimiento en portadas de usuarios
- Severidad: LOW
- Confianza: HIGH
- Límite de confianza: TB-03
- Activo afectado: IP del visitante
- Exposición: Authenticated Users
- Movimiento lateral: No
- Categoría STRIDE: Information Disclosure

Preexistente: una `cover_url` cargada por un usuario puede apuntar a un host propio y registrar las IPs de quienes ven la portada. Aceptado: restringir hosts rompería portadas legítimas; un proxy de imágenes queda para un ticket futuro.

### [TM-04] `style-src 'unsafe-inline'`
- Severidad: LOW
- Confianza: HIGH
- Límite de confianza: TB-03
- Activo afectado: integridad de la UI
- Exposición: Public
- Movimiento lateral: No
- Categoría STRIDE: Information Disclosure

Requerido por Radix, Framer Motion y Leaflet (estilos inline). Permite inyección de CSS si hubiera inyección de HTML, que ya está mitigada por React y `escapeHtml`. Aceptado.

### [TM-05] Rol del usuario en logs (mitigado por el fix)
- Severidad: LOW
- Confianza: HIGH
- Límite de confianza: TB-01
- Activo afectado: logs del backend
- Exposición: Internal
- Movimiento lateral: No
- Categoría STRIDE: Information Disclosure

Se elimina con el Paso 2.

## Governance Findings

- Secretos versionados (DT-01): el Paso 1 cumple la política "NUNCA hardcodear secrets" hacia adelante; TM-02 cubre el historial.
- `security.instructions.md` pide "Content Security Policy (CSP) headers": cumplido por el Paso 4 para la SPA (el backend ya los envía vía helmet).

## Security Inquiries

- **SI-01 (MEDIUM, TM-01):** ¿El servicio de Railway recibe tráfico solo por su dominio público (un único proxy)? Decisión vigente: 1 salto.
- **SI-02 (MEDIUM, TM-02):** confirmar la rotación de las contraseñas de los dos usuarios de `updatePasswords.js` en la base de producción.

## Mitigaciones incorporadas al fix-plan

1. T-01 verifica que dos clientes con IPs distintas tienen límites separados con `trust proxy` = 1.
2. Rotación de contraseñas documentada como acción de la usuaria (Paso 1).
3. T-M-01: verificación de la CSP en el preview de Vercel antes del merge.
