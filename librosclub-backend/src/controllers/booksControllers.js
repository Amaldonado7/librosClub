const pool = require('../config/db');

const BOOK_COLS = `id, title, author, genre, is_available, cover_url AS "coverUrl", type, description`;

// Obtener libros (todos o por título)
exports.getBooks = async (req, res) => {
  const { title } = req.query;
  try {
    let result;
    const select = `SELECT ${BOOK_COLS} FROM public.books`;
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
      `SELECT ${BOOK_COLS} FROM public.books ORDER BY id DESC LIMIT 10`
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
  const { title, author, genre, coverUrl, type, description } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: 'Título y autor son requeridos.' });
  }

  try {
    const result = await pool.query(
      `UPDATE public.books
       SET title = $1, author = $2, genre = $3, cover_url = $4,
           type = COALESCE($6, type), description = $7
       WHERE id = $5
       RETURNING ${BOOK_COLS}`,
      [title, author, genre || null, coverUrl || null, id, type || null, description || null]
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
  const { title, author, genre, coverUrl, type, description } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: 'Título y autor son requeridos.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.books (title, author, genre, cover_url, type, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${BOOK_COLS}`,
      [title, author, genre || null, coverUrl || null, type || 'venta', description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al agregar libro:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};

// Solicitar compra o intercambio de un libro
exports.requestBook = async (req, res) => {
  const userId = req.user.userId;
  const { id: bookId } = req.params;

  try {
    const { rows: books } = await pool.query(
      'SELECT id, type FROM public.books WHERE id = $1',
      [bookId]
    );
    if (books.length === 0) return res.status(404).json({ message: 'Libro no encontrado.' });

    const requestType = books[0].type === 'venta' ? 'compra' : 'intercambio';
    const { rows } = await pool.query(
      `INSERT INTO public.book_requests (book_id, user_id, type)
       VALUES ($1, $2, $3)
       ON CONFLICT (book_id, user_id) DO NOTHING
       RETURNING id, book_id AS "bookId", user_id AS "userId", type, status, created_at AS "createdAt"`,
      [bookId, userId, requestType]
    );

    if (rows.length === 0) return res.status(400).json({ message: 'Ya enviaste una solicitud para este libro.' });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('requestBook:', error);
    res.status(500).json({ message: 'Error al enviar solicitud.' });
  }
};

// Mis solicitudes (usuario autenticado)
exports.getMyBookRequests = async (req, res) => {
  const userId = req.user.userId;
  try {
    const { rows } = await pool.query(
      `SELECT br.id, br.book_id AS "bookId", br.type, br.status, br.created_at AS "createdAt",
              b.title, b.author, b.cover_url AS "coverUrl"
       FROM public.book_requests br
       JOIN public.books b ON b.id = br.book_id
       WHERE br.user_id = $1
       ORDER BY br.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('getMyBookRequests:', error);
    res.status(500).json({ message: 'Error al cargar solicitudes.' });
  }
};

// Todas las solicitudes (solo admin)
exports.getAdminBookRequests = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT br.id, br.book_id AS "bookId", br.type, br.status, br.created_at AS "createdAt",
              b.title, b.author,
              u.username AS "requesterUsername", u.id AS "requesterId"
       FROM public.book_requests br
       JOIN public.books b ON b.id = br.book_id
       JOIN public.users u ON u.id = br.user_id
       ORDER BY br.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('getAdminBookRequests:', error);
    res.status(500).json({ message: 'Error al cargar solicitudes.' });
  }
};

// Aceptar o rechazar solicitud (solo admin)
exports.respondToBookRequest = async (req, res) => {
  const { reqId } = req.params;
  const { status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  try {
    const { rowCount } = await pool.query(
      'UPDATE public.book_requests SET status = $1 WHERE id = $2',
      [status, reqId]
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Solicitud no encontrada.' });
    res.json({ message: 'Solicitud actualizada.' });
  } catch (error) {
    console.error('respondToBookRequest:', error);
    res.status(500).json({ message: 'Error al responder solicitud.' });
  }
};
