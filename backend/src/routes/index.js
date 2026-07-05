import { Router } from 'express';
import sessionRoutes from './session.routes.js';
import flowRoutes from './flow.routes.js';
import modulesRoutes from './modules.routes.js';

const router = Router();

router.use('/session', sessionRoutes);
router.use('/flows', flowRoutes);
router.use('/modules', modulesRoutes);

export default router;
