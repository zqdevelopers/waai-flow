import { prisma } from '../database/index.js';
import { logger } from '../app.js';
import { flowEngine } from '../flow/engine.js';

export const handleWebhook = async (req, res) => {
  const { flowId } = req.params;
  const payload = req.body;

  try {
    const flow = await prisma.flow.findUnique({ where: { id: flowId } });
    if (!flow || !flow.isActive) {
      return res.status(404).json({ error: 'Flow not found or inactive' });
    }

    // Pass the payload as variables to the flow engine
    const result = await flowEngine.execute(flow, { webhookPayload: payload });
    if (!result?.success) {
      return res.status(400).json({ error: result?.reason || 'Flow execution failed' });
    }

    res.json({ success: true, message: 'Webhook received and flow triggered' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
};
