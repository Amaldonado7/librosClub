const pool = require('../config/db');

// Obtener libros (todos o por título)
exports.getBooks = async (req, res) => {
  const { title } = req.query;

  try {
    let result;

    if (title) {
      result = await pool.query(
        'SELECT * FROM public.books WHERE title ILIKE $1',
        [`%${title}%`]
      );
    } else {
      result = await pool.query('SELECT * FROM public.books');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en getBooks:', error);
    res.status(500).json({ error: 'Error al obtener libros' });
  }
};

// Obtener feed (últimos 10 libros)
exports.getFeed = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM public.books ORDER BY id DESC LIMIT 10'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en getFeed:', error);
    res.status(500).json({ error: 'Error al obtener el feed' });
  }
};

// Agregar libro (solo para admins)
exports.createBook = async (req, res) => {
  const { title, author, genre } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: 'Título y autor son requeridos.' });
  }

  try {
    await pool.query(
      'INSERT INTO public.books (title, author, genre) VALUES ($1, $2, $3)',
      [title, author, genre]
    );
    res.status(201).json({ message: 'Libro agregado exitosamente.' });
  } catch (error) {
    console.error('Error al agregar libro:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};
