const express = require('express');
const router = express.Router();
const Command = require('../models/Command');

router.get('/', async (req, res) => {
  try {
    const commands = await Command.find().sort({ createdAt: -1 });
    res.json({ success: true, data: commands });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const command = await Command.create(req.body);
    res.status(201).json({ success: true, data: command });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const command = await Command.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: command });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Command.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;