const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const { registerJob, removeSchedule } = require('../services/schedulerService');

router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ createdAt: -1 });
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const schedule = await Schedule.create(req.body);
    if (schedule.status === 'active') registerJob(schedule, global.io);
    if (global.io) global.io.to('admins').emit('schedule:created', schedule);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!schedule) return res.status(404).json({ success: false, error: 'Not found' });

    if (schedule.status === 'active') registerJob(schedule, global.io);
    else removeSchedule(schedule._id);

    if (global.io) global.io.to('admins').emit('schedule:updated', schedule);
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).json({ success: false, error: 'Not found' });

    removeSchedule(schedule._id);
    if (global.io) global.io.to('admins').emit('schedule:deleted', { id: schedule._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;