import { AIProvider } from './provider.js';
import axios from 'axios';

export class GeminiProvider extends AIProvider {
  async chat(messages) {
    const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in your environment.');

    const model = this.config.model || 'gemini-2.0-flash';

    // Convert OpenAI-style messages to Gemini contents format
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { contents },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { key: apiKey }
      }
    );

    const candidate = response.data?.candidates?.[0];
    if (!candidate) throw new Error('Gemini returned no candidates');
    return candidate.content?.parts?.[0]?.text ?? '';
  }
}
