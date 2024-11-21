const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const db = require('./databases/tables.js')
const app = express();
const bcrypt = require('bcryptjs');
const saltRounds = 10; // El número de rondas de "salting" (puedes ajustarlo)

// Static Files
app.use(express.static(path.join(__dirname, "/static")));


app.use(cors());

app.use(session({
  secret: 'mysecret', // Cambia esto por una cadena secreta más segura
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(flash());

// Middleware para hacer que los mensajes flash estén disponibles en todas las vistas
// Middleware para pasar mensajes flash a las vistas
app.use((req, res, next) => {
  res.locals.errorMessage = req.flash('error'); // Pasamos el mensaje flash de error a la vista
  next();
});

const LocalStrategy = require('passport-local').Strategy;

// Estrategia de autenticación local
passport.use(new LocalStrategy(
  (username, password, done) => {
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
      if (err) { return done(err); }
      if (results.length === 0) {
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      const user = results[0];

      // Comparar la contraseña ingresada con la codificada
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) { return done(err); }
        if (!isMatch) {
          return done(null, false, { message: 'Contraseña incorrecta' });
        }
        return done(null, user);
      });
    });
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) { return done(err); }
    const user = results[0];
    done(null, user);
  });
});


app.get('/login', (req, res) => {
  res.render('authentication/login', {
    layout: path.join(__dirname, 'layouts/auth'),
    footer: false,
    errorMessage: req.flash('error') // Envía el mensaje de error
  });
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }

    if (!user) {
      // Si el usuario no es encontrado o las credenciales son incorrectas, enviar un mensaje de error
      return res.status(401).json({ success: false, message: info.message || 'Credenciales incorrectas.' });
    }

    // Iniciar sesión manualmente si la autenticación es exitosa
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al iniciar sesión.' });
      }

      // Si todo está bien, devolver éxito
      return res.status(200).json({ success: true, message: 'Inicio de sesión exitoso.' });
    });
  })(req, res, next);
});

// Ruta POST para registrar usuario
app.post('/register', (req, res) => {
  const { nombre_usuario, password } = req.body;

  if (!nombre_usuario || !password) {
    return res.status(400).json({ success: false, message: 'Nombre de usuario y contraseña son requeridos.' });
  }

  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error al codificar la contraseña' });
    }

    const query = 'CALL CreateUser(?, ?)';  // Ejemplo de consulta para crear usuario en base de datos
    db.query(query, [nombre_usuario, hashedPassword], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error al registrar el usuario' });
      }

      res.json({ success: true, message: 'Registro exitoso. Puedes iniciar sesión ahora.' });
    });
  });
});

// Ruta GET para mostrar formulario de registro
app.get('/register', (req, res) => {
  res.render('authentication/register', {
    layout: path.join(__dirname, 'layouts/auth'), // Usa un layout más básico para la página de registro
    footer: false, // Si no necesitas footer en la página de registro
  });
});

// Set Templating Engine
app
  .use(expressLayouts)
  .set("view engine", "ejs")
  .set("views", path.join(__dirname, "/content"));

app.get("/", isAuthenticated, (req, res) => {
  res.render("index", {
    layout: path.join(__dirname, "/layouts/dashboard"),
    footer: true,
  });
});

app.get("/settings", isAuthenticated, (req, res) => {
  res.render("settings", {
    layout: path.join(__dirname, "/layouts/dashboard"),
    footer: true,
  });
});

app.get("/authentication/forgot-password", (req, res) => {
  res.render("authentication/forgot-password", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: false,
    footer: false,
  });
});

app.get("/authentication/profile-lock", (req, res) => {
  res.render("authentication/profile-lock", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: false,
    footer: false,
  });
});

app.get("/authentication/sign-in", (req, res) => {
  res.render("authentication/sign-in", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: false,
    footer: false,
  });
});

app.get("/authentication/sign-up", (req, res) => {
  res.render("authentication/sign-up", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: false,
    footer: false,
  });
});

app.get("/authentication/reset-password", (req, res) => {
  res.render("authentication/reset-password", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: false,
    footer: false,
  });
});

app.get("/crud/products", (req, res) => {
  const products = require("./data/products.json");
  res.render("crud/products", {
    layout: path.join(__dirname, "/layouts/dashboard"),
    footer: false,
    products,
  });
});


const axios = require('axios'); 

app.get("/crud/radio-stations", isAuthenticated, async (req, res) => {
  try {
    // Fetch stations data from the API
    const response = await axios.get('http://localhost:3000/api/stations');
    const stations = response.data; // Adjust this based on your API's response structure

    // Render the template with the stations data
    res.render("crud/radio_stations", {
      layout: path.join(__dirname, "/layouts/dashboard"),
      footer: false,
      stations,
    });
  } catch (error) {
    console.error('Error fetching stations data:', error);
    // Handle the error gracefully, e.g., render an error page
    res.status(500).send('Error retrieving stations data');
  }
});

app.get("/crud/banners", isAuthenticated, async (req, res) => {
  try {
    // Fetch stations data from the API
    const response = await axios.get('http://localhost:3000/api/banners');
    const banners = response.data; // Adjust this based on your API's response structure

    // Render the template with the stations data
    res.render("crud/banners", {
      layout: path.join(__dirname, "/layouts/dashboard"),
      footer: false,
      banners,
    });
  } catch (error) {
    console.error('Error fetching stations data:', error);
    // Handle the error gracefully, e.g., render an error page
    res.status(500).send('Error retrieving stations data');
  }
});

// -----------------------------------------------------------------

app.get("/crud/channels", async (req, res) => {
  try {
    // Fetch stations data from the API
    const response = await axios.get('http://localhost:3000/api/channels');
    const channels = response.data; // Adjust this based on your API's response structure

    // Render the template with the stations data
    res.render("crud/channels", {
      layout: path.join(__dirname, "/layouts/dashboard"),
      footer: false,
      channels,
    });


  } catch (error) {
    console.error('Error fetching stations data:', error);
    // Handle the error gracefully, e.g., render an error page
    res.status(500).send('Error retrieving stations data');
  }
});

// -----------------------------------------------------------------
app.get("/crud/:id/programs/", async (req, res) => {
  try {
    const id_Channel = req.params.id;
    // Fetch programs data from the API using the id_Channel
    const response = await axios.get(`http://localhost:3000/api/programs-channel/${id_Channel}`);
    const programs = response.data; // Ajusta esto según la estructura de la respuesta de tu API
    console.log(id_Channel);
    console.log(response.data);
    // Render the template with the programs data
    res.render("crud/programs", {
      layout: path.join(__dirname, "/layouts/dashboard"),
      footer: false,
      programs,
      id_Channel,
    });

  } catch (error) {
    console.error('Error fetching programs data:', error);
    // Manejar el error adecuadamente
    res.status(500).send('Error retrieving programs data');
  }
});
// -----------------------------------------------------------------
app.get("/crud/:id/programs-stations/", async (req, res) => {
  try {
    const id_station = req.params.id;
    // Fetch programs data from the API using the id_Channel
    const response = await axios.get(`http://localhost:3000/api/programs-stations/${id_station}`);
    const programs = response.data; // Ajusta esto según la estructura de la respuesta de tu API
    console.log(id_station);
    console.log(response.data);
    // Render the template with the programs data
    res.render("crud/programs-station", {
      layout: path.join(__dirname, "/layouts/dashboard"),
      footer: false,
      programs,
      id_station,
    });

  } catch (error) {
    console.error('Error fetching programs data:', error);
    // Manejar el error adecuadamente
    res.status(500).send('Error retrieving programs data');
  }
});



// -----------------------------------------------------------------

app.get("/crud/schedules/:id", async (req, res) => {
  try {
    const id_program = req.params.id;
    // Fetch programs data from the API using the id_Channel
    const response = await axios.get(`http://localhost:3000/api/program-schedules/${id_program}`);
    const schedules = response.data;   //Ajusta esto según la estructura de la respuesta de tu API
    console.log(id_program);        
        // Render the template with the programs data
    res.render("crud/schedules", {
      layout: path.join(__dirname, "/layouts/dashboard"),
      footer: false,
      schedules,
      id_program,
    });

  } catch (error) {
    console.error('Error fetching programs data:', error);
    // Manejar el error adecuadamente
    res.status(500).send('Error retrieving programs data');
  }
});


// -----------------------------------------------------------------

app.get("/crud/users", isAuthenticated, (req, res) => {
  const users = require("./data/users.json");
  res.render("crud/users", {
    layout: path.join(__dirname, "/layouts/dashboard"),
    footer: false,
    users,
  });
});


app.get("/layouts/stacked", (req, res) => {
  res.render("layouts/stacked", {
    layout: path.join(__dirname, "/layouts/stacked-layout"),
    footer: true,
  });
});

app.get("/layouts/sidebar", (req, res) => {
  res.render("layouts/sidebar", {
    layout: path.join(__dirname, "/layouts/dashboard"),
    footer: true,
  });
});

app.get("/pages/404", (req, res) => {
  res.render("pages/404", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: false,
    footer: false,
  });
});

app.get("/pages/500", (req, res) => {
  res.render("pages/500", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: false,
    footer: false,
  });
});

app.get("/pages/maintenance", (req, res) => {
  res.render("pages/maintenance", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: false,
    footer: false,
  });
});

app.get("/pages/pricing", (req, res) => {
  res.render("pages/pricing", {
    layout: path.join(__dirname, "/layouts/main"),
    navigation: true,
    footer: false,
  });
});

app.get("/playground/sidebar", (req, res) => {
  res.render("playground/sidebar", {
    layout: path.join(__dirname, "/layouts/dashboard"),
    footer: true,
  });
});

app.get("/playground/stacked", (req, res) => {
  res.render("playground/stacked", {
    layout: path.join(__dirname, "/layouts/stacked-layout"),
    footer: true,
  });
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.get("/", (req, res) => {
  res.render("index", { logoPath: "/static/images/logo1.png" }); // Cambia la ruta del logo
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}