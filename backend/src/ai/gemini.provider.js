import { AIProvider } from './provider.js';
import axios from 'axios';

export class GeminiProvider extends AIProvider {
  async chat(messages) {
    const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in your environment.');

    const model = this.config.model || 'gemini-2.0-flash';

    // Gemini does not support role:'system' inside contents — extract it separately
    const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Gemini requires at least one user message
    if (!contents.length) contents.push({ role: 'user', parts: [{ text: '' }] });

    const requestBody = { contents };
    if (systemParts.length) {
      requestBody.systemInstruction = { parts: [{ text: systemParts.join('\n') }] };
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      requestBody,
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
