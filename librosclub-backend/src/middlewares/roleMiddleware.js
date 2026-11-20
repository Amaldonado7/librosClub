const allowRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const usuario = req.user;

    if (!usuario || !rolesPermitidos.includes(usuario.role)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    next();
  };
};

module.exports = allowRoles;
