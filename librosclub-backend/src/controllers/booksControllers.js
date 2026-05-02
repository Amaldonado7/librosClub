const pool = require('../config/db');

// Obtener libros (todos o por título)
exports.getBooks = async (req, res) => {
  const { title } = req.query;

  try {
    let result;

    const select = 'SELECT id, title, author, genre, is_available, cover_url AS "coverUrl" FROM public.books';
    if (title) {
      result = await pool.query(`${select} WHERE title ILIKE $1`, [`%${title}%`]);
    } else {
      result = await pool.query(select);
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
      'SELECT id, title, author, genre, is_available, cover_url AS "coverUrl" FROM public.books ORDER BY id DESC LIMIT 10'
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en getFeed:', error);
    res.status(500).json({ error: 'Error al obtener el feed' });
  }
};

// Actualizar libro (solo para admins)
exports.updateBook = async (req, res) => {
  const { id } = req.params;
  const { title, author, genre, coverUrl } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: 'Título y autor son requeridos.' });
  }

  try {
    const result = await pool.query(
      `UPDATE public.books
       SET title = $1, author = $2, genre = $3, cover_url = $4
       WHERE id = $5
       RETURNING id, title, author, genre, is_available, cover_url AS "coverUrl"`,
      [title, author, genre || null, coverUrl || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar libro:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};

// Eliminar libro (solo para admins)
exports.deleteBook = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM public.books WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado.' });
    }
    res.json({ message: 'Libro eliminado.' });
  } catch (error) {
    console.error('Error al eliminar libro:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};

// Agregar libro (solo para admins)
exports.createBook = async (req, res) => {
  const { title, author, genre, coverUrl } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: 'Título y autor son requeridos.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO public.books (title, author, genre, cover_url) VALUES ($1, $2, $3, $4) RETURNING id, title, author, genre, cover_url AS "coverUrl"',
      [title, author, genre || null, coverUrl || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al agregar libro:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};
