import { OpenAIProvider } from '../../ai/openai.provider.js';

export default {
  type: "ai_chat",
  name: "AI Chat",
  icon: "Bot",
  category: "AI",
  inputs: ["prompt", "provider", "model"],
  outputs: ["response"],
  config: {
    prompt: "",
    provider: "openai",
    model: "gpt-4o"
  },
  async execute(ctx, data) {
    ctx.logger.info(`Executing AI Chat Plugin`);
    const provider = data.provider || this.config.provider;
    const model = data.model || this.config.model;
    let prompt = data.prompt || '';
    
    // Simple template replacement
    if (ctx.variables) {
      for (const [key, value] of Object.entries(ctx.variables)) {
        prompt = prompt.replaceAll(`{{${key}}}`, String(value ?? ''));
      }
    }

    let aiResponse = '';

    if (provider === 'openai') {
      const ai = new OpenAIProvider({ model });
      aiResponse = await ai.chat([{ role: 'user', content: prompt }]);
    } else {
      // Stub for other providers
      aiResponse = `Mock response for ${provider}`;
    }

    // Save to context variables to be used by next nodes
    ctx.variables = { ...ctx.variables, aiResponse };

    return ctx;
  }
}
