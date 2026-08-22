import { Router } from 'express';
import * as sessionController from '../controllers/session.controller.js';

const router = Router();

router.get('/', sessionController.getSessions);
router.get('/:id', sessionController.getSession);
router.post('/create', sessionController.createSession);
router.put('/:id', sessionController.updateSession);
router.post('/:id/reconnect', sessionController.reconnectSession);
router.post('/:id/pairing-code', sessionController.requestPairingCode);
router.delete('/:id', sessionController.deleteSession);
router.post('/send', sessionController.sendMessage);

export default router;
