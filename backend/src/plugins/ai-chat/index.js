import { OpenAIProvider } from '../../ai/openai.provider.js';
import { GeminiProvider } from '../../ai/gemini.provider.js';
import { OllamaProvider } from '../../ai/ollama.provider.js';
import { AnthropicProvider } from '../../ai/anthropic.provider.js';
import { DeepSeekProvider } from '../../ai/deepseek.provider.js';
import { GroqProvider } from '../../ai/groq.provider.js';
import { renderFlowTemplate } from '../../flow/template.js';
import { prisma } from '../../database/index.js';

export default {
  type: "ai_chat",
  name: "AI Chat",
  icon: "Bot",
  category: "AI",
  inputs: ["prompt", "provider", "model", "agentId", "enableHistory"],
  outputs: ["aiResponse"],
  config: {
    prompt: "",
    provider: "openai",
    model: "gpt-4o",
    systemPrompt: "You are a helpful WhatsApp assistant.",
    temperature: 0.7,
    enableHistory: false
  },
  async execute(ctx, data = {}) {
    ctx.logger.info(`Executing AI Chat Plugin`);

    let provider = data.provider || this.config.provider;
    let model = data.model || this.config.model;
    let systemPrompt = data.systemPrompt || this.config.systemPrompt || '';
    let temperature = data.temperature !== undefined ? Number(data.temperature) : this.config.temperature;

    if (data.agentId) {
      try {
        const agent = await prisma.agent.findUnique({ where: { id: data.agentId } });
        if (agent && agent.isActive) {
          provider = agent.provider || provider;
          model = agent.model || model;
          systemPrompt = agent.systemPrompt || systemPrompt;
          temperature = agent.temperature !== undefined ? Number(agent.temperature) : temperature;
        }
      } catch (err) {
        ctx.logger.warn({ error: err }, 'Failed to fetch agent profile');
      }
    }

    const prompt = renderFlowTemplate(data.prompt || '{{message}}', ctx.variables);
    const resolvedSystemPrompt = renderFlowTemplate(systemPrompt, ctx.variables);

    let ai;
    switch (provider) {
      case 'anthropic':
      case 'claude':
        ai = new AnthropicProvider({ model, temperature });
        break;
      case 'deepseek':
        ai = new DeepSeekProvider({ model, temperature });
        break;
      case 'groq':
        ai = new GroqProvider({ model, temperature });
        break;
      case 'gemini':
        ai = new GeminiProvider({ model, temperature });
        break;
      case 'ollama':
        ai = new OllamaProvider({ model, temperature });
        break;
      case 'openai':
      default:
        ai = new OpenAIProvider({ model, temperature });
    }

    const messages = [];
    if (resolvedSystemPrompt) {
      messages.push({ role: 'system', content: resolvedSystemPrompt });
    }

    if (data.enableHistory && (ctx.variables?.sender || ctx.sender)) {
      const senderJid = ctx.variables?.sender || ctx.sender;
      try {
        const recentMessages = await prisma.message.findMany({
          where: { remoteJid: senderJid },
          orderBy: { createdAt: 'desc' },
          take: 6
        });
        const history = recentMessages.reverse();
        for (const msg of history) {
          if (msg.text && msg.text.trim()) {
            const isMe = msg.sender && !msg.sender.includes('@s.whatsapp.net');
            messages.push({
              role: isMe ? 'assistant' : 'user',
              content: msg.text
            });
          }
        }
      } catch (err) {
        ctx.logger.warn({ error: err }, 'Failed to load conversation history for AI Chat');
      }
    }

    messages.push({ role: 'user', content: prompt });

    const aiResponse = await ai.chat(messages);
    ctx.variables = { ...ctx.variables, aiResponse };
    return ctx;
  }
};
