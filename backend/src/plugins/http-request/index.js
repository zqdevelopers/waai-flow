import axios from 'axios';
import { renderFlowTemplate } from '../../flow/template.js';

export default {
  type: 'http_request',
  name: 'HTTP Request',
  icon: 'Globe',
  category: 'Integrations',
  inputs: ['method', 'url', 'headers', 'body'],
  outputs: ['httpResponse', 'httpStatus'],
  config: { method: 'GET', url: '', headers: '{}', body: '' },
  async execute(ctx, data) {
    const method = (data.method || 'GET').toUpperCase();
    const url = renderFlowTemplate(data.url || '', ctx.variables);
    if (!url) throw new Error('HTTP Request: url is required');

    let headers = {};
    try { headers = JSON.parse(renderFlowTemplate(data.headers || '{}', ctx.variables)); } catch {}

    let body;
    if (data.body) {
      const rendered = renderFlowTemplate(data.body, ctx.variables);
      try { body = JSON.parse(rendered); } catch { body = rendered; }
    }

    ctx.logger.info(`HTTP Request: ${method} ${url}`);
    const response = await axios({ method, url, headers, data: body, timeout: 15000 });

    ctx.variables = { ...ctx.variables, httpResponse: response.data, httpStatus: response.status };
    return ctx;
  }
};
