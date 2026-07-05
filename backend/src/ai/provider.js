export class AIProvider {
  constructor(config) {
    this.config = config;
  }

  async chat(messages) {
    throw new Error('chat() must be implemented');
  }
}
