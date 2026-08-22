import vm from 'vm';
import { renderFlowTemplate } from '../../flow/template.js';

export default {
  type: 'code_exec',
  name: 'Code (JavaScript)',
  icon: 'Code2',
  category: 'Logic',
  inputs: ['code', 'outputVariable'],
  outputs: ['done'],
  config: {
    code: '// Example: Calculate or format variables\nconst text = variables.message || "";\nreturn text.toUpperCase();',
    outputVariable: 'codeResult'
  },
  async execute(ctx, data = {}) {
    const rawCode = data.code || this.config.code;
    const outputVar = (data.outputVariable || this.config.outputVariable).trim();
    const renderedCode = renderFlowTemplate(rawCode, ctx.variables);

    ctx.logger.info(`Code Exec: executing script → ${outputVar}`);

    const sandbox = {
      variables: { ...ctx.variables },
      context: { ...ctx },
      JSON,
      Math,
      Date,
      parseInt,
      parseFloat,
      String,
      Number,
      Boolean,
      Array,
      Object
    };

    const vmContext = vm.createContext(sandbox);
    const wrappedCode = `(function() {\n${renderedCode}\n})()`;

    try {
      const script = new vm.Script(wrappedCode, { timeout: 3000 });
      const result = script.runInContext(vmContext);
      ctx.variables = { ...ctx.variables, [outputVar]: result };
      return ctx;
    } catch (err) {
      ctx.logger.error(`Code Exec failed: ${err.message}`);
      throw new Error(`Code Exec Error: ${err.message}`);
    }
  }
};
