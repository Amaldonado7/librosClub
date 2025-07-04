const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Configuración de la base de datos
const router = express.Router();

router.post('/login', async (req, res) => {
  console.log('Request recibido:', req.body); // Log inicial para verificar los datos recibidos

  const { username, password } = req.body;

  if (!username || !password) {
    console.log('Faltan credenciales en el body'); // Log para verificar el error
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
  }

  try {
    console.log('Buscando usuario en la base de datos...');
    const user = await pool.query('SELECT * FROM public.users WHERE username = $1', [username]);
    console.log('Resultado de la consulta:', user.rows); // Log para ver el resultado de la consulta

    if (user.rows.length === 0) {
      console.log('Usuario no encontrado');
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const userData = user.rows[0];

    console.log('Comparando contraseñas...');
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      console.log('La contraseña no coincide');
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    console.log('Generando token JWT...');
    const token = jwt.sign(
      { userId: userData.id, username: userData.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Login exitoso');
    res.json({ token });
  } catch (err) {
    console.error('Error en el servidor:', err); // Log del error del servidor
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
