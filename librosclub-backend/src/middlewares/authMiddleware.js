const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No hay token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Guardamos la información del usuario decodificada en la request
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token no válido.' });
  }
};

module.exports = authMiddleware;
