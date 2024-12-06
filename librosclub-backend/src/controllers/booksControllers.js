const pool = require('../config/db');

exports.getBooks = async (req, res) => {
    const { title } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM books WHERE title ILIKE $1',
            [`%${title}%`]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar libros' });
    }
};

exports.getFeed = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM books ORDER BY id DESC LIMIT 10'
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el feed' });
    }
};
