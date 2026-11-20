# Verify Report — FIX-001

Fecha: 2026-11-20 · Branch: `fix/FIX-001-hardening-seguridad` (cambios en working tree) · Base: `main` · Node 20.19.5

## Resultado: PASSED

## 1. Suite completa (regresión global)

| Proyecto | Comando | Resultado |
|---|---|---|
| Backend | `node --test` (`npm test`) | 32/32 pass, 0 fail (27 previos + 5 nuevos) |
| Frontend | `npm run test:coverage` (Vitest) | 24 archivos, 165/165 pass (160 previos + 5 nuevos) |
| Frontend | `npm run lint` | 0 errores, 12 warnings preexistentes (react-refresh / exhaustive-deps) |
| Frontend | `npm run build` | OK |

## 2. Cobertura (código modificado)

| Archivo | Líneas | Ramas | Funciones |
|---|---|---|---|
| `librosclub-backend/src/middlewares/roleMiddleware.js` | 100% | 100% | 100% |
| `librosclub-backend/src/app.js` (línea agregada `trust proxy` cubierta por T-01) | 97.62% | 83.33% | 100% |
| `librosclub-frontend/vercel.json`, `vite.config.js` | configuración, verificada por contrato (T-03, T-04) | — | — |

Frontend global: 82.52% líneas, 87.98% ramas (sin cambios respecto de FEAT-001).

## 3. Pasos del fix-plan

| Paso | Estado | Evidencia |
|---|---|---|
| 1 — Borrar `updatePasswords.js` | ✅ | Archivo inexistente; 0 referencias en `librosclub-backend` (T-05). Rotación de contraseñas: pendiente de la usuaria (fuera del código). |
| 2 — Quitar log del rol | ✅ | `roleMiddleware.js` sin `console.log`; T-02 (3 tests). |
| 3 — `trust proxy` = 1 | ✅ | `app.js:20`; T-01 (2 tests: buckets separados por IP, 429 al 11.º intento de la misma IP). |
| 4 — Headers de seguridad en Vercel | ✅ | `vercel.json` con CSP y 4 headers; rewrite SPA conservado; T-03. |
| 5 — Vite dev en localhost | ✅ | `vite.config.js` `host: "localhost"`; T-04. |

## 4. Tests de regresión (F-VER-06)

| ID | Archivo | Rojo antes del fix | Verde después |
|---|---|---|---|
| T-01 | `librosclub-backend/src/__tests__/trustProxy.test.js` | ✅ (segundo cliente recibía 429) | ✅ |
| T-02 | `librosclub-backend/src/middlewares/__tests__/roleMiddleware.test.js` | ✅ (se llamaba `console.log`) | ✅ |
| T-03/T-04 | `librosclub-frontend/src/test/deploy-config.test.ts` | ✅ (4 de 5 fallaban; el del rewrite pasa antes y después) | ✅ |
| T-05 | verificación estática | ✅ | ✅ |

Sad paths (F-VER-04): T-02 cubre 403 sin usuario y con rol no permitido; T-01 cubre 429 por exceso de intentos y 401 con credenciales inválidas.

## 5. Pendiente de verificación manual de la usuaria

- **T-M-01:** abrir el preview de Vercel del PR y revisar la consola del navegador sin violaciones de CSP en `/` y `/app` (Feed con portadas, Buscar, Clubes, Cerca tuyo con mapa y geolocalización, login).
- Rotar las contraseñas de los dos usuarios de `updatePasswords.js` en la base de producción (TM-02 / SI-02).

## 6. Calidad

- Sin código muerto agregado; sin imports sin uso en los archivos tocados.
- `diff.patch` en `docs/work/FIX-001/diff.patch` (diff vs `main` + archivos de test nuevos).
