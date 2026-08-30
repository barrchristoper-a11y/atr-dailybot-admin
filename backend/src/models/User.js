const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, sparse: true },
    firstName: String,
    lastName: String,
    language: { type: String, default: 'en' },
    role: { type: String, enum: ['admin', 'client', 'user'], default: 'user' },
    groups: [{ type: String }],
    messageCount: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    blocked: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

userSchema.index({ username: 'text', firstName: 'text' });
module.exports = mongoose.model('User', userSchema);