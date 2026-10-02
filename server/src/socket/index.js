import { prisma } from '../utils/prisma.js';
import { verifyToken, publicUser } from '../middleware/auth.js';

export function setupSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { chatId: true },
    });
    memberships.forEach((m) => socket.join(`chat:${m.chatId}`));

    socket.on('chat:join', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('message:send', async (data, ack) => {
      try {
        const { chatId, content } = data || {};
        if (!chatId || !String(content || '').trim()) {
          ack?.({ error: 'پیام خالی است' });
          return;
        }

        const member = await prisma.chatMember.findUnique({
          where: { chatId_userId: { chatId, userId } },
        });
        if (!member) {
          ack?.({ error: 'دسترسی ندارید' });
          return;
        }

        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: userId,
            type: 'text',
            content: String(content).trim(),
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
          fileUrl: null,
          fileName: null,
          fileSize: null,
          mimeType: null,
          createdAt: message.createdAt,
          sender: publicUser(message.sender),
        };

        io.to(`chat:${chatId}`).emit('message:new', payload);
        ack?.({ message: payload });
      } catch (err) {
        console.error(err);
        ack?.({ error: 'ارسال ناموفق' });
      }
    });

    socket.on('typing', async ({ chatId }) => {
      if (!chatId) return;
      if (!socket.displayName) {
        const me = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
        socket.displayName = me?.displayName || socket.user.username;
      }
      socket.to(`chat:${chatId}`).emit('typing', {
        chatId,
        userId,
        username: socket.user.username,
        displayName: socket.displayName,
      });
    });
  });
}
