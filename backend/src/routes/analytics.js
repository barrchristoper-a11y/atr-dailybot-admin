const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Command = require('../models/Command');
const Log = require('../models/Log');

router.get('/overview', async (req, res) => {
  try {
    const dayAgo = new Date(Date.now() - 86400000);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastActiveAt: { $gte: dayAgo } });
    const totalCommands = await Command.countDocuments({ status: 'active' });
    const todayMessages = await Log.countDocuments({ type: 'command', createdAt: { $gte: dayAgo } });

    // Weekly activity: command-log count per day, last 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const weeklyLogs = await Log.aggregate([
      { $match: { type: 'command', createdAt: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const dayLabels = [];
    const dayValues = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      const match = weeklyLogs.find(l => l._id === key);
      dayValues.push(match ? match.count : 0);
    }

    // User growth: new users per day, last 7 days
    const userGrowthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const growthLabels = [];
    const growthValues = [];
    let runningTotal = totalUsers - userGrowthAgg.reduce((s, g) => s + g.count, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const match = userGrowthAgg.find(g => g._id === key);
      runningTotal += match ? match.count : 0;
      growthLabels.push(i === 0 ? 'Now' : `-${i}d`);
      growthValues.push(runningTotal);
    }

    // Top commands by usageCount
    const topCmds = await Command.find({ status: 'active' }).sort({ usageCount: -1 }).limit(5);
    const totalUsage = topCmds.reduce((s, c) => s + (c.usageCount || 0), 0) || 1;
    const topCommands = topCmds.map(c => ({
      command: c.command,
      percent: Math.round((c.usageCount / totalUsage) * 100)
    }));

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalCommands,
        todayMessages,
        weeklyActivity: { labels: dayLabels, values: dayValues },
        userGrowth: { labels: growthLabels, values: growthValues },
        topCommands
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;