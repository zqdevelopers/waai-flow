import { renderFlowTemplate } from '../../flow/template.js';

const tpl = (v, vars) => renderFlowTemplate(String(v ?? ''), vars);

export default {
  type: 'poll',
  name: 'WhatsApp Poll',
  icon: 'BarChart',
  category: 'WhatsApp',
  inputs: ['pollName', 'values', 'to', 'sessionId', 'selectableCount'],
  outputs: ['sent'],
  config: {
    pollName: 'What is your choice?',
    values: ['Option 1', 'Option 2'],
    selectableCount: 1,
    to: '{{sender}}',
    sessionId: ''
  },
  async execute(ctx, data = {}) {
    const sessionId = data.sessionId || ctx.flow.Session?.sessionId;
    const to = tpl(data.to || ctx.variables?.sender || ctx.variables?.webhookPayload?.sender || '', ctx.variables);
    if (!sessionId || !to) throw new Error('Poll: Missing sessionId or recipient (to)');

    const name = tpl(data.pollName || this.config.pollName, ctx.variables);
    const rawValues = Array.isArray(data.values) && data.values.length ? data.values : this.config.values;
    const values = rawValues.map(v => tpl(v, ctx.variables)).filter(Boolean);
    const selectableCount = parseInt(data.selectableCount) || 1;

    ctx.logger.info(`Sending Poll "${name}" with ${values.length} options to ${to}`);

    await ctx.whatsapp.sendMessage(sessionId, to, {
      type: 'poll',
      name,
      values,
      selectableCount
    });

    return ctx;
  }
};
