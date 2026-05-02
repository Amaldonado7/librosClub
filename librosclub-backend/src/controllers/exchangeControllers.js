const pool = require('../config/db');

// Listar publicaciones disponibles (excluyendo las propias)
exports.getListings = async (req, res) => {
  const userId = req.user.userId;
  try {
    const { rows } = await pool.query(
      `SELECT
         el.id,
         el.user_id        AS "userId",
         u.username,
         el.title,
         el.author,
         el.cover_url      AS "coverUrl",
         el.description,
         el.status,
         el.created_at     AS "createdAt",
         er.status         AS "myRequestStatus"
       FROM public.exchange_listings el
       JOIN public.users u ON u.id = el.user_id
       LEFT JOIN public.exchange_requests er
         ON er.listing_id = el.id AND er.requester_id = $1
       WHERE el.status = 'available' AND el.user_id != $1
       ORDER BY el.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('getListings:', err);
    res.status(500).json({ message: 'Error al obtener publicaciones.' });
  }
};

// Crear una publicación
exports.createListing = async (req, res) => {
  const userId = req.user.userId;
  const { title, author, coverUrl, description } = req.body;

  if (!title?.trim() || !author?.trim()) {
    return res.status(400).json({ message: 'Título y autor son requeridos.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO public.exchange_listings (user_id, title, author, cover_url, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id AS "userId", title, author,
                 cover_url AS "coverUrl", description, status,
                 created_at AS "createdAt"`,
      [userId, title.trim(), author.trim(), coverUrl || null, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createListing:', err);
    res.status(500).json({ message: 'Error al crear publicación.' });
  }
};

// Eliminar publicación (propia, o cualquiera si es admin)
exports.deleteListing = async (req, res) => {
  const userId = req.user.userId;
  const isAdmin = req.user.role === 'admin';
  const { id } = req.params;

  try {
    const query = isAdmin
      ? 'DELETE FROM public.exchange_listings WHERE id = $1'
      : 'DELETE FROM public.exchange_listings WHERE id = $1 AND user_id = $2';
    const params = isAdmin ? [id] : [id, userId];
    const { rowCount } = await pool.query(query, params);
    if (rowCount === 0) return res.status(404).json({ message: 'No encontrada o sin permiso.' });
    res.json({ message: 'Publicación eliminada.' });
  } catch (err) {
    console.error('deleteListing:', err);
    res.status(500).json({ message: 'Error al eliminar.' });
  }
};

// Todas las publicaciones (solo admin)
exports.getAdminListings = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         el.id,
         el.user_id    AS "userId",
         u.username,
         el.title,
         el.author,
         el.cover_url  AS "coverUrl",
         el.description,
         el.status,
         el.created_at AS "createdAt"
       FROM public.exchange_listings el
       JOIN public.users u ON u.id = el.user_id
       ORDER BY el.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('getAdminListings:', err);
    res.status(500).json({ message: 'Error al obtener publicaciones.' });
  }
};

// Mis publicaciones con sus solicitudes
exports.getMyListings = async (req, res) => {
  const userId = req.user.userId;
  try {
    const { rows: listings } = await pool.query(
      `SELECT el.id, el.user_id AS "userId", u.username,
              el.title, el.author, el.cover_url AS "coverUrl",
              el.description, el.status, el.created_at AS "createdAt"
       FROM public.exchange_listings el
       JOIN public.users u ON u.id = el.user_id
       WHERE el.user_id = $1
       ORDER BY el.created_at DESC`,
      [userId]
    );

    if (listings.length === 0) return res.json([]);

    const ids = listings.map((l) => l.id);
    const { rows: requests } = await pool.query(
      `SELECT er.id, er.listing_id AS "listingId",
              er.requester_id AS "requesterId",
              u.username AS "requesterUsername",
              er.status, er.created_at AS "createdAt"
       FROM public.exchange_requests er
       JOIN public.users u ON u.id = er.requester_id
       WHERE er.listing_id = ANY($1)
       ORDER BY er.created_at ASC`,
      [ids]
    );

    const result = listings.map((l) => ({
      ...l,
      requests: requests.filter((r) => r.listingId === l.id),
    }));

    res.json(result);
  } catch (err) {
    console.error('getMyListings:', err);
    res.status(500).json({ message: 'Error al obtener tus publicaciones.' });
  }
};

// Solicitar intercambio
exports.requestExchange = async (req, res) => {
  const userId = req.user.userId;
  const { id: listingId } = req.params;

  try {
    // Verificar que no sea propia
    const { rows: listing } = await pool.query(
      'SELECT user_id, status FROM public.exchange_listings WHERE id = $1',
      [listingId]
    );
    if (listing.length === 0) return res.status(404).json({ message: 'Publicación no encontrada.' });
    if (listing[0].user_id === userId) return res.status(400).json({ message: 'No podés solicitar tu propio libro.' });
    if (listing[0].status !== 'available') return res.status(400).json({ message: 'Este libro ya no está disponible.' });

    const { rows } = await pool.query(
      `INSERT INTO public.exchange_requests (listing_id, requester_id)
       VALUES ($1, $2)
       ON CONFLICT (listing_id, requester_id) DO NOTHING
       RETURNING id, listing_id AS "listingId", requester_id AS "requesterId", status, created_at AS "createdAt"`,
      [listingId, userId]
    );

    if (rows.length === 0) return res.status(400).json({ message: 'Ya enviaste una solicitud para este libro.' });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('requestExchange:', err);
    res.status(500).json({ message: 'Error al solicitar intercambio.' });
  }
};

// Aceptar o rechazar solicitud
exports.respondToRequest = async (req, res) => {
  const userId = req.user.userId;
  const { requestId } = req.params;
  const { status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  try {
    // Verificar que la solicitud pertenece a una publicación del usuario
    const { rows: req_ } = await pool.query(
      `SELECT er.id, er.listing_id, el.user_id
       FROM public.exchange_requests er
       JOIN public.exchange_listings el ON el.id = er.listing_id
       WHERE er.id = $1`,
      [requestId]
    );
    if (req_.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada.' });
    if (req_[0].user_id !== userId) return res.status(403).json({ message: 'Sin permiso.' });

    const listingId = req_[0].listing_id;

    // Actualizar solicitud
    await pool.query(
      'UPDATE public.exchange_requests SET status = $1 WHERE id = $2',
      [status, requestId]
    );

    if (status === 'accepted') {
      // Marcar el libro como intercambiado
      await pool.query(
        "UPDATE public.exchange_listings SET status = 'exchanged' WHERE id = $1",
        [listingId]
      );
      // Rechazar las otras solicitudes pendientes
      await pool.query(
        "UPDATE public.exchange_requests SET status = 'rejected' WHERE listing_id = $1 AND id != $2 AND status = 'pending'",
        [listingId, requestId]
      );
    }

    res.json({ message: 'Solicitud actualizada.' });
  } catch (err) {
    console.error('respondToRequest:', err);
    res.status(500).json({ message: 'Error al responder solicitud.' });
  }
};
