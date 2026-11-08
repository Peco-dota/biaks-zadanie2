const path = require('path');
const express = require('express');
const session = require('express-session');
const { createDatabase } = require('./db/init');
const pagesRouter = require('./routes/pages');
const authRouter = require('./routes/auth');
const modeRouter = require('./routes/mode');

function createApp() {
  const db = createDatabase();
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(
    session({
      secret: 'biaks-zadanie2-local-demo',
      resave: false,
      saveUninitialized: true,
    })
  );

  app.use((req, res, next) => {
    if (!req.session.mode) req.session.mode = 'secure';
    res.locals.mode = req.session.mode;
    res.locals.user = req.session.user || null;
    next();
  });

  app.locals.db = db;

  app.use('/', pagesRouter);
  app.use('/', authRouter);
  app.use('/', modeRouter);

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
}
