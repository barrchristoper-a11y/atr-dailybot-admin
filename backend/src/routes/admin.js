const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Simple admin auth (replace with proper auth in production)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === process.env.ADMINEMAIL && password === process.env.ADMINPASSWORD) {
    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWTEXPIRESIN || '7d' }
    );
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

router.get('/me', (req, res) => {
  res.json({ success: true, data: { email: process.env.ADMIN_EMAIL, role: 'admin' } });
});

module.exports = router;