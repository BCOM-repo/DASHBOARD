const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Supongamos que tienes un modelo de usuario o una base de datos de usuarios
const users = [
  { id: 1, username: 'admin', password: '$2a$10$wPQTxBq9oTpeFz6r1LjGDe9FlDLZBOofKmFgjXINuOyd2uIS6poGe' } // Contraseña: 'password123'
];

// Configuración de la estrategia local
passport.use(new LocalStrategy((username, password, done) => {
  const user = users.find(user => user.username === username);
  
  if (!user) {
    return done(null, false, { message: 'Usuario no encontrado' });
  }

  // Comparar la contraseña hash con la proporcionada
  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err) throw err;
    if (isMatch) {
      return done(null, user);
    } else {
      return done(null, false, { message: 'Contraseña incorrecta' });
    }
  });
}));

// Serialización y deserialización del usuario
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find(user => user.id === id);
  done(null, user);
});

module.exports = passport;
