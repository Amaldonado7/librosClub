# LibrosClub

Plataforma web para descubrir, buscar e intercambiar libros. Trabajo final de la carrera de Analista de Sistemas en Escuela Da Vinci.

## Tecnologías

### Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS + Shadcn UI (Radix UI)
- Framer Motion
- TanStack Query · React Router DOM · jwt-decode

### Backend
- Node.js 18+ + Express
- PostgreSQL (`pg`)
- JWT (`jsonwebtoken`) · BcryptJS · node-fetch v2

## Instalación

### Requisitos
- Node.js 20+ (recomendado; mínimo 18)
- PostgreSQL
- npm

### 1. Clonar el repositorio

```bash
git clone https://github.com/Amaldonado7/librosClub.git
cd librosClub
```

### 2. Backend

```bash
cd librosclub-backend
npm install
```

Crear archivo `.env`:

```env
PORT=3000
DB_USER=tu_usuario
DB_HOST=localhost
DB_NAME=librosclub
DB_PASSWORD=tu_contraseña
DB_PORT=5432
JWT_SECRET=un_secreto_seguro
GOOGLE_BOOKS_API_KEY=tu_api_key
GOOGLE_BOOKS_CACHE_TTL_MS=600000
```

```bash
npm run dev   # nodemon, puerto 3000
```

### 3. Base de datos

```sql
-- Usuarios
CREATE TABLE public.users (
  id       SERIAL PRIMARY KEY,
  username VARCHAR(50)  NOT NULL,
  password VARCHAR(255) NOT NULL,
  role     VARCHAR(20)  NOT NULL
);

-- Catálogo de libros
CREATE TABLE public.books (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(100),
  author       VARCHAR(100),
  genre        VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  cover_url    VARCHAR(500)
);

-- Publicaciones de intercambio
CREATE TABLE public.exchange_listings (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  author      VARCHAR(200) NOT NULL,
  cover_url   VARCHAR(500),
  description VARCHAR(500),
  status      VARCHAR(20) NOT NULL DEFAULT 'available',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Solicitudes de intercambio
CREATE TABLE public.exchange_requests (
  id           SERIAL PRIMARY KEY,
  listing_id   INTEGER NOT NULL REFERENCES public.exchange_listings(id) ON DELETE CASCADE,
  requester_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(listing_id, requester_id)
);
```

#### Migraciones

Las migraciones de `librosclub-backend/migrations/` se aplican a mano y son idempotentes (se pueden correr más de una vez):

```bash
cd librosclub-backend
psql -d librosclub -f migrations/001_add_book_type.sql
psql -d librosclub -f migrations/002_create_gift_books.sql
psql -d librosclub -f migrations/003_seed_gift_books.sql
psql -d librosclub -f migrations/004_update_gift_books_covers.sql
```

| Tabla | Descripción |
|-------|-------------|
| `public.gift_books` | Catálogo curado para el test de regalo: `id, title, author, cover_url, cover_color, genre_label, why, dedication, share_quote, age_ranges, reading_levels, hooks, kinds, length, tones, active, created_at, updated_at`. Las etiquetas están restringidas por `CHECK` a valores cerrados; `age_ranges` solo admite `joven` y `adulto`. |

`002_create_gift_books.sql` crea la tabla del catálogo de regalo y `003_seed_gift_books.sql` carga la semilla curada.

> Solo en bases **locales**: si ya aplicaste una versión anterior de `002_create_gift_books.sql`, corré `DROP TABLE IF EXISTS public.gift_books;` antes de re-aplicar 002 y 003, porque `CREATE TABLE IF NOT EXISTS` no actualiza los `CHECK` de una tabla que ya existe. **Nunca** lo hagas en producción.

`003_seed_gift_books.sql` y `004_update_gift_books_covers.sql` se generan desde `migrations/seed/gift_books.json` con `npm run seed:gift:build`; no se editan a mano. Una migración aplicada en producción queda **congelada**: se registra su sha256 en `migrations/seed/frozen.json` (`{ "003_seed_gift_books.sql": "<sha256>" }`), el generador la omite sin reescribirla y toda curación posterior (alta, edición o desactivación de libros) va en una migración nueva con `INSERT ... ON CONFLICT (id) DO UPDATE` / `UPDATE ... WHERE id = ...` explícitos. 003 ya está congelada. 004 trae un `UPDATE` de `cover_url` por cada libro con portada y se congela recién cuando se aplica en producción con portadas; a partir de ahí, cualquier cambio de portadas va en una migración `005+`.

En producción, 004 se aplica cortando en el primer error, para que un fallo devuelva un código distinto de 0 en lugar de terminar en un `ROLLBACK` silencioso:

```bash
psql -v ON_ERROR_STOP=1 -d librosclub -f migrations/004_update_gift_books_covers.sql
```

##### Portadas del catálogo de regalo

Las portadas se buscan en Google Books desde la máquina de desarrollo y se aprueban a mano antes de llegar a la base:

1. Con `GOOGLE_BOOKS_API_KEY` en `librosclub-backend/.env` (solo ahí, nunca en el código ni en el repositorio; preferentemente una key de desarrollo distinta de la de producción), `npm run covers:gift:find` busca hasta 3 candidatos por cada libro sin portada y escribe `scripts/out/gift-cover-candidates.json` y `scripts/out/gift-cover-candidates.html`. `scripts/out/` no se versiona.
2. Revisá `scripts/out/gift-cover-candidates.html` y completá `approvedVolumeId` en `scripts/out/gift-cover-candidates.json` con el `volumeId` elegido para cada libro (dejá `null` si ninguno sirve).
3. `npm run covers:gift:apply` copia las portadas aprobadas a `migrations/seed/gift_books.json`, validando de nuevo cada URL.
4. `npm run seed:gift:build` regenera `migrations/004_update_gift_books_covers.sql` (003 está congelada y no se toca), y `npm test` verifica que 004 y el catálogo coincidan.

### 4. Frontend

```bash
cd ../librosclub-frontend
npm install
npm run dev   # Vite, puerto 8080
```

## Funcionalidades

### Feed
Exploración de libros desde Google Books API, filtrada por género (Ficción, Fantasía, Romance, Thriller, Misterio, Terror, Historia, Biografía, Ciencia, Poesía). Chips de selección rápida y botón "Cargar más" con paginación real vía `startIndex`.

### Buscar
Búsqueda libre en Google Books por título, autor, saga o ISBN. Submit explícito (Enter o botón) para no saturar la API.

### Todos
Catálogo propio de la plataforma almacenado en PostgreSQL. Los admins ven un banner de acceso directo al panel de gestión.

### Intercambiar
Sistema P2P de intercambio de libros:
- Publicar un libro con portada, descripción y estado del ejemplar
- Explorar libros disponibles de otros usuarios
- Solicitar un intercambio → el dueño acepta o rechaza
- Al aceptar: el libro queda marcado como "intercambiado" y las demás solicitudes se rechazan automáticamente
- "Mis publicaciones" muestra las solicitudes entrantes con acciones

### Gestionar libros (Admin)
Panel exclusivo para admins:
- Agregar libros al catálogo con portada (URL) y preview en tiempo real
- Editar cualquier campo inline sin salir de la página
- Eliminar con confirmación de dos pasos

## Endpoints

### Auth
| Método | Ruta | Auth | Body |
|--------|------|------|------|
| POST | `/api/auth/login` | No | `{ username, password }` |

### Books
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/books` | No | Lista (`?title=` para buscar) |
| GET | `/api/books/feed` | No | Últimos 10 |
| POST | `/api/books` | Admin | `{ title, author, genre?, coverUrl? }` |
| PUT | `/api/books/:id` | Admin | Actualizar libro |
| DELETE | `/api/books/:id` | Admin | Eliminar libro |

### Google Books
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/google-books/feed` | No | `?topic=&limit=&page=&lang=` |
| GET | `/api/google-books/search` | No | `?q=&page=&pageSize=&lang=` |

### Exchanges
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/exchanges` | Sí | Publicaciones disponibles (con estado de solicitud propia) |
| POST | `/api/exchanges` | Sí | `{ title, author, coverUrl?, description? }` |
| DELETE | `/api/exchanges/:id` | Sí | Eliminar publicación propia |
| GET | `/api/exchanges/my` | Sí | Mis publicaciones con solicitudes |
| POST | `/api/exchanges/:id/request` | Sí | Solicitar intercambio |
| PUT | `/api/exchanges/requests/:id` | Sí | `{ status: 'accepted' \| 'rejected' }` |

### Regalo
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/gift/recommendations` | No | Recibe las 8 respuestas del test (`relationship, occasion, age, readingLevel, hook, kind, length, tone`; `age` admite `joven` (18–30) o `adulto` (31–60)) y devuelve `{ profile, books }` con 3 libros. Límite: 30 pedidos / 15 min por IP y cuerpo ≤2 KB (413 si se excede). |

> Despliegue: el límite por IP asume exactamente un proxy delante del backend (`trust proxy` = 1, como en Railway). Sin proxy, el header `X-Forwarded-For` lo controla el cliente y el límite se puede evadir.

## Roles

| Rol | Permisos |
|-----|----------|
| `user` | Ver catálogo, buscar, feed, intercambiar |
| `admin` | Todo lo anterior + agregar, editar y eliminar libros del catálogo |

## Diseño

Identidad visual basada en el brandbook de LibrosClub (Poulain):
- **Colores:** Cremita `#F7F0E2`, Verde Oliva `#5E5827`, Marrón Oscuro `#492710`, Amarillo `#F2D661`
- **Tipografía:** Space Mono (títulos), Lora (cuerpo), Beth Ellen (acentos)

## Créditos

Desarrollado por [Ariadna Maldonado](https://github.com/Amaldonado7)  
Trabajo final – Escuela Da Vinci – Analista de Sistemas
