const allowRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: 'Acceso denegado. Rol no autorizado.' });
    }
    next();
  };
};

module.exports = allowRoles;
