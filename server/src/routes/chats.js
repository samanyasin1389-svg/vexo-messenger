import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authMiddleware, publicUser } from '../middleware/auth.js';

const router = Router();

/** Put every member's live sockets into the chat room and tell them a chat appeared. */
function announceChat(req, chat) {
  const io = req.app.get('io');
  if (!io) return;
  for (const m of chat.members) {
    io.in(`user:${m.userId}`).socketsJoin(`chat:${chat.id}`);
    if (m.userId !== req.user.id) {
      io.to(`user:${m.userId}`).emit('chat:new', formatChat(chat, m.userId));
    }
  }
}

const SAVED_TITLE = 'پیام‌های ذخیره‌شده';

const chatInclude = {
  members: { include: { user: true } },
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
};

/** Find or create the user's private "saved messages" chat. */
async function getSavedChat(userId) {
  const existing = await prisma.chat.findFirst({
    where: { type: 'saved', members: { some: { userId } } },
    include: chatInclude,
  });
  if (existing) return existing;
  return prisma.chat.create({
    data: {
      type: 'saved',
      title: SAVED_TITLE,
      createdById: userId,
      members: { create: [{ userId }] },
    },
    include: chatInclude,
  });
}

function formatChat(chat, currentUserId) {
  const other =
    chat.type === 'direct'
      ? chat.members.find((m) => m.userId !== currentUserId)?.user
      : null;
  const lastMessage = chat.messages[0] || null;
  return {
    id: chat.id,
    type: chat.type,
    title:
      chat.type === 'saved'
        ? SAVED_TITLE
        : chat.type === 'direct'
          ? other?.displayName || other?.username || 'چت'
          : chat.title || 'گروه',
    avatarUrl: chat.type === 'direct' ? other?.avatarUrl : chat.avatarUrl,
    otherUser: other ? publicUser(other) : null,
    members: chat.members.map((m) => publicUser(m.user)),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          type: lastMessage.type,
          content: lastMessage.content,
          fileName: lastMessage.fileName,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
        }
      : null,
    updatedAt: chat.updatedAt,
  };
}

router.get('/', authMiddleware, async (req, res) => {
  const memberships = await prisma.chatMember.findMany({
    where: { userId: req.user.id },
    include: {
      chat: {
        include: {
          members: { include: { user: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  const chats = memberships
    .map((m) => formatChat(m.chat, req.user.id))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({ chats });
});

router.post('/saved', authMiddleware, async (req, res) => {
  const chat = await getSavedChat(req.user.id);
  const io = req.app.get('io');
  io?.in(`user:${req.user.id}`).socketsJoin(`chat:${chat.id}`);
  res.json({ chat: formatChat(chat, req.user.id) });
});

/** Copy an existing message (from any chat the user belongs to) into saved messages. */
router.post('/saved/messages', authMiddleware, async (req, res) => {
  const { messageId } = req.body;
  if (!messageId) return res.status(400).json({ error: 'messageId لازم است' });

  const source = await prisma.message.findUnique({
    where: { id: messageId },
    include: { chat: { include: { members: true } } },
  });
  if (!source || !source.chat.members.some((m) => m.userId === req.user.id)) {
    return res.status(403).json({ error: 'دسترسی ندارید' });
  }

  const saved = await getSavedChat(req.user.id);
  const message = await prisma.message.create({
    data: {
      chatId: saved.id,
      senderId: req.user.id,
      type: source.type,
      content: source.content,
      fileUrl: source.fileUrl,
      fileName: source.fileName,
      fileSize: source.fileSize,
      mimeType: source.mimeType,
    },
    include: { sender: true },
  });
  await prisma.chat.update({ where: { id: saved.id }, data: { updatedAt: new Date() } });

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
  if (io) {
    io.in(`user:${req.user.id}`).socketsJoin(`chat:${saved.id}`);
    io.to(`chat:${saved.id}`).emit('message:new', payload);
  }

  const fresh = await prisma.chat.findUnique({ where: { id: saved.id }, include: chatInclude });
  res.status(201).json({ message: payload, chat: formatChat(fresh, req.user.id) });
});

router.post('/direct', authMiddleware, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId لازم است' });
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'نمی‌توانید با خودتان چت کنید' });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return res.status(404).json({ error: 'کاربر یافت نشد' });

  const existing = await prisma.chat.findFirst({
    where: {
      type: 'direct',
      AND: [
        { members: { some: { userId: req.user.id } } },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: { include: { user: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (existing) {
    return res.json({ chat: formatChat(existing, req.user.id) });
  }

  const chat = await prisma.chat.create({
    data: {
      type: 'direct',
      createdById: req.user.id,
      members: {
        create: [{ userId: req.user.id }, { userId }],
      },
    },
    include: {
      members: { include: { user: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  announceChat(req, chat);
  res.status(201).json({ chat: formatChat(chat, req.user.id) });
});

router.post('/group', authMiddleware, async (req, res) => {
  const { title, memberIds = [] } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'نام گروه لازم است' });

  const uniqueIds = [...new Set([req.user.id, ...memberIds])];
  const chat = await prisma.chat.create({
    data: {
      type: 'group',
      title: title.trim(),
      createdById: req.user.id,
      members: { create: uniqueIds.map((userId) => ({ userId })) },
    },
    include: {
      members: { include: { user: true } },
      messages: true,
    },
  });

  announceChat(req, chat);
  res.status(201).json({ chat: formatChat(chat, req.user.id) });
});

router.get('/:id/messages', authMiddleware, async (req, res) => {
  const member = await prisma.chatMember.findUnique({
    where: {
      chatId_userId: { chatId: req.params.id, userId: req.user.id },
    },
  });
  if (!member) return res.status(403).json({ error: 'دسترسی ندارید' });

  const take = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before;

  const messages = await prisma.message.findMany({
    where: {
      chatId: req.params.id,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    include: { sender: true },
    orderBy: { createdAt: 'desc' },
    take,
  });

  res.json({
    messages: messages.reverse().map((m) => ({
      id: m.id,
      chatId: m.chatId,
      type: m.type,
      content: m.content,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileSize: m.fileSize,
      mimeType: m.mimeType,
      createdAt: m.createdAt,
      sender: publicUser(m.sender),
    })),
  });
});

export default router;
