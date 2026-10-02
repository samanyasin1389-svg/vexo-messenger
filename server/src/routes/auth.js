import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { signToken, authMiddleware, publicUser } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'آیدی و رمز عبور لازم است' });
    }
    const clean = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(clean)) {
      return res.status(400).json({
        error: 'آیدی باید ۳ تا ۲۴ حرف باشد (حروف انگلیسی، عدد و _)',
      });
    }
    if (String(password).length < 4) {
      return res.status(400).json({ error: 'رمز حداقل ۴ کاراکتر باشد' });
    }

    const exists = await prisma.user.findUnique({ where: { username: clean } });
    if (exists) {
      return res.status(409).json({ error: 'این آیدی قبلاً گرفته شده' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: clean,
        passwordHash,
        displayName: (displayName || clean).trim(),
      },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ثبت‌نام' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'آیدی و رمز لازم است' });
    }
    const user = await prisma.user.findUnique({
      where: { username: String(username).trim().toLowerCase() },
    });
    if (!user) {
      return res.status(401).json({ error: 'آیدی یا رمز اشتباه است' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'آیدی یا رمز اشتباه است' });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ورود' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
  res.json({ user: publicUser(user) });
});

export default router;
