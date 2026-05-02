const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Configuración de la base de datos
const router = express.Router();

router.post('/login', async (req, res) => {
  console.log('Request recibido:', req.body);

  const { username, password } = req.body;

  if (!username || !password) {
    console.log('Faltan credenciales en el body');
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
  }

  try {
    console.log('Buscando usuario en la base de datos...');
    const user = await pool.query('SELECT * FROM public.users WHERE username = $1', [username]);
    console.log('Resultado de la consulta:', user.rows);

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
      {
        userId: userData.id,
        username: userData.username,
        role: userData.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login exitoso');
    res.json({ token });
  } catch (err) {
    console.error('Error en el servidor:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
  }
  try {
    const existing = await pool.query('SELECT id FROM public.users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Ese usuario ya está registrado.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO public.users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashed, 'user']
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token });
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ message: 'Error del servidor.' });
  }
});

module.exports = router;
