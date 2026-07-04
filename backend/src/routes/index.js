import { Router } from 'express';
import sessionRoutes from './session.routes.js';
import flowRoutes from './flow.routes.js';
import webhookRoutes from './webhook.routes.js';
import modulesRoutes from './modules.routes.js';

const router = Router();

router.use('/session', sessionRoutes);
router.use('/flows', flowRoutes);
router.use('/webhook', webhookRoutes);
router.use('/modules', modulesRoutes);
// We can also have an execute/send route here or inside session.

export default router;
