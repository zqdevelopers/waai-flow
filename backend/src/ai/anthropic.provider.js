import { AIProvider } from './provider.js';
import axios from 'axios';

export class AnthropicProvider extends AIProvider {
  async chat(messages) {
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic API key is missing. Set ANTHROPIC_API_KEY in your environment.');

    const model = this.config.model || 'claude-3-5-sonnet-20241022';
    const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
    const conversationMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || ''
    }));

    if (!conversationMessages.length) {
      conversationMessages.push({ role: 'user', content: 'Hello' });
    }

    const payload = {
      model,
      max_tokens: Number(this.config.maxTokens || 2048),
      messages: conversationMessages
    };

    if (systemParts.length) {
      payload.system = systemParts.join('\n');
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      payload,
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 30000
      }
    );

    const block = response.data?.content?.[0];
    if (!block || block.type !== 'text') {
      throw new Error('Anthropic returned no text content');
    }
    return block.text ?? '';
  }
}
