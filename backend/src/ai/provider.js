export class AIProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * Must return the AI response text
   * @param {Array} messages - [{ role: 'user', content: 'hello' }]
   * @returns {Promise<string>}
   */
  async chat(messages) {
    throw new Error('chat() must be implemented');
  }
}
