const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Ruta protegida
router.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Acceso permitido', user: req.user });
});

module.exports = router;
