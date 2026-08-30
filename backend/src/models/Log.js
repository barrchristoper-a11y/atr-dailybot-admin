const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    level: { type: String, enum: ['INFO', 'WARN', 'ERROR'], default: 'INFO' },
    type: { type: String, enum: ['command', 'broadcast', 'schedule', 'system', 'user'] },
    message: String,
    userId: Number,
    username: String,
    command: String,
    metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

logSchema.index({ createdAt: -1 });
logSchema.index({ type: 1, createdAt: -1 });
module.exports = mongoose.model('Log', logSchema);