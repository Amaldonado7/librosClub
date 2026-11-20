# SPEC-FEAT-001: Rediseño visual según el canvas "Regalá un libro"

## Header

| Campo | Valor |
|---|---|
| Ticket | FEAT-001 |
| PRD | `docs/work/FEAT-001/prd.md` (aprobado, Loops PRD 1) |
| Tier | FEATURE (sin Figma) |
| Branch | `feat/FEAT-001-rediseno-visual` (base `mvp-3`) |
| Alcance de código | `librosclub-frontend/` + cambios de backend acotados y sin cambio de contrato (RF-23, RF-25..RF-28) en `librosclub-backend/` |
| Bloques | 5 (1–4 implementados en CODE; 5 pendiente) — un solo ticket, un solo PR (decisión de la usuaria) |
| Estado | Reentrada desde CODE (loop CODE→PLAN→DEFINE→PLAN) |
| Loops Spec | 4 |
| Fecha | 2026-11-19 |

## Resumen

Llevar todas las pantallas montadas del frontend al lenguaje visual del canvas "Regalá un libro" (Sorts Mill Goudy + IBM Plex Mono + Beth Ellen, superficie crema `#FFFBF2`, bordes 1.5px, botones rectos de 4px, chips de 999px, portadas tipo lomo, sello floral, stickers) **sin cambiar funcionalidad, datos, copy ni backend**. El lenguaje visual se centraliza en tokens (`src/index.css` + `tailwind.config.ts`), clases de componente en `@layer components` y componentes base reutilizables (`FloralSeal`, `Sticker`, `CoverArt`, `BookCoverCard`), para que FEAT-002 (`/regalo`) los consuma sin redefinirlos.

Implementación en 4 bloques, en el orden decidido por la usuaria; cada bloque deja `npm run lint` (0 errores) y `npm run build` (exit 0) en verde:

1. Base visual — fuentes, tokens, `ui/` usados, componentes de marca (`FloralSeal`, `Sticker`, `CoverArt`), `BookCoverCard`, skeletons, `EmptyState`, setup de Vitest.
2. Landing + `AuthModal`.
3. Dashboard — sidebar, header, navegación mobile y todas las tabs (Feed, Buscar, Libros disponibles, Clubes, Cerca tuyo, Gestionar libros).
4. Modales/paneles (`PremiumUpgradeModal`, `RequestChatModal`, `ClubDetailSheet`) + `NotFound` / `Login` (Could).

No hay cambios de schema, contratos de API ni endpoints. Única devDependency nueva: `@vitest/coverage-v8@3.2.4` (RF-30).

**Reentrada 2026-11-19 (Loops Spec 3, PRD Loops 1).** Durante CODE/VERIFY aparecieron dos bugs preexistentes de `mvp-3` que impiden ver el rediseño funcionando (Feed vacío porque Google Books devuelve `items: []` con `orderBy=newest` + `q=subject:`; `AuthModal` abre en el modo equivocado al reabrirse) y la usuaria sumó al ticket cambios sin cambio de comportamiento. El código ya implementado en CODE es el correcto y se conserva: los Bloques 1–4 no cambian de diseño; la tarea 4.5 documenta como **ya implementados** RF-25..RF-30 (refactor de auth con tests, `npm audit fix`, `node_modules` del backend fuera de git, tipado sin `any`, cobertura). El **Bloque 5 (pendiente)** cubre RF-22 (favicon), RF-23 (Feed de Google Books) y RF-24 (modo de `AuthModal`). RNF-10 (smoke de las 40 rutas) es una verificación de VERIFY, no código de producción.

## Referencia visual

Maquetas aprobadas (HTML con estilos inline, usadas solo como datos de referencia): App-Landing (1440px), App-Feed (1440px), App-Feed-Mobile (390px). Valores extraídos:

| Elemento | Valor de la maqueta |
|---|---|
| Fuentes | `Sorts Mill Goudy` ital 0/1 (peso 400); `IBM Plex Mono` 400/500/600; `Beth Ellen` 400 |
| Etiqueta mono | 12–14px, `letter-spacing` 0.06–0.16em, `text-transform: uppercase` |
| Botón | alto 52–56px (CTA) / 44px (sidebar), padding-x 28px, `border-radius: 4px`, borde 1.5px en outline |
| Chip de género | `min-height: 44px`, padding-x 18px (16px mobile), radio 999px; activo: fondo y borde `#5E5827`, texto `#F7F0E2`; inactivo: fondo `#FFFBF2`, borde `#CFC3A6`, texto `#492710` |
| Tarjeta | fondo `#FFFBF2`, borde 1.5px `#E2D6BA`, radio 8px, padding 28px (features) |
| Portada lomo | `aspect-ratio: 2/3`, `border-radius: 3px 8px 8px 3px`, `box-shadow: inset 7px 0 0 rgba(0,0,0,0.18)` (6px en mobile); badge año: fondo `#F2D661`, texto `#492710`, mono 11px 600, padding 3px 9px, radio 999px |
| Fallback de portada | paleta `[{bg:#5E5827,fg:#F7F0E2},{bg:#91551F,fg:#F7F0E2},{bg:#492710,fg:#F7F0E2},{bg:#E6DCC6,fg:#492710},{bg:#3F3B1A,fg:#F2D661}]`, padding `18px 14px 14px 22px`, título Goudy 20px |
| Grilla de portadas | `repeat(auto-fill, minmax(min(180px,100%),1fr))`, gap `32px 22px`; mobile 2 columnas, gap `24px 16px` |
| Debajo de portada | título Goudy 19px `#5E5827`; autor Goudy itálica 16px; "Ver más →" mono 12px uppercase `#91551F` |
| Sidebar | fondo `#492710`, padding `24px 16px`, ítem 44px alto, radio 6px, activo fondo `#5E5827` con ícono `#F2D661`, inactivo texto `#EADFC8`; caja de usuario fondo `#5A3418`, radio 8px, padding 16px; "Activar Premium" fondo `#F2D661` texto `#492710` alto 44px |
| Header desktop | padding `20px 40px`, borde inferior 1.5px `#E2D6BA`; botón menú 44×44 redondo con borde 1.5px `#5E5827`; título Goudy 30px `#5E5827`; descripción mono 12px uppercase tracking 0.1em `#6B4A2A` |
| Header mobile | fondo `#492710`, padding `14px 16px` (el `44px` superior de la maqueta es el notch del mock y no se replica), botón menú 44×44 redondo borde `#EADFC8`, sello 24px + "LIBROSCLUB" mono 13px 600 tracking 0.16em |
| Main | padding 40px desktop / 20px mobile, gap 28px; título de sección Goudy 42px (36px mobile) `#5E5827`; acento Beth Ellen 18px (16px mobile) `#91551F` |
| Landing hero | fondo `#5E5827`, texto `#F7F0E2`, max-width 1200px, padding `28px 24px 104px`; h1 `clamp(52px, 7vw, 92px)` line-height 0.98; párrafo 21px; acento Beth Ellen 24px `#F2D661`; sello grande 400px; stickers rotados -8° (sunlight) y 6° (terracotta) |
| Landing secciones | padding 104px 24px; h2 52px; features en `repeat(auto-fit, minmax(min(320px,100%),1fr))` gap 20px, ícono en círculo 52px `#5E5827` con trazo `#F2D661`; planes sobre `#492710`, tarjeta Gratis `#F7F0E2`, tarjeta Premium `#5E5827` con sticker "Premium" rotado 4° |
| Footer | fondo `#5E5827`, padding 28px 24px, mono 14px 600 tracking 0.16em + mono 12px |

## Decisiones de diseño

- **D-01 — Sin copy nuevo salvo stickers y acentos Beth Ellen (RF-09, AC-09).** De la maqueta App-Landing se omiten los links de navegación "Funciones" / "Planes" / "Iniciar sesión" del nav superior y el eyebrow "Funciones" (serían copy y navegación nuevos). Los numerales `01`–`06` de las tarjetas de features se derivan del índice (`String(i + 1).padStart(2, '0')`), son `aria-hidden` y no son strings de copy. Strings nuevos permitidos (y únicos): stickers "Olor a libro nuevo", "Compro, apilo, algún día leo"; acentos Beth Ellen "hola libro nuevo" (hero), "para cada lector" (planes), "olor a libro nuevo" (Feed). El sticker "Premium" de la tarjeta de plan reemplaza al badge "Premium" existente (mismo texto).
- **D-02 — El botón "Mi cuenta" del header mobile de la maqueta no se implementa** (sería funcionalidad nueva; fuera de alcance). El header mobile conserva el botón de menú que abre la sidebar como drawer (comportamiento actual).
- **D-03 — Ítems de la sidebar en IBM Plex Mono mayúscula** (la maqueta usa Goudy 18px; manda RF-11/RF-02 del PRD).
- **D-04 — Borde de controles interactivos (RNF-01, 3:1).** `#CFC3A6` sobre `#FFFBF2` da 1.69:1, no cumple el 3:1 de RNF-01 para bordes de controles. Se agrega el token `--border-control` = `#8C7B5A` (3.99:1 sobre `#FFFBF2`, 3.63:1 sobre `#F7F0E2`) para inputs, textareas, chips inactivos y botones outline sobre fondo claro. `#E2D6BA` / `#CFC3A6` quedan para bordes de tarjetas, separadores y divisores (no interactivos). Desvío consciente de la maqueta, exigido por el PRD.
- **D-05 — Texto atenuado.** `--muted-foreground` actual (`24 30% 45%`, ≈3.9:1 sobre crema) no cumple RNF-01. Pasa a `#6B4A2A` (`29.5 43.6% 29.2%`, 7.02:1 sobre `#F7F0E2`), el mismo tono que usa la maqueta para texto secundario. `--destructive` pasa de `0 65% 50%` (4.47:1 con texto crema) a `0 65.1% 44.9%` (`#BD2828`, 5.29:1).
- **D-06 — Foco.** Anillo `focus-visible` de 2px con `ring-offset` 2px: color forest (`--ring`, 6.38:1 sobre crema) en superficies claras; sunlight (`--sidebar-ring`, 9.21:1 sobre wood-dark, 5.02:1 sobre forest) en sidebar, header mobile, hero y secciones oscuras de la Landing. Forest sobre wood-dark da 1.84:1, por eso no se usa ahí.
- **D-07 — Fuentes por `<link>` en `index.html`** (no `@import` en CSS) con `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com` (crossorigin). URL única: `https://fonts.googleapis.com/css2?family=Beth+Ellen&family=IBM+Plex+Mono:wght@400;500;600&family=Sorts+Mill+Goudy:ital@0;1&display=swap` → 6 combinaciones familia/peso/estilo (Goudy 400 normal + itálica, Plex Mono 400/500/600, Beth Ellen 400) ≤ 8 (RNF-07). No se cargan pesos bold de Goudy (no existen): títulos se jerarquizan por tamaño.
- **D-08 — Radios.** `--radius` pasa de `0.75rem` a `0.5rem` (8px; `rounded-lg` = 8px para tarjetas/modales, `rounded-md` = 6px para ítems de sidebar). Se agregan `borderRadius.btn = 4px`, `borderRadius.spine = 3px 8px 8px 3px`, `borderRadius.pill = 999px`.
- **D-09 — Movimiento reducido.** `<MotionConfig reducedMotion="user">` envolviendo la app en `App.jsx` (desactiva transform/opacity de todas las animaciones Framer Motion cuando el SO pide reducir movimiento) + bloque CSS `@media (prefers-reduced-motion: reduce)` que fuerza `animation-duration` y `transition-duration` a `0.01ms` y desactiva `.shimmer`.
- **D-10 — Premium sin `amber-*`.** Toda referencia a la escala `amber-*` de Tailwind (fuera de paleta) se reemplaza por sunlight (fondo, con texto wood-dark) o terracotta.
- **D-11 — `ui/` re-estilados:** solo los que la app montada usa: `button`, `input`, `textarea`, `label`, `card` (solo `Login.tsx`), `dialog`, `sheet`, `toast`. `badge` no lo importa ningún componente de la app (verificado por grep) → no se toca (PRD: "Rediseño de los componentes Shadcn de `src/components/ui/` que la app no usa" está fuera de alcance); los chips/pastillas se resuelven con las clases `.pill*` / `.chip*`. `sonner` está montado pero ningún componente dispara toasts de sonner → no se toca. `separator` y `tooltip` heredan tokens sin cambios de código.
- **D-13 — Favicon = dibujo `mark` de `FloralSeal` como SVG estático** (RF-22, RNF-11). Mismo `viewBox 0 0 200 200` y geometría que `MARK_PETALS` de `src/components/brand/FloralSeal.tsx` (anillo `r=46` trazo 22, 8 pétalos `r=26`, centro hueco `r=34` en color de fondo), sobre `rect` de 200×200 `#5E5827` con `rx=40`. Sin margen extra para maximizar tamaño a 16px (cada pétalo ≈ 2px de radio a 16px; a 32px ≈ 4px). Contraste flor/fondo `#F2D661`/`#5E5827` = 5.02:1 (≥ 3:1). SVG sin `<script>`, sin referencias externas, sin `<foreignObject>` ni `<text>` (no depende de fuentes).
- **D-14 — Feed de Google Books sin `orderBy`** (RF-23). Se elimina solo `url.searchParams.set('orderBy', 'newest')` en `getGoogleFeed`; se conservan `q=subject:<topic>`, `maxResults`, `startIndex`, `printType`, `projection`, `langRestrict`, `fields`, `key` y el `.sort(comparePublishedDesc)` en memoria (orden por `publishedDate` descendente, nulls al final). El controller y su caché no cambian; tras desplegar, la caché en memoria (`GOOGLE_BOOKS_CACHE_TTL_MS`) puede servir respuestas vacías previas hasta reiniciar el proceso (nodemon/Railway reinician al desplegar).
- **D-15 — `AuthModal` re-sincroniza el modo en cada apertura** (RF-24). `useEffect(() => { if (open) { setMode(defaultMode); setUsername(''); setPassword(''); } }, [open, defaultMode])`. Dentro del efecto se usan solo los setters de `useState` (estables, no requieren estar en las deps), **no** `reset()`: es una función recreada en cada render y obligaría a agregarla a las deps (warning nuevo de `react-hooks/exhaustive-deps`) o a envolverla en `useCallback`. `AuthModal` no tiene estado de error propio (los errores van por `toast`), así que no hay otro setter que limpiar. Se dispara en la transición cerrado→abierto (y si `defaultMode` cambia con el modal abierto, lo que hoy no ocurre en ningún caller). Se conserva el `useState(defaultMode)` inicial. Sin cambios de copy, validación, handlers ni llamadas a `authAPI`.
- **D-16 — Smoke de 40 rutas como verificación de VERIFY** (RNF-10). Script de verificación fuera del código de producción en `docs/work/FEAT-001/smoke/`, solo contra `http://localhost:3000` y PostgreSQL local; nunca contra producción (ver "Verificación final").
- **D-12 — Higiene de URLs y HTML (mitigaciones del threat model).** `BookCoverCard` solo renderiza el link "Ver más →" si la URL externa es `http:`/`https:` (`safeExternalUrl`), conservando `target="_blank"` + `rel="noopener noreferrer"`. Los popups de Leaflet en `CercaTuyoTab` (que hoy interpolan `club.nombre`, `club.ubicacion` y `club.currentBookTitle` en HTML sin escapar) se re-estilan usando `escapeHtml` sobre todo valor dinámico. Ninguno cambia el comportamiento para datos legítimos. Ver `docs/work/FEAT-001/threat.md`.

## Tokens (Bloque 1)

`src/index.css` `:root` — se conservan sin cambios `--forest` `53 41% 26%`, `--terracotta` `28 65% 35%`, `--wood-dark` `24 64% 17%`, `--sunlight` `48 85% 67%`, `--warm-cream` `40 57% 93%` (RF-03, AC-03). Nuevos / modificados (HSL con decimales para resolver exactamente al hex):

| Token CSS | Hex | HSL | Clase Tailwind | Uso |
|---|---|---|---|---|
| `--surface` (nuevo) | `#FFFBF2` | `41.5 100% 97.5%` | `bg-surface` | tarjetas, modales, inputs, chips inactivos |
| `--line` (nuevo) | `#E2D6BA` | `42 40.8% 80.8%` | `border-line` | borde de tarjetas, header, separadores |
| `--line-strong` (nuevo) | `#CFC3A6` | `42.4 29.9% 73.1%` | `border-line-strong` | borde de tarjetas destacadas, divisores de listas |
| `--border-control` (nuevo, D-04) | `#8C7B5A` | `39.6 21.7% 45.1%` | `border-control` | inputs, chips inactivos, outline |
| `--ink-muted` (nuevo) | `#6B4A2A` | `29.5 43.6% 29.2%` | `text-ink-muted` | texto secundario |
| `--wood-mid` (nuevo) | `#5A3418` | `25.5 57.9% 22.4%` | `bg-wood-mid` | caja de usuario en sidebar |
| `--sidebar-muted` (nuevo) | `#EADFC8` | `40.6 44.7% 85.1%` | `text-sidebar-muted` | ítems inactivos sidebar / header mobile |
| `--card` (mod.) | `#FFFBF2` | `41.5 100% 97.5%` | `bg-card` | alias de surface para `ui/` |
| `--popover` (mod.) | `#FFFBF2` | `41.5 100% 97.5%` | — | — |
| `--border`, `--input` (mod.) | `#E2D6BA` / `#8C7B5A` | ver arriba | `border-border` / `border-input` | `--input` = control |
| `--muted-foreground` (mod., D-05) | `#6B4A2A` | `29.5 43.6% 29.2%` | — | — |
| `--destructive` (mod., D-05) | `#BD2828` | `0 65.1% 44.9%` | — | — |
| `--radius` (mod., D-08) | — | `0.5rem` | — | — |
| `--sidebar-accent` (mod.) | `#5E5827` | = forest | — | ítem activo sidebar (RF-11) |
| `--sidebar-foreground` (mod.) | `#EADFC8` | = sidebar-muted | — | — |

`tailwind.config.ts` `fontFamily`: `sans` y `serif` → `['"Sorts Mill Goudy"', 'Georgia', 'serif']`; `mono` → `['"IBM Plex Mono"', 'ui-monospace', 'monospace']`; `handwriting` → `['"Beth Ellen"', 'cursive']`. Colores nuevos mapeados como `hsl(var(--token))`. `borderRadius`: `btn: '4px'`, `spine: '3px 8px 8px 3px'`, `pill: '999px'`. (La sombra del lomo no se expone como utilidad Tailwind: vive solo en `.cover-spine::after`.)

Clases de componente en `@layer components` (`src/index.css`):

| Clase | Definición |
|---|---|
| `.label-mono` | `font-mono uppercase tracking-[0.08em] text-xs font-medium` |
| `.card-surface` | `bg-surface border-[1.5px] border-line rounded-lg` |
| `.pill` | `inline-flex items-center rounded-pill font-mono uppercase tracking-[0.06em] text-[11px] font-semibold px-[9px] py-[3px]` |
| `.pill-sun` / `.pill-forest` / `.pill-terracotta` / `.pill-outline` | fondo sunlight + texto wood-dark / forest + crema / terracotta + crema / transparente + borde 1.5px currentColor |
| `.chip` | `inline-flex items-center min-h-11 px-[18px] rounded-pill border-[1.5px] font-mono uppercase tracking-[0.08em] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| `.chip-off` / `.chip-on` | `bg-surface border-control text-wood-dark hover:border-forest` / `bg-forest border-forest text-warm-cream` |
| `.cover-spine` | **Única fuente del marco lomo.** `position: relative; overflow: hidden; border-radius: 3px 8px 8px 3px` (`rounded-spine`) + `::after` `content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; box-shadow: inset 7px 0 0 rgba(0,0,0,0.18)` (`inset 6px` en < 768px vía media query). La sombra va en el overlay `::after` porque una sombra `inset` del contenedor queda tapada por el `<img>` hijo. No fija tamaño: `aspect-[2/3]` / `w-10 h-14` los pone `CoverArt` según `size`. Nadie más reimplementa la sombra (no se usan utilidades `shadow-spine` sueltas). |
| `.cover-grid` | **Única fuente de la grilla de portadas.** `display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 24px 16px` en < 640px; desde 640px `grid-template-columns: repeat(auto-fill, minmax(min(180px,100%), 1fr)); gap: 32px 22px`. La consumen `BooksGridSkeleton`, Feed, Buscar y `LibrosDisponiblesTab`. |
| `.accent-hand` | `font-handwriting` (solo textos de ≤ 4 palabras, RF-02) |

Base (`@layer base`): `body` → `font-sans` (Goudy) `text-base` (16px mínimo en ≤ 768px); `h1`–`h6` → `font-serif font-normal` (se elimina la regla `font-family: 'Space Mono'`); `button`, `[role="tab"]`, `nav a` sin forzar mono globalmente (se aplica por componente con `buttonVariants`, `.chip`, `.label-mono` para no afectar textos de usuario).

## Estrategia de RNFs

| RNF | Estrategia técnica |
|---|---|
| RNF-01 Contraste | Pares de color restringidos a los verificados (ratios WCAG calculados): wood-dark/crema 11.71, forest/crema 6.38, terracotta/crema 5.26, `#6B4A2A`/crema 7.02, crema/forest 6.38, crema/terracotta 5.26, `#EADFC8`/wood-dark 10.05, `#EADFC8`/`#5A3418` 8.19, wood-dark/sunlight 9.21, sunlight/`#3F3B1A` 7.87, wood-dark/`#E6DCC6` 9.75, crema/`#BD2828` 5.29. Sunlight nunca como color de texto sobre fondo claro (1.27:1); solo como fondo con texto wood-dark, o como texto sobre forest/wood-dark/`#3F3B1A`. Bordes de controles con `--border-control` (D-04). Texto secundario con `--muted-foreground` = `#6B4A2A` (D-05). Se eliminan opacidades de texto que bajan de 4.5:1 (ej. `text-sidebar-foreground/40`, `text-muted-foreground/50` en texto). Verificación: T-M-04 (axe/Lighthouse). |
| RNF-02 Targets 44×44 | `buttonVariants` con alturas `h-11` (default, icon `h-11 w-11`), `sm` = `h-11 md:h-9`, `lg` = `h-14`; `.chip` `min-h-11`; botones solo-ícono ad-hoc (`p-1.5` en Dashboard admin, ClubesTab, ClubDetailSheet, RequestChatModal) pasan a `inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center`; cierre de `Dialog`/`Sheet` 44×44; inputs `h-11`. Verificación: T-M-05. |
| RNF-03 Foco visible | `focus-visible:ring-2 ring-offset-2` en `buttonVariants`, `input`, `textarea`, `.chip`, ítems de sidebar, cierres de dialog/sheet y todo `<button>`/`<a>` ad-hoc re-estilado; color por superficie según D-06; `ring-offset-color` igual al fondo de la superficie (`ring-offset-surface`, `ring-offset-wood-dark`, `ring-offset-forest`). Verificación: T-M-06. |
| RNF-04 Etiquetas accesibles | `aria-label` en todo botón solo-ícono (lista cerrada en Bloque 3/4); `FloralSeal` y `Sticker` decorativos con `aria-hidden="true"` por defecto; íconos lucide decorativos `aria-hidden`; chips de género con `aria-pressed`; ítem activo de la sidebar con `aria-current="page"`. Verificación: T-U-03, T-U-04, T-M-06. |
| RNF-05 Responsive | Grillas con `minmax(min(Npx,100%),1fr)` (portadas: `.cover-grid`), `min-w-0` en contenedores flex, chips de Feed con scroll horizontal en < 768px (`overflow-x-auto`, `flex-nowrap`) y `flex-wrap` en ≥ 768px; títulos con `clamp()`; stickers del hero posicionados dentro del contenedor del sello (`overflow-hidden` en la sección). Verificación: T-M-05 en 390/768/1024/1440. |
| RNF-06 No regresión | Cambios limitados a `className`, estructura de presentación y atributos ARIA; ninguna firma de props, handler, llamada a API, estado ni condición de render cambia (excepción declarada: fallback `onError` de `BookCoverCard` y escape de popups, que no alteran el flujo). Checklist manual de los 11 flujos contra `mvp-3`: T-M-07. |
| RNF-07 Fuentes | D-07: `<link rel="preconnect">` ×2 + `<link rel="stylesheet">` con `display=swap`; 6 archivos de fuente; sin Lora/Space Mono en todo `src/` e `index.html`. Verificación: T-U-01 (estático) + T-M-01 (red). |
| RNF-08 Build | Cada bloque cierra con `npm run lint` (0 errores), `npm run build` (exit 0) y `npm test` en `librosclub-frontend/`; desde 4.5 también `npm test` (`node --test`) en `librosclub-backend/` con 11/11 + los tests del Bloque 5. Tipado sin `any` (RF-29) mantiene lint en 0. Verificación: T-M-02, T-B-01. |
| RNF-10 Smoke de backend | Script de verificación `docs/work/FEAT-001/smoke/smoke-routes.mjs` (Node 18+ `fetch`, sin dependencias) ejecutado en VERIFY contra el backend local; tabla de 40 rutas con código esperado por rol; datos de prueba con prefijo `smoke_feat001_` creados y borrados por el propio smoke + teardown SQL con conteo final 0; logins dentro del presupuesto del `loginLimiter` (≤ 10 por IP / 15 min) reutilizando tokens. Detalle en "Verificación final — Smoke de 40 rutas". Verificación: T-M-11. |
| RNF-11 Favicon | D-13: geometría `mark` sin margen, contraste 5.02:1, sin texto. Verificación: T-U-14 (estructura del SVG) + T-M-10 (rasterizado 16/32 px). |
| RNF-09 Movimiento | D-09: `MotionConfig reducedMotion="user"` + media query CSS. Stickers no tienen animación (rotación estática). Verificación: T-U-05 (CSS presente) + T-M-08. |

## Bloques

### Bloque 1 — Base visual: fuentes, tokens, componentes base

**RFs:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-18, RF-20 (toast), RF-21 (sin cambios de paginación, solo presentación). **RNFs:** RNF-01, RNF-03, RNF-04, RNF-07, RNF-08, RNF-09.

**Archivos:**

- Modificar: `librosclub-frontend/index.html`, `librosclub-frontend/src/index.css`, `librosclub-frontend/tailwind.config.ts`, `librosclub-frontend/src/App.jsx`, `librosclub-frontend/vite.config.js`
- Modificar (`ui/`): `librosclub-frontend/src/components/ui/button.tsx`, `librosclub-frontend/src/components/ui/input.tsx`, `librosclub-frontend/src/components/ui/textarea.tsx`, `librosclub-frontend/src/components/ui/label.tsx`, `librosclub-frontend/src/components/ui/card.tsx`, `librosclub-frontend/src/components/ui/dialog.tsx`, `librosclub-frontend/src/components/ui/sheet.tsx`, `librosclub-frontend/src/components/ui/toast.tsx`
- Modificar (base): `librosclub-frontend/src/components/BookCoverCard.tsx`, `librosclub-frontend/src/components/BookCardSkeleton.tsx`, `librosclub-frontend/src/components/EmptyState.tsx`
- Crear: `librosclub-frontend/src/components/brand/FloralSeal.tsx`, `librosclub-frontend/src/components/brand/Sticker.tsx`, `librosclub-frontend/src/components/brand/CoverArt.tsx`, `librosclub-frontend/src/lib/safe-url.ts`, `librosclub-frontend/src/lib/cover-palette.ts`, `librosclub-frontend/src/test/setup.ts`
- Crear (tests): `librosclub-frontend/src/components/__tests__/BookCoverCard.test.tsx`, `librosclub-frontend/src/components/brand/__tests__/CoverArt.test.tsx`, `librosclub-frontend/src/components/brand/__tests__/FloralSeal.test.tsx`, `librosclub-frontend/src/components/brand/__tests__/Sticker.test.tsx`, `librosclub-frontend/src/lib/__tests__/safe-url.test.ts`, `librosclub-frontend/src/test/design-contract.test.ts`

`BookCard.tsx` no se modifica: delega en `BookCoverCard` sin cambio de firma (y hoy no tiene callers).

**Tareas:**

1.1 Fuentes (RF-01, RNF-07)
- [ ] `index.html`: agregar `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` y el `<link rel="stylesheet">` de D-07 en `<head>`.
- [ ] `src/index.css`: eliminar la línea `@import url(...Lora...Space+Mono...)`.
- [ ] Ningún archivo en `src/` ni `index.html` contiene `Lora` ni `Space Mono` (incluido el `style={{ fontFamily: 'Lora, serif' }}` de `LandingPage.tsx`, que se elimina en el Bloque 2; T-U-01 lo verifica a partir del Bloque 2 — en el Bloque 1 el test excluye ese archivo con un `TODO(FEAT-001 B2)` que el Bloque 2 remueve). El propio `design-contract.test.ts` (y todo `*.test.*` / `src/test/**`) queda excluido del barrido, y además arma los literales buscados sin escribirlos textualmente (`['Lo','ra'].join('')`, `['Space',' Mono'].join('')`) para no autodetectarse.

1.2 Tokens y Tailwind (RF-02, RF-03, RF-05)
- [ ] `src/index.css` `:root` con los tokens nuevos/modificados de la tabla "Tokens"; los 5 tokens de marca conservan su valor exacto.
- [ ] `tailwind.config.ts`: `fontFamily`, colores nuevos y `borderRadius` (`btn`, `spine`, `pill`) según la sección "Tokens".
- [ ] `@layer base`: `h1`–`h6` en `font-serif font-normal`; se elimina la regla Space Mono.
- [ ] `@layer components`: `.label-mono`, `.card-surface`, `.pill*`, `.chip*`, `.cover-spine` (con overlay `::after`), `.cover-grid`, `.accent-hand`; `.shimmer` pasa a usar `--line` / `--surface` y queda desactivado bajo `prefers-reduced-motion`.
- [ ] Bloque `@media (prefers-reduced-motion: reduce)` (D-09).
- [ ] `.dark` no se modifica (fuera de alcance).

1.3 Movimiento reducido (RNF-09)
- [ ] `src/App.jsx`: envolver `<AppContent />` con `<MotionConfig reducedMotion="user">` (import de `framer-motion`); no cambia providers ni rutas.

1.4 `ui/` usados (RF-04, RF-05, RF-18, RF-20, RNF-02, RNF-03)
- [ ] `button.tsx` — base: `rounded-btn font-mono uppercase tracking-[0.08em] text-[13px] font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. Variantes: `default` (forest/crema), `destructive`, `outline` (`border-[1.5px] border-forest text-forest bg-transparent hover:bg-forest hover:text-warm-cream`), `secondary`, `ghost`, `link`, nuevas `accent` (terracotta/crema) y `sun` (sunlight/wood-dark). Se eliminan `hero`, `hero-outline`, `warm` (sin usos — verificado por grep — y referencian clases inexistentes `terracotta-dark`/`forest-light`). Tamaños: `default` `h-11 px-5`, `sm` `h-11 md:h-9 px-3`, `lg` `h-14 px-7 text-sm`, `icon` `h-11 w-11`. La firma `ButtonProps` y el export `buttonVariants` no cambian (lo consumen `ui/pagination`, `calendar`, `alert-dialog`).
- [ ] `input.tsx` / `textarea.tsx` — `bg-surface border-[1.5px] border-input rounded-btn h-11` (textarea `min-h-[88px]`), `text-base` (16px, evita zoom iOS), `placeholder:text-ink-muted`, foco forest.
- [ ] `label.tsx` — `font-mono uppercase tracking-[0.08em] text-xs text-ink-muted`.
- [ ] `card.tsx` — `Card` = `card-surface`; `CardTitle` `font-serif font-normal text-2xl text-forest`.
- [ ] `dialog.tsx` / `sheet.tsx` — contenido `bg-surface border-[1.5px] border-line` (`rounded-lg` en dialog), overlay `bg-wood-dark/60`; botón de cierre `inline-flex h-11 w-11 items-center justify-center rounded-pill` con foco visible; `DialogTitle`/`SheetTitle` `font-serif font-normal text-2xl text-forest`. Se conserva el texto sr-only existente del cierre (sin cambio de copy).
- [ ] `toast.tsx` — `default`: `bg-surface border-[1.5px] border-line text-wood-dark rounded-lg`; `destructive`: `bg-destructive text-destructive-foreground border-destructive`; `ToastTitle` `label-mono`; `ToastDescription` Goudy 15px; `ToastClose` con foco visible y 44×44. Disparadores, textos y `variant` de los toasts existentes no cambian (RF-20).

1.5 Componentes de marca (RF-07, RF-08, RNF-04)
- [ ] `brand/FloralSeal.tsx` — `export type FloralSealVariant = 'mark' | 'emblem'`; props `{ variant?: FloralSealVariant; size?: number; petalColor?: string; centerColor?: string; label?: string; className?: string }`. `mark` (default): anillo + 8 pétalos + centro (geometría `viewBox 0 0 200 200` de la maqueta: anillo `r=46` stroke 22, pétalos `r=26` en los 8 puntos, centro `r=34`). `emblem`: sello grande de la Landing (9 círculos crema, textos en arco "LIBROS"/"CLUB" vía `<textPath>`, chevron y dos puntos). Ids de `<path>` para `textPath` generados con `useId()` saneado (`replace(/:/g, '')`) para que múltiples instancias no colisionen. Sin `label` → `aria-hidden="true"` y `focusable="false"`; con `label` → `role="img"` + `aria-label={label}`. Colores por defecto: pétalos sunlight, centro igual al fondo donde se monta (lo pasa el caller).
- [ ] `brand/Sticker.tsx` — props `{ children: React.ReactNode; tone?: 'sun' | 'terracotta'; rotate?: number; decorative?: boolean; className?: string }`. Renderiza `<span>` con `.pill` a escala sticker (`text-[13px] px-[18px] py-[9px] tracking-[0.06em]`) y `style={{ transform: \`rotate(${clamp(rotate,-8,8)}deg)\` }}`; `rotate` default `-6`, se clampa a [-8, 8]. `decorative` default `true` → `aria-hidden="true"`. `tone` `sun` = sunlight/wood-dark, `terracotta` = terracotta/crema.
- [ ] Ambos componentes exportan `default` y no usan `dangerouslySetInnerHTML`.

1.6 Utilidades
- [ ] `lib/safe-url.ts` — `export function safeExternalUrl(raw: string | null | undefined): string | null`: devuelve la URL normalizada (`new URL(raw).href`) solo si `protocol` es `http:` o `https:`; `null` en cualquier otro caso (vacío, relativo, `javascript:`, `data:`, `vbscript:`, URL inválida que hace throw en `new URL`).
- [ ] `lib/cover-palette.ts` — `export const COVER_PALETTE` (los 5 pares bg/fg de la maqueta) y `export function coverPaletteFor(seed: string): { bg: string; fg: string }` determinística (suma de char codes `% 5`); seed vacío → índice 0.

1.6b `CoverArt` — portada base reutilizable (RF-06, RF-18, RF-20)
- [ ] `brand/CoverArt.tsx` — `export type CoverArtSize = 'card' | 'thumb'`; props `{ src?: string | null; title: string; subtitle?: string; size?: CoverArtSize; className?: string; children?: React.ReactNode }` (`children` = overlays, ej. el badge de `BookCoverCard`). Es el **único** lugar con la lógica imagen + `onError` + fallback de paleta.
- [ ] Contenedor `.cover-spine` + tamaño por `size`: `card` (default) → `w-full aspect-[2/3]`; `thumb` → `w-10 h-14 shrink-0` (40×56).
- [ ] Estado `imgFailed` (`useState(false)`), reseteado con `useEffect` al cambiar `src`; se muestra `<img src alt={title} loading="lazy" className="h-full w-full object-cover">` si `src && !imgFailed`; `onError={() => setImgFailed(true)}`.
- [ ] Fallback con `coverPaletteFor(title)` (bg/fg inline). `card`: padding `18px 14px 14px 22px`, título Goudy 20px (`line-clamp-4`) y `subtitle` Goudy itálica 14px (`line-clamp-2`) — pares ≥ 7.87:1. `thumb`: solo el bloque de color con la inicial del título (Goudy 18px, `aria-hidden`), y el contenedor lleva `role="img"` + `aria-label={title}` para conservar el nombre accesible que daba el `alt`.
- [ ] `children` se renderizan dentro del contenedor (por encima de imagen/fallback; el `::after` del lomo queda por encima de todo con `pointer-events: none`).

1.7 `BookCoverCard` (RF-05, RF-06, RF-21)
- [ ] Firma `BookCoverCardProps` sin cambios (`title, subtitle, badge, badgeVariant, thumbnail, link, index`).
- [ ] La portada se renderiza con `<CoverArt src={thumbnail} title={title} subtitle={subtitle} size="card">` — `BookCoverCard` no reimplementa imagen, `onError`, fallback ni sombra de lomo (desaparecen el ícono `BookOpen` y el gradiente actual).
- [ ] Badge como `children` de `CoverArt`: `badgeVariant='accent'` → `.pill pill-sun`; `'primary'` → `.pill pill-forest`; posición `absolute top-3 left-[22px] z-10`.
- [ ] Debajo: título Goudy 19px forest (`line-clamp-2`), autor Goudy itálica 16px (`line-clamp-1`), "Ver más →" mono 12px uppercase terracotta con `min-h-11 md:min-h-8 inline-flex items-center`, renderizado solo si `safeExternalUrl(link)` no es `null`; `href` = valor saneado, `target="_blank"`, `rel="noopener noreferrer"`.
- [ ] Contenedor sin borde/tarjeta (la maqueta no enmarca la portada); hover: `-translate-y-0.5` (desactivado por D-09). `motion.div` de entrada se conserva.
- [ ] `alt` de la imagen = `title` (sin cambio; lo pone `CoverArt`).

1.8 Skeletons y `EmptyState` (RF-18)
- [ ] `BookCardSkeleton` — portada `div.cover-spine.shimmer.aspect-[2/3]` (2:3, lomo) + dos barras `rounded-btn shimmer`; sin tarjeta con borde. `BooksGridSkeleton` usa `.cover-grid`. `count` default 10 sin cambio. La grilla del skeleton queda `aria-hidden="true"` (estado decorativo; no se agrega copy de "Cargando", igual que hoy).
- [ ] `EmptyState` — props sin cambio; ícono en círculo `bg-forest` 64px con color sunlight (el `icon` recibido se envuelve en un `span` que fuerza `text-sunlight [&_svg]:text-sunlight`), título `font-serif text-[27px] text-forest font-normal`, descripción Goudy 18px `text-ink-muted`; textos por defecto sin cambio.

1.9 Vitest (habilitador del gate de tests)
- [ ] `vite.config.js`: cambiar el import a `import { defineConfig } from "vitest/config";` (re-exporta el `defineConfig` de Vite con el tipo de `test`; mantiene la forma función `({ mode }) => ({...})`, plugins, alias y server actuales) y agregar `test: { environment: 'jsdom', globals: false, setupFiles: ['./src/test/setup.ts'], css: false, include: ['src/**/*.test.{ts,tsx}'] }`. No se crea `vitest.config.*`.
- [ ] **Sin globals:** todo archivo de test importa explícitamente desde `'vitest'` (`import { describe, it, expect, vi, afterEach } from 'vitest'`); no se agregan `types: ["vitest/globals"]` a `tsconfig`.
- [ ] `src/test/setup.ts`: `import { afterEach, vi } from 'vitest'`, `import { cleanup } from '@testing-library/react'`, `import '@testing-library/jest-dom/vitest'`, `afterEach(cleanup)`, stub de `window.matchMedia` (jsdom no lo implementa y Framer Motion lo consulta con `reducedMotion="user"`).

**Validación de input:** el bloque no agrega inputs de usuario. Los únicos datos externos que se renderizan son `thumbnail` y `link` (Google Books vía backend, o `cover_url` de la DB): `link` se valida con `safeExternalUrl` (solo `http:`/`https:`); `thumbnail` se usa solo como `src` de `<img>` (no ejecuta script) y su falla de carga cae al fallback. Los inputs existentes (`ui/input`, `ui/textarea`) conservan todos sus atributos de validación (`required`, `minLength`, `type`), que vienen de los callers y no se tocan.

**Manejo de errores:**

| Error | Manejo |
|---|---|
| Imagen de portada falla (`onError`, 404, CORS, mixed content) | `imgFailed=true` → fallback de color con título y autor (RF-06, RF-20). Sin toast (comportamiento actual: no había toast). |
| `link` con esquema no permitido o URL inválida | `safeExternalUrl` devuelve `null` → no se renderiza "Ver más →"; sin error visible. |
| Google Fonts no responde | `display=swap` → texto visible con fallback `Georgia`/`ui-monospace`/`cursive`; sin error. |
| `useId` en SSR/tests | ids saneados; tests renderizan 2 instancias sin colisión. |

**Tests requeridos:**

- T-U-01 `src/test/design-contract.test.ts` (Vitest, `node:fs`): (a) `index.html` contiene `preconnect` a ambos hosts y una única URL de Google Fonts con `Sorts+Mill+Goudy`, `IBM+Plex+Mono`, `Beth+Ellen` y `display=swap`, y el conteo de combinaciones familia/peso/estilo de la URL es ≤ 8; (b) ningún archivo de `src/**/*.{ts,tsx,jsx,css}` ni `index.html` contiene `Lora` ni `Space Mono`; el barrido excluye `**/*.test.*` y `src/test/**` y los literales se construyen por concatenación para que el test no se encuentre a sí mismo (exclusión temporal adicional de `LandingPage.tsx` solo durante el Bloque 1); (c) `index.css` define `.cover-spine` con regla `::after` que contiene `box-shadow: inset` y define `.cover-grid`; ningún otro archivo de `src/components/**` contiene `inset 7px` ni `shadow-spine`. → AC-01 (parte estática), AC-19 (parte "no referencian Lora/Space Mono").
- T-U-02 `src/test/design-contract.test.ts`: `index.css` define `--surface: 41.5 100% 97.5%`, `--line: 42 40.8% 80.8%`, `--line-strong: 42.4 29.9% 73.1%` y conserva `--forest: 53 41% 26%`, `--terracotta: 28 65% 35%`, `--wood-dark: 24 64% 17%`, `--sunlight: 48 85% 67%`, `--warm-cream: 40 57% 93%`; `tailwind.config.ts` mapea `surface`, `line`, `line-strong` y `borderRadius.btn = '4px'`, `pill = '999px'`. → AC-03, AC-04 (parte de tokens).
- T-U-03a `src/components/brand/__tests__/CoverArt.test.tsx`: (a) con `src` renderiza `<img alt={title}>` dentro de un contenedor con clase `cover-spine`; (b) `fireEvent.error(img)` → desaparece la imagen y se muestran título y subtítulo en el fallback, con `style.backgroundColor` igual al `bg` de `coverPaletteFor(title)` **normalizado como lo devuelve jsdom** (jsdom convierte hex inline a `rgb(r, g, b)`: comparar contra un helper `hexToRgb(bg)` → `'rgb(94, 88, 39)'`, o leer el atributo `style` crudo con `toHaveStyle({ backgroundColor: bg })`, que normaliza ambos lados); (c) sin `src` → fallback directo; (d) `size="thumb"` sin `src` → contenedor `role="img"` con `aria-label={title}`; (e) re-render con otro `src` tras un error vuelve a mostrar `<img>` (reset de `imgFailed`).
- T-U-03 `src/components/__tests__/BookCoverCard.test.tsx`: (a) usa `CoverArt` (render con `thumbnail` → `<img alt={title}>` dentro de `.cover-spine`); (d) `link="https://books.google.com/x"` → `<a>` con ese `href`, `target="_blank"`, `rel="noopener noreferrer"`; (e) `link="javascript:alert(1)"` → no hay `<a>`; (f) `badgeVariant="accent"` → badge con clase `pill-sun`. → AC-06, AC-13 (marco lomo). T-U-03a → AC-06, AC-18, AC-20 (fallo de imagen).
- T-U-04 `src/components/brand/__tests__/FloralSeal.test.tsx`: (a) sin `label` el `<svg>` tiene `aria-hidden="true"` y no tiene `role`; (b) con `label="LibrosClub"` tiene `role="img"` y `aria-label`; (c) dos `emblem` en el mismo render no repiten ids de `<path>`. → AC-07 (componente único reutilizable), AC-08/RNF-04 (decorativo oculto).
- T-U-05 `src/components/brand/__tests__/Sticker.test.tsx`: (a) por defecto `aria-hidden="true"`; (b) `rotate={20}` → `transform: rotate(8deg)`; `rotate={-20}` → `rotate(-8deg)`; (c) tiene clases `font-mono` y `uppercase`. Más `design-contract.test.ts`: `index.css` contiene `@media (prefers-reduced-motion: reduce)` y `App.jsx` contiene `reducedMotion="user"`. → AC-08, AC-26 (parte estática).
- T-U-06 `src/lib/__tests__/safe-url.test.ts`: acepta `http://` y `https://`; rechaza `javascript:`, `JaVaScRiPt:`, `data:text/html,...`, `vbscript:`, `//evil.com`, `/relativo`, `''`, `null`, `undefined`, `'no es url'`. Más `coverPaletteFor`: determinística y siempre dentro de `COVER_PALETTE`. → mitigación TM-002 del threat model.
- T-M-02 `npm run lint` (0 errores) + `npm run build` (exit 0) + `npm test` (verde). → AC-25.

**Criterio de completado:** T-U-01..T-U-06 (incluido T-U-03a) pasan con `npm test`; `npm run lint` reporta 0 errores; `npm run build` termina con exit 0; en `npm run dev` la app carga con Goudy/Plex Mono (verificado en DevTools > Computed `font-family` de `body` y de un `Button`), los botones tienen `border-radius: 4px` y las portadas del Feed muestran el marco lomo.

---

### Bloque 2 — Landing + AuthModal

**RFs:** RF-07 (hero), RF-08, RF-09, RF-10, RF-20 (errores de login). **RNFs:** RNF-01, RNF-02, RNF-03, RNF-04, RNF-05, RNF-09.

**Archivos:**

- Modificar: `librosclub-frontend/src/components/LandingPage.tsx`, `librosclub-frontend/src/components/AuthModal.tsx`
- Modificar (test): `librosclub-frontend/src/test/design-contract.test.ts` (quitar la exclusión temporal de `LandingPage.tsx`)
- Crear (test): `librosclub-frontend/src/components/__tests__/AuthModal.test.tsx`, `librosclub-frontend/src/components/__tests__/LandingPage.test.tsx`

**Tareas:**

2.1 Landing — estructura y estilos (RF-09)
- [ ] Hero: `<section>` `bg-forest text-warm-cream overflow-hidden`; contenedor `max-w-[1200px] px-6 pt-7 pb-[104px] flex flex-col gap-14`. Nav superior: solo marca (`FloralSeal variant="mark" size={34} centerColor=forest` + "LibrosClub" mono 15px 600 tracking 0.16em uppercase) — D-01, sin links nuevos. Eliminar los blobs decorativos y el ícono `BookOpen`.
- [ ] Hero texto: acento `<p className="accent-hand text-2xl text-sunlight">hola libro nuevo</p>`; `h1` Goudy `text-[clamp(52px,7vw,92px)] leading-[0.98] font-normal` con el copy actual; párrafo Goudy 21px (se elimina el `style={{ fontFamily: 'Lora, serif' }}`).
- [ ] CTAs con el mismo `onClick` y condición `!isAuthenticated` actuales: "Explorar la plataforma" → `Button variant="accent" size="lg"` con flecha (`ArrowRight` `aria-hidden`); "Crear cuenta gratis" → `Button variant="outline" size="lg"` con borde crema (`border-warm-cream text-warm-cream hover:bg-warm-cream hover:text-forest`). Línea "¿Ya tenés cuenta? / Hola, {username}" en mono 13px tracking 0.04em, link en sunlight subrayado (sunlight sobre forest 5.02:1); botones-link con `min-h-11 inline-flex items-center` en mobile.
- [ ] Columna derecha: `FloralSeal variant="emblem" size={400} label="LibrosClub"` (`max-w-full h-auto`), con `Sticker tone="sun" rotate={-8}` "Olor a libro nuevo" (abajo-izquierda) y `Sticker tone="terracotta" rotate={6}` "Compro, apilo, algún día leo" (arriba-derecha), posicionados `absolute` dentro del contenedor del sello. En < 640px el sello baja a `size` 260 (via clases `w-[260px] sm:w-[400px]`).
- [ ] Features: `section` `max-w-[1200px] px-6 py-[104px] gap-12`; `h2` Goudy 52px forest (`text-[clamp(36px,5vw,52px)]`) — copy actual; descripción Goudy 20px. Grilla `grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5`; tarjeta `.card-surface p-7 flex flex-col gap-4`; ícono lucide actual en círculo 52px `bg-forest` con trazo `text-sunlight`; numeral `aria-hidden` mono 13px terracotta (D-01); `h3` Goudy 27px forest; descripción Goudy 18px. CTA "Entrar a la plataforma" → `Button size="lg"` (forest) con flecha sunlight.
- [ ] Planes: `section` `bg-wood-dark text-warm-cream`, contenedor `max-w-[1000px] py-[104px]`; acento `accent-hand` "para cada lector" sunlight; `h2` "Planes" y subtítulo con copy actual, centrados. Grilla `grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-6`. Tarjeta Gratis `bg-warm-cream text-wood-dark rounded-lg px-8 py-9`: etiqueta mono terracotta, precio Goudy 60px forest, "Para siempre" mono 13px `text-ink-muted`; ítems Goudy 18px con `Check` forest / `X` terracotta (`aria-hidden`), ítems no incluidos en `text-ink-muted` (no opacidad); CTA `Button variant="outline"` (forest). Tarjeta Premium `bg-forest text-warm-cream`: `Sticker tone="sun" rotate={4} decorative={false}` con `Crown` + "Premium" (reemplaza el badge amber; `decorative={false}` porque el texto "Premium" es informativo), precio Goudy 60px, checks sunlight.
- [ ] Ramas de CTA Premium (`isPremium` / `isAuthenticated` / anónimo) con los mismos textos y handlers; "Ya sos Premium" → `.pill pill-sun` con `Crown`; botones `variant="accent"` (terracotta) en vez de `amber-600`; "Ir a la plataforma" → `variant="outline"` crema. Sin `amber-*` (D-10).
- [ ] Footer `bg-forest text-warm-cream`, `max-w-[1200px] px-6 py-7`, "LibrosClub" mono 14px 600 tracking 0.16em uppercase + leyenda mono 12px (copy actual). Se elimina el ícono `BookOpen`.
- [ ] Foco sobre superficies oscuras (hero, planes, footer) con `ring-sunlight ring-offset-forest`/`ring-offset-wood-dark` (D-06).
- [ ] Las animaciones `motion.*` existentes se conservan (quedan neutralizadas por D-09).

2.2 AuthModal (RF-10, RF-20)
- [ ] `DialogContent` `sm:max-w-sm` (hereda surface de Bloque 1); cabecera con `FloralSeal size={40} centerColor="#FFFBF2"` (`aria-hidden`) + `DialogTitle` (copy actual).
- [ ] Selector login/registro: contenedor `rounded-pill border-[1.5px] border-control p-1 flex`; cada opción `.chip` sin borde, activa `bg-forest text-warm-cream`, inactiva `text-wood-dark`; agregar `aria-pressed`. Mismo `onClick` (`handleModeChange`).
- [ ] Inputs y labels con los `ui/` del Bloque 1; se agregan `id`/`htmlFor` (`auth-email`, `auth-password`) para asociar labels (accesibilidad, sin cambio de copy). Se conservan `type`, `required`, `minLength={6}`, `autoFocus`, `placeholder`.
- [ ] Ayuda "Mínimo 6 caracteres." en `text-ink-muted text-sm`.
- [ ] Botón submit `Button` default (forest) `w-full`; textos de carga/acción sin cambio.
- [ ] `handleSubmit`, llamadas a `authAPI`, `login(res.token)`, toasts de éxito y de error (`err.message`, `variant: 'destructive'`) sin cambios.

**Validación de input:** sin inputs nuevos. `AuthModal` conserva exactamente la validación actual: email `type="email"` + `required`; contraseña `type="password"` + `required` + `minLength={6}`; la validación de credenciales la hace el backend (`POST /api/auth/login` / registro), sin cambios.

**Manejo de errores:**

| Error | Manejo |
|---|---|
| Login/registro rechazado por la API | Toast `variant: 'destructive'` con `title: 'Error'` y `description: err.message` (sin cambio, RF-20); el texto del servidor se renderiza como texto React (escapado). |
| Validación HTML5 (email inválido, contraseña < 6) | Mensaje nativo del navegador (sin cambio). |
| `navigate('/app')` | Sin cambio. |

**Tests requeridos:**

- T-U-07 `src/components/__tests__/AuthModal.test.tsx` (mock de `authAPI` y `useAuth`): (a) abierto, contiene el sello `aria-hidden` y el título "Iniciar sesión"; (b) submit con `authAPI.login` resuelto → llama `login(token)` y `onClose`; (c) `authAPI.login` rechazado con `Error('Credenciales inválidas')` → se dispara `toast` con `variant: 'destructive'` y `description: 'Credenciales inválidas'` (mock de `useToast`); (d) el input de contraseña conserva `minLength=6` y `required`; (e) labels asociados (`getByLabelText('Email')`). → AC-10, AC-20 (login).
- T-U-08 `src/components/__tests__/LandingPage.test.tsx` (con `MemoryRouter` y `useAuth` mockeado anónimo): (a) renderiza "Tu comunidad de lectores", "Todo lo que encontrás", "Planes"; (b) hay exactamente un `svg[role="img"][aria-label="LibrosClub"]` (sello emblem) y los stickers "Olor a libro nuevo" / "Compro, apilo, algún día leo" tienen `aria-hidden="true"`; (c) no hay links con texto "Funciones" (D-01). → AC-07 (hero), AC-08, AC-09 (parte automatizable).
- T-U-01 (actualizado): sin exclusiones; ningún archivo contiene `Lora`/`Space Mono`. → AC-01.
- T-M-03 Revisión visual de la usuaria: `/` en 1440px y 390px contra App-Landing; `git diff mvp-3 -- librosclub-frontend/src/components/LandingPage.tsx` revisado: los únicos literales de texto agregados son los de D-01. → AC-09.
- T-M-02 lint + build + test. → AC-25.

**Criterio de completado:** T-U-07, T-U-08 y T-U-01 (sin exclusiones) pasan; lint 0 errores; build exit 0; T-M-03 aprobado por la usuaria; en `npm run dev`, login con credenciales válidas e inválidas se comporta igual que en `mvp-3` (flujos 1 y 2 de T-M-07).

---

### Bloque 3 — Dashboard: sidebar, header, navegación mobile y tabs

**RFs:** RF-07 (sidebar y header mobile), RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-18, RF-20, RF-21. **RNFs:** RNF-01..RNF-06, RNF-09.

**Archivos:**

- Modificar: `librosclub-frontend/src/components/Dashboard.tsx`, `librosclub-frontend/src/components/LibrosDisponiblesTab.tsx`, `librosclub-frontend/src/components/ClubesTab.tsx`, `librosclub-frontend/src/components/CercaTuyoTab.tsx`, `librosclub-frontend/src/components/AddBookForm.tsx`, `librosclub-frontend/src/components/BookAdminRow.tsx`
- Crear: `librosclub-frontend/src/lib/escape-html.ts` (consume además `brand/CoverArt.tsx` y `.cover-grid` del Bloque 1, sin modificarlos)
- Crear (tests): `librosclub-frontend/src/lib/__tests__/escape-html.test.ts`, `librosclub-frontend/src/components/__tests__/Dashboard.test.tsx`

**Tareas:**

3.1 Sidebar (RF-07, RF-11)
- [ ] `motion.aside` (ancho 260 y animación actuales) `bg-wood-dark px-4 py-6 flex flex-col gap-8`.
- [ ] Marca: botón actual (`navigate('/')`) con `FloralSeal size={32} centerColor=wood-dark` + "LibrosClub" mono 14px 600 tracking 0.16em uppercase crema; `min-h-11`; foco sunlight.
- [ ] `<nav aria-label="Secciones">` (atributo nuevo, no visible); ítems: `w-full min-h-11 px-3 rounded-md flex items-center gap-3 label-mono text-[13px]`; activo `bg-forest text-warm-cream` + ícono `text-sunlight` + `aria-current="page"`; inactivo `text-sidebar-muted hover:bg-wood-mid`; íconos `aria-hidden`. Mismos `onClick` (`handleTabChange`).
- [ ] Bloque admin: separador `border-t-[1.5px] border-wood-mid`, rótulo "Admin" `label-mono text-sidebar-muted` (sin opacidad), ítem "Gestionar libros" con el mismo estilo de ítem.
- [ ] Caja de usuario `bg-wood-mid rounded-lg p-4 flex flex-col gap-3`: username Goudy 18px crema; plan `Pro` → `.pill pill-sun` con `Crown`; `Free` → `.pill pill-outline` borde `#EADFC8`; "Activar Premium" → `Button variant="sun" className="w-full"` (mismo handler); "Cerrar sesión" / "Iniciar sesión" / "Registrarse" → `Button variant="ghost"` `w-full text-sidebar-muted hover:bg-wood-dark hover:text-warm-cream` (mismos handlers e íconos). Sin `amber-*`.
- [ ] Backdrop mobile `bg-wood-dark/60` (mismo comportamiento).

3.2 Header y navegación mobile (RF-07, RF-12)
- [ ] Desktop (≥ 768px, `!isMobile`): `header` `px-10 py-5 border-b-[1.5px] border-line bg-warm-cream flex items-center gap-4`; botón menú `Button variant="outline" size="icon" className="rounded-pill"` con `aria-label="Abrir o cerrar menú"` (antes sin label); título de tab `h1` Goudy 30px forest (era `h2`; único `h1` de `/app`); descripción `label-mono text-ink-muted tracking-[0.1em]`; chip "Admin" `.pill pill-forest`.
- [ ] Mobile (`isMobile`): `header` `bg-wood-dark text-warm-cream px-4 py-3.5 flex items-center justify-between gap-3`; botón menú 44×44 `rounded-pill border-[1.5px] border-sidebar-muted` con `aria-label="Abrir o cerrar menú"` (mismo toggle `setSidebarOpen`); centro: `FloralSeal size={24}` + "LibrosClub" mono 13px 600 tracking 0.16em; derecha: chip "Admin" si `isAdmin`, o un `span` vacío de 44px para centrar (D-02: sin botón "Mi cuenta"). Debajo del header, título y descripción de la tab en el área de contenido (`h1` Goudy 30px forest + `label-mono`), visibles en mobile (antes la descripción estaba oculta con `hidden sm:block`: se muestra, mismo texto).
- [ ] La sidebar en mobile sigue siendo drawer `fixed` con backdrop; todas las tabs (incluida admin para rol admin) siguen accesibles (AC-12).

3.3 Main y Feed (RF-13, RF-21)
- [ ] `main` `p-5 md:p-10 flex flex-col gap-7`.
- [ ] Feed: acento `accent-hand text-lg text-terracotta` "olor a libro nuevo" (D-01); `h2` Goudy `text-[36px] md:text-[42px] text-forest font-normal leading-[1.05]` "Explorá libros" (antes `h3 font-mono`); bajada Goudy 19px.
- [ ] Chips de género: `div role="group" aria-label="Géneros"`; cada chip `.chip` + `chip-on`/`chip-off` + `aria-pressed`; `flex flex-nowrap overflow-x-auto md:flex-wrap` con `shrink-0` en mobile. Mismo `onClick={() => handleTopicChange(g.key)}`.
- [ ] Grilla de portadas: `<div className="cover-grid">` (reemplaza `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4`). Mismas props a `BookCoverCard`.
- [ ] "Cargar más": `Button variant="outline" size="lg"`; mismo `onClick` (`page: googlePage + 1, append: true`), `disabled={isLoadingMore}` y condición `hasMore`; spinner `Loader2` `aria-hidden`.

3.4 Buscar (RF-14, RF-21)
- [ ] `h2` Goudy forest "Encontrá tu próxima lectura"; form con `Input` del Bloque 1 (`pl-10`, ícono `Search` `aria-hidden`) y botón submit `Button size="icon"` (ya tiene `aria-label="Buscar"`); se agrega `aria-label` al input igual a su placeholder ("Título, autor, saga o ISBN...") para que tenga nombre accesible. `handleSearch`, `autoFocus` y `disabled` sin cambios.
- [ ] Resultados con `.cover-grid`; `EmptyState` del Bloque 1 (mismos textos).

3.5 Libros disponibles (RF-14, RF-21)
- [ ] `LibrosDisponiblesTab.tsx`: banner admin → `card-surface` con borde `border-line-strong`, texto Goudy, `label-mono` para el rótulo, `ChevronRight` `aria-hidden`; grilla de portadas `.cover-grid`; botones de solicitud (compra/intercambio) con `Button` del Bloque 1 (variantes `default`/`outline`, `size="sm"`); estados de solicitud (pendiente/aceptada/rechazada) como `.pill` (`pill-sun` pendiente, `pill-forest` aceptada, `pill-outline` con `text-destructive` rechazada). Handlers, props y llamadas a `bookRequestsAPI` sin cambios.
- [ ] Bloque "Tus solicitudes" en `Dashboard.tsx` (usuario no admin): tarjetas `card-surface`; miniatura `<CoverArt src={req.coverUrl} title={req.title ?? 'Libro'} size="thumb" />` (reemplaza el `<img>` + ícono `BookOpen`); estado con `.pill`; "Coordinar" `Button variant="link"` `min-h-11 md:min-h-0`. Mismo filtro y `setChatRequest`.

3.6 Clubes y Cerca tuyo (RF-15)
- [ ] `ClubesTab.tsx`: tarjetas de club `card-surface p-5`; nombre Goudy 22px forest; metadatos `label-mono text-ink-muted`; chips de rol/plan como `.pill` (Premium `pill-sun` con `Crown`, sin `amber-*`); formulario de creación en `card-surface` con `ui/` del Bloque 1; botón solo-ícono "Ubicar en mapa" con `aria-label="Ubicar en mapa"` (hoy solo `title`) y 44×44 en mobile. Contenido, textos, validaciones y handlers sin cambios.
- [ ] `CercaTuyoTab.tsx`: selector de radio 5/10/20/50 como `.chip` + `aria-pressed` (mismos valores y handler); tarjetas de club `card-surface`; contenedor del mapa `rounded-lg border-[1.5px] border-line overflow-hidden`; mensajes de geolocalización con tipografía del sistema. Marcadores `L.divIcon`: colores de paleta (miembro `#5E5827`, no miembro `#91551F`, usuario `#F2D661` con borde `#492710`) en vez de `#5c7a6b`/`#7c6e5b`/`#3b82f6`.
- [ ] Popup de club re-estilado (fuentes `'IBM Plex Mono'` / `'Sorts Mill Goudy'`, colores `#492710`/`#6B4A2A`; los emojis existentes se conservan porque son parte del copy actual) construyendo el HTML con `escapeHtml(club.nombre)`, `escapeHtml(club.ubicacion)`, `escapeHtml(club.currentBookTitle)`; `club.miembros` y `distanceKm` se interpolan como `Number(...)` (`String(Number(x))` / `Number(x).toFixed(1)`). El texto y datos mostrados son los mismos (D-12).
- [ ] `lib/escape-html.ts` — `export function escapeHtml(value: unknown): string`: `String(value ?? '')` reemplazando `&`, `<`, `>`, `"`, `'` por sus entidades (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`), `&` primero.

3.7 Gestionar libros (RF-16, RF-21)
- [ ] Sub-tabs Catálogo/Solicitudes (`Dashboard.tsx`): se mantienen como `button` (sin introducir el patrón ARIA tablist) con `aria-pressed`, estilo `label-mono min-h-11 px-4` con indicador activo `border-b-2 border-forest`; contador de pendientes `.pill pill-sun` (`min-w-5`). Mismos handlers.
- [ ] Lista de catálogo: contenedor `rounded-lg border-[1.5px] border-line-strong overflow-hidden divide-y divide-line bg-surface`; rótulo "Catálogo — N libros" `label-mono text-ink-muted`. "Cargando catálogo..." Goudy `text-ink-muted`.
- [ ] Lista de solicitudes: filas `bg-surface px-4 py-3`; título Goudy 17px forest; tipo (`Intercambio`/`Compra`) como `.pill` (`pill-sun` / `pill-forest`); botones solo-ícono Aceptar / Rechazar / Abrir chat / Actualizar → `inline-flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-pill` con `aria-label` igual a su `title` actual ("Aceptar", "Rechazar", "Abrir chat", "Actualizar"); estados "Aceptada"/"Rechazada" en `label-mono` (forest / `text-ink-muted`). Mismos handlers y `disabled`.
- [ ] `AddBookForm.tsx`: contenedor `card-surface p-6`; título Goudy forest; labels/inputs/textarea `ui/` del Bloque 1; preview de portada `<CoverArt src={coverUrl} title={title} subtitle={author} size="card" className="w-32" />` (reemplaza `<img>` + `ImageOff`; el fallback se actualiza en vivo con título/autor); botón submit `Button` default. Campos, validaciones (`required`, etc.), `booksAPI.addBook` y toasts sin cambios.
- [ ] `BookAdminRow.tsx` — 3 estados: **normal**: miniatura `<CoverArt src={book.coverUrl} title={book.title} size="thumb" />` (reemplaza `<img>` + `ImageOff`/`BookOpen`), título Goudy forest, autor/género `text-ink-muted`, botones Editar/Eliminar solo-ícono 44×44 (mobile) con `aria-label` "Editar" / "Eliminar"; **editando**: fondo `bg-warm-cream`, inputs `ui/`, botones Guardar/Cancelar (`Check`/`X`) con `aria-label` "Guardar" / "Cancelar"; **confirmando borrado**: fondo `bg-destructive/10` con borde izquierdo `border-l-4 border-destructive`, texto de confirmación actual, botones `Button variant="destructive" size="sm"` y `variant="outline" size="sm"`. Lógica de estados, `booksAPI.updateBook`/`deleteBook`, callbacks y toasts sin cambios.

3.8 Botones solo-ícono (RNF-04) — lista cerrada del bloque
- [ ] `Dashboard.tsx`: menú (header desktop y mobile), Actualizar, Aceptar, Rechazar, Abrir chat.
- [ ] `ClubesTab.tsx`: Ubicar en mapa (y cualquier otro `size="icon"` del archivo).
- [ ] `BookAdminRow.tsx`: Editar, Eliminar, Guardar, Cancelar.
- [ ] Verificación: `grep -n 'size="icon"\|title="' ` sobre los 6 archivos del bloque no deja botones solo-ícono sin `aria-label`.

**Validación de input:** sin inputs nuevos. Se conservan sin cambios las validaciones existentes de: búsqueda (`!searchQuery.trim()` deshabilita submit), `AddBookForm` (campos requeridos y `coverUrl` opcional), edición inline de `BookAdminRow`, creación de club y publicación en `ClubesTab`, radio de `CercaTuyoTab` (valores cerrados 5/10/20/50). Los datos de usuario que el bloque renderiza (títulos, autores, nombres de club, usernames) se muestran como texto React (escapado por defecto); el único sink HTML (popup de Leaflet) pasa a escapar todo valor dinámico con `escapeHtml`.

**Manejo de errores:**

| Error | Manejo |
|---|---|
| Falla `getAllBooks` | Toast destructivo "No se pudieron cargar los libros." (sin cambio). |
| Falla búsqueda Google Books | Toast destructivo "Error en la búsqueda." (sin cambio). |
| Falla feed Google Books / "Cargar más" | Toast destructivo "No se pudo cargar el feed de Google Books."; se conservan los resultados ya cargados (sin cambio). |
| Falla carga de solicitudes admin / respuesta a solicitud | Toasts destructivos actuales (sin cambio). |
| Falla de clubes cercanos / geolocalización denegada o no soportada | Toast con `err.message` y `locationError` actuales, re-estilados (sin cambio de texto). |
| Errores de alta/edición/borrado admin | Toasts actuales de `AddBookForm` / `BookAdminRow` (sin cambio). |
| Imagen de miniatura falla (Tus solicitudes, BookAdminRow, AddBookForm preview) | Fallback de paleta de `CoverArt` (`onError`). |
| Dato de club con HTML (ej. `<img onerror>` en `nombre`) | Se muestra literal en el popup (escapado), no se ejecuta. |

**Tests requeridos:**

- T-U-09 `src/lib/__tests__/escape-html.test.ts`: escapa `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, `'`, `&` (se escapa siempre, incluso un `&amp;` ya presente; el popup recibe datos crudos de la API); `null`/`undefined` → `''`; números → string. → mitigación TM-001 del threat model.
- T-U-10 `src/components/__tests__/Dashboard.test.tsx` (`MemoryRouter`; `booksAPI.getGoogleFeed` mockeado; `useAuth` mockeado anónimo y admin; `window.innerWidth` 1280 y 390): (a) desktop: `nav[aria-label="Secciones"]` con ítem "Feed" `aria-current="page"` y clase `bg-forest`, el resto sin `aria-current`; (b) los chips de género están en `role="group"` con `aria-pressed="true"` solo en "Ficción" y click en "Fantasía" llama `getGoogleFeed('fantasy', 0)`; (c) click en "Cargar más" llama `getGoogleFeed('fiction', 1)` y la grilla tiene la suma de ambas páginas (append); (d) mobile (390): header con sello `aria-hidden` y botón `aria-label="Abrir o cerrar menú"`; al abrir, con usuario admin el ítem "Gestionar libros" es accesible; (e) `getGoogleFeed` rechazado → `toast` destructivo con "No se pudo cargar el feed de Google Books." → AC-11, AC-12, AC-13, AC-20 (feed).
- T-M-05 Responsive y targets: en 390/768/1024/1440 cada tab cumple `document.documentElement.scrollWidth <= innerWidth` y, en ≤ 768, todo interactivo ≥ 44×44 (script de consola `[...document.querySelectorAll('button,a,input,[role=button]')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.width<44||r.height<44)})` devuelve `[]`). → AC-22.
- T-M-04 axe DevTools + Lighthouse (desktop y mobile) en `/app` en cada tab: 0 violaciones `color-contrast`, Accesibilidad ≥ 90. → AC-21.
- T-M-06 Navegación por teclado en cada tab: foco visible ≥ 2px en todo interactivo; Lighthouse sin `button-name`/`link-name`. → AC-23.
- T-M-09 Inspección de estilos (DevTools > Computed) en Buscar, Libros disponibles, Clubes, Cerca tuyo y Gestionar libros: tarjetas `background-color: rgb(255, 251, 242)` + `border-width: 1.5px`; botones `border-radius: 4px` + `font-family` IBM Plex Mono + `text-transform: uppercase`; chips/badges `border-radius` ≥ 999px; `h1`–`h3` Sorts Mill Goudy. → AC-02, AC-04, AC-05, AC-14, AC-15, AC-16.
- T-M-07 Checklist de no regresión (flujos de RNF-06 que pertenecen al Dashboard: Feed + cargar más, búsqueda, Libros disponibles, solicitar intercambio, aceptar/rechazar solicitud, Clubes + detalle, Cerca tuyo, alta/edición/borrado admin, logout) en la rama vs `mvp-3`, con usuario `user` y `admin`; incluye contenido de Clubes/Cerca tuyo idéntico (textos, opciones de radio 5/10/20/50). → AC-14, AC-15, AC-16, AC-24.
- T-M-02 lint + build + test. → AC-25.

**Criterio de completado:** T-U-09 y T-U-10 pasan junto con los tests de bloques anteriores; lint 0 errores; build exit 0; T-M-04, T-M-05, T-M-06, T-M-09 sin hallazgos en las tabs del Dashboard; flujos del Dashboard de T-M-07 idénticos a `mvp-3`.

---

### Bloque 4 — Modales/paneles + NotFound/Login (Could)

**RFs:** RF-17, RF-19, RF-20; RF-25..RF-30 (tarea 4.5, ya implementada). **RNFs:** RNF-01..RNF-06, RNF-08, RNF-09.

**Archivos:**

- Modificar: `librosclub-frontend/src/components/PremiumUpgradeModal.tsx`, `librosclub-frontend/src/components/RequestChatModal.tsx`, `librosclub-frontend/src/components/ClubDetailSheet.tsx`, `librosclub-frontend/src/pages/NotFound.tsx`, `librosclub-frontend/src/components/Login.tsx`
- Tarea 4.5 (ya implementado en CODE): `librosclub-backend/src/routes/auth.js`, `librosclub-backend/src/controllers/authControllers.js` (creado), `librosclub-backend/src/controllers/__tests__/authControllers.test.js` (creado), `librosclub-backend/package.json`, `librosclub-backend/package-lock.json`, `librosclub-frontend/package.json`, `librosclub-frontend/package-lock.json`, `librosclub-frontend/vite.config.js`, `librosclub-frontend/src/components/ExchangeTab.tsx`, `librosclub-frontend/src/components/ui/command.tsx`, `librosclub-frontend/src/utils/api.ts`, índice de git de `librosclub-backend/node_modules/` (removido con `git rm -r --cached`), y los 23 archivos `*.test.{ts,tsx}` de `librosclub-frontend/src/` (incluye los de T-U-01..T-U-12)
- Crear (tests): `librosclub-frontend/src/components/__tests__/PremiumUpgradeModal.test.tsx`
- Modificar (test): `librosclub-frontend/src/test/design-contract.test.ts` (agrega el caso de AC-19)

**Tareas:**

4.1 PremiumUpgradeModal (RF-17)
- [ ] Panel `bg-surface border-[1.5px] border-line rounded-lg` (el overlay propio pasa a `bg-wood-dark/60`); encabezado: título "Activar Premium" Goudy forest (era `h3 font-mono`); rótulo "Plan Premium · 30 días" como `.pill pill-sun` (era `text-amber-700`); estado de éxito "¡Plan Premium activado!" en Goudy forest y su botón `Button variant="accent"` (era `bg-amber-600`). Mismos textos.
- [ ] Los 4 `Input` de pago (todos `required`) con `ui/` del Bloque 1, conservando sus atributos y formateo actuales; `Label` asociados por `id`/`htmlFor`.
- [ ] Botón confirmar `Button variant="accent"`; cancelar `variant="outline"`; botón de cierre `<button>` con ícono `X` (hoy sin nombre accesible) con `aria-label="Cerrar"`, `inline-flex h-11 w-11 items-center justify-center rounded-pill` y foco visible. Sin `amber-*` (D-10).
- [ ] `authAPI` (upgrade), `useAuth` y toasts sin cambios.

4.2 RequestChatModal (RF-17)
- [ ] Panel `bg-surface border-[1.5px] border-line rounded-lg`; encabezado con título del libro Goudy forest y `MessageCircle` `aria-hidden`; burbujas: propias `bg-forest text-warm-cream rounded-lg rounded-br-sm`, ajenas `bg-warm-cream border-[1.5px] border-line text-wood-dark rounded-lg rounded-bl-sm`; metadatos (`username`, hora) `label-mono text-ink-muted` (o `text-sidebar-muted` sobre forest). Se elimina `font-sans` explícito (ya es Goudy).
- [ ] Input de mensaje con `ui/input`; botón enviar `Button size="icon"` (se quita el override `h-9 w-9` → `h-11 w-11 md:h-9 md:w-9`, se conserva `bg-accent text-accent-foreground` = sunlight/wood-dark 9.21:1) con `aria-label="Enviar"`; cierre `X` con `aria-label="Cerrar"`, 44×44.
- [ ] Polling/carga de mensajes, envío, scroll automático y toasts sin cambios; los mensajes se renderizan como texto React (sin cambio).

4.3 ClubDetailSheet (RF-17)
- [ ] `SheetContent` hereda surface del Bloque 1; cabecera: nombre del club `SheetTitle` Goudy forest, metadatos `label-mono text-ink-muted`; secciones (libro actual, reuniones, foro, miembros) en `card-surface p-4` con títulos Goudy 20px; `Separator` con `bg-line`.
- [ ] Badges Premium/rol → `.pill` (`pill-sun` con `Crown`/`Sparkles` `aria-hidden`); sin `amber-*` (D-10).
- [ ] Formularios (reunión, post, coordenadas) con `ui/` del Bloque 1; botón coordenadas mantiene su `title` y suma `aria-label` igual; botón enviar post (`size="icon"` con `Send`, línea ~595) con `aria-label="Enviar"` y override `h-9 w-9` → `h-11 w-11 md:h-9 md:w-9`; botones de eliminar (`Trash2`) con `aria-label="Eliminar"` si son solo-ícono.
- [ ] Imagen de libro actual (línea ~426) → `<CoverArt src=... title=... size="thumb" />` (o `size="card"` con ancho fijo si hoy se muestra grande); sin lógica `onError` propia.
- [ ] Llamadas a `clubsAPI`, manejo de `ApiError`, gating Premium y toasts sin cambios.

4.4 NotFound / Login (RF-19, Could)
- [ ] `pages/NotFound.tsx`: `bg-warm-cream`; `FloralSeal size={64}` `aria-hidden`; "404" Goudy 60px forest; texto Goudy `text-ink-muted`; link "Return to Home" como `Button asChild variant="outline"` envolviendo el `<a href="/">` (copy sin cambio). Sigue sin montarse en el router.
- [ ] `components/Login.tsx`: `Card` del Bloque 1; `CardTitle` Goudy; inputs/labels/botón `ui/` del Bloque 1; reemplazar `BookOpen`/`Leaf` de marca por `FloralSeal` `aria-hidden`; sin clases `rounded-lg`/`rounded-xl` que dependan de `--radius` antiguo; imagen `hero-bg.jpg` se conserva con overlay `bg-forest/80`. Lógica de login y toasts sin cambios. Sigue sin montarse en el router.

**Validación de input:** sin inputs nuevos. `PremiumUpgradeModal` conserva su validación actual de datos de pago simulados (tipos, longitudes y formato tal como están hoy; el bloque no los altera); `RequestChatModal` conserva el bloqueo de envío de mensaje vacío; `ClubDetailSheet` conserva las validaciones de reunión/post/coordenadas; `Login.tsx` las de `AuthModal`.

**Manejo de errores:**

| Error | Manejo |
|---|---|
| Falla upgrade Premium | Toast destructivo actual (sin cambio). |
| Falla carga/envío de mensajes del chat | Toasts actuales (sin cambio). |
| `ApiError` en acciones del club (403 Premium, 4xx/5xx) | Manejo actual de `ClubDetailSheet` (sin cambio de mensajes ni de gating). |
| Imagen del libro actual falla | Fallback de paleta de `CoverArt` (`onError`). |

**Tests requeridos:**

- T-U-11 `src/components/__tests__/PremiumUpgradeModal.test.tsx` (`useAuth`/`authAPI`/`useToast` mockeados): (a) el botón de cierre tiene `aria-label="Cerrar"` y llamarlo invoca `onClose`; (b) el contenedor del panel tiene clase `bg-surface`; (c) ningún elemento tiene clases `amber-`. → AC-17 (parte automatizable), AC-04 (botón).
- T-U-12 `design-contract.test.ts`: `pages/NotFound.tsx` y `components/Login.tsx` no contienen `Lora`, `Space Mono`, `rounded-xl` ni `rounded-2xl`; ningún archivo de `src/components/*.tsx` contiene `amber-`. → AC-19, RNF-01 (D-10).
- T-M-09 (extensión) Inspección de estilos de `PremiumUpgradeModal`, `RequestChatModal` y `ClubDetailSheet` abiertos: superficie `rgb(255, 251, 242)`, botones 4px mono uppercase, títulos Goudy. → AC-17.
- T-M-07 (cierre) Checklist completo de los 11 flujos de RNF-06 (incluye login, logout, Clubes + detalle y upgrade Premium) vs `mvp-3` con `user` y `admin`. → AC-24.
- T-M-01 Red: build de producción servido (`npm run build && npm run preview`), DevTools > Network > Font al cargar `/`: solo Sorts Mill Goudy, IBM Plex Mono y Beth Ellen, ≤ 8 archivos, URL con `display=swap`, ninguna request de Lora/Space Mono. → AC-01.
- T-M-04 / T-M-05 / T-M-06 sobre `/` y `/app` completos (incluidos los modales abiertos); Lighthouse Accesibilidad ≥ 90 en `/` y `/app` desktop y mobile. → AC-21, AC-22, AC-23.
- T-M-08 Con "reducir movimiento" activado en el SO: Landing y Dashboard sin animaciones de entrada (las `motion.*` aparecen en su estado final, `.shimmer` estático). → AC-26.
- T-M-02 lint + build + test. → AC-25.

4.5 Cambios transversales ya implementados en CODE por decisión de la usuaria (RF-25..RF-30) — sin cambio de comportamiento
- [x] RF-25 — `routes/auth.js` solo declara `POST /login`, `POST /register`, `PUT /upgrade` (`authMiddleware`) y delega en `controllers/authControllers.js` (`login`, `register`, `upgrade`). Contrato conservado: `400` (usuario/contraseña faltantes; contraseña < 6 en registro), `401` (credenciales inválidas; token ausente/inválido/expirado en upgrade), `409` (usuario ya registrado), `201 { token }` (registro), `200 { token }` (login), `500` (error del servidor). El registro fuerza rol `user` ignorando `req.body.role`. Queries parametrizadas (`pg`), contraseñas con `bcryptjs`.
- [x] RF-26 — `controllers/__tests__/authControllers.test.js`: 11 tests con `node:test` + `node:assert/strict`, mockeando `config/db` vía `require.cache` y `JWT_SECRET='test-secret'`; script `"test": "node --test"` en `librosclub-backend/package.json`.
- [x] RF-27 — `npm audit fix` (sin `--force`) en ambos proyectos; backend `npm audit --omit=dev` = 0 vulnerabilidades; frontend: advisories restantes = DT-06 de `deuda-tecnica.md` (fix solo semver-major); sin saltos major en `package.json` respecto de `mvp-3`.
- [x] RF-28 — `librosclub-backend/node_modules` fuera del índice de git (`git ls-files librosclub-backend/node_modules | wc -l` = 0); `.gitignore` ya lo listaba.
- [x] RF-29 — `ExchangeTab.tsx`, `ui/command.tsx` y `utils/api.ts` sin `: any` / `as any` / `<any>` (tipos explícitos o `unknown` + narrowing); `npm run lint` 0 errores.
- [x] RF-30 — devDependency `@vitest/coverage-v8@3.2.4` (versión exacta, alineada con Vitest 3.2.4); script `"test:coverage": "vitest run --coverage"`; `vite.config.js` `test.coverage`: `provider: 'v8'`, `reporter: ['text', 'json-summary']`, `include: ['src/**/*.{ts,tsx,jsx}']`, `exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/components/ui/!(button|input|textarea|label|card|dialog|sheet|toast).tsx', 'src/components/ui/use-toast.ts']` (se miden solo los `ui/` re-estilados en el Bloque 1; los Shadcn no usados quedan fuera, igual que en el alcance del PRD). Suite actual: 23 archivos, 154 tests; cobertura 82.5% líneas global (sobre ese `include`/`exclude`, reproducible con `npm run test:coverage` → `coverage/coverage-summary.json` `total.lines.pct`) y 99% en archivos del ticket.

**Validación de input (4.5):** `authControllers` conserva exactamente la validación previa de `routes/auth.js` (presencia de `username`/`password`, longitud mínima 6 en registro, rol forzado `user`). Sin inputs nuevos.

**Manejo de errores (4.5):**

| Error | Manejo |
|---|---|
| Body incompleto / contraseña corta | `400` con el mensaje previo |
| Credenciales inválidas / token inválido en upgrade | `401` |
| Usuario duplicado | `409` |
| Error de DB / bcrypt / jwt | `500` con mensaje genérico; detalle solo a `console.error` |
| `npm audit fix` sin solución no-major | Queda registrado como DT-06 (no se fuerza) |

**Tests (4.5, ya escritos y en verde):**

- T-B-01 `librosclub-backend/src/controllers/__tests__/authControllers.test.js` — 11 tests (`npm test` en backend): login 400 (faltantes), 401 (usuario inexistente), 401 (contraseña incorrecta), 200 con plan premium vigente, 200 degradando premium vencido a free, 500 (falla de DB); registro 400 (contraseña < 6), 409 (duplicado), 201 con rol `user` forzado y token free; upgrade 200 (token premium), 500 (falla de actualización). El `401` de upgrade sin token lo resuelve `authMiddleware` antes del controller y se verifica en el smoke (T-M-11). → AC-32, AC-38.
- T-U-13 Suite de cobertura del frontend — 23 archivos `*.test.{ts,tsx}`, 154 tests (`npm test` y `npm run test:coverage` exit 0, reporte v8 3.2.4). → AC-36.
- T-M-12 Comandos de verificación: `npm audit --omit=dev` en backend (0), `npm audit` en frontend (solo DT-06), `git diff mvp-3 -- */package.json` sin saltos major, `git ls-files librosclub-backend/node_modules | wc -l` = 0, `grep -nE ": any\b|as any|<any>" ExchangeTab.tsx ui/command.tsx utils/api.ts` vacío + `npm run lint` 0 errores. → AC-33, AC-34, AC-35.

**Criterio de completado:** T-U-01..T-U-12 pasan; lint 0 errores; build exit 0; T-M-01, T-M-04..T-M-09 sin hallazgos; checklist T-M-07 de 11 flujos con 0 diferencias vs `mvp-3`; revisión visual de la usuaria (T-M-03 extendido a `/app` desktop y mobile contra App-Feed / App-Feed-Mobile) aprobada.


---

### Bloque 5 — Favicon, Feed de Google Books y modo de AuthModal (pendiente)

**RFs:** RF-22, RF-23, RF-24 (y RF-13 / RF-20 / RF-21 en su verificación). **RNFs:** RNF-08, RNF-11.

**Archivos:**

- Modificar: `librosclub-frontend/public/favicon.svg`, `librosclub-backend/src/services/googleBooksService.js`, `librosclub-frontend/src/components/AuthModal.tsx`
- Crear (tests): `librosclub-backend/src/services/__tests__/googleBooksService.test.js`
- Modificar (tests): `librosclub-frontend/src/test/design-contract.test.ts`, `librosclub-frontend/src/components/__tests__/AuthModal.test.tsx`, `librosclub-frontend/src/components/__tests__/LandingPage.test.tsx`, `librosclub-frontend/src/components/__tests__/Dashboard.test.tsx`
- Solo verificar (sin cambios): `librosclub-frontend/index.html` (ya tiene `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` y `<link rel="shortcut icon" href="/favicon.svg">`), `librosclub-backend/src/controllers/googleBooksControllers.js`, `librosclub-frontend/src/components/brand/FloralSeal.tsx`

**Tareas:**

5.1 Favicon con el sello floral (RF-22, RNF-11, D-13)
- [ ] Reemplazar el contenido de `public/favicon.svg` (hoy un libro abierto sobre `#3D2B1F`) por: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">`, `<rect width="200" height="200" rx="40" fill="#5E5827"/>`, `<circle cx="100" cy="100" r="46" fill="none" stroke="#F2D661" stroke-width="22"/>`, 8 `<circle r="26" fill="#F2D661">` en los centros de `MARK_PETALS` (`100,38` `144,56` `162,100` `144,144` `100,162` `56,144` `38,100` `56,56`), y `<circle cx="100" cy="100" r="34" fill="#5E5827"/>` (centro hueco).
- [ ] Sin `<script>`, `<foreignObject>`, `<text>`, `href` externos ni estilos inline con `url()`.
- [ ] `index.html` sin cambios (ya referencia `/favicon.svg`); verificar que `npm run build` copia `public/favicon.svg` a `dist/favicon.svg`.

5.2 Feed de Google Books (RF-23, RF-21, D-14)
- [ ] `googleBooksService.getGoogleFeed`: eliminar `url.searchParams.set('orderBy', 'newest')`; el resto de parámetros, el `.sort(comparePublishedDesc)` sobre `normalizePublishedDate` y la forma de la respuesta `{ topic, limit, page, items }` no cambian.
- [ ] `searchVolumes` sin cambios (no usa `orderBy`).
- [ ] Test `src/services/__tests__/googleBooksService.test.js` (`node:test`, `node:assert/strict`): antes de `require('../googleBooksService')`, setear `process.env.GOOGLE_BOOKS_API_KEY = 'test-key'` e inyectar el mock con la misma forma que `authControllers.test.js`: `const fetchPath = require.resolve('node-fetch'); require.cache[fetchPath] = { id: fetchPath, filename: fetchPath, loaded: true, exports: async (url) => { calls.push(new URL(url)); return responder(url); } };`. `responder` devuelve un objeto con la forma que consume el service: `{ ok: boolean, status: number, text: async () => JSON.stringify(body) }` (el service llama `r.text()` y luego `JSON.parse`; para el caso de error, `{ ok: false, status: 503, text: async () => 'Service Unavailable' }`). `beforeEach` resetea `calls` y `responder`.

5.3 `AuthModal` abre en el modo de `defaultMode` (RF-24, D-15)
- [ ] Importar `useEffect` y agregar el efecto de D-15: `setMode(defaultMode)`, `setUsername('')`, `setPassword('')` directo dentro del efecto, deps exactamente `[open, defaultMode]`, sin llamar a `reset()` ni agregar `// eslint-disable`.
- [ ] `npm run lint` sin warnings nuevos en `AuthModal.tsx` respecto del estado previo al bloque (en particular ninguno de `react-hooks/exhaustive-deps`).
- [ ] Sin cambios en `handleModeChange`, `handleSubmit`, textos, validaciones, `toast`, `login`, `onClose`, `onSuccess`.
- [ ] Callers sin cambios: `LandingPage` (`authMode` + `openAuth('login'|'register')`) y `Dashboard` (`authModalMode` + `openAuthModal`).

**Validación de input:**
- 5.1: asset estático, sin input.
- 5.2: sin inputs nuevos. Se conservan los saneos existentes: `topic` como `String` dentro de `q=subject:<topic>` armado con `URLSearchParams` (codificado), `limit` acotado a [1, 40], `page` ≥ 0, `lang` como `String`. La API key se lee de `GOOGLE_BOOKS_API_KEY` y nunca se devuelve al cliente.
- 5.3: sin cambios en la validación del formulario (`type="email"`, `required`, `minLength={6}`).

**Manejo de errores:**

| Error | Manejo |
|---|---|
| Google Books responde `!ok` | El service lanza `Error` con `status`; el controller responde `500 { message: 'Error al obtener feed de Google Books' }` (sin cambio) y el Feed muestra el toast destructivo existente (AC-30). |
| `GOOGLE_BOOKS_API_KEY` ausente | `Error` `status 500` (sin cambio). |
| Google Books devuelve 0 ítems para un género | `items: []` → `EmptyState` "No se encontraron libros" (sin cambio); AC-28 lo detecta como falla de verificación. |
| Navegador no soporta favicon SVG | Muestra el ícono por defecto del navegador (sin error funcional). |
| `defaultMode` inválido | Imposible por tipo (`'login' | 'register'`). |

**Tests requeridos:**

- T-B-02 `librosclub-backend/src/services/__tests__/googleBooksService.test.js` (`npm test` en backend): (a) `getGoogleFeed({ topic: 'fantasy', limit: 10, lang: 'es', page: 2 })` → la URL capturada tiene `q=subject:fantasy`, `maxResults=10`, `startIndex=20`, `langRestrict=es`, `printType=books`, `key=test-key` y `searchParams.has('orderBy') === false`; (b) con ítems de `publishedDate` `'2001'`, `'2019-05'`, `null`, `'2019-05-20'` → orden de salida `2019-05-20`, `2019-05`, `2001`, `null` y sin el campo interno `_publishedDateNormalized`; (c) respuesta `ok: false, status: 503` → rechaza con `err.status === 503`; (d) `limit: 999` → `maxResults=40`, `page: -3` → `startIndex=0`. → AC-28 (parte automatizable), AC-30 (parte service).
- T-U-14 `design-contract.test.ts` (favicon): `public/favicon.svg` contiene un `rect` con `fill="#5E5827"`, exactamente 8 `circle` con `r="26"` y `fill="#F2D661"`, un `circle` `r="46"` con `stroke="#F2D661"`, un `circle` `r="34"` con `fill="#5E5827"`, y no contiene `<script`, `<foreignObject`, `<text` ni `http`; `index.html` referencia `/favicon.svg` con `type="image/svg+xml"`. → AC-27 (estructura), RNF-11 (geometría).
- T-U-15 regresión de `AuthModal` (RF-24): en `AuthModal.test.tsx`, (a) render con `open={false} defaultMode="register"` y rerender `open` → título "Crear cuenta"; (b) cambiar a "Iniciar sesión" con el toggle, cerrar (`open={false}`), reabrir con `defaultMode="register"` → vuelve a "Crear cuenta"; (c) cerrar y reabrir con `defaultMode="login"` → "Iniciar sesión" y campos vacíos. En `LandingPage.test.tsx`: click "Iniciá sesión" → diálogo con título "Iniciar sesión"; cerrar; click "Crear cuenta gratis" → título "Crear cuenta". En `Dashboard.test.tsx` (anónimo): click "Registrarse" de la sidebar → título "Crear cuenta". → AC-31.
- T-M-10 Favicon: `npm run build && npm run preview`, `curl -I http://localhost:4173/favicon.svg` → `200` y `content-type: image/svg+xml`; pestaña del navegador muestra el sello; rasterizado a 16×16 y 32×32 (`rsvg-convert -w 16 -h 16` / `-w 32 -h 32`, o zoom en DevTools) con 8 pétalos y anillo distinguibles. → AC-27.
- T-M-13 Feed real: backend local con `GOOGLE_BOOKS_API_KEY` válida, proceso reiniciado (caché vacía); `curl "http://localhost:3000/api/google-books/feed?topic=<g>&page=0"` para los 10 géneros → `200`, `items.length ≥ 1`, `publishedDate` descendente (`jq`). En la UI logueado: cada género muestra ≥ 1 portada y "Cargar más" agrega la página siguiente. Con `GOOGLE_BOOKS_API_KEY` inválida → `500` con el mensaje y toast destructivo en el Feed. → AC-28, AC-29, AC-30.
- T-M-02 lint + build + `npm test` (frontend) + `npm test` (backend). → AC-25, AC-38.

**Criterio de completado:** T-B-01, T-B-02, T-U-14, T-U-15 y toda la suite (T-U-01..T-U-15) en verde; `npm run lint` 0 errores y `npm run build` exit 0 en frontend; `npm test` exit 0 en backend; T-M-10 y T-M-13 sin hallazgos.

## Dependencias entre bloques

| Bloque | Depende de | Motivo |
|---|---|---|
| 1 | — | Define tokens, clases (`.cover-spine`, `.cover-grid`), `ui/`, `FloralSeal`, `Sticker`, `CoverArt`, `BookCoverCard`, `safeExternalUrl`, `coverPaletteFor` y el setup de Vitest. |
| 2 | 1 | Usa `FloralSeal`, `Sticker`, variantes `accent`/`outline` de `Button`, `.card-surface`, `.accent-hand`; quita la exclusión temporal de T-U-01. |
| 3 | 1 | Usa tokens, `.chip`, `.pill`, `.cover-grid`, `CoverArt`, `FloralSeal` y `ui/` re-estilados. No depende del Bloque 2 (puede verificarse de forma independiente), pero se implementa después por el orden acordado. |
| 4 | 1, 3 | Usa los `ui/` y componentes de marca del Bloque 1 (incluido `CoverArt` en `ClubDetailSheet`); `ClubDetailSheet` se abre desde `ClubesTab` (Bloque 3) y `RequestChatModal`/`PremiumUpgradeModal` desde el Dashboard (Bloque 3), así que su verificación manual requiere el Dashboard ya re-estilado. |

| 5 | 1, 2, 4 | 5.1 reutiliza la geometría de `FloralSeal` (Bloque 1); 5.3 modifica `AuthModal` (re-estilado en el Bloque 2) y sus tests de Landing/Dashboard (Bloques 2–3); 5.2 corre con el script `npm test` del backend agregado en 4.5. 5.1, 5.2 y 5.3 son independientes entre sí. |

Orden de ejecución: 1 → 2 → 3 → 4 (incl. 4.5, ya implementados) → 5. Cada bloque cierra con lint + build + test en verde antes de empezar el siguiente.

## Trazabilidad

### RF → Bloque

| RF | Bloque(s) |
|---|---|
| RF-01 | 1 (1.1), 2 (quita `Lora` de LandingPage) |
| RF-02 | 1 (1.2, 1.4), 2, 3, 4 (aplicación por componente) |
| RF-03 | 1 (1.2) |
| RF-04 | 1 (1.4, `.chip`, `.pill`), 3 (chips/badges), 4 |
| RF-05 | 1 (`.card-surface`, `ui/card`), 2, 3, 4 |
| RF-06 | 1 (1.7) |
| RF-07 | 1 (1.5), 2 (hero), 3 (sidebar y header mobile) |
| RF-08 | 1 (1.5), 2 (stickers del hero y Premium) |
| RF-09 | 2 (2.1) |
| RF-10 | 2 (2.2) |
| RF-11 | 3 (3.1) |
| RF-12 | 3 (3.2) |
| RF-13 | 3 (3.3) |
| RF-14 | 3 (3.4, 3.5) |
| RF-15 | 3 (3.6) |
| RF-16 | 3 (3.7) |
| RF-17 | 4 (4.1, 4.2, 4.3) |
| RF-18 | 1 (1.4 toast, 1.8) |
| RF-19 | 4 (4.4) |
| RF-20 | 1 (toast, fallback imagen), 2 (login), 3 (tabs), 4 (modales) |
| RF-21 | 1 (props de `BookCoverCard` sin cambio), 3 (3.3, 3.4, 3.5, 3.7), 5 (5.2 conserva `startIndex`/paginación) |
| RF-22 | 5 (5.1) |
| RF-23 | 5 (5.2) |
| RF-24 | 5 (5.3) |
| RF-25 | 4 (4.5, implementado) |
| RF-26 | 4 (4.5, implementado) |
| RF-27 | 4 (4.5, implementado) |
| RF-28 | 4 (4.5, implementado) |
| RF-29 | 4 (4.5, implementado) |
| RF-30 | 4 (4.5, implementado) |

### AC → Test

| AC | Test(s) |
|---|---|
| AC-01 | T-U-01, T-M-01 |
| AC-02 | T-M-09 |
| AC-03 | T-U-02 |
| AC-04 | T-U-02, T-U-11, T-M-09 |
| AC-05 | T-M-09 |
| AC-06 | T-U-03, T-U-03a |
| AC-07 | T-U-04, T-U-08, T-U-10 |
| AC-08 | T-U-04, T-U-05, T-U-08 |
| AC-09 | T-U-08, T-M-03 |
| AC-10 | T-U-07 |
| AC-11 | T-U-10 |
| AC-12 | T-U-10 |
| AC-13 | T-U-03, T-U-10 |
| AC-14 | T-M-09, T-M-07 |
| AC-15 | T-M-09, T-M-07 |
| AC-16 | T-M-09, T-M-07 |
| AC-17 | T-U-11, T-M-09 |
| AC-18 | T-U-03a (marco lomo y fallback), T-U-01(c) (`.cover-spine` única fuente), T-M-09 (skeleton 2:3 lomo, `EmptyState`, toasts) |
| AC-19 | T-U-01, T-U-12 |
| AC-20 | T-U-03a, T-U-07, T-U-10 |
| AC-21 | T-M-04 |
| AC-22 | T-M-05 |
| AC-23 | T-M-06 |
| AC-24 | T-M-07 |
| AC-25 | T-M-02 |
| AC-26 | T-U-05, T-M-08 |
| AC-27 | T-U-14, T-M-10 |
| AC-28 | T-B-02, T-M-13 |
| AC-29 | T-U-10 (cargar más), T-M-13 |
| AC-30 | T-B-02 (c), T-U-10 (e), T-M-13 |
| AC-31 | T-U-15 |
| AC-32 | T-B-01 |
| AC-33 | T-M-12 |
| AC-34 | T-M-12 |
| AC-35 | T-M-12, T-M-02 |
| AC-36 | T-U-13 |
| AC-37 | T-M-11 |
| AC-38 | T-B-01, T-B-02, T-M-02 |

Leyenda: `T-U-*` = test unitario/estático automatizado con Vitest (`npm test`); `T-M-*` = verificación manual o con herramienta (lint/build, DevTools, axe, Lighthouse, checklist de flujos), justificada porque el PRD define esos ACs sobre estilo computado, red o comportamiento en navegador real y el frontend no tiene E2E (stack-profile). `T-B-*` = test de backend con `node --test` (`npm test` en `librosclub-backend/`). Total: 16 grupos automatizados de frontend (T-U-01..T-U-15 + T-U-03a; la suite real tiene 23 archivos y 154 tests antes del Bloque 5), 2 de backend (T-B-01 con 11 tests, T-B-02) y 13 verificaciones manuales/herramienta (T-M-01..T-M-13).

## Seguridad (resumen del threat model)

Ver `docs/work/FEAT-001/threat.md`. Mitigaciones incorporadas a los bloques:

- **TM-001 (HIGH, preexistente) — XSS almacenado en popups de Leaflet** (`CercaTuyoTab`: `club.nombre`, `club.ubicacion`, `club.currentBookTitle` interpolados en HTML). Mitigación: `escapeHtml` en Bloque 3 (3.6) + T-U-09.
- **TM-002 (MEDIUM) — esquemas peligrosos en `link` externo** (`javascript:` en `href` de "Ver más →"). Mitigación: `safeExternalUrl` en Bloque 1 (1.6, 1.7) + T-U-03(e), T-U-06.
- **Tabnabbing** — `rel="noopener noreferrer"` conservado en todo `target="_blank"` (T-U-03(d)).
- Prohibido introducir `dangerouslySetInnerHTML` en componentes nuevos o re-estilados (`FloralSeal` y `Sticker` son JSX puro).
- **TM-003 (LOW)** — datos de tarjeta simulados de `PremiumUpgradeModal`: el re-estilado (4.1) no agrega persistencia ni envío; SAST en CODE verifica que `cardNumber`/`cvv` no lleguen a `fetch` ni a `localStorage`.
- **GF-01 (MEDIUM, preexistente) — sin CSP en `vercel.json`**: fuera del alcance de este ticket (cambio solo visual; requiere conocer `VITE_API_URL` por entorno, SI-01). Compensado por el escape de todos los sinks que el ticket toca; se recomienda ticket de hardening posterior.
- **Delta de reentrada (TM-009..TM-015)** — favicon SVG estático sin script ni referencias externas (T-U-14); query a Google Books sin `orderBy` con la API key solo en el servidor; `AuthModal` limpia campos al reabrirse; refactor de auth sin cambio de contrato y cubierto por T-B-01; `npm audit fix` sin saltos major y lockfiles versionados; `node_modules` fuera de git; smoke solo contra localhost con teardown verificado y credenciales admin por variables de entorno. Detalle en el threat model.
- Riesgos LOW restantes (TM-004..TM-008) quedan cubiertos por RNF-06, D-07 y el fallback `onError`; detalle en el threat model.

## Rollback

Sin schema, migraciones, contratos de API ni datos. Los cambios de backend (4.5, 5.2) no modifican contratos, así que frontend y backend se pueden revertir de forma independiente. Rollback = revertir el merge commit del PR (o los commits del bloque afectado si se detecta antes del merge); al revertir 4.5 hay que reinstalar dependencias (`npm ci`) porque cambian los lockfiles. Revertir 5.2 vuelve a dejar el Feed vacío (bug de `mvp-3`). No hay estado persistido afectado: `localStorage` (`libros_token`) no cambia. Si Google Fonts falla en producción, el sistema degrada a `Georgia`/`ui-monospace` por `display=swap` sin necesidad de rollback.

## Verificación final

- [ ] `grep -rn "onError" librosclub-frontend/src/components --include=*.tsx` solo encuentra `brand/CoverArt.tsx` (más tests); `grep -rn "grid-cols-2 sm:grid-cols-3" librosclub-frontend/src/components` sin resultados en archivos del alcance.
- [ ] `npm test` en `librosclub-frontend/`: T-U-01..T-U-15 y T-U-03a en verde; `npm run test:coverage` exit 0.
- [ ] `npm test` en `librosclub-backend/`: T-B-01 (11/11) y T-B-02 en verde.
- [ ] `npm run lint`: 0 errores. `npm run build`: exit 0.
- [ ] T-M-01..T-M-13 ejecutados y registrados en `docs/work/FEAT-001/verify-report.md` (fase VERIFY).
- [ ] Checklist de 11 flujos (RNF-06) con 0 diferencias vs `mvp-3`.
- [ ] Revisión visual de la usuaria aprobada para `/` y `/app` (desktop 1440 y mobile 390).
- [ ] `grep -rn "amber-\|Lora\|Space Mono\|dangerouslySetInnerHTML" librosclub-frontend/src` sin resultados en archivos del alcance (excluye `src/components/ui/` no usados y `ExchangeTab.tsx`, fuera de alcance).

### Verificación final — Smoke de 40 rutas (RNF-10, AC-37; T-M-11, fase VERIFY)

No es código de producción: se escribe y ejecuta en VERIFY como `docs/work/FEAT-001/smoke/smoke-routes.mjs` (Node 18+, `fetch` nativo, sin dependencias) + `docs/work/FEAT-001/smoke/teardown.sql`, y su resultado se registra en `docs/work/FEAT-001/verify-report.md`.

**Precondiciones y guardas**
- [ ] Backend local con `npm run dev` en `librosclub-backend/` (puerto 3000), PostgreSQL local con las tablas de `CLAUDE.md` (+ `clubs`, `club_members`, `club_meetings`, `club_posts`, `book_requests`, `book_request_messages`).
- [ ] Guarda de API: el script aborta si el host de `SMOKE_BASE_URL` (default `http://localhost:3000/api`) no es `localhost`/`127.0.0.1`/`::1`.
- [ ] Guarda de DB, **falla cerrada**: `DB_HOST` se toma de la variable de entorno `DB_HOST` si está definida; si no, se lee parseando a mano (sin `dotenv` ni otras dependencias: `fs.readFileSync` + split por línea, ignorando comentarios y comillas) el archivo con path explícito `librosclub-backend/.env` resuelto desde la raíz del repo. Si no se encuentra ningún valor, o el valor no es `localhost`/`127.0.0.1`/`::1`, el script termina con exit ≠ 0 **antes** de cualquier request. Nunca se ejecuta contra Railway/producción.
- [ ] El host validado se reutiliza tal cual (variable `VALIDATED_DB_HOST`) para el teardown; no se vuelve a leer de otra fuente.
- [ ] Usuario admin existente en la base local, con credenciales por variables de entorno `SMOKE_ADMIN_USERNAME` / `SMOKE_ADMIN_PASSWORD` (nunca en archivos versionados ni en el reporte). El usuario `user` lo crea el propio smoke.

**Presupuesto del `loginLimiter`** (10 requests / 15 min por IP, compartido por `/api/auth/login`, `/api/auth/register`, `/api/users/login`, `/api/users/register`): el smoke usa como máximo 7 — `POST /auth/register` (crea `smoke_feat001_<ts>_a@example.com`, 201), `POST /auth/register` con contraseña de 3 caracteres (400), `POST /auth/login` del usuario creado (200, su token se reutiliza en todo el smoke), `POST /auth/login` admin (200, token reutilizado), `POST /auth/login` con contraseña incorrecta (401), `POST /users/register` (crea `smoke_feat001_<ts>_b@example.com`), `POST /users/login` de ese usuario. Si aparece un `429`, el script espera y reintenta una sola vez en vez de desactivar el limiter; si persiste, falla con mensaje claro.

**Matriz de las 40 rutas** (código esperado: autorizado `2xx`; sin token `401` donde hay `authMiddleware`; rol `user` `403` donde hay `allowRoles('admin')`; validación `400`)

| Router (n) | Rutas y casos |
|---|---|
| auth (3) | `POST /auth/login` 200 / 401; `POST /auth/register` 201 / 400; `PUT /auth/upgrade` 401 sin token, 200 con token del usuario smoke (solo lo modifica a él) |
| users (2) | `POST /users/register` 2xx; `POST /users/login` 200 |
| books (11) | `GET /books/feed` 200; `GET /books` 200; `GET /books/requests` 401 / 403 user / 200 admin; `GET /books/my-requests` 401 / 200; `POST /books` 403 user / 201 admin (libro `smoke_feat001_libro`); `POST /books/:id/request` 401 / 2xx user sobre el libro smoke; `GET /books/requests/:reqId/messages` 200; `POST /books/requests/:reqId/messages` 2xx; `PUT /books/requests/:reqId` 403 user / 200 admin; `PUT /books/:id` 403 user / 200 admin (libro smoke); `DELETE /books/:id` 403 user / 200 admin (libro smoke) |
| protected (2) | `GET /protected` 401 / 200; `GET /admin-only` 403 user / 200 admin (montado bajo `/api`) |
| google-books (2) | `GET /google-books/feed?topic=fiction&page=0` 200 con `items.length ≥ 1`; `GET /google-books/search` sin `q` 400, con `q=borges` 200 |
| exchanges (7) | todas 401 sin token; `POST /exchanges` 201 (publicación smoke del admin); `GET /exchanges` 200 (user); `GET /exchanges/my` 200; `GET /exchanges/admin` 403 user / 200 admin; `POST /exchanges/:id/request` 2xx (user sobre la publicación smoke); `PUT /exchanges/requests/:requestId` 200 (dueño, `rejected`); `DELETE /exchanges/:id` 200 (dueño) |
| clubs (13) | `GET /clubs` 200 sin token; `GET /clubs/nearby?lat=-34.6&lng=-58.4&radius=5` 200 sin token; resto 401 sin token; `POST /clubs` 201 (club `smoke_feat001_club`); `POST /clubs/:id/join` 2xx (segundo usuario); `GET /clubs/:id` 200; `PUT /clubs/:id/current-book` 2xx o el `403` documentado de gating Premium; `PUT /clubs/:id/location` 2xx; `PUT /clubs/:id/upgrade` 2xx (club smoke); `POST /clubs/:id/meetings` 2xx; `DELETE /clubs/:id/meetings/:meetingId` 2xx; `POST /clubs/:id/posts` 2xx; `DELETE /clubs/:id/posts/:postId` 2xx; `DELETE /clubs/:id/leave` 2xx (segundo usuario) |

Total 40 rutas: auth 3 + users 2 + books 11 + protected 2 + google-books 2 + exchanges 7 + clubs 13. Donde una ruta depende del estado de gating Premium (`clubs`), el código esperado se toma del controller vigente y se documenta en el reporte; un código no esperado cuenta como falla.

**Datos de prueba y teardown**
- [ ] Todo dato creado lleva el prefijo `smoke_feat001_` (usernames, título de libro, nombre de club, publicación) y el script registra cada id creado.
- [ ] El propio smoke borra lo que la API permite borrar (libro, publicación, reunión, post, membresía).
- [ ] `teardown.sql` se ejecuta con `psql -h "$VALIDATED_DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -1 -f docs/work/FEAT-001/smoke/teardown.sql` (mismo host validado por la guarda; contraseña por `PGPASSWORD` en el entorno, nunca en línea de comandos ni en archivos; `-1` = una transacción) y borra en orden de dependencias lo que la API no expone: `book_request_messages` → `book_requests` → `exchange_requests` → `exchange_listings` → `club_posts` → `club_meetings` → `club_members` → `clubs` → `books` → `users`, filtrando por los ids registrados y por `username LIKE 'smoke\_feat001\_%'` / títulos y nombres con el prefijo (parámetros, no concatenación).
- [ ] Verificación de cierre: un `SELECT count(*)` por tabla filtrando por el prefijo y los ids registrados devuelve 0 en todas; el reporte incluye la tabla de conteos.

**Salida**: tabla de 40 filas (método, ruta, rol, código esperado, código obtenido, OK/FAIL) en `verify-report.md`; criterio de aprobación 40/40 OK + 0 remanentes. Los tokens y credenciales no se imprimen.
