export default {
  type: "webhook_trigger",
  name: "Webhook Trigger",
  icon: "Globe",
  category: "Triggers",
  inputs: [],
  outputs: ["payload"],
  config: {},
  async execute(ctx, data) {
    ctx.logger.info(`Webhook Trigger executed for flow ${ctx.flow.id}`);
    // Context already contains webhookPayload populated by the controller
    return ctx;
  }
}
