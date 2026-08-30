const User = require('../models/User');
const Broadcast = require('../models/Broadcast');
const Log = require('../models/Log');
const { getBot } = require('./telegram.service');

async function sendBroadcast(message, targetGroup, io) {
    const bot = getBot();
    if (!bot) throw new Error('Bot not initialized');

    // Create broadcast record
    const broadcast = await Broadcast.create({
        message,
        targetGroup,
        status: 'sending'
    });

    // Get target users
    const query = targetGroup === 'All'
        ? { blocked: false }
        : { role: targetGroup.toLowerCase(), blocked: false };

    const users = await User.find(query);
    await Broadcast.findByIdAndUpdate(broadcast._id, { totalUsers: users.length });

    let delivered = 0, failed = 0;
    const BATCH_SIZE = 30; // Telegram: 30 msgs/sec limit

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);

        await Promise.allSettled(
            batch.map(async (user) => {
                try {
                    await bot.api.sendMessage(user.telegramId, message, {
                        parse_mode: 'Markdown'
                    });
                    delivered++;
                } catch (err) {
                    failed++;
                    if (err.error_code === 403) {
                        await User.findByIdAndUpdate(user._id, { blocked: true });
                    }
                }
            })
        );

        // Update progress in real-time
        await Broadcast.findByIdAndUpdate(broadcast._id, { delivered, failed });
        io.emit('broadcast:progress', {
            id: broadcast._id,
            delivered,
            failed,
            total: users.length,
            percent: Math.round((delivered + failed) / users.length * 100)
        });

        // Wait 1 second between batches
        if (i + BATCH_SIZE < users.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    await Broadcast.findByIdAndUpdate(broadcast._id, {
        status: 'completed',
        delivered,
        failed,
        sentAt: new Date()
    });

    await Log.create({
        level: 'INFO',
        type: 'broadcast',
        message: `Broadcast completed: ${delivered} delivered, ${failed} failed`
    });

    io.emit('broadcast:complete', { id: broadcast._id, delivered, failed });
    return broadcast;
}

module.exports = { sendBroadcast };