import { renderFlowTemplate } from '../../flow/template.js';

const parseJson = (v, fallback) => {
  try { return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};

export default {
  type: "send_message",
  name: "Send Message",
  icon: "MessageSquare",
  category: "WhatsApp",
  inputs: ["text", "to", "sessionId"],
  outputs: ["success"],
  config: { text: "", to: "", sessionId: "", messageType: "text" },
  async execute(ctx, data) {
    const sessionId = data.sessionId || ctx.flow.Session?.sessionId;
    const text = renderFlowTemplate(data.text || '', ctx.variables);
    const to = renderFlowTemplate(
      data.to || ctx.variables?.sender || ctx.variables?.webhookPayload?.sender || '',
      ctx.variables
    );

    if (!sessionId || !to) throw new Error('Missing sessionId or recipient (to)');

    const type = data.messageType || 'text';
    let payload = { type, text };

    if (type === 'buttons') {
      payload.buttons = parseJson(data.buttonsJson, []);
      payload.title = renderFlowTemplate(data.title || '', ctx.variables);
      payload.footer = renderFlowTemplate(data.footer || '', ctx.variables);
    } else if (type === 'list') {
      payload.buttonText = renderFlowTemplate(data.buttonText || 'Open', ctx.variables);
      payload.title = renderFlowTemplate(data.title || '', ctx.variables);
      payload.sections = parseJson(data.sectionsJson, []);
      payload.footer = renderFlowTemplate(data.footer || '', ctx.variables);
    } else if (['image', 'video', 'audio', 'document'].includes(type)) {
      payload.url = renderFlowTemplate(data.mediaUrl || '', ctx.variables);
    }

    ctx.logger.info(`Send Message [${type}] to ${to}`);
    await ctx.whatsapp.sendMessage(sessionId, to, payload);

    return ctx;
  }
};
