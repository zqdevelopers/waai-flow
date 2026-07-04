import { prisma } from '../database/index.js';
import { logger } from '../app.js';
import { baileyService } from '../baileys/index.js';

export const getSessions = async (req, res) => {
  try {
    const sessions = await prisma.session.findMany();
    // Inject QR codes into the response
    const sessionsWithQr = sessions.map(s => ({
      ...s,
      qr: baileyService.qrCache.get(s.sessionId) || null
    }));
    res.json(sessionsWithQr);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const createSession = async (req, res) => {
  const { sessionId, name } = req.body;
  if (!sessionId || !name) {
    return res.status(400).json({ error: 'sessionId and name are required' });
  }

  try {
    const existing = await prisma.session.findUnique({ where: { sessionId } });
    if (existing) {
      return res.status(400).json({ error: 'Session ID already exists' });
    }

    const session = await prisma.session.create({
      data: { sessionId, name, status: 'CONNECTING' }
    });

    // Start WhatsApp connection
    baileyService.startSession(sessionId);

    res.json(session);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

export const deleteSession = async (req, res) => {
  const { id } = req.params;
  try {
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Stop WhatsApp connection and detach flows before deleting the session.
    await baileyService.stopSession(session.sessionId);
    await prisma.flow.updateMany({
      where: { sessionId: id },
      data: { sessionId: null }
    });

    await prisma.session.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
};

export const sendMessage = async (req, res) => {
  const { sessionId, to, text, media } = req.body;
  if (!sessionId || !to) {
    return res.status(400).json({ error: 'sessionId and to are required' });
  }

  try {
    const result = await baileyService.sendMessage(sessionId, to, { text, media });
    res.json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};
