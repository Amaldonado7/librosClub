# Deuda técnica — FEAT-001

Registrada en la entrada a CODE (`mdd:validate-arch` sobre el codebase) y en el cierre de CODE (SAST), 2026-11-19. Decisiones de la usuaria.

## Pendiente (aceptada)

| ID | Hallazgo | Ubicación | Severidad | Decisión |
|----|----------|-----------|-----------|----------|
| DT-01 | Contraseñas en texto plano para dos usuarios en un script de mantenimiento commiteado y publicado en el remoto | `librosclub-backend/src/updatePasswords.js:7-8` | FAIL (secrets hardcodeados) | Aceptada como deuda: fuera del alcance de FEAT-001. Resolver en un ticket de backend: eliminar el script o leer valores de entorno, y rotar las contraseñas de esos usuarios en toda base real (borrar el archivo no las quita del historial de git). |
| DT-02 | `console.log` del rol del usuario en cada request autorizada | `librosclub-backend/src/middlewares/roleMiddleware.js:6` | WARN | No bloqueante. Incluir en el mismo ticket de backend. |
| DT-04 | Backend detrás de proxy (Railway) sin `app.set('trust proxy', 1)`: el rate limit de login agrupa a todos los clientes en la IP del proxy (DoS de login con 10 requests) | `librosclub-backend/src/app.js` | MEDIUM (GF-02 de `sast.md`) | Ticket de hardening aparte; prerrequisito `proxy-addr` ≥ 2.0.8 ya cumplido. |
| DT-05 | Sin Content-Security-Policy | `librosclub-frontend/vercel.json` | MEDIUM (GF-01) | Ticket de hardening aparte. |
| DT-07 | El dev server de Vite escucha en todas las interfaces (`server.host: "::"`) y `vite` ≤ 6.4.3 tiene un advisory de path traversal del dev server (fix solo en major) | `librosclub-frontend/vite.config.js` | LOW (GF-05 de `sast.md`, solo desarrollo) | Ticket de mantenimiento: `host: "localhost"` y/o actualizar vite. No afecta producción. |
| DT-06 | Advisories del frontend con fix solo semver-major (zod 4, react-router 7, glob/minimatch/sucrase), no alcanzables en producción | `librosclub-frontend/package.json` | FALSE POSITIVE en esta app | No se actualizan en este ticket. Evaluar quitar `zod` (sin uso) y migrar a react-router 7 por separado. |

## Resuelto en este ticket

- Lógica de login/registro/upgrade movida de `routes/auth.js` a `controllers/authControllers.js` sin cambio de comportamiento, con 11 tests (`node --test`).
- DT-03 (`any` en `catch` y en `api.ts`): tipado sin `any`; `npm run lint` con 0 errores.
- CVEs de dependencias del backend: `npm audit fix` sin `--force` → 0 vulnerabilidades (incluye el DoS de body-parser, único true positive).
- `librosclub-backend/node_modules` deja de estar versionado (ya figuraba en `.gitignore`).
- Feed de Google Books vacío (`orderBy=newest` devolvía 0 resultados): corregido en `googleBooksService.js` (RF-23).
- AuthModal abría en el modo equivocado al reabrirse: corregido (RF-24).
- `@vitest/coverage-v8` y `vitest` en 3.2.7 (sin advisories en coverage-v8).
