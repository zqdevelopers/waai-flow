export default {
  type: 'delay',
  name: 'Delay',
  icon: 'Clock',
  category: 'Logic',
  inputs: ['delayMs'],
  outputs: ['done'],
  config: { delayMs: 1000 },
  async execute(ctx, data) {
    const ms = Math.min(Number(data.delayMs ?? 1000), 30000);
    ctx.logger.info(`Delay: waiting ${ms}ms`);
    await new Promise((resolve) => setTimeout(resolve, ms));
    return ctx;
  }
};
