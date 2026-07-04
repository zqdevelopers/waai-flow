import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  createMessageScheduler,
  createAutoReply,
  createTypingIndicator,
  createReadReceiptController,
  createMessageSearch,
  MessageStore,
  createAntiDeleteHandler,
  createMessageStoreHandler,
  normalizePhoneToJid,
  parseJid,
  plotJid,
  getJidVariants,
  formatJidDisplay,
  createContactCard,
  createContactCards,
  renderTemplate,
  createTextStatus,
  createImageStatus,
  createVideoStatus,
  createAudioStatus,
  generateQuickReplyButtons,
  generateUrlButtonMessage,
  generateCopyCodeButton,
  generateNativeFlowMessage,
  generateInteractiveListMessage,
  generateCombinedButtons
} from '@innovatorssoft/baileys';
import { Boom } from '@hapi/boom';
import { logger, io } from '../app.js';
import { prisma } from '../database/index.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import { dataPath } from '../paths.js';

class BaileysService {
  constructor() {
    this.sessions = new Map();
    this.qrCache = new Map();
    this.schedulers = new Map();
    this.autoReplies = new Map();
    this.typingIndicators = new Map();
    this.readReceipts = new Map();
    this.messageStore = new MessageStore({ maxMessagesPerChat: 1000, ttl: 7 * 24 * 60 * 60 * 1000 });
    this.search = createMessageSearch();
  }

  async init() {
    const activeSessions = await prisma.session.findMany({
      where: { status: { not: 'DISCONNECTED' } }
    });
    for (const session of activeSessions) {
      logger.info(`Rehydrating session: ${session.sessionId}`);
      this.startSession(session.sessionId);
    }
  }

  async startSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      logger.info(`Session ${sessionId} already started.`);
      return this.sessions.get(sessionId);
    }

    const sessionDir = dataPath('sessions', sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: logger.child({ level: 'silent' }), // Suppress baileys internal logs or set to info
      browser: Browsers.macOS('Desktop')
    });

    sock.ev.on('creds.update', saveCreds);

    this.setupSessionUtilities(sessionId, sock);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.qrCache.set(sessionId, qr);
        // Emit QR to frontend
        io.emit(`qr-${sessionId}`, { qr });
        io.emit('qr', { sessionId, qr }); // Global event
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        logger.info(`Session ${sessionId} closed. Reconnecting: ${shouldReconnect}`);
        
        const newStatus = shouldReconnect ? 'CONNECTING' : 'DISCONNECTED';
        
        await prisma.session.update({
          where: { sessionId },
          data: { status: newStatus }
        }).catch((error) => {
          logger.warn({ error, sessionId }, 'Unable to update closed session status');
        });
        io.emit(`status-${sessionId}`, { status: newStatus });
        io.emit('status', { sessionId, status: newStatus });

        if (shouldReconnect) {
          this.startSession(sessionId);
        } else {
          this.sessions.delete(sessionId);
          // Delete folder if logged out
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
      } else if (connection === 'open') {
        logger.info(`Session ${sessionId} opened.`);
        this.qrCache.delete(sessionId);
        await prisma.session.update({
          where: { sessionId },
          data: { status: 'CONNECTED' }
        }).catch((error) => {
          logger.warn({ error, sessionId }, 'Unable to update opened session status');
        });
        io.emit(`status-${sessionId}`, { status: 'CONNECTED' });
        io.emit('status', { sessionId, status: 'CONNECTED' });
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      createMessageStoreHandler(this.messageStore)(m);
      this.search.addMessages(m.messages);

      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            await this.autoReplies.get(sessionId)?.processMessage(msg).catch((error) => {
              logger.warn({ error, sessionId }, 'Auto-reply failed');
            });
            this.handleIncomingMessage(sessionId, msg, sock);
          }
        }
      }
    });

    sock.ev.on('messages.update', (updates) => {
      const deleted = createAntiDeleteHandler(this.messageStore)(updates);
      for (const item of deleted) {
        io.emit('message-deleted', {
          key: item.key,
          deletedAt: item.deletedAt,
          deletedBy: item.deletedBy,
          isRevokedBySender: item.isRevokedBySender
        });
      }
    });

    this.sessions.set(sessionId, sock);
    return sock;
  }

  async setupSessionUtilities(sessionId, sock) {
    this.schedulers.set(sessionId, createMessageScheduler(
      (jid, content) => sock.sendMessage(jid, content),
      {
        onSent: (scheduled) => logger.info(`Scheduled message sent: ${scheduled.id}`),
        onFailed: (scheduled, error) => logger.warn({ error, scheduled }, 'Scheduled message failed')
      }
    ));

    this.typingIndicators.set(sessionId, createTypingIndicator(
      (jid, presence) => sock.sendPresenceUpdate(presence, jid)
    ));

    this.readReceipts.set(sessionId, createReadReceiptController(
      async (jid, participant, messageIds) => {
        await sock.readMessages(messageIds.map((id) => ({ remoteJid: jid, participant, id })));
      },
      { enabled: true, autoRead: false, readDelay: 0, excludeJids: [] }
    ));

    const autoReply = createAutoReply(
      (jid, content, opts) => sock.sendMessage(jid, content, opts),
      (jid, presence) => sock.sendPresenceUpdate(presence, jid),
      { simulateTyping: true, typingDuration: 1000, globalCooldown: 1000 }
    );

    const rules = await this.getAutoReplyRules();
    for (const rule of rules.filter((item) => item.active !== false)) {
      autoReply.addRule({
        ...rule,
        pattern: rule.pattern ? new RegExp(rule.pattern, rule.flags || 'i') : undefined,
        response: this.buildMessageContent(rule.response || { type: 'text', text: '' })
      });
    }
    this.autoReplies.set(sessionId, autoReply);
  }

  getSession(sessionId) {
    const sock = this.sessions.get(sessionId);
    if (!sock) throw new Error(`Session ${sessionId} not active`);
    return sock;
  }

  async stopSession(sessionId) {
    const sock = this.sessions.get(sessionId);
    if (sock) {
      await sock.logout().catch((error) => {
        logger.warn({ error, sessionId }, 'Failed to logout session cleanly');
      });
      this.sessions.delete(sessionId);
    }
    this.qrCache.delete(sessionId);
    this.schedulers.get(sessionId)?.stop();
    this.schedulers.delete(sessionId);
    this.autoReplies.delete(sessionId);
    this.typingIndicators.delete(sessionId);
    this.readReceipts.delete(sessionId);
  }

  toMediaUpload(value) {
    if (!value) return undefined;
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'string') return value.startsWith('http') ? { url: value } : value;
    if (value.url) return { url: value.url };
    if (value.path) return value.path;
    return value;
  }

  buildMessageContent(payload = {}) {
    const type = payload.type || (payload.media ? payload.media.type : 'text');
    const text = payload.text || payload.caption || '';
    const media = payload.media || payload;

    switch (type) {
      case 'text':
        return { text };
      case 'template':
        return { text: renderTemplate(payload.template || text, payload.variables || {}) };
      case 'markdown':
        return { text };
      case 'code':
      case 'codeBlock':
        return { text: `\`\`\`${payload.language || ''}\n${payload.code || text}\n\`\`\`` };
      case 'image':
        return { image: this.toMediaUpload(media.url || media.path || media.image), caption: text };
      case 'video':
        return { video: this.toMediaUpload(media.url || media.path || media.video), caption: text };
      case 'gif':
        return { video: this.toMediaUpload(media.url || media.path || media.video), caption: text, gifPlayback: true };
      case 'audio':
        return { audio: this.toMediaUpload(media.url || media.path || media.audio), ptt: Boolean(payload.ptt) };
      case 'document':
        return {
          document: this.toMediaUpload(media.url || media.path || media.document),
          mimetype: payload.mimetype || media.mimetype || 'application/octet-stream',
          fileName: payload.fileName || media.fileName || 'document',
          caption: text
        };
      case 'sticker':
        return { sticker: this.toMediaUpload(media.url || media.path || media.sticker), isAnimated: Boolean(payload.isAnimated) };
      case 'location':
        return {
          location: {
            degreesLatitude: Number(payload.latitude),
            degreesLongitude: Number(payload.longitude),
            name: payload.name,
            address: payload.address
          }
        };
      case 'contacts':
      case 'contact':
        return Array.isArray(payload.contacts)
          ? createContactCards(payload.contacts)
          : createContactCard(payload.contact || {
              fullName: payload.fullName || payload.name || 'Contact',
              displayName: payload.displayName || payload.name,
              phones: [{ number: payload.phone || payload.number || '' }],
              organization: payload.organization,
              title: payload.title,
              emails: payload.email ? [{ email: payload.email }] : undefined
            });
      case 'poll':
        return { poll: { name: payload.name || text, values: payload.values || [], selectableCount: Number(payload.selectableCount || 1) } };
      case 'buttons':
        return generateQuickReplyButtons(text, payload.buttons || [], { title: payload.title, footer: payload.footer });
      case 'urlButtons':
        return generateUrlButtonMessage(text, payload.buttons || [], { title: payload.title, footer: payload.footer });
      case 'copyButton':
        return generateCopyCodeButton(text, payload.copyCode || payload.code || '', payload.displayText || 'Copy', { footer: payload.footer });
      case 'combinedButtons':
        return generateCombinedButtons(text, payload.buttons || [], { title: payload.title, footer: payload.footer });
      case 'list':
        return generateInteractiveListMessage({
          title: payload.title || 'Options',
          buttonText: payload.buttonText || 'Open',
          description: payload.description || text,
          footer: payload.footer,
          sections: payload.sections || []
        });
      case 'nativeFlow':
        return generateNativeFlowMessage(text, payload.buttons || [], payload.options || {});
      case 'rich':
      case 'richMessage':
        return { richResponse: { text, code: payload.code, table: payload.table, submessages: payload.submessages } };
      case 'product':
        return { product: payload.product, businessOwnerJid: payload.businessOwnerJid, body: text, footer: payload.footer };
      case 'shop':
        return { text, shop: payload.shop, title: payload.title, footer: payload.footer };
      case 'collection':
        return { text, collection: payload.collection, title: payload.title, footer: payload.footer };
      case 'payment':
        return { text, nativeFlow: payload.nativeFlow || [], interactiveButtons: payload.buttons || [] };
      case 'raw':
        return payload.content || {};
      default:
        return { text };
    }
  }

  async sendMessage(sessionId, to, payload = {}) {
    const sock = this.getSession(sessionId);
    const content = this.buildMessageContent(payload.text && !payload.type ? { ...payload, type: 'text' } : payload);
    const result = await sock.sendMessage(to, content, payload.options || {});
    return { success: true, messageId: result?.key?.id, result };
  }

  scheduleMessage(sessionId, to, payload = {}) {
    const scheduler = this.schedulers.get(sessionId);
    if (!scheduler) throw new Error(`Session ${sessionId} scheduler not active`);
    const content = this.buildMessageContent(payload);
    const scheduled = payload.delayMs
      ? scheduler.scheduleDelay(to, content, Number(payload.delayMs))
      : scheduler.schedule(to, content, new Date(payload.scheduledTime));
    return scheduled;
  }

  getScheduledMessages(sessionId) {
    return sessionId
      ? this.schedulers.get(sessionId)?.getPending() || []
      : Array.from(this.schedulers.entries()).flatMap(([id, scheduler]) => scheduler.getPending().map((item) => ({ ...item, sessionId: id })));
  }

  cancelScheduledMessage(sessionId, id) {
    const scheduler = this.schedulers.get(sessionId);
    if (!scheduler) throw new Error(`Session ${sessionId} scheduler not active`);
    return scheduler.cancel(id);
  }

  async getAutoReplyRules() {
    const row = await prisma.settings.findUnique({ where: { key: 'automation.autoReplies' } });
    return row ? JSON.parse(row.value || '[]') : [];
  }

  async saveAutoReplyRules(rules) {
    await prisma.settings.upsert({
      where: { key: 'automation.autoReplies' },
      update: { value: JSON.stringify(rules) },
      create: { key: 'automation.autoReplies', value: JSON.stringify(rules) }
    });
    for (const [sessionId, sock] of this.sessions.entries()) {
      await this.setupSessionUtilities(sessionId, sock);
    }
    return rules;
  }

  searchMessages(query, options = {}) {
    return this.search.search(query, options).map((item) => ({
      matchedText: item.matchedText,
      matchPosition: item.matchPosition,
      relevanceScore: item.relevanceScore,
      message: {
        key: item.message.key,
        pushName: item.message.pushName,
        messageTimestamp: item.message.messageTimestamp
      }
    }));
  }

  getDeletedMessages(chatId) {
    const deleted = chatId
      ? this.messageStore.getDeletedMessagesByChat(chatId)
      : this.messageStore.getAllDeletedMessages();
    return deleted.map((item) => ({
      key: item.key,
      deletedAt: item.deletedAt,
      deletedBy: item.deletedBy,
      isRevokedBySender: item.isRevokedBySender,
      originalMessage: item.originalMessage
    }));
  }

  async simulateTyping(sessionId, jid, duration = 1500, recording = false) {
    const typing = this.typingIndicators.get(sessionId);
    if (!typing) throw new Error(`Session ${sessionId} typing helper not active`);
    if (recording) await typing.startRecording(jid, { duration: Number(duration) });
    else await typing.startTyping(jid, { duration: Number(duration) });
    return { success: true };
  }

  async markRead(sessionId, jid, messageIds, participant) {
    const controller = this.readReceipts.get(sessionId);
    if (!controller) throw new Error(`Session ${sessionId} read receipt controller not active`);
    await controller.markRead(jid, participant, messageIds);
    return { success: true };
  }

  plotJid(value) {
    const jid = value.includes('@') ? value : normalizePhoneToJid(value);
    return {
      input: value,
      normalized: jid,
      parsed: parseJid(jid),
      plotted: plotJid(jid),
      variants: getJidVariants(value),
      display: formatJidDisplay(jid, { showType: true })
    };
  }

  createVCard(payload) {
    return Array.isArray(payload.contacts)
      ? createContactCards(payload.contacts)
      : createContactCard(payload.contact || payload);
  }

  async postStatus(sessionId, payload = {}) {
    const sock = this.getSession(sessionId);
    const type = payload.type || 'text';
    const media = payload.url || payload.path || payload.media;
    const content = type === 'image'
      ? createImageStatus(media, { caption: payload.caption })
      : type === 'video'
        ? createVideoStatus(media, { caption: payload.caption, gifPlayback: payload.gifPlayback })
        : type === 'audio'
          ? createAudioStatus(media, { ptt: payload.ptt })
          : createTextStatus({ text: payload.text || '', backgroundColor: payload.backgroundColor, font: payload.font });
    const result = await sock.sendMessage('status@broadcast', content, { statusJidList: payload.jidList || [] });
    return { success: true, messageId: result?.key?.id };
  }

  async groupAction(sessionId, action, payload = {}) {
    const sock = this.getSession(sessionId);
    switch (action) {
      case 'create':
        return sock.groupCreate(payload.subject, payload.participants || []);
      case 'participants':
        return sock.groupParticipantsUpdate(payload.jid, payload.participants || [], payload.operation || 'add');
      case 'promote':
      case 'demote':
      case 'add':
      case 'remove':
        return sock.groupParticipantsUpdate(payload.jid, payload.participants || [], action);
      case 'subject':
        return sock.groupUpdateSubject(payload.jid, payload.subject);
      case 'description':
        return sock.groupUpdateDescription(payload.jid, payload.description);
      case 'settings':
        return sock.groupSettingUpdate(payload.jid, payload.setting);
      case 'leave':
        return sock.groupLeave(payload.jid);
      case 'inviteCode':
        return sock.groupInviteCode(payload.jid);
      case 'revokeInvite':
        return sock.groupRevokeInvite(payload.jid);
      case 'join':
        return sock.groupAcceptInvite(payload.code);
      case 'metadata':
        return sock.groupMetadata(payload.jid);
      default:
        throw new Error(`Unsupported group action: ${action}`);
    }
  }

  async privacyAction(sessionId, action, payload = {}) {
    const sock = this.getSession(sessionId);
    switch (action) {
      case 'settings':
        return sock.fetchPrivacySettings?.();
      case 'blocklist':
        return sock.fetchBlocklist?.();
      case 'block':
      case 'unblock':
        return sock.updateBlockStatus(payload.jid, action);
      case 'lastSeen':
        return sock.updateLastSeenPrivacy(payload.value);
      case 'online':
        return sock.updateOnlinePrivacy(payload.value);
      case 'profilePicture':
        return sock.updateProfilePicturePrivacy(payload.value);
      case 'status':
        return sock.updateStatusPrivacy(payload.value);
      case 'readReceipts':
        return sock.updateReadReceiptsPrivacy(payload.value);
      case 'groupsAdd':
        return sock.updateGroupsAddPrivacy(payload.value);
      case 'disappearing':
        return sock.updateDefaultDisappearingMode(payload.duration || 0);
      default:
        throw new Error(`Unsupported privacy action: ${action}`);
    }
  }

  async handleIncomingMessage(sessionId, msg, sock) {
    logger.info(`Message received on ${sessionId}: ${msg.key.remoteJid}`);
    const remoteJid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    
    // Save to DB
    await prisma.message.create({
      data: {
        remoteJid,
        messageId: msg.key.id,
        sender: msg.key.participant || remoteJid,
        text,
        timestamp: Math.floor(Date.now() / 1000)
      }
    });

    // Fire webhook/trigger flow
    // ...
  }
}

export const baileyService = new BaileysService();
