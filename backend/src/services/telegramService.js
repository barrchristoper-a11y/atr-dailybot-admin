const { Bot, webhookCallback } = require('grammy');

const Command = require('../models/Command');
const User = require('../models/User');
const Log = require('../models/Log');

let bot = null;

/**
 * Initialize Telegram bot.
 *
 * Webhook registration is intentionally NOT performed here.
 * The deployment script registers the webhook after the
 * Cloudflare tunnel has been created.
 */
async function initTelegram(app, io) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN missing');
    }

    bot = new Bot(token);

    // ========================================================
    // USER TRACKING MIDDLEWARE
    // ========================================================

    bot.use(async (ctx, next) => {
        try {
            const user = ctx.from;

            if (user) {
                await User.findOneAndUpdate(
                    { telegramId: String(user.id) },
                    {
                        $set: {
                            username: user.username,
                            firstName: user.first_name,
                            lastName: user.last_name,
                            languageCode: user.language_code,
                            lastActiveAt: new Date()
                        },
                        $inc: {
                            messageCount: 1
                        }
                    },
                    {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );
            }
        } catch (error) {
            console.error(
                '[Telegram] User tracking error:',
                error.message
            );
        }

        await next();
    });

    // ========================================================
    // COMMAND HANDLER
    // ========================================================

    bot.on('message:text', async (ctx) => {
        try {
            const text = ctx.message.text.trim();

            if (!text.startsWith('/')) {
                return;
            }

            const cmdName = text
                .split(/\s+/)[0]
                .toLowerCase();

            // Search command by name or alias.
            const cmd = await Command.findOne({
                $or: [
                    { name: cmdName.replace('/', '') },
                    { name: cmdName },
                    { aliases: cmdName.replace('/', '') },
                    { aliases: cmdName }
                ],
                status: 'active'
            });

            if (!cmd) {
                await ctx.reply(
                    '❓ Unknown command. Use /help to see available commands.'
                );
                return;
            }

            // Increment usage count.
            await Command.findByIdAndUpdate(
                cmd._id,
                {
                    $inc: {
                        usageCount: 1
                    },
                    $set: {
                        lastUsedAt: new Date()
                    }
                }
            );

            // ========================================================
            // SEND COMMAND RESPONSE
            // ========================================================

            try {
                const response = JSON.parse(cmd.answer);

                await ctx.reply(
                    response.text || '',
                    {
                        parse_mode:
                            response.parse_mode ||
                            cmd.parseMode ||
                            'Markdown',
                        reply_markup:
                            response.reply_markup ||
                            cmd.replyMarkup
                    }
                );
            } catch (parseError) {
                // If answer isn't JSON, send it as normal text.
                await ctx.reply(
                    cmd.answer || '',
                    {
                        parse_mode:
                            cmd.parseMode || 'Markdown'
                    }
                );
            }

            // ========================================================
            // LOG COMMAND
            // ========================================================

            try {
                await Log.create({
                    level: 'info',
                    message: `User executed ${cmdName}`,
                    source: 'telegram',
                    userId: String(ctx.from.id),
                    command: cmdName,
                    metadata: {
                        username: ctx.from.username,
                        firstName: ctx.from.first_name
                    }
                });
            } catch (logError) {
                console.error(
                    '[Telegram] Command logging error:',
                    logError.message
                );
            }

            // ========================================================
            // ADMIN PANEL EVENT
            // ========================================================

            if (io) {
                io.emit('command:executed', {
                    command: cmdName,
                    user:
                        ctx.from.username ||
                        ctx.from.first_name ||
                        String(ctx.from.id),
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error(
                '[Telegram] Command handler error:',
                error.message
            );

            try {
                await ctx.reply(
                    'Sorry, an error occurred while processing that command.'
                );
            } catch (_) {
                // Ignore Telegram reply failure.
            }
        }
    });

    // ========================================================
    // /START COMMAND
    // ========================================================

    bot.command('start', async (ctx) => {
        try {
            await ctx.reply(
                '🚀 *Welcome to ATR_dailybot!*\n\n' +
                "I'm your daily briefing assistant. " +
                'Use /help to see available commands.',
                {
                    parse_mode: 'Markdown'
                }
            );

            try {
                await Log.create({
                    level: 'info',
                    message: 'New user started bot',
                    source: 'telegram',
                    userId: String(ctx.from.id),
                    metadata: {
                        username: ctx.from.username,
                        firstName: ctx.from.first_name
                    }
                });
            } catch (logError) {
                console.error(
                    '[Telegram] Start logging error:',
                    logError.message
                );
            }

            if (io) {
                io.emit('user:new', {
                    user:
                        ctx.from.username ||
                        ctx.from.first_name ||
                        String(ctx.from.id),
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error(
                '[Telegram] /start error:',
                error.message
            );
        }
    });

    // ========================================================
    // BOT ERROR HANDLER
    // ========================================================

    bot.catch(async (err) => {
        console.error(
            '[Telegram] Bot error:',
            err.error?.message || err.message
        );

        try {
            await Log.create({
                level: 'error',
                message:
                    err.error?.message ||
                    err.message ||
                    'Telegram bot error',
                source: 'telegram',
                metadata: {
                    error: String(err)
                }
            });
        } catch (logError) {
            console.error(
                '[Telegram] Error logging bot error:',
                logError.message
            );
        }
    });

    // ========================================================
    // EXPRESS WEBHOOK ENDPOINT
    // ========================================================

    if (app) {
        app.post(
            '/api/webhook',
            webhookCallback(bot, 'express')
        );

        console.log(
            '✅ Telegram webhook endpoint registered: POST /api/webhook'
        );
    }

    console.log('✅ Telegram bot initialized');

    return bot;
}

// ========================================================
// GET BOT INSTANCE
// ========================================================

function getBot() {
    return bot;
}

module.exports = {
    initTelegram,
    getBot
};