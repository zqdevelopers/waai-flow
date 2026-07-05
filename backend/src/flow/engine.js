import { logger, io } from '../app.js';
import { pluginLoader } from '../plugins/loader.js';
import { prisma } from '../database/index.js';
import { baileyService } from '../baileys/index.js';

class FlowEngine {
  getNodePluginType(node) {
    const label = node?.data?.label?.toLowerCase?.() || '';
    const normalizedLabelMap = {
      'webhook trigger': 'webhook_trigger',
      trigger: 'webhook_trigger',
      'send message': 'send_message',
      'ai chat': 'ai_chat'
    };

    return node?.data?.pluginType
      || node?.data?.type
      || (pluginLoader.getPlugin(node?.type) ? node.type : null)
      || normalizedLabelMap[label]
      || node?.type;
  }

  async execute(flow, initialContext = {}) {
    let execution = null;
    const executionLogs = [];
    const pushExecutionLog = async (entry) => {
      executionLogs.push({ ...entry, time: new Date().toISOString() });
      if (execution) {
        await prisma.execution.update({
          where: { id: execution.id },
          data: { logs: JSON.stringify(executionLogs) }
        }).catch((error) => logger.warn({ error }, 'Failed to update execution logs'));
      }
    };

    try {
      execution = await prisma.execution.create({
        data: {
          flowId: flow.id,
          status: 'RUNNING',
          logs: '[]'
        }
      });

      const nodes = JSON.parse(flow.nodes || '[]');
      const edges = JSON.parse(flow.edges || '[]');
      
      const triggerNodes = nodes.filter((node) => {
        const pluginType = this.getNodePluginType(node);
        return pluginType?.includes('trigger') || pluginLoader.getPlugin(pluginType)?.category === 'Triggers';
      });
      
      if (triggerNodes.length === 0) {
        logger.warn(`No trigger found for flow ${flow.id}`);
        await pushExecutionLog({ status: 'FAILED', message: 'No trigger node found' });
        await prisma.execution.update({ where: { id: execution.id }, data: { status: 'FAILED' } });
        return { success: false, reason: 'No trigger node found' };
      }

      const startNode = triggerNodes[0];
      const contextVariables = initialContext.variables && typeof initialContext.variables === 'object'
        ? initialContext.variables
        : initialContext;
      
      const ctx = {
        flow,
        whatsapp: baileyService,
        logger,
        pushExecutionLog,
        ...initialContext,
        variables: contextVariables
      };

      await this.traverse(startNode, nodes, edges, ctx);
      if (ctx.failed) {
        await prisma.execution.update({ where: { id: execution.id }, data: { status: 'FAILED' } });
        return { success: false, reason: ctx.error || 'Flow execution failed' };
      }
      await prisma.execution.update({ where: { id: execution.id }, data: { status: 'COMPLETED' } });
      return { success: true };
      
    } catch (error) {
      logger.error(`Flow execution failed for ${flow.id}:`, error);
      await pushExecutionLog({ status: 'FAILED', message: error.message });
      if (execution) {
        await prisma.execution.update({ where: { id: execution.id }, data: { status: 'FAILED' } });
      }
      return { success: false, reason: error.message };
    }
  }

  async traverse(currentNode, allNodes, allEdges, ctx) {
    if (!currentNode) return;
    
    const pluginType = this.getNodePluginType(currentNode);
    const plugin = pluginLoader.getPlugin(pluginType);
    if (plugin && typeof plugin.execute === 'function') {
      try {
        io.emit('flow-log', { flowId: ctx.flow.id, node: currentNode.id, plugin: pluginType, status: 'RUNNING' });
        await ctx.pushExecutionLog?.({ node: currentNode.id, plugin: pluginType, status: 'RUNNING' });

        ctx = await plugin.execute(ctx, currentNode.data);

        io.emit('flow-log', { flowId: ctx.flow.id, node: currentNode.id, plugin: pluginType, status: 'COMPLETED' });
        await ctx.pushExecutionLog?.({ node: currentNode.id, plugin: pluginType, status: 'COMPLETED' });
      } catch (err) {
        logger.error(`Node ${currentNode.id} failed:`, err);
        io.emit('flow-log', { flowId: ctx.flow.id, node: currentNode.id, plugin: pluginType, status: 'FAILED', error: err.message });
        await ctx.pushExecutionLog?.({ node: currentNode.id, plugin: pluginType, status: 'FAILED', error: err.message });
        ctx.failed = true;
        ctx.error = err.message;
        return;
      }
    } else {
      logger.warn(`Plugin ${pluginType} not found or not executable.`);
    }

    const outgoingEdges = allEdges.filter(e => e.source === currentNode.id);
    
    const handleFilter = ctx.nextNodeHandle;
    ctx.nextNodeHandle = null;

    for (const edge of outgoingEdges) {
      if (handleFilter && edge.sourceHandle !== handleFilter) continue;
      const nextNode = allNodes.find(n => n.id === edge.target);
      await this.traverse(nextNode, allNodes, allEdges, ctx);
      if (ctx.failed) return;
    }
  }
}

export const flowEngine = new FlowEngine();
