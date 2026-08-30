const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
    command: { type: String, required: true, unique: true, index: true },
    answer: { type: String, required: true },
    aliases: [{ type: String, trim: true }],
    help: { type: String, default: '' },
    keyboard: { type: String, default: '' },
    group: { type: String, enum: ['All', 'Clients', 'Admins'], default: 'All' },
    waitAnswer: { type: Boolean, default: false },
    autoRetry: { type: Number, default: 600 },
    status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'active' },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

commandSchema.index({ aliases: 1 });
module.exports = mongoose.model('Command', commandSchema);