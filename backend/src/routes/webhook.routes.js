import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';

const router = Router();

router.post('/:flowId', webhookController.handleWebhook);

export default router;
