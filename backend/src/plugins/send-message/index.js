import { renderFlowTemplate } from '../../flow/template.js';

export default {
  type: "send_message",
  name: "Send Message",
  icon: "MessageSquare",
  category: "WhatsApp",
  inputs: ["text", "to", "sessionId"],
  outputs: ["success"],
  config: {
    text: "",
    to: "",
    sessionId: ""
  },
  async execute(ctx, data) {
    const sessionId = data.sessionId || ctx.flow.Session?.sessionId;
    const text = renderFlowTemplate(data.text || '', ctx.variables);

    // Determine recipient: from context (webhook or trigger) or static data
    const to = renderFlowTemplate(data.to || ctx.variables?.sender || ctx.variables?.webhookPayload?.sender || '', ctx.variables);

    if (!sessionId || !to) {
      throw new Error('Missing sessionId or recipient (to)');
    }

    ctx.logger.info(`Executing Send Message Plugin to ${to}`);
    await ctx.whatsapp.sendMessage(sessionId, to, { text });

    return ctx;
  }
}
