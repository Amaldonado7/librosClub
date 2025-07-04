const { Pool } = require('pg');

// Configuración de la conexión
const pool = new Pool({
  user: 'ariadna.maldonado',
  host: 'localhost',
  database: 'librosclub',
  password: 'tu_password',
  port: 5432,
});

pool.connect()
  .then(() => console.log('Conexión exitosa a PostgreSQL'))
  .catch((err) => console.error('Error de conexión:', err));

module.exports = pool;
