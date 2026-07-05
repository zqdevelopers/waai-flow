import { AIProvider } from './provider.js';
import axios from 'axios';

export class OpenAIProvider extends AIProvider {
  async chat(messages) {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API Key is missing');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.config.model || 'gpt-4o',
        messages
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const choice = response.data.choices?.[0];
    if (!choice) throw new Error('OpenAI returned no choices');
    return choice.message.content ?? '';
  }
}
