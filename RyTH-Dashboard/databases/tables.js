// db.js
const mysql = require('mysql');

// Configura la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'tvradioapp3',
});

// Conectar a la base de datos
connection.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

module.exports = connection;