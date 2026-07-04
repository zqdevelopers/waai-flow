import { Router } from 'express';
import * as sessionController from '../controllers/session.controller.js';

const router = Router();

router.get('/', sessionController.getSessions);
router.get('/:id', sessionController.getSession);
router.post('/create', sessionController.createSession);
router.post('/:id/reconnect', sessionController.reconnectSession);
router.delete('/:id', sessionController.deleteSession);
router.post('/send', sessionController.sendMessage);

export default router;
