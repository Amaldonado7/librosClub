const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

// Ruta protegida
router.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Acceso permitido', user: req.user });
});

// Ruta solo para admins
router.get('/admin-only', authMiddleware, allowRoles('admin'), (req, res) => {
  res.json({ message: `Bienvenido admin ${req.user.username}` });
});


module.exports = router;
