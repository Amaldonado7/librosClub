const { Pool } = require('pg');

// Configuración de la conexión
const pool = new Pool({
  user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT,
});

// Verificar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect(); // Intentar conectar
    console.log('Conexión exitosa a PostgreSQL');
    client.release(); // Liberar cliente después de usarlo
  } catch (err) {
    console.error('Error al conectar a PostgreSQL:', err);
  }
};

// Ejecutar la prueba
testConnection();

module.exports = pool;
