const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');
const { sendBroadcast } = require('../services/broadcast.service');

// GET broadcast history
router.get('/history', async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: broadcasts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST send a broadcast
router.post('/', async (req, res) => {
  try {
    const { message, targetGroup } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    const result = await sendBroadcast(message, targetGroup || 'All', global.io);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;