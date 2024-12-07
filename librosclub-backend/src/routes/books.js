const express = require('express');
const { getBooks, getFeed } = require('../controllers/booksControllers');
const router = express.Router();

// Ruta principal para obtener todos los libros o buscar por título
router.get('/', getBooks); // Cambié /search a /

// Ruta para obtener el feed (últimos libros)
router.get('/feed', getFeed);

module.exports = router;
