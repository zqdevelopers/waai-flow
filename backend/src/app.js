import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import pino from 'pino';
import { connectDB } from './database/index.js';
import mainRoutes from './routes/index.js';
import webhookRoutes from './routes/webhook.routes.js';
import { pluginLoader } from './plugins/loader.js';
import authRoutes, { requireAuth, verifyToken } from './auth.js';
import { dataPath } from './paths.js';
import { baileyService } from './baileys/index.js';

dotenv.config();

export const logBuffer = [];

const logDir = dataPath('logs');
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

export const logger = pino(
  {
    hooks: {
      logMethod(args, method) {
        const message = args.map((arg) => {
          if (arg instanceof Error) return arg.message;
          if (typeof arg === 'object') return JSON.stringify(arg);
          return String(arg);
        }).join(' ');

        logBuffer.push({
          level: this.level,
          message,
          time: new Date().toISOString()
        });
        if (logBuffer.length > 500) logBuffer.shift();

        return method.apply(this, args);
      }
    }
  },
  pino.transport({
    targets: [
      { target: 'pino-pretty', options: { colorize: true }, level: 'info' },
      { target: 'pino/file', options: { destination: dataPath('logs', 'app.log'), append: true }, level: 'info' }
    ]
  })
);

const app = express();
const server = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : '*';

const corsOptions = { origin: corsOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] };

export const io = new Server(server, { cors: corsOptions });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' }
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(dataPath('uploads')));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/webhook', apiLimiter, webhookRoutes);
app.use('/api', apiLimiter, requireAuth, mainRoutes);

app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

io.use((socket, next) => {
  if (process.env.AUTH_DISABLED === 'true') return next();
  const token = socket.handshake.auth?.token
    || (socket.handshake.headers?.authorization || '').replace('Bearer ', '');
  if (!token || !verifyToken(token)) return next(new Error('Unauthorized'));
  next();
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  connectDB().then(async () => {
    await pluginLoader.loadPlugins();
    await baileyService.init();
  }).catch((err) => {
    logger.error('Startup initialization failed:', err);
    process.exit(1);
  });
});
