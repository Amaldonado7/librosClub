const express = require('express');
const { getBooks, getFeed } = require('../controllers/booksControllers');
const router = express.Router();

// Ruta principal para obtener todos los libros o buscar por título
router.get('/', getBooks); // GET /api/books

// Ruta para obtener el feed (últimos libros)
router.get('/feed', getFeed); // GET /api/books/feed

module.exports = router;
