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

// Obtener feed (últimos libros)
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
