const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function effectivePlan(userData) {
  if (userData.plan !== 'premium') return 'free';
  if (userData.plan_expires_at && new Date(userData.plan_expires_at) < new Date()) return 'free';
  return 'premium';
}

function signToken({ id, username, role }, plan) {
  return jwt.sign(
    { userId: id, username, role, plan },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
  }

  try {
    const user = await pool.query('SELECT * FROM public.users WHERE username = $1', [username]);

    if (user.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const userData = user.rows[0];
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    res.json({ token: signToken(userData, effectivePlan(userData)) });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

exports.register = async (req, res) => {
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
    res.status(201).json({ token: signToken(result.rows[0], 'free') });
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};

exports.upgrade = async (req, res) => {
  const userId = req.user.userId;
  try {
    await pool.query(
      `UPDATE public.users SET plan = 'premium', plan_expires_at = NOW() + INTERVAL '30 days' WHERE id = $1`,
      [userId]
    );
    const userRow = await pool.query('SELECT * FROM public.users WHERE id = $1', [userId]);
    res.json({ token: signToken(userRow.rows[0], 'premium') });
  } catch (err) {
    console.error('upgrade user:', err);
    res.status(500).json({ message: 'Error al actualizar el plan.' });
  }
};
