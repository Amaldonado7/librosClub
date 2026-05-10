const pool = require('../config/db');

async function getMiRol(userId, clubId) {
  const { rows } = await pool.query(
    'SELECT rol FROM public.club_members WHERE usuario_id = $1 AND club_id = $2',
    [userId, clubId]
  );
  return rows[0]?.rol ?? null;
}

async function isPremiumClub(clubId) {
  const { rows } = await pool.query(
    'SELECT plan, plan_expires_at FROM public.clubs WHERE id = $1',
    [clubId]
  );
  if (!rows.length) return null;
  const { plan, plan_expires_at } = rows[0];
  if (plan !== 'premium') return false;
  if (plan_expires_at && new Date(plan_expires_at) < new Date()) return false;
  return true;
}

exports.getClubs = async (req, res) => {
  const userId = req.user?.userId ?? null;
  try {
    const { rows } = await pool.query(
      `SELECT
         c.id,
         c.nombre,
         c.descripcion,
         c.ubicacion,
         c.lat,
         c.lng,
         c.creador_id             AS "creadorId",
         u.username               AS "creadorUsername",
         c.fecha_creacion         AS "fechaCreacion",
         COUNT(cm.usuario_id)::int AS miembros,
         MAX(CASE WHEN cm.usuario_id = $1 THEN cm.rol END) AS "miRol",
         c.current_book_title     AS "currentBookTitle",
         c.current_book_author    AS "currentBookAuthor",
         c.current_book_cover_url AS "currentBookCoverUrl",
         c.plan,
         c.plan_expires_at        AS "planExpiresAt"
       FROM public.clubs c
       JOIN public.users u ON u.id = c.creador_id
       LEFT JOIN public.club_members cm ON cm.club_id = c.id
       GROUP BY c.id, u.username
       ORDER BY c.fecha_creacion DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('getClubs:', err);
    res.status(500).json({ message: 'Error al cargar clubes.' });
  }
};

exports.createClub = async (req, res) => {
  const { nombre, descripcion, ubicacion, lat, lng } = req.body;
  const creadorId = req.user.userId;

  if (!nombre?.trim()) {
    return res.status(400).json({ message: 'El nombre es requerido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO public.clubs (nombre, descripcion, ubicacion, lat, lng, creador_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, descripcion, ubicacion, lat, lng, creador_id AS "creadorId", fecha_creacion AS "fechaCreacion"`,
      [nombre.trim(), descripcion?.trim() || null, ubicacion?.trim() || null, lat ?? null, lng ?? null, creadorId]
    );
    const club = rows[0];
    await client.query(
      `INSERT INTO public.club_members (usuario_id, club_id, rol) VALUES ($1, $2, 'admin')`,
      [creadorId, club.id]
    );
    await client.query('COMMIT');

    const { rows: userRows } = await pool.query('SELECT username FROM public.users WHERE id = $1', [creadorId]);
    res.status(201).json({
      ...club,
      creadorUsername: userRows[0].username,
      miembros: 1,
      miRol: 'admin',
      currentBookTitle: null,
      currentBookAuthor: null,
      currentBookCoverUrl: null,
      plan: 'free',
      planExpiresAt: null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createClub:', err);
    res.status(500).json({ message: 'Error al crear el club.' });
  } finally {
    client.release();
  }
};

exports.joinClub = async (req, res) => {
  const userId = req.user.userId;
  const { id: clubId } = req.params;
  try {
    const premium = await isPremiumClub(clubId);
    if (premium === null) return res.status(404).json({ message: 'Club no encontrado.' });
    if (!premium) {
      const { rows: countRows } = await pool.query(
        'SELECT COUNT(*) FROM public.club_members WHERE club_id = $1',
        [clubId]
      );
      if (parseInt(countRows[0].count) >= 10) {
        return res.status(403).json({
          message: 'Este club está lleno (máx. 10 miembros en plan gratuito).',
          code: 'MEMBERS_LIMIT_REACHED',
        });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO public.club_members (usuario_id, club_id, rol)
       VALUES ($1, $2, 'miembro')
       ON CONFLICT (usuario_id, club_id) DO NOTHING
       RETURNING *`,
      [userId, clubId]
    );
    if (rows.length === 0) return res.status(400).json({ message: 'Ya sos miembro de este club.' });
    res.status(201).json({ message: 'Te uniste al club.' });
  } catch (err) {
    console.error('joinClub:', err);
    res.status(500).json({ message: 'Error al unirse al club.' });
  }
};

exports.leaveClub = async (req, res) => {
  const userId = req.user.userId;
  const { id: clubId } = req.params;
  try {
    const { rows: club } = await pool.query('SELECT creador_id FROM public.clubs WHERE id = $1', [clubId]);
    if (!club.length) return res.status(404).json({ message: 'Club no encontrado.' });
    if (club[0].creador_id === userId) {
      return res.status(400).json({ message: 'El creador no puede abandonar su propio club.' });
    }
    await pool.query(
      'DELETE FROM public.club_members WHERE usuario_id = $1 AND club_id = $2',
      [userId, clubId]
    );
    res.json({ message: 'Saliste del club.' });
  } catch (err) {
    console.error('leaveClub:', err);
    res.status(500).json({ message: 'Error al salir del club.' });
  }
};

exports.getClubDetail = async (req, res) => {
  const userId = req.user.userId;
  const isGlobalAdmin = req.user.role === 'admin';
  const { id: clubId } = req.params;

  const miRol = await getMiRol(userId, clubId);
  if (!miRol && !isGlobalAdmin) {
    return res.status(403).json({ message: 'No sos miembro de este club.' });
  }

  try {
    const { rows: clubRows } = await pool.query(
      `SELECT c.id, c.nombre, c.descripcion, c.ubicacion, c.lat, c.lng,
              c.creador_id             AS "creadorId",
              u.username               AS "creadorUsername",
              c.fecha_creacion         AS "fechaCreacion",
              COUNT(cm.usuario_id)::int AS miembros,
              MAX(CASE WHEN cm.usuario_id = $1 THEN cm.rol END) AS "miRol",
              c.current_book_title     AS "currentBookTitle",
              c.current_book_author    AS "currentBookAuthor",
              c.current_book_cover_url AS "currentBookCoverUrl",
              c.plan,
              c.plan_expires_at        AS "planExpiresAt"
       FROM public.clubs c
       JOIN public.users u ON u.id = c.creador_id
       LEFT JOIN public.club_members cm ON cm.club_id = c.id
       WHERE c.id = $2
       GROUP BY c.id, u.username`,
      [userId, clubId]
    );
    if (!clubRows.length) return res.status(404).json({ message: 'Club no encontrado.' });

    const { rows: meetings } = await pool.query(
      `SELECT id, club_id AS "clubId", titulo, descripcion, fecha, ubicacion, created_at AS "createdAt"
       FROM public.club_meetings
       WHERE club_id = $1 AND fecha >= NOW()
       ORDER BY fecha ASC`,
      [clubId]
    );

    const { rows: posts } = await pool.query(
      `SELECT p.id, p.club_id AS "clubId", p.autor_id AS "autorId",
              u.username AS "autorUsername", p.contenido, p.created_at AS "createdAt"
       FROM public.club_posts p
       JOIN public.users u ON u.id = p.autor_id
       WHERE p.club_id = $1
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [clubId]
    );

    res.json({ ...clubRows[0], meetings, posts });
  } catch (err) {
    console.error('getClubDetail:', err);
    res.status(500).json({ message: 'Error al cargar detalle del club.' });
  }
};

exports.setCurrentBook = async (req, res) => {
  const userId = req.user.userId;
  const isGlobalAdmin = req.user.role === 'admin';
  const { id: clubId } = req.params;

  const miRol = await getMiRol(userId, clubId);
  if (miRol !== 'admin' && !isGlobalAdmin) {
    return res.status(403).json({ message: 'Solo el admin del club puede cambiar el libro actual.' });
  }

  const premium = await isPremiumClub(clubId);
  if (!premium) {
    return res.status(403).json({ message: 'Esta función requiere plan Premium.', code: 'PREMIUM_REQUIRED' });
  }

  const { title, author, coverUrl } = req.body;
  try {
    await pool.query(
      `UPDATE public.clubs
       SET current_book_title = $1, current_book_author = $2, current_book_cover_url = $3
       WHERE id = $4`,
      [title ?? null, author ?? null, coverUrl ?? null, clubId]
    );
    res.json({ message: 'Libro actual actualizado.' });
  } catch (err) {
    console.error('setCurrentBook:', err);
    res.status(500).json({ message: 'Error al actualizar el libro actual.' });
  }
};

exports.addMeeting = async (req, res) => {
  const userId = req.user.userId;
  const isGlobalAdmin = req.user.role === 'admin';
  const { id: clubId } = req.params;

  const miRol = await getMiRol(userId, clubId);
  if (miRol !== 'admin' && !isGlobalAdmin) {
    return res.status(403).json({ message: 'Solo el admin del club puede agregar reuniones.' });
  }

  const premium = await isPremiumClub(clubId);
  if (!premium) {
    return res.status(403).json({ message: 'Esta función requiere plan Premium.', code: 'PREMIUM_REQUIRED' });
  }

  const { titulo, fecha, ubicacion, descripcion } = req.body;
  if (!titulo?.trim() || !fecha) {
    return res.status(400).json({ message: 'Título y fecha son requeridos.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO public.club_meetings (club_id, titulo, descripcion, fecha, ubicacion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, club_id AS "clubId", titulo, descripcion, fecha, ubicacion, created_at AS "createdAt"`,
      [clubId, titulo.trim(), descripcion?.trim() || null, fecha, ubicacion?.trim() || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('addMeeting:', err);
    res.status(500).json({ message: 'Error al agregar reunión.' });
  }
};

exports.deleteMeeting = async (req, res) => {
  const userId = req.user.userId;
  const isGlobalAdmin = req.user.role === 'admin';
  const { id: clubId, meetingId } = req.params;

  const miRol = await getMiRol(userId, clubId);
  if (miRol !== 'admin' && !isGlobalAdmin) {
    return res.status(403).json({ message: 'Solo el admin del club puede eliminar reuniones.' });
  }

  const premium = await isPremiumClub(clubId);
  if (!premium) {
    return res.status(403).json({ message: 'Esta función requiere plan Premium.', code: 'PREMIUM_REQUIRED' });
  }

  try {
    await pool.query('DELETE FROM public.club_meetings WHERE id = $1 AND club_id = $2', [meetingId, clubId]);
    res.json({ message: 'Reunión eliminada.' });
  } catch (err) {
    console.error('deleteMeeting:', err);
    res.status(500).json({ message: 'Error al eliminar reunión.' });
  }
};

exports.createPost = async (req, res) => {
  const userId = req.user.userId;
  const isGlobalAdmin = req.user.role === 'admin';
  const { id: clubId } = req.params;

  const miRol = await getMiRol(userId, clubId);
  if (!miRol && !isGlobalAdmin) {
    return res.status(403).json({ message: 'Debés ser miembro del club para postear.' });
  }

  const premium = await isPremiumClub(clubId);
  if (!premium) {
    return res.status(403).json({ message: 'Esta función requiere plan Premium.', code: 'PREMIUM_REQUIRED' });
  }

  const { contenido } = req.body;
  if (!contenido?.trim()) return res.status(400).json({ message: 'El contenido no puede estar vacío.' });
  if (contenido.length > 1000) return res.status(400).json({ message: 'El mensaje no puede superar 1000 caracteres.' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO public.club_posts (club_id, autor_id, contenido)
       VALUES ($1, $2, $3)
       RETURNING id, club_id AS "clubId", autor_id AS "autorId", contenido, created_at AS "createdAt"`,
      [clubId, userId, contenido.trim()]
    );
    const { rows: userRows } = await pool.query('SELECT username FROM public.users WHERE id = $1', [userId]);
    res.status(201).json({ ...rows[0], autorUsername: userRows[0].username });
  } catch (err) {
    console.error('createPost:', err);
    res.status(500).json({ message: 'Error al publicar mensaje.' });
  }
};

exports.deletePost = async (req, res) => {
  const userId = req.user.userId;
  const isGlobalAdmin = req.user.role === 'admin';
  const { id: clubId, postId } = req.params;

  const premium = await isPremiumClub(clubId);
  if (!premium) {
    return res.status(403).json({ message: 'Esta función requiere plan Premium.', code: 'PREMIUM_REQUIRED' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT autor_id FROM public.club_posts WHERE id = $1 AND club_id = $2',
      [postId, clubId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Mensaje no encontrado.' });

    const miRol = await getMiRol(userId, clubId);
    const isAuthor = rows[0].autor_id === userId;

    if (!isAuthor && miRol !== 'admin' && !isGlobalAdmin) {
      return res.status(403).json({ message: 'No podés eliminar este mensaje.' });
    }

    await pool.query('DELETE FROM public.club_posts WHERE id = $1', [postId]);
    res.json({ message: 'Mensaje eliminado.' });
  } catch (err) {
    console.error('deletePost:', err);
    res.status(500).json({ message: 'Error al eliminar mensaje.' });
  }
};

exports.getNearbyClubs = async (req, res) => {
  const { lat, lng, radius = 20 } = req.query;
  if (!lat || !lng) return res.status(400).json({ message: 'lat y lng son requeridos.' });
  const userId = req.user?.userId ?? null;

  try {
    const { rows } = await pool.query(
      `SELECT
         c.id, c.nombre, c.descripcion, c.ubicacion, c.lat, c.lng,
         c.creador_id             AS "creadorId",
         u.username               AS "creadorUsername",
         c.fecha_creacion         AS "fechaCreacion",
         COUNT(cm.usuario_id)::int AS miembros,
         MAX(CASE WHEN cm.usuario_id = $3 THEN cm.rol END) AS "miRol",
         c.current_book_title     AS "currentBookTitle",
         c.current_book_author    AS "currentBookAuthor",
         c.current_book_cover_url AS "currentBookCoverUrl",
         c.plan,
         c.plan_expires_at        AS "planExpiresAt",
         (6371 * acos(LEAST(1.0,
           cos(radians($1::float)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians($2::float)) +
           sin(radians($1::float)) * sin(radians(c.lat))
         ))) AS "distanceKm"
       FROM public.clubs c
       JOIN public.users u ON u.id = c.creador_id
       LEFT JOIN public.club_members cm ON cm.club_id = c.id
       WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
         AND (6371 * acos(LEAST(1.0,
           cos(radians($1::float)) * cos(radians(c.lat)) * cos(radians(c.lng) - radians($2::float)) +
           sin(radians($1::float)) * sin(radians(c.lat))
         ))) <= $4::float
       GROUP BY c.id, u.username
       ORDER BY "distanceKm" ASC`,
      [parseFloat(lat), parseFloat(lng), userId, parseFloat(radius)]
    );
    res.json(rows);
  } catch (err) {
    console.error('getNearbyClubs:', err);
    res.status(500).json({ message: 'Error al buscar clubes cercanos.' });
  }
};

exports.upgradeClub = async (req, res) => {
  const userId = req.user.userId;
  const isGlobalAdmin = req.user.role === 'admin';
  const { id: clubId } = req.params;

  const miRol = await getMiRol(userId, clubId);
  if (miRol !== 'admin' && !isGlobalAdmin) {
    return res.status(403).json({ message: 'Solo el admin del club puede actualizar el plan.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE public.clubs
       SET plan = 'premium', plan_expires_at = NOW() + INTERVAL '30 days'
       WHERE id = $1
       RETURNING plan, plan_expires_at AS "planExpiresAt"`,
      [clubId]
    );
    res.json({ message: 'Club actualizado a Premium.', ...rows[0] });
  } catch (err) {
    console.error('upgradeClub:', err);
    res.status(500).json({ message: 'Error al actualizar el plan.' });
  }
};

exports.setClubLocation = async (req, res) => {
  const userId = req.user.userId;
  const isGlobalAdmin = req.user.role === 'admin';
  const { id: clubId } = req.params;

  const miRol = await getMiRol(userId, clubId);
  if (miRol !== 'admin' && !isGlobalAdmin) {
    return res.status(403).json({ message: 'Solo el admin del club puede actualizar la ubicación.' });
  }

  const { lat, lng, ubicacion } = req.body;
  try {
    if (ubicacion !== undefined) {
      await pool.query(
        'UPDATE public.clubs SET lat = $1, lng = $2, ubicacion = $3 WHERE id = $4',
        [lat ?? null, lng ?? null, ubicacion, clubId]
      );
    } else {
      await pool.query(
        'UPDATE public.clubs SET lat = $1, lng = $2 WHERE id = $3',
        [lat ?? null, lng ?? null, clubId]
      );
    }
    res.json({ message: 'Ubicación actualizada.' });
  } catch (err) {
    console.error('setClubLocation:', err);
    res.status(500).json({ message: 'Error al actualizar la ubicación.' });
  }
};
