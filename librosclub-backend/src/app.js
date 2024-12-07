const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importar rutas
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');

// Crear la instancia de Express
const app = express();

// Configuración de middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar rutas
app.use('/api/auth', authRoutes); // Rutas de autenticación
app.use('/api/books', booksRoutes); // Rutas de libros
app.use('/api/protected', protectedRoutes); // Rutas protegidas
app.use('/api/users', usersRoutes); // Rutas de usuarios

module.exports = app;
