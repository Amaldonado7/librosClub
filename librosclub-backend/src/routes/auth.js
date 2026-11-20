const express = require('express');
const { login, register, upgrade } = require('../controllers/authControllers');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.put('/upgrade', authMiddleware, upgrade);

module.exports = router;
