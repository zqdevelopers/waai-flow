import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../database/index.js';
import { logger, logBuffer } from '../app.js';
import { baileyService } from '../baileys/index.js';
import { dataPath } from '../paths.js';

const uploadDir = dataPath('uploads');
const envPath = path.join(process.cwd(), '.env');

const parseJson = (value, fallback) => {
  try {
    if (value === null || value === undefined || value === '') return fallback;
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const stringify = (value) => JSON.stringify(value ?? []);

const settingMap = async (prefix = '') => {
  const rows = await prisma.settings.findMany({
    where: prefix ? { key: { startsWith: prefix } } : undefined,
    orderBy: { key: 'asc' }
  });
  return Object.fromEntries(rows.map((row) => [row.key, parseJson(row.value, row.value)]));
};

const upsertSetting = (key, value) => prisma.settings.upsert({
  where: { key },
  update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
  create: { key, value: typeof value === 'string' ? value : JSON.stringify(value) }
});

const sanitizeEnvValue = (key, value) => {
  if (value === undefined || value === null) return '';
  if (/SECRET|TOKEN|KEY|PASSWORD/i.test(key) && value === '********') {
    return process.env[key] || '';
  }
  return String(value);
};

const readEnv = () => {
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  return Object.fromEntries(lines
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      const key = index >= 0 ? line.slice(0, index).trim() : line.trim();
      const value = index >= 0 ? line.slice(index + 1).trim().replace(/^"|"$/g, '') : '';
      return [key, value];
    }));
};

const writeEnv = (values) => {
  const current = readEnv();
  const next = { ...current };
  for (const [key, value] of Object.entries(values || {})) {
    if (!/^[A-Z0-9_]+$/i.test(key)) continue;
    next[key] = sanitizeEnvValue(key, value);
    process.env[key] = next[key];
  }
  const content = Object.entries(next)
    .map(([key, value]) => `${key}="${String(value).replaceAll('"', '\\"')}"`)
    .join('\n');
  fs.writeFileSync(envPath, `${content}\n`, 'utf8');
  return next;
};

export const getAgents = async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json(agents);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
};

export const createAgent = async (req, res) => {
  try {
    const agent = await prisma.agent.create({
      data: {
        name: req.body.name || 'New Agent',
        description: req.body.description || '',
        provider: req.body.provider || 'openai',
        model: req.body.model || 'gpt-4o',
        systemPrompt: req.body.systemPrompt || 'You are a helpful WhatsApp assistant.',
        temperature: Number(req.body.temperature ?? 0.7),
        isActive: req.body.isActive !== false
      }
    });
    res.json(agent);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
};

export const updateAgent = async (req, res) => {
  try {
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        provider: req.body.provider,
        model: req.body.model,
        systemPrompt: req.body.systemPrompt,
        temperature: req.body.temperature === undefined ? undefined : Number(req.body.temperature),
        isActive: req.body.isActive
      }
    });
    res.json(agent);
  } catch (error) {
    logger.error(error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2025' ? 'Agent not found' : 'Failed to update agent' });
  }
};

export const deleteAgent = async (req, res) => {
  try {
    await prisma.agent.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2025' ? 'Agent not found' : 'Failed to delete agent' });
  }
};

export const getExecutions = async (req, res) => {
  try {
    const executions = await prisma.execution.findMany({
      include: { Flow: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(executions.map((execution) => ({
      ...execution,
      logs: parseJson(execution.logs, [])
    })));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};

export const getConversations = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const messages = await prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    const grouped = new Map();
    for (const message of messages) {
      const current = grouped.get(message.remoteJid) || {
        remoteJid: message.remoteJid,
        sender: message.sender,
        lastText: message.text,
        messageCount: 0,
        lastMessageAt: message.createdAt
      };
      current.messageCount += 1;
      if (new Date(message.createdAt) >= new Date(current.lastMessageAt)) {
        current.lastText = message.text;
        current.lastMessageAt = message.createdAt;
        current.sender = message.sender;
      }
      grouped.set(message.remoteJid, current);
    }
    res.json(Array.from(grouped.values()).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const cursor = req.query.cursor;
    const where = req.query.remoteJid ? { remoteJid: req.query.remoteJid } : undefined;
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
    res.json(messages);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const createMessage = async (req, res) => {
  try {
    const { sessionId, to, text } = req.body;
    if (!to || (!text && !req.body.type && !req.body.content)) return res.status(400).json({ error: 'to and message content are required' });

    if (sessionId) {
      await baileyService.sendMessage(sessionId, to, req.body);
    }

    const message = await prisma.message.create({
      data: {
        remoteJid: to,
        messageId: `manual-${crypto.randomUUID()}`,
        sender: sessionId || 'manual',
        text,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });
    res.json(message);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

export const getMessagingCapabilities = async (req, res) => {
  res.json({
    messageTypes: ['text', 'template', 'markdown', 'code', 'image', 'video', 'gif', 'audio', 'document', 'sticker', 'location', 'contact', 'contacts', 'poll', 'buttons', 'urlButtons', 'copyButton', 'combinedButtons', 'list', 'nativeFlow', 'richMessage', 'product', 'shop', 'collection', 'payment', 'raw'],
    automation: ['autoReply', 'scheduler', 'antiDelete', 'messageSearch', 'readReceipts', 'typingIndicator'],
    utilities: ['jidPlotting', 'vCard', 'statusPosting', 'groups', 'privacy']
  });
};

export const sendAdvancedMessage = async (req, res) => {
  try {
    const { sessionId, to } = req.body;
    if (!sessionId || !to) return res.status(400).json({ error: 'sessionId and to are required' });
    const result = await baileyService.sendMessage(sessionId, to, req.body);
    res.json(result);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

export const getScheduledMessages = async (req, res) => {
  try {
    res.json(baileyService.getScheduledMessages(req.query.sessionId));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to get scheduled messages' });
  }
};

export const scheduleMessage = async (req, res) => {
  try {
    const { sessionId, to } = req.body;
    if (!sessionId || !to) return res.status(400).json({ error: 'sessionId and to are required' });
    const scheduled = baileyService.scheduleMessage(sessionId, to, req.body);
    res.json(scheduled);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to schedule message' });
  }
};

export const cancelScheduledMessage = async (req, res) => {
  try {
    const cancelled = baileyService.cancelScheduledMessage(req.params.sessionId, req.params.id);
    res.json({ success: cancelled });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to cancel scheduled message' });
  }
};

export const getAutoReplies = async (req, res) => {
  try {
    res.json(await baileyService.getAutoReplyRules());
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to get auto-reply rules' });
  }
};

export const saveAutoReplies = async (req, res) => {
  try {
    const rules = Array.isArray(req.body) ? req.body : req.body.rules;
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules array is required' });
    res.json(await baileyService.saveAutoReplyRules(rules));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to save auto-reply rules' });
  }
};

export const getDeletedMessages = async (req, res) => {
  try {
    res.json(baileyService.getDeletedMessages(req.query.chatId));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to get deleted messages' });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const query = req.query.q || req.body.query;
    if (!query) return res.status(400).json({ error: 'q query parameter is required' });
    res.json(baileyService.searchMessages(query, req.body.options || {}));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
};

export const simulateTyping = async (req, res) => {
  try {
    const { sessionId, jid, duration, recording } = req.body;
    if (!sessionId || !jid) return res.status(400).json({ error: 'sessionId and jid are required' });
    res.json(await baileyService.simulateTyping(sessionId, jid, duration, recording));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to simulate typing' });
  }
};

export const markRead = async (req, res) => {
  try {
    const { sessionId, jid, messageIds, participant } = req.body;
    if (!sessionId || !jid || !Array.isArray(messageIds)) return res.status(400).json({ error: 'sessionId, jid and messageIds[] are required' });
    res.json(await baileyService.markRead(sessionId, jid, messageIds, participant));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to mark read' });
  }
};

export const plotJid = async (req, res) => {
  try {
    const value = req.body.value || req.query.value;
    if (!value) return res.status(400).json({ error: 'value is required' });
    res.json(baileyService.plotJid(value));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to plot JID' });
  }
};

export const createVCard = async (req, res) => {
  try {
    res.json(baileyService.createVCard(req.body));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to create vCard' });
  }
};

export const postStatus = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
    res.json(await baileyService.postStatus(sessionId, req.body));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to post status' });
  }
};

export const groupAction = async (req, res) => {
  try {
    const { sessionId, action } = req.body;
    if (!sessionId || !action) return res.status(400).json({ error: 'sessionId and action are required' });
    res.json(await baileyService.groupAction(sessionId, action, req.body));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to perform group action' });
  }
};

export const privacyAction = async (req, res) => {
  try {
    const { sessionId, action } = req.body;
    if (!sessionId || !action) return res.status(400).json({ error: 'sessionId and action are required' });
    res.json(await baileyService.privacyAction(sessionId, action, req.body));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error.message || 'Failed to perform privacy action' });
  }
};

export const getBroadcasts = async (req, res) => {
  try {
    const broadcasts = await prisma.broadcast.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json(broadcasts.map((broadcast) => ({
      ...broadcast,
      recipients: parseJson(broadcast.recipients, []),
      result: parseJson(broadcast.result, null)
    })));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch broadcasts' });
  }
};

export const createBroadcast = async (req, res) => {
  try {
    const recipients = Array.isArray(req.body.recipients)
      ? req.body.recipients
      : String(req.body.recipients || '').split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);

    const broadcast = await prisma.broadcast.create({
      data: {
        name: req.body.name || 'Untitled Broadcast',
        sessionId: req.body.sessionId || null,
        recipients: stringify(recipients),
        text: req.body.text || '',
        delayMs: Number(req.body.delayMs ?? 1000),
        status: 'DRAFT'
      }
    });
    res.json({ ...broadcast, recipients });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to create broadcast' });
  }
};

export const runBroadcast = async (req, res) => {
  try {
    const broadcast = await prisma.broadcast.findUnique({ where: { id: req.params.id } });
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    if (broadcast.status === 'RUNNING') return res.status(400).json({ error: 'Broadcast already running' });

    const recipients = parseJson(broadcast.recipients, []);
    const delayMs = broadcast.delayMs ?? 1000;

    await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: 'RUNNING', result: '[]' } });
    res.json({ success: true, message: `Sending to ${recipients.length} recipients…` });

    (async () => {
      const result = [];
      try {
        for (let i = 0; i < recipients.length; i++) {
          const to = recipients[i];
          try {
            if (broadcast.sessionId) await baileyService.sendMessage(broadcast.sessionId, to, { text: broadcast.text });
            result.push({ to, success: true });
          } catch (error) {
            result.push({ to, success: false, error: error.message });
          }
          await prisma.broadcast.update({
            where: { id: broadcast.id },
            data: { result: JSON.stringify(result) }
          }).catch(() => {});
          if (delayMs > 0 && i < recipients.length - 1) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
        const anyFailed = result.some((item) => !item.success);
        await prisma.broadcast.update({
          where: { id: broadcast.id },
          data: { status: anyFailed ? 'PARTIAL' : 'COMPLETED', result: JSON.stringify(result) }
        }).catch(() => {});
      } catch (error) {
        logger.error({ error, broadcastId: broadcast.id }, 'Broadcast loop failed');
        await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: 'FAILED' } }).catch(() => {});
      }
    })();
  } catch (error) {
    logger.error(error);
    await prisma.broadcast.update({ where: { id: req.params.id }, data: { status: 'FAILED' } }).catch(() => {});
    if (!res.headersSent) res.status(500).json({ error: 'Failed to run broadcast' });
  }
};

export const deleteBroadcast = async (req, res) => {
  try {
    await prisma.broadcast.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2025' ? 'Broadcast not found' : 'Failed to delete broadcast' });
  }
};

export const getWebhooks = async (req, res) => {
  try {
    const flows = await prisma.flow.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json(flows.map((flow) => ({
      id: flow.id,
      name: flow.name,
      isActive: flow.isActive,
      url: `/api/webhook/${flow.id}`,
      updatedAt: flow.updatedAt
    })));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
};

export const getApiDocs = async (req, res) => {
  res.json({
    baseUrl: '/api',
    endpoints: [
      ['GET', '/status', 'Health check'],
      ['GET/POST/PUT/DELETE', '/flows', 'Manage automation flows'],
      ['GET/POST/DELETE', '/session', 'Manage WhatsApp sessions'],
      ['POST', '/webhook/:flowId', 'Trigger an active flow'],
      ['GET/POST/PUT/DELETE', '/modules/agents', 'Manage AI agents'],
      ['GET', '/modules/messages', 'List messages'],
      ['POST', '/modules/messages', 'Send or record a message'],
      ['POST', '/modules/messaging/send', 'Send any supported Baileys message type'],
      ['GET/POST/DELETE', '/modules/broadcasts', 'Manage broadcasts'],
      ['GET/POST/DELETE', '/modules/scheduler', 'Schedule and cancel messages'],
      ['GET/PUT', '/modules/auto-replies', 'Manage keyword/regex auto replies'],
      ['GET', '/modules/deleted-messages', 'Inspect anti-delete recovered messages'],
      ['GET/POST', '/modules/search', 'Search indexed WhatsApp messages'],
      ['POST', '/modules/typing', 'Simulate typing or recording presence'],
      ['POST', '/modules/read-receipts', 'Programmatically mark messages as read'],
      ['POST', '/modules/jid/plot', 'Normalize and inspect phone/JID/LID values'],
      ['POST', '/modules/vcard', 'Generate vCard contact message payloads'],
      ['POST', '/modules/status', 'Post text/image/video/audio status'],
      ['POST', '/modules/groups', 'Run group management actions'],
      ['POST', '/modules/privacy', 'Run privacy/blocklist actions']
    ]
  });
};

export const getProviders = async (req, res) => {
  try {
    const settings = await settingMap('provider.');
    res.json({
      providers: [
        { id: 'openai', name: 'OpenAI', enabled: settings['provider.openai.enabled'] !== false, model: settings['provider.openai.model'] || 'gpt-4o', hasApiKey: Boolean(process.env.OPENAI_API_KEY) },
        { id: 'gemini', name: 'Gemini', enabled: settings['provider.gemini.enabled'] === true, model: settings['provider.gemini.model'] || 'gemini-2.0-flash', hasApiKey: Boolean(process.env.GEMINI_API_KEY) },
        { id: 'ollama', name: 'Ollama', enabled: settings['provider.ollama.enabled'] === true, model: settings['provider.ollama.model'] || 'llama3', hasApiKey: true }
      ]
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
};

export const updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    await upsertSetting(`provider.${id}.enabled`, Boolean(req.body.enabled));
    if (req.body.model) await upsertSetting(`provider.${id}.model`, req.body.model);
    if (req.body.apiKey) writeEnv({ [`${id.toUpperCase()}_API_KEY`]: req.body.apiKey });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
};

export const getPlugins = async (req, res) => {
  try {
    const plugins = await prisma.plugin.findMany({ orderBy: { name: 'asc' } });
    res.json(plugins.map((plugin) => ({ ...plugin, config: parseJson(plugin.config, {}) })));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch plugins' });
  }
};

export const updatePlugin = async (req, res) => {
  try {
    const plugin = await prisma.plugin.update({
      where: { id: req.params.id },
      data: {
        isActive: req.body.isActive,
        config: req.body.config === undefined ? undefined : JSON.stringify(req.body.config)
      }
    });
    res.json(plugin);
  } catch (error) {
    logger.error(error);
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2025' ? 'Plugin not found' : 'Failed to update plugin' });
  }
};

export const getFiles = async (req, res) => {
  try {
    const files = await prisma.fileAsset.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(files);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const file = await prisma.fileAsset.create({
      data: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });
    res.json(file);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const file = await prisma.fileAsset.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    await prisma.fileAsset.delete({ where: { id: file.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const [sessions, flows, executions, messages, agents, broadcasts, files] = await Promise.all([
      prisma.session.count(),
      prisma.flow.count(),
      prisma.execution.count(),
      prisma.message.count(),
      prisma.agent.count(),
      prisma.broadcast.count(),
      prisma.fileAsset.count()
    ]);
    const recentMessages = await prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
    res.json({
      totals: { sessions, flows, executions, messages, agents, broadcasts, files },
      recentMessagesByDay: recentMessages.reduce((days, message) => {
        const key = message.createdAt.toISOString().slice(0, 10);
        days[key] = (days[key] || 0) + 1;
        return days;
      }, {})
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await settingMap();
    res.json(settings);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    await Promise.all(Object.entries(req.body || {}).map(([key, value]) => upsertSetting(key, value)));
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const getEnv = async (req, res) => {
  try {
    const values = { ...readEnv(), PORT: process.env.PORT, DATABASE_URL: process.env.DATABASE_URL };
    res.json(Object.fromEntries(Object.entries(values).map(([key, value]) => [
      key,
      /SECRET|TOKEN|KEY|PASSWORD/i.test(key) && value ? '********' : value
    ])));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to read environment' });
  }
};

export const updateEnv = async (req, res) => {
  try {
    const values = writeEnv(req.body || {});
    res.json(Object.fromEntries(Object.entries(values).map(([key, value]) => [
      key,
      /SECRET|TOKEN|KEY|PASSWORD/i.test(key) && value ? '********' : value
    ])));
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update environment' });
  }
};

export const getLogs = async (req, res) => {
  res.json(logBuffer.slice(-200).reverse());
};

export const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
};
