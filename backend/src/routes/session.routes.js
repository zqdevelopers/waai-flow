import { Router } from 'express';
import * as sessionController from '../controllers/session.controller.js';

const router = Router();

router.get('/', sessionController.getSessions);
router.post('/create', sessionController.createSession);
router.delete('/:id', sessionController.deleteSession);
router.post('/send', sessionController.sendMessage);

export default router;
