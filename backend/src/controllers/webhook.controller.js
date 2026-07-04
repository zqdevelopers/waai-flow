import { prisma } from '../database/index.js';
import { logger } from '../app.js';
import { flowEngine } from '../flow/engine.js';
import { renderFlowTemplate } from '../flow/template.js';

function getNestedValue(obj, path) {
  return path.split('.').reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
}

export const handleWebhook = async (req, res) => {
  const { flowId } = req.params;
  const payload = req.body;

  try {
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: { Session: { select: { id: true, sessionId: true, name: true, status: true } } }
    });
    if (!flow || !flow.isActive) {
      return res.status(404).json({ error: 'Flow not found or inactive' });
    }

    // Find the webhook_trigger node to read its config
    let nodes = [];
    try { nodes = JSON.parse(flow.nodes || '[]'); } catch {}
    const triggerNode = nodes.find(n => n.type === 'webhook_trigger');

    // Validate secret if configured
    if (triggerNode?.data?.secret) {
      const incoming = req.headers['x-webhook-secret'];
      if (!incoming || incoming !== triggerNode.data.secret) {
        return res.status(401).json({ error: 'Invalid or missing webhook secret' });
      }
    }

    // Build base context: spread top-level payload fields + keep webhookPayload for dot-notation
    const ctx = {
      ...payload,
      webhookPayload: payload,
      sender: payload.sender || '',
      message: payload.message || payload.text || '',
      messageId: payload.messageId || '',
    };

    // Apply variable mappings defined on the trigger node
    if (triggerNode?.data?.variableMappings) {
      try {
        const mappings = JSON.parse(triggerNode.data.variableMappings);
        for (const [varName, sourcePath] of Object.entries(mappings)) {
          if (typeof sourcePath === 'string') {
            const val = getNestedValue(ctx, sourcePath);
            if (val !== undefined) ctx[varName] = val;
          }
        }
      } catch {
        // Malformed JSON — skip mappings silently
      }
    }

    const result = await flowEngine.execute(flow, ctx);
    if (!result?.success) {
      return res.status(400).json({ error: result?.reason || 'Flow execution failed' });
    }

    res.json({ success: true, message: 'Webhook received and flow triggered' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
};
