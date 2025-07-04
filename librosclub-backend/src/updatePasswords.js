const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function actualizarPasswords() {
  try {
    // Contraseñas nuevas
    const nuevaPasswordAri = 'ari123';
    const nuevaPasswordPepe = 'pepe123';

    // Generar hashes
    const hashAri = await bcrypt.hash(nuevaPasswordAri, 10);
    const hashPepe = await bcrypt.hash(nuevaPasswordPepe, 10);

    // Actualizar en la base de datos
    await pool.query(
      'UPDATE public.users SET password = $1 WHERE username = $2',
      [hashAri, 'ari@gmail.com']
    );

    await pool.query(
      'UPDATE public.users SET password = $1 WHERE username = $2',
      [hashPepe, 'pepe@gmail.com']
    );

    console.log('✅ Contraseñas actualizadas correctamente.');
  } catch (err) {
    console.error('❌ Error al actualizar las contraseñas:', err);
  } finally {
    pool.end();
  }
}

actualizarPasswords();
