const express = require('express');
const { getBooks, getFeed, createBook, updateBook, deleteBook } = require('../controllers/booksControllers');
const authMiddleware = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/allowRoles');
const router = express.Router();

// Ruta principal para obtener todos los libros o buscar por título
router.get('/', getBooks); // GET /api/books

// Ruta para obtener el feed (últimos libros)
router.get('/feed', getFeed); // GET /api/books/feed

// Agregar un nuevo libro (solo admin)
router.post('/', authMiddleware, allowRoles('admin'), createBook);

// Actualizar libro (solo admin)
router.put('/:id', authMiddleware, allowRoles('admin'), updateBook);

// Eliminar libro (solo admin)
router.delete('/:id', authMiddleware, allowRoles('admin'), deleteBook);

module.exports = router;
