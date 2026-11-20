const POSITIVE_INTEGER = /^[1-9]\d{0,9}$/;

module.exports = (req, res, next, value) => {
  if (!POSITIVE_INTEGER.test(value) || Number(value) > 2147483647) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }
  next();
};
