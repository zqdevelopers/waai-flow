import { AIProvider } from './provider.js';
import axios from 'axios';

export class GroqProvider extends AIProvider {
  async chat(messages) {
    const apiKey = this.config.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API Key is missing. Set GROQ_API_KEY in your environment.');

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: this.config.model || 'llama-3.3-70b-versatile',
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
    if (!choice) throw new Error('Groq returned no choices');
    return choice.message.content ?? '';
  }
}
