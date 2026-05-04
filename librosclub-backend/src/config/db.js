const { Pool } = require('pg');

const isInternalRailway = (process.env.DATABASE_URL ?? '').includes('.railway.internal');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ...(isInternalRailway ? {} : { ssl: { rejectUnauthorized: false } }),
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
    });

pool.connect()
  .then(() => console.log('Conexión exitosa a PostgreSQL'))
  .catch((err) => console.error('Error de conexión:', err));

module.exports = pool;
