require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importar rutas
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');
const googleBooksRoutes = require('./routes/googleBooks');
const exchangeRoutes   = require('./routes/exchanges');
const clubsRoutes      = require('./routes/clubs');

// Crear la instancia de Express
const app = express();

// Configuración de seguridad con Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // Permitir recursos del mismo origen
        fontSrc: ["'self'", "https://fonts.gstatic.com"], // Fuentes externas (ajusta según necesidades)
        styleSrc: ["'self'", "https://fonts.googleapis.com"], // Hojas de estilo externas
        scriptSrc: ["'self'"], // Scripts del mismo origen
      },
    },
    crossOriginEmbedderPolicy: false, // Si usas fuentes externas con CORS
  })
);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : [];

function isAllowedOrigin(origin) {
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return allowedOrigins.some((pattern) => {
    if (!pattern.includes('*')) return pattern === origin;
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$');
    return regex.test(origin);
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Configurar rutas
app.use('/api', protectedRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', loginLimiter);
app.use('/api/users/login', loginLimiter);
app.use('/api/users/register', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes); // Rutas de libros
app.use('/api/protected', protectedRoutes); // Rutas protegidas
app.use('/api/users', usersRoutes); // Rutas de usuarios
app.use('/api/google-books', googleBooksRoutes);
app.use('/api/exchanges',   exchangeRoutes);
app.use('/api/clubs',       clubsRoutes);

module.exports = app;
