import { AIProvider } from './provider.js';
import axios from 'axios';

export class DeepSeekProvider extends AIProvider {
  async chat(messages) {
    const apiKey = this.config.apiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('DeepSeek API Key is missing. Set DEEPSEEK_API_KEY in your environment.');

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: this.config.model || 'deepseek-chat',
        messages,
        temperature: Number(this.config.temperature ?? 0.7)
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const choice = response.data.choices?.[0];
    if (!choice) throw new Error('DeepSeek returned no choices');
    return choice.message.content ?? '';
  }
}
