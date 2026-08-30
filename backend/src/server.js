require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const commandRoutes = require('./routes/commands');
const userRoutes = require('./routes/users');
const scheduleRoutes = require('./routes/schedules');
const broadcastRoutes = require('./routes/broadcast');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');

const { initTelegram } = require('./services/telegramService');
const { initScheduler } = require('./services/schedulerService');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.ADMIN_PANEL_URL || '*',
        methods: ['GET', 'POST']
    }
});

app.use(helmet());
app.use(cors({
    origin: process.env.ADMIN_PANEL_URL || '*'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: {
            mongodb: mongoose.connection.readyState === 1
                ? 'connected'
                : 'disconnected',
            telegram: global.bot
                ? 'running'
                : 'stopped',
            scheduler: global.scheduler
                ? 'active'
                : 'inactive'
        }
    });
});

app.use('/api/commands', commandRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

io.on('connection', (socket) => {
    logger.info(`Admin connected: ${socket.id}`);

    socket.on('disconnect', () => {
        logger.info(`Admin disconnected: ${socket.id}`);
    });

    socket.join('admins');
});

global.io = io;

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        logger.info('✅ MongoDB connected');

        global.bot = await initTelegram(app, io);

        logger.info('✅ Telegram Bot initialized');

        global.scheduler = global.scheduler = await initScheduler(io);

        logger.info('✅ Scheduler initialized');

        const PORT = process.env.PORT || 3002;

        server.listen(PORT, () => {
            logger.info(`🚀 ATR_dailybot backend running on port ${PORT}`);
            logger.info('📡 WebSocket server ready');
            logger.info(`🌐 API: http://localhost:${PORT}`);
        });

    } catch (error) {
        logger.error(`❌ Backend startup failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

connectDB();

module.exports = {
    app,
    server,
    io
};


