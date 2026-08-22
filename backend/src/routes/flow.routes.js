import { Router } from 'express';
import * as flowController from '../controllers/flow.controller.js';

const router = Router();

router.get('/', flowController.getFlows);
router.post('/', flowController.createFlow);
router.post('/generate', flowController.generateFlowWithAi);
router.get('/:id', flowController.getFlow);
router.put('/:id', flowController.updateFlow);
router.post('/:id/duplicate', flowController.duplicateFlow);
router.delete('/:id', flowController.deleteFlow);
router.post('/run/:id', flowController.runFlow);

export default router;
