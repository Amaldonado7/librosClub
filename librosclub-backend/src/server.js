require('dotenv').config(); // Cargar las variables de entorno
const app = require('./app'); // Importar la aplicación configurada

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
