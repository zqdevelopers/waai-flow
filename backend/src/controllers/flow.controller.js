import { prisma } from '../database/index.js';
import { logger } from '../app.js';
import { flowEngine } from '../flow/engine.js';

const serializeFlowJson = (value, fallback = '[]') => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return fallback;
    }
  }
  return JSON.stringify(value ?? JSON.parse(fallback));
};

const pickDefined = (data) => Object.fromEntries(
  Object.entries(data).filter(([, value]) => value !== undefined)
);

export const getFlows = async (req, res) => {
  try {
    const flows = await prisma.flow.findMany();
    res.json(flows);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
};

export const createFlow = async (req, res) => {
  const { name, description, nodes, edges, isActive, sessionId } = req.body;
  try {
    const flow = await prisma.flow.create({
      data: {
        name: name || 'New Flow',
        description: description || '',
        nodes: serializeFlowJson(nodes) || '[]',
        edges: serializeFlowJson(edges) || '[]',
        isActive: Boolean(isActive),
        sessionId: sessionId || null
      }
    });
    res.json(flow);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
};

export const updateFlow = async (req, res) => {
  const { id } = req.params;
  const { name, description, nodes, edges, isActive, sessionId } = req.body;
  
  try {
    const data = pickDefined({
      name,
      description,
      nodes: serializeFlowJson(nodes),
      edges: serializeFlowJson(edges),
      isActive,
      sessionId: sessionId === '' ? null : sessionId
    });

    const flow = await prisma.flow.update({
      where: { id },
      data
    });
    res.json(flow);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update flow' });
  }
};

export const deleteFlow = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.execution.deleteMany({ where: { flowId: id } });
    await prisma.flow.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
};

export const runFlow = async (req, res) => {
  const { id } = req.params;
  const { variables } = req.body;
  
  try {
    const flow = await prisma.flow.findUnique({ where: { id } });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    
    const result = await flowEngine.execute(flow, variables || {});
    if (!result?.success) {
      return res.status(400).json({ error: result?.reason || 'Flow execution failed' });
    }
    
    res.json({ success: true, message: 'Flow executed successfully' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to run flow' });
  }
};
