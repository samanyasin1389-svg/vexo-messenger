import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/prisma.js';
import { authMiddleware, publicUser } from '../middleware/auth.js';

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || './uploads';

['images', 'videos', 'voices', 'files'].forEach((d) => {
  fs.mkdirSync(path.join(uploadDir, d), { recursive: true });
});

function folderFor(mime) {
  if (mime.startsWith('image/')) return 'images';
  if (mime.startsWith('video/')) return 'videos';
  if (mime.startsWith('audio/')) return 'voices';
  return 'files';
}

function typeFor(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'voice';
  return 'file';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(uploadDir, folderFor(file.mimetype)));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.post(
  '/:chatId/media',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const member = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: req.user.id } },
      });
      if (!member) return res.status(403).json({ error: 'دسترسی ندارید' });
      if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشد' });

      const folder = folderFor(req.file.mimetype);
      const fileUrl = `/uploads/${folder}/${req.file.filename}`;
      const type = typeFor(req.file.mimetype);
      const caption = String(req.body.caption || '');

      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: req.user.id,
          type,
          content: caption,
          fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
        include: { sender: true },
      });

      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      const payload = {
        id: message.id,
        chatId: message.chatId,
        type: message.type,
        content: message.content,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
        createdAt: message.createdAt,
        sender: publicUser(message.sender),
      };

      const io = req.app.get('io');
      if (io) io.to(`chat:${chatId}`).emit('message:new', payload);

      res.status(201).json({ message: payload });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطا در آپلود' });
    }
  }
);

export default router;
