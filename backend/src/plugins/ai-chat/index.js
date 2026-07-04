import { OpenAIProvider } from '../../ai/openai.provider.js';
import { GeminiProvider } from '../../ai/gemini.provider.js';
import { OllamaProvider } from '../../ai/ollama.provider.js';
import { renderFlowTemplate } from '../../flow/template.js';

export default {
  type: "ai_chat",
  name: "AI Chat",
  icon: "Bot",
  category: "AI",
  inputs: ["prompt", "provider", "model"],
  outputs: ["aiResponse"],
  config: {
    prompt: "",
    provider: "openai",
    model: "gpt-4o"
  },
  async execute(ctx, data) {
    ctx.logger.info(`Executing AI Chat Plugin`);
    const provider = data.provider || this.config.provider;
    const model = data.model || this.config.model;
    const prompt = renderFlowTemplate(data.prompt || '', ctx.variables);

    let ai;
    switch (provider) {
      case 'gemini':
        ai = new GeminiProvider({ model });
        break;
      case 'ollama':
        ai = new OllamaProvider({ model });
        break;
      case 'openai':
      default:
        ai = new OpenAIProvider({ model });
    }

    const aiResponse = await ai.chat([{ role: 'user', content: prompt }]);

    ctx.variables = { ...ctx.variables, aiResponse };
    return ctx;
  }
}
