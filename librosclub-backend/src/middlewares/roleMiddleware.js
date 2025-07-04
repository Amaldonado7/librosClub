const allowRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const usuario = req.user;

		// Mostramos el rol que llega del token
    console.log('🔍 Rol del usuario:', usuario?.role);

    if (!usuario || !rolesPermitidos.includes(usuario.role)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    next();
  };
};

module.exports = allowRoles;
