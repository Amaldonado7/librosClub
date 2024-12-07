const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Asegúrate de que la configuración de tu base de datos esté correcta
const router = express.Router();

// Ruta de login
router.post('/login', async (req, res) => {
  const { username, password } = req.body; // Cambié email por username

  if (!username || !password) {
    return res.status(400).json({ message: 'Username y contraseña son requeridos.' }); // Actualicé el mensaje de error
  }

  try {
    // Verificar que el username exista en la base de datos
    const user = await pool.query('SELECT * FROM public."users" WHERE username = $1', [username]);

    if (user.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // Comparar la contraseña ingresada con la almacenada (hash)
    const isMatch = await bcrypt.compare(password, user.rows[0].password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // Crear un token JWT
    const token = jwt.sign(
      { userId: user.rows[0].id, username: user.rows[0].username },
      process.env.JWT_SECRET, // Asegúrate de definir JWT_SECRET en tus variables de entorno
      { expiresIn: '1h' } // Expira en 1 hora
    );

    // Retornar el token
    return res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
