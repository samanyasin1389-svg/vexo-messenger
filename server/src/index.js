import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chats.js';
import mediaRoutes from './routes/media.js';
import { setupSocket } from './socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const port = Number(process.env.PORT) || 4000;

fs.mkdirSync(uploadDir, { recursive: true });

const io = new Server(server, {
  cors: { origin: clientOrigin, credentials: true },
  maxHttpBufferSize: 1e8,
});
app.set('io', io);
setupSocket(io);

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.resolve(uploadDir)));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Vexo' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/chats', mediaRoutes);

const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

server.listen(port, () => {
  console.log(`🚀 Vexo سرور روی پورت ${port}`);
});
