const express = require('express');
const router = express.Router();

router.post('/toggle-mode', (req, res) => {
  // This flip is what the demo's "VULNERABLE / SECURE" button does —
  // every vulnerable-mode query function checks this session value.
  req.session.mode = req.session.mode === 'vulnerable' ? 'secure' : 'vulnerable';
  res.redirect(req.get('Referer') || '/');
});

module.exports = router;
