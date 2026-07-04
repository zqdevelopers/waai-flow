import { renderFlowTemplate } from '../../flow/template.js';

const tpl = (v, vars) => renderFlowTemplate(String(v || ''), vars);

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
    const to = tpl(data.to || ctx.variables?.sender || ctx.variables?.webhookPayload?.sender || '', ctx.variables);
    if (!sessionId || !to) throw new Error('Missing sessionId or recipient (to)');

    const type = data.messageType || 'text';
    const text = tpl(data.text || '', ctx.variables);
    let payload = { type };

    switch (type) {
      case 'text':
        payload.text = text;
        break;

      case 'image':
      case 'video':
      case 'gif':
        payload.url = tpl(data.mediaUrl || '', ctx.variables);
        payload.caption = text;
        if (type === 'gif') payload.gifPlayback = true;
        break;

      case 'audio':
        payload.url = tpl(data.mediaUrl || '', ctx.variables);
        payload.ptt = Boolean(data.ptt);
        break;

      case 'document':
        payload.url = tpl(data.mediaUrl || '', ctx.variables);
        payload.fileName = tpl(data.fileName || 'file', ctx.variables);
        payload.mimetype = data.mimetype || 'application/octet-stream';
        payload.caption = text;
        break;

      case 'sticker':
        payload.url = tpl(data.mediaUrl || '', ctx.variables);
        break;

      case 'location':
        payload.latitude = parseFloat(data.latitude) || 0;
        payload.longitude = parseFloat(data.longitude) || 0;
        payload.name = tpl(data.locationName || '', ctx.variables);
        payload.address = tpl(data.address || '', ctx.variables);
        break;

      case 'contact':
        payload.fullName = tpl(data.contactName || 'Contact', ctx.variables);
        payload.phones = [{ number: tpl(data.contactPhone || '', ctx.variables) }];
        if (data.contactEmail) payload.emails = [{ email: tpl(data.contactEmail, ctx.variables) }];
        if (data.contactOrg)   payload.organization = tpl(data.contactOrg, ctx.variables);
        break;

      case 'poll':
        payload.name = tpl(data.pollName || 'Poll', ctx.variables);
        payload.values = Array.isArray(data.pollValues) ? data.pollValues.map(v => tpl(v, ctx.variables)).filter(Boolean) : [];
        payload.selectableCount = parseInt(data.selectableCount) || 1;
        break;

      case 'buttons':
        payload.text = text;
        payload.title = tpl(data.title || '', ctx.variables);
        payload.footer = tpl(data.footer || '', ctx.variables);
        payload.buttons = Array.isArray(data.buttons)
          ? data.buttons.map(b => ({ id: tpl(b.id, ctx.variables), text: tpl(b.text, ctx.variables) }))
          : [];
        break;

      case 'urlButtons':
        payload.text = text;
        payload.title = tpl(data.title || '', ctx.variables);
        payload.footer = tpl(data.footer || '', ctx.variables);
        payload.buttons = Array.isArray(data.urlButtons)
          ? data.urlButtons.map(b => ({ text: tpl(b.text, ctx.variables), url: tpl(b.url, ctx.variables) }))
          : [];
        break;

      case 'copyButton':
        payload.text = text;
        payload.copyCode = tpl(data.copyCode || '', ctx.variables);
        payload.displayText = tpl(data.copyDisplayText || 'Copy', ctx.variables);
        payload.footer = tpl(data.footer || '', ctx.variables);
        break;

      case 'list':
        payload.description = text;
        payload.title = tpl(data.title || '', ctx.variables);
        payload.buttonText = tpl(data.buttonText || 'Open', ctx.variables);
        payload.footer = tpl(data.footer || '', ctx.variables);
        payload.sections = Array.isArray(data.sections)
          ? data.sections.map(sec => ({
              title: tpl(sec.title || '', ctx.variables),
              rows: (sec.rows || []).map(r => ({
                id: tpl(r.id, ctx.variables),
                title: tpl(r.title, ctx.variables),
                description: tpl(r.description || '', ctx.variables),
              }))
            }))
          : [];
        break;

      default:
        payload.text = text;
    }

    ctx.logger.info(`Send Message [${type}] to ${to}`);
    await ctx.whatsapp.sendMessage(sessionId, to, payload);
    return ctx;
  }
};
