const router = require('express').Router();
const Command = require('../models/Command');
const Log = require('../models/Log');

// GET all commands
router.get('/', async (req, res) => {
    const commands = await Command.find().sort({ createdAt: -1 });
    res.json({ success: true, data: commands });
});

// GET single command
router.get('/:id', async (req, res) => {
    const cmd = await Command.findById(req.params.id);
    if (!cmd) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: cmd });
});

// CREATE command
router.post('/', async (req, res) => {
    try {
        const cmd = await Command.create(req.body);
        await Log.create({
            level: 'INFO',
            type: 'command',
            message: `Command created: ${cmd.command}`
        });
        res.status(201).json({ success: true, data: cmd });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// UPDATE command
router.put('/:id', async (req, res) => {
    const cmd = await Command.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await Log.create({
        level: 'INFO',
        type: 'command',
        message: `Command updated: ${cmd.command}`
    });
    res.json({ success: true, data: cmd });
});

// DELETE command
router.delete('/:id', async (req, res) => {
    const cmd = await Command.findByIdAndDelete(req.params.id);
    await Log.create({
        level: 'WARN',
        type: 'command',
        message: `Command deleted: ${cmd.command}`
    });
    res.json({ success: true });
});

// TOGGLE status
router.patch('/:id/toggle', async (req, res) => {
    const cmd = await Command.findById(req.params.id);
    cmd.status = cmd.status === 'active' ? 'paused' : 'active';
    await cmd.save();
    res.json({ success: true, data: cmd });
});

module.exports = router;