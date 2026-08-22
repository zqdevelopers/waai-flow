import { prisma } from '../database/index.js';
import { logger } from '../app.js';
import { flowEngine } from '../flow/engine.js';
import { OpenAIProvider } from '../ai/openai.provider.js';
import { GeminiProvider } from '../ai/gemini.provider.js';
import { DeepSeekProvider } from '../ai/deepseek.provider.js';
import { GroqProvider } from '../ai/groq.provider.js';
import { AnthropicProvider } from '../ai/anthropic.provider.js';

const serializeFlowJson = (value, fallback = '[]') => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      logger.warn(`serializeFlowJson: invalid JSON received, falling back to ${fallback}`);
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
    const flows = await prisma.flow.findMany({
      include: { Session: { select: { id: true, sessionId: true, name: true, status: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(flows);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
};

export const getFlow = async (req, res) => {
  try {
    const flow = await prisma.flow.findUnique({
      where: { id: req.params.id },
      include: { Session: { select: { id: true, sessionId: true, name: true, status: true } } }
    });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(flow);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch flow' });
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

export const duplicateFlow = async (req, res) => {
  const { id } = req.params;
  try {
    const original = await prisma.flow.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ error: 'Flow not found' });

    const duplicated = await prisma.flow.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description || '',
        nodes: original.nodes,
        edges: original.edges,
        isActive: false,
        sessionId: original.sessionId
      }
    });
    res.json(duplicated);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to duplicate flow' });
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
    const flow = await prisma.flow.findUnique({
      where: { id },
      include: { Session: { select: { id: true, sessionId: true, name: true, status: true } } }
    });
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

export const generateFlowWithAi = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const systemInstruction = `You are an expert AI Flow Architect for WAAI Flow (a WhatsApp automation platform).
Given a user's description of a WhatsApp workflow, output ONLY a valid JSON object with:
{
  "name": "Concise Flow Title",
  "description": "Short description of what this flow does",
  "nodes": [
    {
      "id": "node-1",
      "type": "webhook_trigger",
      "position": { "x": 250, "y": 80 },
      "data": {
        "label": "Webhook Trigger",
        "pluginType": "webhook_trigger",
        "keyword": ""
      }
    },
    ...
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "node-1",
      "target": "node-2",
      "animated": true,
      "style": { "stroke": "#25D366", "strokeWidth": 2 }
    }
  ]
}

Available Node Types:
1. "webhook_trigger": Trigger node with optional data.keyword filter. (Must always be start node at position y: 80).
2. "send_message": data: { label: "Send Message", pluginType: "send_message", text: "...", to: "{{sender}}", messageType: "text" | "image" | "buttons" | "list" }
3. "ai_chat": data: { label: "AI Chat", pluginType: "ai_chat", provider: "openai"|"gemini"|"anthropic"|"deepseek"|"groq", model: "gpt-4o", prompt: "{{message}}", systemPrompt: "..." }
4. "condition": data: { label: "Condition", pluginType: "condition", variable: "message", operator: "contains"|"equals", value: "...", sourceHandles: "true"|"false" }. (Condition has two source handles: "true" and "false". An edge from condition MUST specify sourceHandle: "true" or sourceHandle: "false").
5. "delay": data: { label: "Delay", pluginType: "delay", delayMs: 2000 }
6. "http_request": data: { label: "HTTP Request", pluginType: "http_request", method: "GET"|"POST", url: "https://...", headers: "{}", body: "{}" }
7. "code_exec": data: { label: "Code (JavaScript)", pluginType: "code_exec", code: "...", outputVariable: "result" }
8. "poll": data: { label: "WhatsApp Poll", pluginType: "poll", pollName: "...", values: ["Option 1", "Option 2"], selectableCount: 1, to: "{{sender}}" }

Layout each node sequentially with y spaced by ~140px. Return ONLY the JSON object, with no markdown fences.`;

  let ai = null;
  if (process.env.GROQ_API_KEY) ai = new GroqProvider({ model: 'llama-3.3-70b-versatile' });
  else if (process.env.DEEPSEEK_API_KEY) ai = new DeepSeekProvider({ model: 'deepseek-chat' });
  else if (process.env.OPENAI_API_KEY) ai = new OpenAIProvider({ model: 'gpt-4o' });
  else if (process.env.GEMINI_API_KEY) ai = new GeminiProvider({ model: 'gemini-2.0-flash' });
  else if (process.env.ANTHROPIC_API_KEY) ai = new AnthropicProvider({ model: 'claude-3-5-haiku-20241022' });

  try {
    let rawJsonText = '';
    if (ai) {
      const response = await ai.chat([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Create a WhatsApp workflow for: ${prompt}` }
      ]);
      rawJsonText = response.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    } else {
      // Fallback smart heuristic generator if no API key is configured
      const lower = prompt.toLowerCase();
      const isAiBot = lower.includes('ai') || lower.includes('bot') || lower.includes('gpt') || lower.includes('chat');
      const hasHttp = lower.includes('api') || lower.includes('http') || lower.includes('fetch') || lower.includes('webhook') || lower.includes('order');
      
      const nodes = [
        {
          id: 'trigger-1',
          type: 'webhook_trigger',
          position: { x: 250, y: 80 },
          data: { label: 'Webhook Trigger', pluginType: 'webhook_trigger', keyword: '' }
        }
      ];
      const edges = [];

      let yPos = 220;
      let prevId = 'trigger-1';

      if (hasHttp) {
        nodes.push({
          id: 'http-2',
          type: 'http_request',
          position: { x: 250, y: yPos },
          data: {
            label: 'Fetch External Data',
            pluginType: 'http_request',
            method: 'GET',
            url: 'https://api.example.com/status?query={{message}}',
            headers: '{\n  "Accept": "application/json"\n}',
            body: ''
          }
        });
        edges.push({ id: `e-${prevId}-http-2`, source: prevId, target: 'http-2', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } });
        prevId = 'http-2';
        yPos += 140;
      }

      if (isAiBot) {
        nodes.push({
          id: 'ai-3',
          type: 'ai_chat',
          position: { x: 250, y: yPos },
          data: {
            label: 'AI Assistant',
            pluginType: 'ai_chat',
            provider: 'openai',
            model: 'gpt-4o',
            systemPrompt: 'You are an intelligent WhatsApp customer assistant.',
            prompt: 'Customer sent: {{message}}\nAPI Data: {{httpResponse}}\nFormulate a helpful WhatsApp response.'
          }
        });
        edges.push({ id: `e-${prevId}-ai-3`, source: prevId, target: 'ai-3', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } });
        prevId = 'ai-3';
        yPos += 140;
      }

      nodes.push({
        id: 'msg-final',
        type: 'send_message',
        position: { x: 250, y: yPos },
        data: {
          label: 'Send WhatsApp Reply',
          pluginType: 'send_message',
          to: '{{sender}}',
          messageType: 'text',
          text: isAiBot ? '{{aiResponse}}' : 'Hello {{sender}}! We received your message: {{message}}'
        }
      });
      edges.push({ id: `e-${prevId}-msg-final`, source: prevId, target: 'msg-final', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } });

      return res.json({
        name: prompt.slice(0, 40),
        description: prompt,
        nodes,
        edges
      });
    }

    const parsed = JSON.parse(rawJsonText);
    res.json(parsed);
  } catch (error) {
    logger.error({ error }, 'AI Flow Generator error');
    res.status(500).json({ error: error.message || 'Failed to generate flow with AI' });
  }
};
