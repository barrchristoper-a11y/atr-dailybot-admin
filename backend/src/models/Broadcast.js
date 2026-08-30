const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
    message: { type: String, required: true },
    targetGroup: String,
    totalUsers: Number,
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'sending', 'completed', 'failed'], default: 'pending' },
    scheduledAt: Date,
    sentAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Broadcast', broadcastSchema);