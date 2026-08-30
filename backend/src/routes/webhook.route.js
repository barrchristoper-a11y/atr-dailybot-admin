const express = require('express');
const router = express.Router();
const { getBotInstance } = require('../services/telegram.service');

router.post('/', (req, res) => {
  const bot = getBotInstance();
  if (bot) {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } else {
    res.status(503).send('Bot not initialized');
  }
});

module.exports = router;