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
