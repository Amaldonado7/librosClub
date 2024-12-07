const app = require('./app'); // Importar la aplicación configurada
require('dotenv').config(); // Cargar las variables de entorno

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
