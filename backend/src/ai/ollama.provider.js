import { AIProvider } from './provider.js';
import axios from 'axios';

export class OllamaProvider extends AIProvider {
  async chat(messages) {
    const baseUrl = this.config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = this.config.model || process.env.OLLAMA_MODEL || 'llama3';

    const response = await axios.post(
      `${baseUrl}/api/chat`,
      {
        model,
        messages,
        stream: false
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const content = response.data?.message?.content;
    if (content === undefined || content === null) throw new Error('Ollama returned no content');
    return String(content);
  }
}
