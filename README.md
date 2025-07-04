# 📚 LibrosClub

**LibrosClub** es una plataforma web desarrollada como trabajo final para la carrera de Analista de Sistemas en Escuela Da Vinci. El objetivo del proyecto es conectar a lectores a través de una experiencia unificada que permite descubrir, buscar y compartir libros, fomentando también la creación de comunidades lectoras.

---

## 🚀 Tecnologías utilizadas

### 🖥️ Frontend

- [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- TypeScript
- Tailwind CSS
- Shadcn UI + Radix UI
- React Hook Form
- React Router DOM
- JWT para autenticación (token)

### 🗄️ Backend

- Node.js + Express
- PostgreSQL
- JWT (jsonwebtoken)
- BcryptJS para hashing de contraseñas
- Dotenv para configuración de variables

---

## ⚙️ Instalación

### Requisitos:

- Node.js 18+
- PostgreSQL
- npm

### 1. Clonar el repositorio

```bash
git clone https://github.com/Amaldonado7/librosClub.git
cd librosClub
```

### 2. Instalar dependencias

#### Backend

```bash
cd librosclub-backend
npm install
```

#### Frontend

```bash
cd ../librosclub-frontend
npm install
```

### 3. Variables de entorno

#### Backend - Crear archivo `.env` en `librosclub-backend`

```env
PORT=3000
DB_USER=tu_usuario
DB_HOST=localhost
DB_DATABASE=librosclub
DB_PASSWORD=tu_contraseña
DB_PORT=5432
JWT_SECRET=un_secreto_seguro
```

---

## 🔑 Roles de usuario

- **admin**: puede ver, buscar y **agregar libros**
- **user**: puede ver y buscar libros

---

## 🔐 Autenticación

El sistema usa **JWT tokens** para proteger rutas privadas y validar el rol del usuario.

---

## 📚 Endpoints principales

### 🔐 Auth

- `POST /api/auth/login`
  → Iniciar sesión y obtener token

### 📖 Books

- `GET /api/books`
  → Lista completa de libros

- `GET /api/books?title=palabra`
  → Buscar libros por título

- `GET /api/books/feed`
  → Últimos 10 libros agregados

- `POST /api/books`
  → Agregar nuevo libro (solo `admin`)

  **Headers:**
  `Authorization: Bearer <token>`

  **Body:**

  ```json
  {
    "title": "Título del libro",
    "author": "Autor",
    "genre": "Género"
  }
  ```

### 🛡️ Verificación de token

- `GET /api/protected`
  → Verifica si el token es válido

- `GET /api/admin-only`
  → Ruta protegida solo para admins

---

## 💻 Interfaz de usuario

Una vez logueado, el usuario accede a un `Dashboard` donde puede:

- Ver el feed de los últimos libros
- Buscar por título
- Ver todos los libros
- Si es admin: aparece formulario para agregar libros

---

## 📂 Estructura del proyecto

```
librosClub/
├── librosclub-backend/
│   ├── routes/
│   ├── controllers/
│   ├── middlewares/
│   ├── config/db.js
│   └── ...
└── librosclub-frontend/
    ├── src/components/
    ├── src/pages/
    ├── src/utils/
    ├── src/contexts/
    └── ...
```

---

## 🙋‍♀️ Créditos

Desarrollado por [Ariadna Maldonado](https://github.com/Amaldonado7)
Trabajo final – Escuela Da Vinci – Analista de Sistemas

---
