import { Router } from 'express';
import multer from 'multer';
import * as modules from '../controllers/modules.controller.js';

const router = Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, modules.ensureUploadDir()),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-z0-9._-]/gi, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.get('/agents', wrap(modules.getAgents));
router.post('/agents', wrap(modules.createAgent));
router.put('/agents/:id', wrap(modules.updateAgent));
router.delete('/agents/:id', wrap(modules.deleteAgent));

router.get('/executions', wrap(modules.getExecutions));
router.get('/conversations', wrap(modules.getConversations));
router.get('/messages', wrap(modules.getMessages));
router.post('/messages', wrap(modules.createMessage));
router.get('/messaging/capabilities', wrap(modules.getMessagingCapabilities));
router.post('/messaging/send', wrap(modules.sendAdvancedMessage));
router.get('/scheduler', wrap(modules.getScheduledMessages));
router.post('/scheduler', wrap(modules.scheduleMessage));
router.delete('/scheduler/:sessionId/:id', wrap(modules.cancelScheduledMessage));
router.get('/auto-replies', wrap(modules.getAutoReplies));
router.put('/auto-replies', wrap(modules.saveAutoReplies));
router.get('/deleted-messages', wrap(modules.getDeletedMessages));
router.get('/search', wrap(modules.searchMessages));
router.post('/search', wrap(modules.searchMessages));
router.post('/typing', wrap(modules.simulateTyping));
router.post('/read-receipts', wrap(modules.markRead));
router.post('/jid/plot', wrap(modules.plotJid));
router.post('/vcard', wrap(modules.createVCard));
router.post('/status', wrap(modules.postStatus));
router.post('/groups', wrap(modules.groupAction));
router.post('/privacy', wrap(modules.privacyAction));

router.get('/broadcasts', wrap(modules.getBroadcasts));
router.post('/broadcasts', wrap(modules.createBroadcast));
router.post('/broadcasts/:id/run', wrap(modules.runBroadcast));
router.delete('/broadcasts/:id', wrap(modules.deleteBroadcast));

router.get('/webhooks', wrap(modules.getWebhooks));
router.get('/api-docs', wrap(modules.getApiDocs));

router.get('/providers', wrap(modules.getProviders));
router.put('/providers/:id', wrap(modules.updateProvider));

router.get('/plugins', wrap(modules.getPlugins));
router.put('/plugins/:id', wrap(modules.updatePlugin));

router.get('/files', wrap(modules.getFiles));
router.post('/files', upload.single('file'), wrap(modules.uploadFile));
router.delete('/files/:id', wrap(modules.deleteFile));

router.get('/analytics', wrap(modules.getAnalytics));
router.get('/settings', wrap(modules.getSettings));
router.put('/settings', wrap(modules.updateSettings));
router.get('/env', wrap(modules.getEnv));
router.put('/env', wrap(modules.updateEnv));
router.get('/logs', wrap(modules.getLogs));

export default router;
