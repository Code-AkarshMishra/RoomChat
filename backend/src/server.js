require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const healthRoutes = require('./routes/healthRoutes');
const setupSocketHandlers = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Setup CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, uptime bots) or matching CLIENT_URL
      if (!origin || CLIENT_URL === '*' || origin.includes(CLIENT_URL) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/prod with credential headers
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Anti-Sleep & Health Routes
app.use('/', healthRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

setupSocketHandlers(io);

// Optional internal keep-alive self-ping for free tier hosting (Render/Railway)
if (process.env.AUTO_PING_URL) {
  const autoPingInterval = 14 * 60 * 1000; // 14 mins
  setInterval(async () => {
    try {
      const fetch = (await import('node-fetch')).default;
      await fetch(`${process.env.AUTO_PING_URL}/ping`);
      console.log('⏰ [Self-Ping] Sent keep-alive signal to preserve warm instance.');
    } catch (err) {
      console.warn('⚠️ Self-ping failed:', err.message);
    }
  }, autoPingInterval);
}

// Start Server
const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🥷 ROOMCHAT SECURE GATEWAY RUNNING ON PORT ${PORT}`);
    console.log(`📡 Anti-Sleep Ping: http://localhost:${PORT}/ping`);
    console.log(`🔒 Zero-Trace In-Memory Auth Policy Active`);
    console.log('====================================================');
  });
};

startServer();

module.exports = { app, server, io };

