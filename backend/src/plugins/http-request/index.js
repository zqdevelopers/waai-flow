import axios from 'axios';
import { renderFlowTemplate } from '../../flow/template.js';

export default {
  type: 'http_request',
  name: 'HTTP Request',
  icon: 'Globe',
  category: 'Integrations',
  inputs: ['method', 'url', 'headers', 'body', 'continueOnError'],
  outputs: ['httpResponse', 'httpStatus', 'httpError'],
  config: { method: 'GET', url: '', headers: '{}', body: '', continueOnError: false },
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
    try {
      const response = await axios({
        method,
        url,
        headers,
        data: ['GET', 'HEAD'].includes(method) ? undefined : body,
        timeout: 20000,
        validateStatus: () => true
      });

      ctx.variables = {
        ...ctx.variables,
        httpResponse: response.data,
        httpStatus: response.status,
        httpError: response.status >= 400 ? `HTTP ${response.status}: ${JSON.stringify(response.data)}` : null
      };

      if (response.status >= 400 && !data.continueOnError) {
        throw new Error(`HTTP Request returned status ${response.status}`);
      }

      return ctx;
    } catch (err) {
      if (data.continueOnError) {
        ctx.variables = {
          ...ctx.variables,
          httpResponse: null,
          httpStatus: err.response?.status || 500,
          httpError: err.message
        };
        return ctx;
      }
      throw err;
    }
  }
};
