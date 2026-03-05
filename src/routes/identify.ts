import { Router } from 'express';
import { identifyController } from '../controllers/identify.controller';

const router = Router();

// POST /identify - Identity reconciliation endpoint
router.post('/identify', identifyController);

export default router;
