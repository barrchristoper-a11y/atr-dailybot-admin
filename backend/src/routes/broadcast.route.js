const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');
const { sendBroadcast } = require('../services/broadcast.service');

router.get('/', async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: broadcasts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { message, targetGroup } = req.body;
    if (!message || !targetGroup) {
      return res.status(400).json({ success: false, error: 'Message and targetGroup required' });
    }
    const broadcast = await sendBroadcast(message, targetGroup, global.io);
    res.json({ success: true, data: broadcast });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;