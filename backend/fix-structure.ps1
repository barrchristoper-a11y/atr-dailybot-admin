==========================================
ATR_dailybot Structure Fixer
Creates missing files/folders with boilerplate
==========================================

Set your backend path (change if needed)
$basePath = "C:\Users\tncyb\ATR_dailybot\backend"

if (!(Test-Path $basePath)) {
    Write-Host "❌ Backend folder not found at $basePath" -ForegroundColor Red
    Write-Host "Please update $basePath in this script." -ForegroundColor Yellow
    exit
}

Set-Location $basePath
Write-Host "🔍 Checking structure in: $basePath" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$created = 0
$exists = 0
$skipped = 0

Helper: Create file only if missing
function Ensure-File {
    param($Path, $Content)
    if (Test-Path $Path) {
        Write-Host "  ✅ Exists: $Path" -ForegroundColor Green
        $script:exists++
    }
    else {
        $dir = Split-Path $Path -Parent
        if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
        $utf8 = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($Path, $Content, $utf8)
        Write-Host "  🆕 Created: $Path" -ForegroundColor Yellow
        $script:created++
    }
}

Helper: Ensure folder exists
function Ensure-Folder {
    param($Path)
    if (Test-Path $Path) {
        Write-Host "   Exists: $Path" -ForegroundColor Green
        $script:exists++
    }
    else {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
        Write-Host "  📁 Created: $Path" -ForegroundColor Yellow
        $script:created++
    }
}

==========================================
ROOT FILES
==========================================
Write-Host "n Checking ROOT files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\package.json" -Content @'
{
  "name": "atr-dailybot-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop atr-dailybot",
    "pm2:restart": "pm2 restart atr-dailybot",
    "pm2:logs": "pm2 logs atr-dailybot"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "socket.io": "^4.6.1",
    "node-telegram-bot-api": "^0.64.0",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.11.0",
    "node-cron": "^3.0.3",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
'@

Ensure-File -Path "$basePath\ecosystem.config.js" -Content @'
module.exports = {
  apps: [{
    name: 'atr-dailybot',
    script: './src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    maxmemoryrestart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 8090
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    logdateformat: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
'@

Ensure-File -Path "$basePath\.env" -Content @'
PORT=8090
NODE_ENV=production
ADMINPANELURL=https://barrchristoper-a11y.github.io
CORS_ORIGIN=https://barrchristoper-a11y.github.io

MONGODBURI=mongodb+srv://:@workerman.kivslch.mongodb.net/atrdailybot?retryWrites=true&w=majority

TELEGRAMBOTTOKEN=7583048091:AAEtwyGJhf7vHwNyHDKzoiliJCyLdasMaho
TELEGRAMBOTUSERNAME=ATR_dailybot

WEBHOOK_URL=https://YOUR-CLOUDFLARE-URL.trycloudflare.com/webhook
WEBHOOK_HOST=0.0.0.0
WEBHOOK_PORT=8443

JWTSECRET=changethistoarandom32charstring
JWTEXPIRESIN=7d

ADMIN_EMAIL=admin@atr.com
ADMINPASSWORD=changethisstrongpassword

RATELIMITWINDOW_MS=900000
RATELIMITMAX_REQUESTS=100

LOG_LEVEL=info
LOG_FILE=./logs/app.log

SCHEDULER_TIMEZONE=UTC
'@

Ensure-File -Path "$basePath\.gitignore" -Content @'
node_modules/
.env
.env.local
logs/
*.log
.DS_Store
coverage/
'@

==========================================
SRC FOLDERS
==========================================
Write-Host "n📁 Checking src/ folders..." -ForegroundColor Yellow

Ensure-Folder -Path "$basePath\src"
Ensure-Folder -Path "$basePath\src\config"
Ensure-Folder -Path "$basePath\src\models"
Ensure-Folder -Path "$basePath\src\services"
Ensure-Folder -Path "$basePath\src\routes"
Ensure-Folder -Path "$basePath\src\middleware"
Ensure-Folder -Path "$basePath\src\utils"
Ensure-Folder -Path "$basePath\public"
Ensure-Folder -Path "$basePath\logs"

==========================================
SRC ROOT FILE
==========================================
Write-Host "n📄 Checking src/ files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\src\server.js" -Content @'
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const webhookRoute = require('./routes/webhook.route');
const commandsRoute = require('./routes/commands.route');
const usersRoute = require('./routes/users.route');
const schedulesRoute = require('./routes/schedules.route');
const broadcastRoute = require('./routes/broadcast.route');
const analyticsRoute = require('./routes/analytics.route');
const adminRoute = require('./routes/admin.route');

const { initTelegramBot, getBotInstance } = require('./services/telegram.service');
const { initScheduler } = require('./services/scheduler.service');
const { initWebSocket } = require('./services/websocket.service');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.ADMINPANELURL || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve admin panel
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      telegram: global.bot ? 'running' : 'stopped',
      scheduler: global.scheduler ? 'active' : 'inactive'
    }
  });
});

// Telegram webhook
app.post('/webhook', (req, res) => {
  const bot = getBotInstance();
  if (bot) {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } else {
    res.status(503).send('Bot not initialized');
  }
});

// API Routes
app.use('/api/commands', commandsRoute);
app.use('/api/users', usersRoute);
app.use('/api/schedules', schedulesRoute);
app.use('/api/broadcast', broadcastRoute);
app.use('/api/analytics', analyticsRoute);
app.use('/api/admin', adminRoute);

// Initialize WebSocket service
initWebSocket(io);
global.io = io;

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ MongoDB connected');
    
    await initTelegramBot(io);
    logger.info('✅ Telegram Bot initialized');
    
    await initScheduler(io);
    logger.info('✅ Scheduler initialized');
    
    const PORT = process.env.PORT || 8090;
    server.listen(PORT, () => {
      logger.info(🚀 ATR_dailybot backend running on port ${PORT});
      logger.info(📡 WebSocket server ready);
      logger.info(🌐 API: http://localhost:${PORT});
    });
  } catch (error) {
    logger.error(❌ Database connection failed: ${error.message});
    process.exit(1);
  }
};

connectDB();

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down...');
  server.close(() => process.exit(0));
});
'@

==========================================
CONFIG FILES
==========================================
Write-Host "n⚙️  Checking config/ files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\src\config\database.js" -Content @'
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info(✅ MongoDB Connected: ${conn.connection.host});
  } catch (error) {
    logger.error(❌ MongoDB Error: ${error.message});
    process.exit(1);
  }
};

module.exports = { connectDB, mongoose };
'@

Ensure-File -Path "$basePath\src\config\telegram.js" -Content @'
module.exports = {
  token: process.env.TELEGRAMBOTTOKEN,
  username: process.env.TELEGRAMBOTUSERNAME,
  webhook: {
    url: process.env.WEBHOOK_URL,
    host: process.env.WEBHOOK_HOST || '0.0.0.0',
    port: parseInt(process.env.WEBHOOK_PORT) || 8443
  },
  options: {
    webHook: false, // We use Express webhook route instead
    polling: false
  }
};
'@

==========================================
MODELS
==========================================
Write-Host "n🗄️  Checking models/ files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\src\models\Command.js" -Content @'
const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  answer: { type: String, required: true },
  parseMode: { type: String, enum: ['Markdown', 'HTML', 'PlainText'], default: 'Markdown' },
  aliases: [{ type: String, lowercase: true, trim: true }],
  help: String,
  keyboard: { type: String, default: '' },
  replyMarkup: mongoose.Schema.Types.Mixed,
  allowedGroups: [{ type: String, enum: ['all', 'clients', 'admins', 'new_users'], default: 'all' }],
  waitForAnswer: { type: Boolean, default: false },
  autoRetry: { type: Number, default: 600 },
  rateLimit: {
    enabled: { type: Boolean, default: true },
    maxRequests: { type: Number, default: 10 },
    windowMs: { type: Number, default: 60000 }
  },
  status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'active' },
  usageCount: { type: Number, default: 0 },
  lastUsedAt: Date,
  createdBy: String,
  updatedBy: String
}, { timestamps: true });

commandSchema.index({ name: 1 });
commandSchema.index({ status: 1 });

module.exports = mongoose.model('Command', commandSchema);
'@

Ensure-File -Path "$basePath\src\models\User.js" -Content @'
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true, index: true },
  username: String,
  firstName: String,
  lastName: String,
  languageCode: { type: String, default: 'en' },
  isBot: { type: Boolean, default: false },
  groups: [{ type: String, enum: ['all', 'clients', 'admins', 'new_users'], default: ['all'] }],
  messageCount: { type: Number, default: 0 },
  lastActiveAt: Date,
  firstSeenAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  blockedAt: Date,
  blockedReason: String,
  preferences: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' }
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

userSchema.index({ status: 1 });
userSchema.index({ lastActiveAt: -1 });

module.exports = mongoose.model('User', userSchema);
'@

Ensure-File -Path "$basePath\src\models\Schedule.js" -Content @'
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  time: { type: String, required: true },
  timezone: { type: String, default: 'UTC' },
  frequency: { type: String, enum: ['daily', 'weekdays', 'weekly', 'custom'], required: true },
  cronExpression: String,
  daysOfWeek: [Number],
  message: { type: String, required: true },
  parseMode: { type: String, default: 'Markdown' },
  replyMarkup: mongoose.Schema.Types.Mixed,
  targetGroup: { type: String, enum: ['all', 'clients', 'admins', 'new_users'], default: 'all' },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  lastRunAt: Date,
  nextRunAt: Date,
  runCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failCount: { type: Number, default: 0 },
  createdBy: String
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
'@

Ensure-File -Path "$basePath\src\models\Broadcast.js" -Content @'
const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  message: { type: String, required: true },
  parseMode: { type: String, default: 'Markdown' },
  replyMarkup: mongoose.Schema.Types.Mixed,
  targetGroup: { type: String, enum: ['all', 'clients', 'admins', 'newusers', 'active7d', 'inactive_30d'], required: true },
  totalRecipients: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'sending', 'completed', 'failed', 'scheduled'], default: 'pending' },
  scheduledFor: Date,
  startedAt: Date,
  completedAt: Date,
  progress: { type: Number, default: 0 },
  createdBy: String,
  errorMessage: String
}, { timestamps: true });

module.exports = mongoose.model('Broadcast', broadcastSchema);
'@

Ensure-File -Path "$basePath\src\models\Log.js" -Content @'
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  level: { type: String, enum: ['info', 'warn', 'error', 'debug'], default: 'info' },
  message: { type: String, required: true },
  source: String,
  metadata: mongoose.Schema.Types.Mixed,
  userId: String,
  command: String
}, { timestamps: true });

logSchema.index({ level: 1 });
logSchema.index({ createdAt: -1 });
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Log', logSchema);
'@

Ensure-File -Path "$basePath\src\models\Group.js" -Content @'
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  memberCount: { type: Number, default: 0 },
  permissions: {
    canSendMessages: { type: Boolean, default: true },
    canUseCommands: { type: Boolean, default: true },
    canReceiveBroadcasts: { type: Boolean, default: true }
  },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdBy: String
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
'@

==========================================
SERVICES
==========================================
Write-Host "n🔧 Checking services/ files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\src\services\telegram.service.js" -Content @'
const TelegramBot = require('node-telegram-bot-api');
const User = require('../models/User');
const Command = require('../models/Command');
const Message = require('../models/Message');
const Log = require('../models/Log');
const logger = require('../utils/logger');

let bot;

const initTelegramBot = async (io) => {
  const token = process.env.TELEGRAMBOTTOKEN;
  if (!token) {
    logger.error('❌ TELEGRAMBOTTOKEN not set');
    return;
  }

  bot = new TelegramBot(token, { webHook: false });
  global.bot = bot;

  bot.on('message', async (msg) => {
    await handleMessage(msg, io);
  });

  bot.on('callback_query', async (query) => {
    await handleCallback(query, io);
  });

  logger.info('✅ Telegram Bot service initialized');
};

const handleMessage = async (msg, io) => {
  try {
    const { chat, from, text } = msg;
    if (!from || !text) return;

    const user = await User.findOneAndUpdate(
      { telegramId: from.id.toString() },
      {
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        languageCode: from.language_code,
        lastActiveAt: new Date(),
        $inc: { messageCount: 1 }
      },
      { upsert: true, new: true }
    );

    if (text.startsWith('/')) {
      const commandName = text.split(' ')[0].substring(1).toLowerCase();
      await executeCommand(commandName, msg, user, io);
    }

    io.to('admins').emit('message:received', {
      userId: from.id,
      username: from.username,
      text: text,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error(Message handler error: ${error.message});
  }
};

const executeCommand = async (commandName, msg, user, io) => {
  try {
    const command = await Command.findOne({
      $or: [{ name: commandName }, { aliases: commandName }],
      status: 'active'
    });

    if (!command) {
      await bot.sendMessage(msg.chat.id, '❓ Unknown command. Use /help');
      return;
    }

    const userGroups = user.groups || ['all'];
    const hasAccess = command.allowedGroups.some(g => userGroups.includes(g) || g === 'all');

    if (!hasAccess) {
      await bot.sendMessage(msg.chat.id, '🔒 You don\'t have access to this command.');
      return;
    }

    const response = await bot.sendMessage(msg.chat.id, command.answer, {
      parse_mode: command.parseMode === 'Markdown' ? 'Markdown' : 'HTML',
      reply_markup: command.replyMarkup
    });

    await Command.findByIdAndUpdate(command._id, {
      $inc: { usageCount: 1 },
      lastUsedAt: new Date()
    });

    io.to('admins').emit('command:executed', {
      command: commandName,
      user: user.username,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error(Command execution error: ${error.message});
  }
};

const handleCallback = async (query, io) => {
  try {
    logger.info(Callback received: ${query.data} from @${query.from.username});
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    logger.error(Callback error: ${error.message});
  }
};

const getBotInstance = () => bot;

module.exports = { initTelegramBot, getBotInstance };
'@

Ensure-File -Path "$basePath\src\services\scheduler.service.js" -Content @'
const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const Log = require('../models/Log');
const logger = require('../utils/logger');

let scheduledJobs = [];

const initScheduler = async (io) => {
  try {
    const schedules = await Schedule.find({ status: 'active' });
    logger.info(Loading ${schedules.length} active schedules);

    schedules.forEach(schedule => {
      const cronExpr = getCronExpression(schedule);
      if (cron.validate(cronExpr)) {
        const job = cron.schedule(cronExpr, async () => {
          await executeSchedule(schedule, io);
        }, { timezone: schedule.timezone || 'UTC' });

        scheduledJobs.push({ scheduleId: schedule._id, job });
        logger.info(✅ Scheduled: ${schedule.name} (${cronExpr}));
      }
    });

    global.scheduler = { jobs: scheduledJobs };
  } catch (error) {
    logger.error(Scheduler init error: ${error.message});
  }
};

const getCronExpression = (schedule) => {
  if (schedule.cronExpression) return schedule.cronExpression;
  const [hours, minutes] = schedule.time.split(':');
  switch (schedule.frequency) {
    case 'daily': return ${minutes} ${hours}   *;
    case 'weekdays': return ${minutes} ${hours}   1-5;
    case 'weekly': return ${minutes} ${hours}   ${schedule.daysOfWeek.join(',')};
    default: return ${minutes} ${hours}   *;
  }
};

const executeSchedule = async (schedule, io) => {
  try {
    let query = { status: 'active' };
    if (schedule.targetGroup !== 'all') query.groups = schedule.targetGroup;
    const users = await User.find(query);
    let successCount = 0, failCount = 0;

    for (const user of users) {
      try {
        await global.bot.sendMessage(user.telegramId, schedule.message, {
          parse_mode: schedule.parseMode === 'Markdown' ? 'Markdown' : 'HTML'
        });
        successCount++;
      } catch (error) { failCount++; }
      await new Promise(resolve => setTimeout(resolve, 35));
    }

    await Schedule.findByIdAndUpdate(schedule._id, {
      lastRunAt: new Date(),
      $inc: { runCount: 1, successCount, failCount }
    });

    io.to('admins').emit('schedule:executed', {
      scheduleId: schedule._id,
      name: schedule.name,
      recipients: users.length,
      success: successCount,
      failed: failCount
    });

    logger.info(✅ Schedule executed: ${schedule.name} (${successCount}/${users.length}));
  } catch (error) {
    logger.error(Schedule execution error: ${error.message});
  }
};

module.exports = { initScheduler };
'@

Ensure-File -Path "$basePath\src\services\broadcast.service.js" -Content @'
const User = require('../models/User');
const Broadcast = require('../models/Broadcast');
const logger = require('../utils/logger');

const sendBroadcast = async (message, targetGroup, io) => {
  const broadcast = await Broadcast.create({
    message, targetGroup, status: 'sending', startedAt: new Date()
  });

  let query = { status: 'active' };
  if (targetGroup !== 'all') query.groups = targetGroup;
  const users = await User.find(query);
  broadcast.totalRecipients = users.length;
  await broadcast.save();

  let delivered = 0, failed = 0;

  for (const user of users) {
    try {
      await global.bot.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
      delivered++;
    } catch (error) {
      failed++;
      logger.warn(Failed to send to @${user.username}: ${error.message});
    }

    broadcast.deliveredCount = delivered;
    broadcast.failedCount = failed;
    broadcast.progress = Math.round(((delivered + failed) / users.length) * 100);
    await broadcast.save();

    io.to('admins').emit('broadcast:progress', {
      broadcastId: broadcast._id,
      progress: broadcast.progress,
      delivered, failed
    });

    await new Promise(resolve => setTimeout(resolve, 35));
  }

  broadcast.status = 'completed';
  broadcast.completedAt = new Date();
  await broadcast.save();

  io.to('admins').emit('broadcast:completed', { broadcastId: broadcast._id, delivered, failed });
  return broadcast;
};

module.exports = { sendBroadcast };
'@

Ensure-File -Path "$basePath\src\services\websocket.service.js" -Content @'
const logger = require('../utils/logger');

const initWebSocket = (io) => {
  io.on('connection', (socket) => {
    logger.info(🔌 Admin connected: ${socket.id});
    socket.join('admins');

    socket.on('disconnect', () => {
      logger.info(🔌 Admin disconnected: ${socket.id});
    });

    socket.on('admin:ping', () => {
      socket.emit('admin:pong', { timestamp: Date.now() });
    });
  });

  // Emit stats every 30 seconds
  setInterval(async () => {
    try {
      const User = require('../models/User');
      const Message = require('../models/Message');
      const Command = require('../models/Command');

      const totalUsers = await User.countDocuments();
      const todayMessages = await Message.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 86400000) }
      });
      const activeCommands = await Command.countDocuments({ status: 'active' });

      io.to('admins').emit('stats:updated', {
        totalUsers, todayMessages, activeCommands, timestamp: Date.now()
      });
    } catch (error) {
      // Silently fail stats update
    }
  }, 30000);

  logger.info('✅ WebSocket service initialized');
};

module.exports = { initWebSocket };
'@

==========================================
ROUTES
==========================================
Write-Host "n🛣️  Checking routes/ files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\src\routes\webhook.route.js" -Content @'
const express = require('express');
const router = express.Router();
const { getBotInstance } = require('../services/telegram.service');

router.post('/', (req, res) => {
  const bot = getBotInstance();
  if (bot) {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } else {
    res.status(503).send('Bot not initialized');
  }
});

module.exports = router;
'@

Ensure-File -Path "$basePath\src\routes\commands.route.js" -Content @'
const express = require('express');
const router = express.Router();
const Command = require('../models/Command');

router.get('/', async (req, res) => {
  try {
    const commands = await Command.find().sort({ createdAt: -1 });
    res.json({ success: true, data: commands });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const command = await Command.create(req.body);
    res.status(201).json({ success: true, data: command });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const command = await Command.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: command });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Command.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
'@

Ensure-File -Path "$basePath\src\routes\users.route.js" -Content @'
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ lastActiveAt: -1 }).limit(100);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
'@

Ensure-File -Path "$basePath\src\routes\schedules.route.js" -Content @'
const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.find().sort({ time: 1 });
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const schedule = await Schedule.create(req.body);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
'@

Ensure-File -Path "$basePath\src\routes\broadcast.route.js" -Content @'
const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');
const { sendBroadcast } = require('../services/broadcast.service');

router.get('/', async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: broadcasts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { message, targetGroup } = req.body;
    if (!message || !targetGroup) {
      return res.status(400).json({ success: false, error: 'Message and targetGroup required' });
    }
    const broadcast = await sendBroadcast(message, targetGroup, global.io);
    res.json({ success: true, data: broadcast });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
'@

Ensure-File -Path "$basePath\src\routes\analytics.route.js" -Content @'
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Command = require('../models/Command');
const Message = require('../models/Message');

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActiveAt: { $gte: new Date(Date.now() - 86400000) }
    });
    const totalCommands = await Command.countDocuments({ status: 'active' });
    const todayMessages = await Message.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 86400000) }
    });

    res.json({
      success: true,
      data: { totalUsers, activeUsers, totalCommands, todayMessages }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
'@

Ensure-File -Path "$basePath\src\routes\admin.route.js" -Content @'
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Simple admin auth (replace with proper auth in production)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === process.env.ADMINEMAIL && password === process.env.ADMINPASSWORD) {
    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWTEXPIRESIN || '7d' }
    );
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

router.get('/me', (req, res) => {
  res.json({ success: true, data: { email: process.env.ADMIN_EMAIL, role: 'admin' } });
});

module.exports = router;
'@

==========================================
MIDDLEWARE
==========================================
Write-Host "n🛡️  Checking middleware/ files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\src\middleware\auth.middleware.js" -Content @'
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

module.exports = { authMiddleware };
'@

Ensure-File -Path "$basePath\src\middleware\validate.middleware.js" -Content @'
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        errors: error.details.map(d => d.message)
      });
    }
    next();
  };
};

module.exports = { validate };
'@

==========================================
UTILS
==========================================
Write-Host "n Checking utils/ files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\src\utils\logger.js" -Content @'
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return ${timestamp} [${level.toUpperCase()}] ${message};
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: path.join(dirname, '../../logs/app.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

module.exports = logger;
'@

Ensure-File -Path "$basePath\src\utils\helpers.js" -Content @'
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const sanitizeText = (text) => {
  if (!text) return '';
  return text.replace(/[<>]/g, '');
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { formatNumber, sanitizeText, generateId, sleep };
'@

==========================================
PUBLIC (ADMIN PANEL)
==========================================
Write-Host "n🎨 Checking public/ files..." -ForegroundColor Yellow

Ensure-File -Path "$basePath\public\admin-panel.html" -Content @'

ATR_dailybot · Admin Panel

  body { font-family: system-ui; background: #0d1117; color: #e6edf3; margin: 0; padding: 40px; }
  .container { max-width: 800px; margin: 0 auto; }
  h1 { color: #58a6ff; }
  .status { padding: 12px; border-radius: 8px; background: #161b22; margin: 12px 0; }
  .status.online { border-left: 4px solid #3fb950; }
  .status.offline { border-left: 4px solid #f85149; }
  #feed { font-family: monospace; font-size: 13px; max-height: 400px; overflow-y: auto; }
  .feed-item { padding: 8px; border-bottom: 1px solid #30363d; }

   ATR_dailybot Admin Panel
  🔴 Connecting...
  📊 Live Feed
  

  const socket = io(window.location.origin);
  socket.on('connect', () => {
    document.getElementById('status').className = 'status online';
    document.getElementById('status').textContent = '🟢 Connected';
  });
  socket.on('disconnect', () => {
    document.getElementById('status').className = 'status offline';
    document.getElementById('status').textContent = '🔴 Disconnected';
  });
  socket.on('message:received', (data) => {
    const feed = document.getElementById('feed');
    feed.innerHTML = '📨 @' + data.username + ': ' + data.text + '' + feed.innerHTML;
  });
  socket.on('command:executed', (data) => {
    const feed = document.getElementById('feed');
    feed.innerHTML = '️ /' + data.command + ' by @' + data.user + '' + feed.innerHTML;
  });

'@

==========================================
SUMMARY
==========================================
Write-Host "n==================================================" -ForegroundColor Cyan
Write-Host "  ✅ STRUCTURE CHECK COMPLETE!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Yellow
Write-Host "   ✅ Already existed: $exists" -ForegroundColor Green
Write-Host "   🆕 Created:         $created" -ForegroundColor Yellow
Write-Host ""
Write-Host "👉 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Update .env with your real MongoDB credentials"
Write-Host "   2. Run: npm install"
Write-Host "   3. Run: node src/server.js"
Write-Host "   4. Visit: http://localhost:8090"
Write-Host "==================================================" -ForegroundColor Cyan