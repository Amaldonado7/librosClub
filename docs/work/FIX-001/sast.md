# SAST — FIX-001

## Metadata

- Architecture Type: Monolith (SPA React/Vite en Vercel + API Express/PostgreSQL en Railway)
- Exposure Context: Public (SPA y `/api/auth/*`)
- Governance Loaded: Yes (`security.instructions.md`; sin `AGENTS.md`)
- Analysis Scope: parcial — diff de `fix/FIX-001-hardening-seguridad` vs `main`: `librosclub-backend/src/app.js`, `middlewares/roleMiddleware.js`, `updatePasswords.js` (borrado), `src/__tests__/trustProxy.test.js`, `middlewares/__tests__/roleMiddleware.test.js`; `librosclub-frontend/vercel.json`, `vite.config.js`, `src/test/deploy-config.test.ts`; más auditoría de dependencias y del build (`dist/`).
- Mode: Audit

## Executive Summary

**PASSED — Secure-Ready.** El fix no introduce vulnerabilidades y elimina dos hallazgos previos (secreto versionado, log del rol). C:0 H:0 M:0 L:0 en el código del ticket.

## Passes

- **Pass A — Fuentes:** `X-Forwarded-For` (ahora usado para `req.ip` con 1 salto), `req.user.role` (del JWT verificado).
- **Pass B/C — Flujos y sinks:** `req.ip` solo alimenta el keyGenerator por defecto de `express-rate-limit`; no llega a SQL, logs ni respuestas. Sin hallazgos en este pass.
- **Pass D — Validación:** con `trust proxy` = 1, Express toma la dirección agregada por el último proxy; el cliente no controla `req.ip` mientras el servicio se exponga solo por el edge de Railway (TM-01, SI-01 del threat model). T-01 lo verifica.
- **Pass E — AuthN/AuthZ:** `roleMiddleware` conserva la misma decisión (403 sin usuario o con rol no permitido, `next()` con rol permitido); T-02. Sin hallazgos en este pass.
- **Pass F — Secretos:** `updatePasswords.js` eliminado (0 referencias); no quedan contraseñas literales en `librosclub-backend/src`. El historial de git las conserva (TM-02: rotación a cargo de la usuaria). Se elimina el log del rol (CWE-532).
- **Pass G — Supply chain:** sin dependencias nuevas. Backend `npm audit --omit=dev`: 0. Frontend `--omit=dev`: 3 (zod, react-router), los mismos FALSE POSITIVE de FEAT-001.
- **Configuración de deploy (`vercel.json`):** CSP sin `'unsafe-eval'` ni comodines en `script-src`/`connect-src`; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`; `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Verificado contra el build: sin fuentes locales (`font-src` solo Google), sin `eval(` en `dist/assets/*.js`, la única `url()` no-data del CSS es `#default#VML` de Leaflet (inofensiva). `'unsafe-inline'` en `style-src` y `img-src https:` aceptados (TM-03, TM-04).
- **`vite.config.js`:** `server.host: "localhost"` cierra la exposición del dev server a la red local (DT-07).

## Governance Findings

- Cumplido: "NUNCA hardcodear secrets" (DT-01) y "Content Security Policy (CSP) headers" (DT-05).

## Security Inquiries

- SI-01: número de saltos de proxy en Railway (decisión vigente: 1).
- SI-02: confirmación de la rotación de contraseñas de los usuarios de `updatePasswords.js`.
