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

router.get('/:id', async (req, res) => {
  try {
    const command = await Command.findById(req.params.id);
    if (!command) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: command });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const command = await Command.create(req.body);
    if (global.io) global.io.to('admins').emit('command:created', command);
    res.status(201).json({ success: true, data: command });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const command = await Command.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!command) return res.status(404).json({ success: false, error: 'Not found' });
    if (global.io) global.io.to('admins').emit('command:updated', command);
    res.json({ success: true, data: command });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    const command = await Command.findById(req.params.id);
    if (!command) return res.status(404).json({ success: false, error: 'Not found' });
    command.status = command.status === 'active' ? 'paused' : 'active';
    await command.save();
    if (global.io) global.io.to('admins').emit('command:updated', command);
    res.json({ success: true, data: command });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const command = await Command.findByIdAndDelete(req.params.id);
    if (!command) return res.status(404).json({ success: false, error: 'Not found' });
    if (global.io) global.io.to('admins').emit('command:deleted', { id: command._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;