import { renderFlowTemplate } from '../../flow/template.js';

export default {
  type: 'text_formatter',
  name: 'Text Formatter',
  icon: 'Type',
  category: 'Logic',
  inputs: ['template', 'outputVariable'],
  outputs: ['done'],
  config: { template: '', outputVariable: 'formattedText' },
  async execute(ctx, data) {
    const template = data.template || '';
    const outputVar = (data.outputVariable || 'formattedText').trim();
    const result = renderFlowTemplate(template, ctx.variables);
    ctx.logger.info(`Text Formatter: rendered → ${outputVar}`);
    ctx.variables = { ...ctx.variables, [outputVar]: result };
    return ctx;
  }
};
