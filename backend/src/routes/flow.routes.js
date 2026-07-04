import { Router } from 'express';
import * as flowController from '../controllers/flow.controller.js';

const router = Router();

router.get('/', flowController.getFlows);
router.post('/', flowController.createFlow);
router.put('/:id', flowController.updateFlow);
router.delete('/:id', flowController.deleteFlow);
router.post('/run/:id', flowController.runFlow);

export default router;
