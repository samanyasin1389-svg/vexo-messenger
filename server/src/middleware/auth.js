import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'nabiro-dev-secret';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    secret,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, secret);
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'وارد نشده‌اید' });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'توکن نامعتبر است' });
  }
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}
