import { renderFlowTemplate } from '../../flow/template.js';

export default {
  type: 'set_variable',
  name: 'Set Variable',
  icon: 'Variable',
  category: 'Logic',
  inputs: ['variables'],
  outputs: ['done'],
  config: { variables: '{}' },
  async execute(ctx, data) {
    let vars = {};
    try { vars = JSON.parse(data.variables || '{}'); } catch {
      throw new Error('Set Variable: variables field must be valid JSON');
    }

    const resolved = {};
    for (const [key, value] of Object.entries(vars)) {
      resolved[key] = renderFlowTemplate(String(value), ctx.variables);
    }

    ctx.logger.info(`Set Variable: setting ${Object.keys(resolved).join(', ')}`);
    ctx.variables = { ...ctx.variables, ...resolved };
    return ctx;
  }
};
