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
    const sessionId = data.sessionId || ctx.flow.sessionId;
    // Replace variables in text
    let text = data.text || '';
    if (ctx.variables) {
      for (const [key, value] of Object.entries(ctx.variables)) {
        text = text.replaceAll(`{{${key}}}`, String(value ?? ''));
      }
    }

    // Determine recipient: from context (webhook or trigger) or static data
    const to = data.to || ctx.variables.sender || '';

    if (!sessionId || !to) {
      throw new Error('Missing sessionId or recipient (to)');
    }

    ctx.logger.info(`Executing Send Message Plugin to ${to}`);
    await ctx.whatsapp.sendMessage(sessionId, to, { text });

    return ctx;
  }
}
