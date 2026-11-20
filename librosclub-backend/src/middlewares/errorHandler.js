const CORS_REJECTION = 'Not allowed by CORS';

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido.' });
  }
  if (err.message === CORS_REJECTION) {
    return res.status(403).json({ message: 'Origen no permitido.' });
  }
  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500 && err.expose) {
    return res.status(err.status).json({ message: 'Solicitud inválida.' });
  }

  console.error(`${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ message: 'Error del servidor.' });
};
