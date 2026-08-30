const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cron: { type: String, required: true }, // e.g. "0 6 * * *"
    message: { type: String, required: true },
    parseMode: { type: String, default: 'Markdown' },
    targetGroup: { type: String, enum: ['All', 'Clients', 'Admins'], default: 'All' },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
    lastRun: Date,
    nextRun: Date,
    runCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);