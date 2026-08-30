const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Command = require('../models/Command');
const Message = require('../models/Message');

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActiveAt: { $gte: new Date(Date.now() - 86400000) }
    });
    const totalCommands = await Command.countDocuments({ status: 'active' });
    const todayMessages = await Message.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 86400000) }
    });

    res.json({
      success: true,
      data: { totalUsers, activeUsers, totalCommands, todayMessages }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;