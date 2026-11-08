const express = require('express');
const router = express.Router();
const { findUserForLogin } = require('../queries/users');

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = req.app.locals.db;
  const user = findUserForLogin(db, username, password, req.session.mode);
  if (!user) {
    return res.render('login', { error: 'Invalid username or password.' });
  }
  req.session.user = {
    id: user.id,
    username: user.username,
    is_admin: !!user.is_admin,
    secret_note: user.secret_note,
  };
  res.redirect('/dashboard');
});

router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('dashboard', { user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/');
});

module.exports = router;
