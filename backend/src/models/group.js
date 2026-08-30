const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    telegramId: Number,
    type: { type: String, enum: ['primary', 'admin', 'broadcast', 'onboarding'] },
    memberCount: { type: Number, default: 0 },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);