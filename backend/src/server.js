require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const commandRoutes = require('./routes/commands');
const userRoutes = require('./routes/users');
const scheduleRoutes = require('./routes/schedules');
const broadcastRoutes = require('./routes/broadcast');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhook');
const logRoutes = require('./routes/logs');

const { initTelegram } = require('./services/telegramService');
const { initScheduler } = require('./services/schedulerService');

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.ADMIN_PANEL_URL || 'https://atrdaily.netlify.app';

const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] }
});

app.use(helmet());
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    bot: 'ATR_dailybot',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      telegram: global.bot ? 'running' : 'stopped',
      scheduler: global.scheduler ? 'active' : 'inactive',
      websocket: 'ready'
    }
  });
});

app.use('/api/admin', adminRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/logs', logRoutes);

io.on('connection', (socket) => {
  console.log(`🔌 Admin connected: ${socket.id}`);
  socket.join('admins');
  socket.emit('system:connected', { message: 'Connected to ATR_dailybot', timestamp: new Date().toISOString() });
  socket.on('disconnect', () => console.log(`🔌 Admin disconnected: ${socket.id}`));
});

global.io = io;

async function start() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    global.bot = await initTelegram(app, io);
    console.log('✅ Telegram Bot initialized');

    global.scheduler = await initScheduler(io);
    console.log('✅ Scheduler initialized');

    const PORT = process.env.PORT || 3002;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ATR_dailybot backend running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
    });
  } catch (error) {
    console.error('❌ Backend startup failed');
    console.error(error);
    process.exit(1);
  }
}

start();

module.exports = { app, server, io };