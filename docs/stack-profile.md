# Stack Profile

| Campo | Valor |
|-------|-------|
| Lenguaje | TypeScript 5.8 (frontend), JavaScript CommonJS sobre Node 18+ (backend) |
| Framework | React 18 + Vite 5 + React Router 6 + TanStack Query 5 (frontend); Express 4 (backend) |
| UI | Tailwind CSS 3 + Shadcn UI (Radix) + Framer Motion |
| Test runner | Vitest 3.2.7 + Testing Library + jsdom (frontend: `npm test`, cobertura con `npm run test:coverage` vía @vitest/coverage-v8); `node --test` nativo (backend: `npm test`, tests en `src/**/__tests__/*.test.js`) |
| Linter | ESLint 9 (frontend, `npm run lint`); backend sin linter |
| ORM / DB | PostgreSQL vía `pg` (queries SQL directas, sin ORM) |
| CI/CD | N/A (no hay `.github/` ni pipeline configurado) |
| Estructura | Monorepo simple: `librosclub-frontend/` y `librosclub-backend/` independientes |

Detectado automáticamente el 2026-11-19. Actualizar si el stack cambia.
