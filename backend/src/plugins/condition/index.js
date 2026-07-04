import { renderFlowTemplate } from '../../flow/template.js';

const getPathValue = (source, path) => {
  if (!path) return undefined;
  return String(path).split('.').reduce((cur, key) => (cur == null ? undefined : cur[key]), source);
};

export default {
  type: 'condition',
  name: 'Condition',
  icon: 'GitBranch',
  category: 'Logic',
  inputs: ['variable', 'operator', 'value'],
  outputs: ['true', 'false'],
  config: { variable: 'message', operator: 'contains', value: '' },
  async execute(ctx, data) {
    const variable = data.variable || '';
    const operator = data.operator || 'equals';
    const compareValue = renderFlowTemplate(String(data.value ?? ''), ctx.variables);
    const actual = getPathValue(ctx.variables, variable);
    const actualStr = actual == null ? '' : String(actual);

    let result = false;
    switch (operator) {
      case 'equals':       result = actualStr === compareValue; break;
      case 'not_equals':   result = actualStr !== compareValue; break;
      case 'contains':     result = actualStr.includes(compareValue); break;
      case 'not_contains': result = !actualStr.includes(compareValue); break;
      case 'starts_with':  result = actualStr.startsWith(compareValue); break;
      case 'ends_with':    result = actualStr.endsWith(compareValue); break;
      case 'greater_than': result = Number(actualStr) > Number(compareValue); break;
      case 'less_than':    result = Number(actualStr) < Number(compareValue); break;
      case 'is_empty':     result = actualStr.trim() === ''; break;
      case 'is_not_empty': result = actualStr.trim() !== ''; break;
      default:             result = actualStr === compareValue;
    }

    ctx.logger.info(`Condition: ${variable} (${actualStr}) ${operator} (${compareValue}) → ${result}`);
    ctx.nextNodeHandle = result ? 'true' : 'false';
    return ctx;
  }
};
