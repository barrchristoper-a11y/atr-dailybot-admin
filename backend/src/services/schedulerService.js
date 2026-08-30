const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Log = require('../models/Log');
const { getBot } = require('./telegramService');

const jobs = new Map();

/**
 * Initialize all active scheduled jobs from MongoDB.
 */
async function initScheduler(io) {
    const schedules = await Schedule.find({ status: 'active' });

    for (const sched of schedules) {
        registerJob(sched, io);
    }

    console.log(`✅ ${schedules.length} scheduled jobs loaded`);

    // Return the job registry so server.js can expose scheduler status.
    return jobs;
}

/**
 * Register one schedule with node-cron.
 */
function registerJob(sched, io) {
    const jobId = sched._id.toString();

    // Stop an existing copy before replacing it.
    if (jobs.has(jobId)) {
        try {
            jobs.get(jobId).stop();
        } catch (err) {
            console.error(`⚠️ Could not stop existing job ${jobId}:`, err.message);
        }

        jobs.delete(jobId);
    }

    if (!cron.validate(sched.cron)) {
        console.error(
            `❌ Invalid cron expression for "${sched.name}": ${sched.cron}`
        );
        return null;
    }

    const job = cron.schedule(
        sched.cron,
        async () => {
            try {
                const bot = getBot();

                if (!bot) {
                    console.error(
                        `❌ Schedule "${sched.name}" skipped: Telegram bot is not running`
                    );
                    return;
                }

                const query =
                    sched.targetGroup === 'All'
                        ? { blocked: false }
                        : {
                              role: sched.targetGroup.toLowerCase(),
                              blocked: false
                          };

                const users = await User.find(query);

                let sent = 0;
                let failed = 0;

                for (const user of users) {
                    try {
                        await bot.api.sendMessage(
                            user.telegramId,
                            sched.message,
                            {
                                parse_mode: sched.parseMode || undefined
                            }
                        );

                        sent++;
                    } catch (err) {
                        failed++;

                        console.error(
                            `⚠️ Failed to send "${sched.name}" to ${user.telegramId}:`,
                            err.message
                        );

                        // Telegram 403 normally means the user blocked the bot.
                        if (err.error_code === 403) {
                            await User.findByIdAndUpdate(user._id, {
                                blocked: true
                            });
                        }
                    }

                    // Small delay to avoid Telegram rate limits.
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                await Schedule.findByIdAndUpdate(sched._id, {
                    lastRun: new Date(),
                    $inc: {
                        runCount: 1,
                        sentCount: sent,
                        failedCount: failed
                    }
                });

                await Log.create({
                    level: 'INFO',
                    type: 'schedule',
                    message: `Schedule "${sched.name}" executed: ${sent} sent, ${failed} failed`
                });

                if (io) {
                    io.emit('schedule:executed', {
                        name: sched.name,
                        sent,
                        failed,
                        timestamp: new Date().toISOString()
                    });
                }

                console.log(
                    `📅 ${sched.name}: ${sent} sent, ${failed} failed`
                );
            } catch (err) {
                console.error(
                    `❌ Schedule "${sched.name}" failed:`,
                    err
                );

                try {
                    await Log.create({
                        level: 'ERROR',
                        type: 'schedule',
                        message: `Schedule "${sched.name}" failed: ${err.message}`
                    });
                } catch (logError) {
                    console.error(
                        '❌ Could not write scheduler error log:',
                        logError.message
                    );
                }
            }
        },
        {
            scheduled: true,
            timezone: process.env.TIMEZONE || 'America/New_York'
        }
    );

    jobs.set(jobId, job);

    console.log(
        `⏰ Scheduler registered: ${sched.name} | ${sched.cron}`
    );

    return job;
}

/**
 * Register a newly-created schedule without restarting the server.
 */
function addSchedule(sched, io) {
    return registerJob(sched, io);
}

/**
 * Remove a schedule from the active job registry.
 */
function removeSchedule(scheduleId) {
    const jobId = scheduleId.toString();

    if (jobs.has(jobId)) {
        try {
            jobs.get(jobId).stop();
        } catch (err) {
            console.error(
                `⚠️ Could not stop schedule ${jobId}:`,
                err.message
            );
        }

        jobs.delete(jobId);
    }

    return true;
}

/**
 * Return scheduler status.
 */
function getSchedulerStatus() {
    return {
        active: jobs.size > 0,
        jobCount: jobs.size,
        jobs: Array.from(jobs.keys())
    };
}

module.exports = {
    initScheduler,
    registerJob,
    addSchedule,
    removeSchedule,
    getSchedulerStatus
};
