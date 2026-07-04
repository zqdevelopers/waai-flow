import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import { connectDB } from './database/index.js';
import mainRoutes from './routes/index.js';
import { pluginLoader } from './plugins/loader.js';
import authRoutes, { requireAuth } from './auth.js';
import { dataPath } from './paths.js';

// Load environment variables
dotenv.config();

export const logBuffer = [];

// Create logger
export const logger = pino({
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
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

const app = express();
const server = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

// Configure Socket.IO
export const io = new Server(server, {
  cors: {
    origin: '*', // For development. Update in production.
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(dataPath('uploads')));

// Basic Status Route
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, mainRoutes);

app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

import { baileyService } from './baileys/index.js';

// Connect DB and Start Server
connectDB().then(async () => {
  await pluginLoader.loadPlugins();
  await baileyService.init();
  server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
});
