const express = require('express');
const router = express.Router();
const { searchRobots, getRobotById } = require('../queries/robots');

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const q = req.query.q || '';
  const results = q ? searchRobots(db, q, req.session.mode) : [];
  res.render('models', { q, results });
});

router.get('/view', (req, res) => {
  const db = req.app.locals.db;
  const id = req.query.id || '';
  const rows = id ? getRobotById(db, id, req.session.mode) : [];
  res.render('model-detail', { id, rows });
});

module.exports = router;
