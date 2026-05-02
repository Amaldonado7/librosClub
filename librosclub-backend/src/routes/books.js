const express = require('express');
const {
  getBooks, getFeed, createBook, updateBook, deleteBook,
  requestBook, getMyBookRequests, getAdminBookRequests, respondToBookRequest,
} = require('../controllers/booksControllers');
const authMiddleware = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/allowRoles');
const router = express.Router();

// Rutas estáticas primero (antes de /:id)
router.get('/feed',         getFeed);
router.get('/requests',     authMiddleware, allowRoles('admin'), getAdminBookRequests);
router.get('/my-requests',  authMiddleware, getMyBookRequests);
router.get('/',             getBooks);

router.post('/',            authMiddleware, allowRoles('admin'), createBook);
router.post('/:id/request', authMiddleware, requestBook);

// PUT /requests/:reqId antes de PUT /:id para evitar conflicto de parámetros
router.put('/requests/:reqId', authMiddleware, allowRoles('admin'), respondToBookRequest);
router.put('/:id',             authMiddleware, allowRoles('admin'), updateBook);

router.delete('/:id',       authMiddleware, allowRoles('admin'), deleteBook);

module.exports = router;
