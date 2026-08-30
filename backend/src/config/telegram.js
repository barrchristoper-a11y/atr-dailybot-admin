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