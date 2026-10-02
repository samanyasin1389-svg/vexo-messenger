import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/prisma.js';
import { authMiddleware, publicUser } from '../middleware/auth.js';

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || './uploads';
fs.mkdirSync(path.join(uploadDir, 'avatars'), { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(uploadDir, 'avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('فقط تصویر مجاز است'));
  },
});

router.get('/search', authMiddleware, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [] });
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: req.user.id } },
        {
          OR: [
            { username: { contains: q } },
            { displayName: { contains: q } },
          ],
        },
      ],
    },
    take: 20,
  });
  res.json({ users: users.map(publicUser) });
});

router.get('/:username', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username.toLowerCase() },
  });
  if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
  res.json({ user: publicUser(user) });
});

router.patch('/me', authMiddleware, async (req, res) => {
  const { displayName, bio } = req.body;
  const data = {};
  if (displayName !== undefined) data.displayName = String(displayName).trim();
  if (bio !== undefined) data.bio = String(bio).slice(0, 200);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
  });
  res.json({ user: publicUser(user) });
});

router.post(
  '/me/avatar',
  authMiddleware,
  avatarUpload.single('avatar'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشد' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });
    res.json({ user: publicUser(user) });
  }
);

export default router;
