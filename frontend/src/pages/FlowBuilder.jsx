import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow, MiniMap, Controls, Background,
  useNodesState, useEdgesState, addEdge,
  Panel, Handle, Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save, Play, Plus, Trash2, Zap, MessageSquare, Bot,
  GitBranch, Clock, Globe, Variable, Type, X, Code2, BarChart,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight,
  Copy, Download, Upload, Sparkles, BookOpen, Layers, Check
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api';
import { SOCKET_URL } from '../config';

const NODE_DEFS = {
  webhook_trigger: { label: 'Webhook Trigger', color: '#3B82F6', Icon: Zap,            category: 'Triggers',     desc: 'Starts flow via HTTP POST or WhatsApp incoming message' },
  send_message:    { label: 'Send Message',    color: '#25D366', Icon: MessageSquare,   category: 'WhatsApp',     desc: 'Send WhatsApp message (text, media, buttons, list)' },
  poll:            { label: 'WhatsApp Poll',   color: '#10B981', Icon: BarChart,        category: 'WhatsApp',     desc: 'Send interactive poll question' },
  ai_chat:         { label: 'AI Chat',         color: '#8B5CF6', Icon: Bot,             category: 'AI',           desc: 'Generate AI response with multi-turn memory' },
  condition:       { label: 'Condition',       color: '#F59E0B', Icon: GitBranch,       category: 'Logic',        desc: 'Branch on condition (true/false)' },
  code_exec:       { label: 'Code (JavaScript)', color: '#EC4899', Icon: Code2,         category: 'Logic',        desc: 'Execute custom JavaScript logic' },
  delay:           { label: 'Delay',           color: '#F59E0B', Icon: Clock,           category: 'Logic',        desc: 'Wait before next step' },
  set_variable:    { label: 'Set Variable',    color: '#F59E0B', Icon: Variable,        category: 'Logic',        desc: 'Set context variables' },
  text_formatter:  { label: 'Text Formatter',  color: '#F59E0B', Icon: Type,            category: 'Logic',        desc: 'Format text with template' },
  http_request:    { label: 'HTTP Request',    color: '#06B6D4', Icon: Globe,           category: 'Integrations', desc: 'Call external REST API' },
};

const CATEGORIES = ['Triggers', 'WhatsApp', 'AI', 'Logic', 'Integrations'];

const TEMPLATES = [
  {
    id: 'ai-support-agent',
    name: '🤖 AI Customer Support Bot',
    description: 'Auto-replies with conversational AI, remembers context, and sends WhatsApp messages.',
    nodes: [
      { id: 'trigger-1', type: 'webhook_trigger', position: { x: 250, y: 80 }, data: { label: 'Incoming Message', pluginType: 'webhook_trigger', keyword: '' } },
      { id: 'ai-2', type: 'ai_chat', position: { x: 250, y: 220 }, data: { label: 'AI Assistant', pluginType: 'ai_chat', provider: 'openai', model: 'gpt-4o', prompt: '{{message}}', systemPrompt: 'You are a friendly WhatsApp customer support assistant for our store. Answer questions concisely.', enableHistory: true } },
      { id: 'msg-3', type: 'send_message', position: { x: 250, y: 360 }, data: { label: 'Reply Customer', pluginType: 'send_message', to: '{{sender}}', text: '{{aiResponse}}', messageType: 'text' } }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'ai-2', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } },
      { id: 'e2-3', source: 'ai-2', target: 'msg-3', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } }
    ]
  },
  {
    id: 'order-status-checker',
    name: '📦 E-Commerce Order Lookup',
    description: 'Checks customer order status via external HTTP API and replies with live tracking info.',
    nodes: [
      { id: 'trigger-1', type: 'webhook_trigger', position: { x: 250, y: 80 }, data: { label: 'Order Inquiry', pluginType: 'webhook_trigger', keyword: 'order' } },
      { id: 'http-2', type: 'http_request', position: { x: 250, y: 220 }, data: { label: 'Fetch Order API', pluginType: 'http_request', method: 'GET', url: 'https://api.example.com/orders?query={{message}}', headers: '{\n  "Accept": "application/json"\n}', continueOnError: true } },
      { id: 'cond-3', type: 'condition', position: { x: 250, y: 360 }, data: { label: 'Check API Status', pluginType: 'condition', variable: 'httpStatus', operator: 'equals', value: '200' } },
      { id: 'msg-success', type: 'send_message', position: { x: 120, y: 520 }, data: { label: 'Send Tracking Info', pluginType: 'send_message', to: '{{sender}}', text: '📦 Your order details:\n\nStatus: {{httpResponse.status}}\nEstimated Delivery: {{httpResponse.deliveryDate}}', messageType: 'text' } },
      { id: 'msg-fail', type: 'send_message', position: { x: 380, y: 520 }, data: { label: 'Order Not Found', pluginType: 'send_message', to: '{{sender}}', text: '❌ Sorry, we could not find an order matching your request. Please reply with your exact 6-digit Order ID.', messageType: 'text' } }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'http-2', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } },
      { id: 'e2-3', source: 'http-2', target: 'cond-3', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } },
      { id: 'e3-success', source: 'cond-3', sourceHandle: 'true', target: 'msg-success', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } },
      { id: 'e3-fail', source: 'cond-3', sourceHandle: 'false', target: 'msg-fail', animated: true, style: { stroke: '#EF4444', strokeWidth: 2 } }
    ]
  },
  {
    id: 'poll-survey',
    name: '📊 Customer Satisfaction Poll',
    description: 'Sends a WhatsApp native interactive poll and logs feedback.',
    nodes: [
      { id: 'trigger-1', type: 'webhook_trigger', position: { x: 250, y: 80 }, data: { label: 'Trigger Poll', pluginType: 'webhook_trigger' } },
      { id: 'poll-2', type: 'poll', position: { x: 250, y: 220 }, data: { label: 'Satisfaction Survey', pluginType: 'poll', pollName: 'How was your support experience today?', values: ['⭐ Excellent', '👍 Good', '👎 Needs Improvement'], selectableCount: 1, to: '{{sender}}' } },
      { id: 'delay-3', type: 'delay', position: { x: 250, y: 360 }, data: { label: 'Wait 3 seconds', pluginType: 'delay', delayMs: 3000 } },
      { id: 'msg-4', type: 'send_message', position: { x: 250, y: 500 }, data: { label: 'Thank You Message', pluginType: 'send_message', to: '{{sender}}', text: 'Thank you for your valuable feedback! 🙏', messageType: 'text' } }
    ],
    edges: [
      { id: 'e1-2', source: 'trigger-1', target: 'poll-2', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } },
      { id: 'e2-3', source: 'poll-2', target: 'delay-3', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } },
      { id: 'e3-4', source: 'delay-3', target: 'msg-4', animated: true, style: { stroke: '#25D366', strokeWidth: 2 } }
    ]
  }
];

const NodeShell = ({ nodeType, selected, children, bottomHandles, noTargetHandle }) => {
  const def = NODE_DEFS[nodeType] || {};
  const { Icon = Zap, color = '#64748b', label = nodeType } = def;
  return (
    <div style={{ borderColor: selected ? color : 'rgba(255,255,255,0.08)' }}
      className="bg-[#0B1F19] rounded-xl border-2 shadow-2xl min-w-[210px] transition-all select-none">
      {!noTargetHandle && (
        <Handle type="target" position={Position.Top}
          style={{ borderColor: color, background: '#0B1F19', width: 12, height: 12, borderWidth: 2 }} />
      )}
      <div style={{ background: color + '18', borderBottomColor: color + '28' }}
        className="px-3 py-2 flex items-center gap-2 border-b rounded-t-[10px]">
        <Icon size={13} style={{ color }} />
        <span className="text-xs font-bold tracking-wide" style={{ color }}>{label}</span>
      </div>
      <div className="px-3 py-2.5 space-y-1 text-xs text-slate-400 min-h-[40px]">{children}</div>
      {bottomHandles !== undefined ? bottomHandles : (
        <Handle type="source" position={Position.Bottom}
          style={{ borderColor: color, background: '#0B1F19', width: 12, height: 12, borderWidth: 2 }} />
      )}
    </div>
  );
};

const WebhookTriggerNode = ({ data, selected }) => (
  <NodeShell nodeType="webhook_trigger" selected={selected} noTargetHandle>
    <div className="text-blue-400 font-mono text-[10px]">POST /api/webhook/…</div>
    {data.keyword && <div className="text-emerald-400 text-[10px]">Keyword: "{data.keyword}"</div>}
    {data.secret && <div className="text-amber-400 text-[9px] font-mono">🔒 secret set</div>}
  </NodeShell>
);

const MSG_TYPE_ICON = {
  text: '💬', image: '🖼️', video: '🎥', gif: '🎞️', audio: '🎵',
  document: '📄', sticker: '🎭', location: '📍', contact: '👤',
  poll: '📊', buttons: '🔘', urlButtons: '🔗', copyButton: '📋', list: '📋',
};

const SendMessageNode = ({ data, selected }) => {
  const type = data.messageType || 'text';
  return (
    <NodeShell nodeType="send_message" selected={selected}>
      <div className="text-emerald-400 truncate">{data.to || '{{sender}}'}</div>
      <div className="text-slate-500 text-[10px] flex items-center gap-1">
        <span>{MSG_TYPE_ICON[type] || '💬'}</span>
        <span className="font-medium text-slate-400">{type}</span>
        {data.text && <span className="truncate">· {data.text.slice(0, 18)}</span>}
      </div>
    </NodeShell>
  );
};

const PollNode = ({ data, selected }) => (
  <NodeShell nodeType="poll" selected={selected}>
    <div className="text-emerald-300 font-medium truncate">{data.pollName || 'Poll question'}</div>
    <div className="text-[10px] text-slate-500">{(data.values || []).length || 2} options</div>
  </NodeShell>
);

const AiChatNode = ({ data, selected }) => (
  <NodeShell nodeType="ai_chat" selected={selected}>
    <div className="text-purple-400 font-medium">{data.provider || 'openai'} / {data.model || 'gpt-4o'}</div>
    <div className="text-slate-500 truncate">{data.prompt || 'Prompt…'}</div>
    {data.enableHistory && <div className="text-[9px] text-purple-300">🧠 Context Memory Active</div>}
  </NodeShell>
);

const ConditionNode = ({ data, selected }) => (
  <NodeShell nodeType="condition" selected={selected} bottomHandles={
    <div className="relative" style={{ height: 28 }}>
      <div className="absolute left-0 bottom-0" style={{ width: '50%' }}>
        <div className="text-center text-[9px] text-emerald-400 font-bold pb-1">TRUE</div>
        <Handle type="source" id="true" position={Position.Bottom}
          style={{ left: '50%', borderColor: '#10B981', background: '#0B1F19', width: 12, height: 12, borderWidth: 2, transform: 'translate(-50%, 50%)' }} />
      </div>
      <div className="absolute right-0 bottom-0" style={{ width: '50%' }}>
        <div className="text-center text-[9px] text-red-400 font-bold pb-1">FALSE</div>
        <Handle type="source" id="false" position={Position.Bottom}
          style={{ left: '50%', borderColor: '#EF4444', background: '#0B1F19', width: 12, height: 12, borderWidth: 2, transform: 'translate(-50%, 50%)' }} />
      </div>
    </div>
  }>
    <div className="text-slate-300 font-mono">{data.variable || 'variable'}</div>
    <div className="text-slate-500">{data.operator || 'equals'} <span className="text-amber-400">"{data.value || ''}"</span></div>
  </NodeShell>
);

const CodeExecNode = ({ data, selected }) => (
  <NodeShell nodeType="code_exec" selected={selected}>
    <div className="text-pink-400 font-mono text-[10px]">JavaScript Logic</div>
    <div className="text-slate-500 text-[10px]">→ <span className="text-amber-400">{data.outputVariable || 'codeResult'}</span></div>
  </NodeShell>
);

const DelayNode = ({ data, selected }) => (
  <NodeShell nodeType="delay" selected={selected}>
    <div className="text-amber-400 font-bold">{data.delayMs || 1000} ms</div>
  </NodeShell>
);

const SetVariableNode = ({ data, selected }) => (
  <NodeShell nodeType="set_variable" selected={selected}>
    <div className="text-slate-300 font-mono text-[10px] truncate">{data.variables || '{}'}</div>
  </NodeShell>
);

const TextFormatterNode = ({ data, selected }) => (
  <NodeShell nodeType="text_formatter" selected={selected}>
    <div className="text-slate-300 truncate">{data.template || 'Template…'}</div>
    <div className="text-slate-500">→ <span className="text-amber-400">{data.outputVariable || 'formattedText'}</span></div>
  </NodeShell>
);

const HttpRequestNode = ({ data, selected }) => (
  <NodeShell nodeType="http_request" selected={selected}>
    <div className="text-cyan-400 font-bold">{data.method || 'GET'}</div>
    <div className="text-slate-500 truncate">{data.url || 'https://…'}</div>
  </NodeShell>
);

const nodeTypes = {
  webhook_trigger: WebhookTriggerNode,
  send_message: SendMessageNode,
  poll: PollNode,
  ai_chat: AiChatNode,
  condition: ConditionNode,
  code_exec: CodeExecNode,
  delay: DelayNode,
  set_variable: SetVariableNode,
  text_formatter: TextFormatterNode,
  http_request: HttpRequestNode,
};

const defaultData = (type) => {
  const label = NODE_DEFS[type]?.label || type;
  const base = { label, pluginType: type };
  switch (type) {
    case 'send_message':   return { ...base, text: 'Hello {{sender}}', to: '{{sender}}', sessionId: '', messageType: 'text', buttons: [], urlButtons: [], pollValues: [], sections: [] };
    case 'poll':           return { ...base, pollName: 'What is your choice?', values: ['Option 1', 'Option 2'], selectableCount: 1, to: '{{sender}}' };
    case 'ai_chat':        return { ...base, prompt: '{{message}}', provider: 'openai', model: 'gpt-4o', enableHistory: true, systemPrompt: 'You are a helpful WhatsApp assistant.' };
    case 'condition':      return { ...base, variable: 'message', operator: 'contains', value: '' };
    case 'code_exec':      return { ...base, code: '// Write JavaScript\nconst msg = variables.message || "";\nreturn msg.trim().toUpperCase();', outputVariable: 'codeResult' };
    case 'delay':          return { ...base, delayMs: 1000 };
    case 'http_request':   return { ...base, method: 'GET', url: '', headers: '{}', body: '', continueOnError: false };
    case 'set_variable':   return { ...base, variables: '{"myVar": "{{message}}"}' };
    case 'text_formatter': return { ...base, template: '{{message}}', outputVariable: 'formattedText' };
    default:               return base;
  }
};

const parseJson = (v, fallback) => {
  try { const p = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(p) ? p : fallback; }
  catch { return fallback; }
};

const INIT_NODES = [{ id: 'trigger-1', position: { x: 250, y: 80 }, data: defaultData('webhook_trigger'), type: 'webhook_trigger' }];
const INIT_EDGES = [];

const FieldLabel = ({ children }) => <span className="text-[10px] uppercase text-slate-500 tracking-wider block mb-1">{children}</span>;
const inputCls = 'w-full bg-background border border-border text-slate-200 text-sm rounded-lg p-2 outline-none focus:border-primary/50';

const FlowBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INIT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INIT_EDGES);
  const [flows, setFlows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [currentFlowId, setCurrentFlowId] = useState(null);
  const [flowName, setFlowName] = useState('New Flow');
  const [flowSessionId, setFlowSessionId] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [testVars, setTestVars] = useState('{\n  "sender": "923001234567@s.whatsapp.net",\n  "message": "Hello"\n}');
  const [flowIsActive, setFlowIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [running, setRunning] = useState(false);
  const [execLogs, setExecLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const fileInputRef = useRef(null);

  const socketRef = useRef(null);
  const logHandlerRef = useRef(null);

  const selectedNode = nodes.find(n => n.id === selectedId) || null;

  useEffect(() => {
    api.get('/flows').then(r => setFlows(r.data)).catch(() => {});
    api.get('/session').then(r => setSessions(r.data)).catch(() => {});
    api.get('/modules/agents').then(r => setAgents(r.data)).catch(() => {});

    return () => {
      if (socketRef.current) {
        if (logHandlerRef.current) socketRef.current.off('flow-log', logHandlerRef.current);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#25D366', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const saveFlow = async () => {
    setSaving(true); setSaveError('');
    const payload = { name: flowName, nodes: JSON.stringify(nodes), edges: JSON.stringify(edges), isActive: flowIsActive, sessionId: flowSessionId || null };
    try {
      if (currentFlowId) {
        await api.put(`/flows/${currentFlowId}`, payload);
      } else {
        const res = await api.post('/flows', payload);
        setCurrentFlowId(res.data.id);
      }
      const res = await api.get('/flows');
      setFlows(res.data);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Error saving flow');
    } finally { setSaving(false); }
  };

  const loadFlow = (flow) => {
    setCurrentFlowId(flow.id);
    setFlowName(flow.name);
    setFlowIsActive(flow.isActive !== false);
    setFlowSessionId(flow.sessionId || '');
    const parsed = parseJson(flow.nodes, INIT_NODES).map(n => ({
      ...n, type: n.data?.pluginType || n.type || 'default'
    }));
    setNodes(parsed);
    setEdges(parseJson(flow.edges, INIT_EDGES));
    setSelectedId(null);
    setExecLogs([]);
    setShowLogs(false);
  };

  const createNewFlow = () => {
    setCurrentFlowId(null); setFlowName('New Flow'); setFlowSessionId(''); setFlowIsActive(true);
    setNodes(INIT_NODES); setEdges(INIT_EDGES);
    setSelectedId(null); setExecLogs([]); setShowLogs(false); setSaveError('');
  };

  const handleDeleteFlow = async (flowId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this workflow? This cannot be undone.')) return;
    try {
      await api.delete(`/flows/${flowId}`);
      if (currentFlowId === flowId) createNewFlow();
      const r = await api.get('/flows');
      setFlows(r.data);
    } catch (err) {
      setSaveError('Failed to delete flow');
    }
  };

  const handleDuplicateFlow = async (flowId, e) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/flows/${flowId}/duplicate`);
      const r = await api.get('/flows');
      setFlows(r.data);
      loadFlow(res.data);
    } catch (err) {
      setSaveError('Failed to duplicate flow');
    }
  };

  const exportFlowJson = () => {
    const data = {
      name: flowName,
      nodes,
      edges,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flowName.toLowerCase().replace(/\s+/g, '_')}_flow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.nodes && parsed.edges) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          if (parsed.name) setFlowName(parsed.name + ' (Imported)');
          setCurrentFlowId(null);
        } else {
          alert('Invalid flow JSON format');
        }
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const applyTemplate = (tpl) => {
    setNodes(tpl.nodes);
    setEdges(tpl.edges);
    setFlowName(tpl.name.replace(/^[^\w\s]+/, '').trim());
    setCurrentFlowId(null);
    setShowTemplatesModal(false);
  };

  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const res = await api.post('/flows/generate', { prompt: aiPrompt });
      if (res.data.nodes && res.data.edges) {
        setNodes(res.data.nodes);
        setEdges(res.data.edges);
        if (res.data.name) setFlowName(res.data.name);
        setCurrentFlowId(null);
        setShowAiModal(false);
        setAiPrompt('');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'AI Flow generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleToggleActive = async () => {
    const newActive = !flowIsActive;
    setFlowIsActive(newActive);
    if (!currentFlowId) return;
    setSaving(true); setSaveError('');
    try {
      await api.put(`/flows/${currentFlowId}`, {
        name: flowName, nodes: JSON.stringify(nodes), edges: JSON.stringify(edges),
        isActive: newActive, sessionId: flowSessionId || null
      });
      const r = await api.get('/flows');
      setFlows(r.data);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Error saving flow');
      setFlowIsActive(!newActive);
    } finally { setSaving(false); }
  };

  const runFlow = async () => {
    if (!currentFlowId) { setSaveError('Save the flow first before running.'); return; }
    let vars = {};
    try { vars = JSON.parse(testVars || '{}'); } catch { setSaveError('Test Variables JSON is invalid'); return; }

    setRunning(true); setExecLogs([]); setShowLogs(true);

    if (!socketRef.current) {
      const token = localStorage.getItem('waai.auth.token');
      socketRef.current = io(SOCKET_URL || window.location.origin, { auth: { token } });
    }
    const sock = socketRef.current;

    if (logHandlerRef.current) sock.off('flow-log', logHandlerRef.current);
    const onLog = (log) => {
      if (log.flowId === currentFlowId) setExecLogs(p => [...p, { ...log, time: new Date().toISOString() }]);
    };
    logHandlerRef.current = onLog;
    sock.on('flow-log', onLog);

    try {
      await api.post(`/flows/run/${currentFlowId}`, { variables: vars });
    } catch (err) {
      setExecLogs(p => [...p, { status: 'FAILED', message: err.response?.data?.error || err.message, time: new Date().toISOString() }]);
    } finally {
      setTimeout(() => {
        sock.off('flow-log', onLog);
        logHandlerRef.current = null;
        setRunning(false);
      }, 8000);
    }
  };

  const addNode = (type) => {
    const id = `node_${Date.now()}`;
    setNodes(nds => [...nds, { id, position: { x: 220 + Math.random() * 80, y: 80 + nds.length * 130 }, data: defaultData(type), type }]);
    setSelectedId(id);
  };

  const updateNode = (key, value) => {
    if (!selectedId) return;
    setNodes(nds => nds.map(n => n.id === selectedId ? { ...n, data: { ...n.data, [key]: value } } : n));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes(nds => nds.filter(n => n.id !== selectedId));
    setEdges(eds => eds.filter(e => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  const renderSettings = () => {
    if (!selectedNode) return null;
    const type = selectedNode.data.pluginType || selectedNode.type;
    const def = NODE_DEFS[type] || {};
    const { Icon = Zap, color = '#64748b' } = def;
    const d = selectedNode.data;

    const field = (label, key, props = {}) => (
      <label key={key} className="block">
        <FieldLabel>{label}</FieldLabel>
        <input value={d[key] ?? ''} onChange={e => updateNode(key, e.target.value)} className={inputCls} {...props} />
      </label>
    );

    const ta = (label, key, rows = 3, props = {}) => (
      <label key={key} className="block">
        <FieldLabel>{label}</FieldLabel>
        <textarea value={d[key] ?? ''} onChange={e => updateNode(key, e.target.value)} rows={rows}
          className={inputCls + ' font-mono'} {...props} />
      </label>
    );

    const sel = (label, key, options) => (
      <label key={key} className="block">
        <FieldLabel>{label}</FieldLabel>
        <select value={d[key] ?? ''} onChange={e => updateNode(key, e.target.value)} className={inputCls}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
    );

    const hint = (text) => <p className="text-[10px] text-slate-500 leading-relaxed">{text}</p>;

    let body = null;
    switch (type) {
      case 'webhook_trigger':
        body = (
          <>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs space-y-1.5">
              <div className="text-blue-400 font-bold">Webhook URL</div>
              <code className="text-slate-300 break-all block text-[10px]">POST /api/webhook/{currentFlowId || ':flowId'}</code>
              <div className="text-slate-500 text-[10px]">Payload fields available as <code className="text-blue-400">{'{{webhookPayload.field}}'}</code></div>
              <div className="text-slate-500 text-[10px]">Built-in: <code className="text-blue-400">{'{{sender}}'}</code>, <code className="text-blue-400">{'{{message}}'}</code></div>
            </div>
            {field('Keyword Filter (WhatsApp Trigger)', 'keyword', { placeholder: 'e.g. order, support, hi' })}
            <p className="text-[10px] text-slate-500 -mt-1">When set, this flow triggers automatically whenever a WhatsApp message contains this keyword.</p>
            {field('Webhook Secret (optional)', 'secret', { placeholder: 'my-secret-token', type: 'password' })}
            <p className="text-[10px] text-slate-500 -mt-1">When set, external HTTP requests must include <code className="text-slate-400">X-Webhook-Secret: your-token</code></p>
          </>
        );
        break;

      case 'send_message': {
        const msgType = d.messageType || 'text';
        body = (
          <>
            {sel('Session', 'sessionId', [['', 'Use flow session'], ...sessions.map(s => [s.sessionId, `${s.name} (${s.status})`])])}
            {field('Recipient JID', 'to', { placeholder: '{{sender}} or 923...@s.whatsapp.net' })}
            {sel('Message Type', 'messageType', [
              ['text',       '💬  Text message'],
              ['image',      '🖼️  Image'],
              ['video',      '🎥  Video'],
              ['gif',        '🎞️  GIF'],
              ['audio',      '🎵  Audio / Voice note'],
              ['document',   '📄  Document / File'],
              ['location',   '📍  Location'],
              ['contact',    '👤  Contact card'],
              ['poll',       '📊  Poll'],
            ])}

            {msgType === 'text' && ta('Message', 'text', 4, { placeholder: 'Hello {{sender}}!\n\nAI reply: {{aiResponse}}' })}
            {['image', 'video', 'gif', 'document'].includes(msgType) && (
              <>
                {field('Media URL', 'mediaUrl', { placeholder: 'https://example.com/file.jpg' })}
                {ta('Caption (optional)', 'text', 2, { placeholder: 'Caption text…' })}
              </>
            )}
            {msgType === 'audio' && (
              <>
                {field('Audio URL', 'mediaUrl', { placeholder: 'https://example.com/voice.mp3' })}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!d.ptt} onChange={e => updateNode('ptt', e.target.checked)} className="accent-primary" />
                  <span className="text-xs text-slate-400">Send as Voice Note (PTT)</span>
                </label>
              </>
            )}
            {hint('Template vars: {{sender}}, {{message}}, {{aiResponse}}, {{httpResponse}}, {{codeResult}}')}
          </>
        );
        break;
      }

      case 'poll':
        body = (
          <>
            {field('Poll Question', 'pollName', { placeholder: 'What is your choice?' })}
            <label className="block">
              <FieldLabel>Options (one per line)</FieldLabel>
              <textarea
                rows={4}
                value={Array.isArray(d.values) ? d.values.join('\n') : (d.values || 'Option 1\nOption 2')}
                onChange={e => updateNode('values', e.target.value.split('\n').filter(Boolean))}
                className={inputCls + ' font-mono text-xs'}
              />
            </label>
            {field('Max Selectable Options', 'selectableCount', { type: 'number', min: 1, max: 10, placeholder: '1' })}
            {field('Recipient (to)', 'to', { placeholder: '{{sender}}' })}
          </>
        );
        break;

      case 'ai_chat':
        body = (
          <>
            {agents.length > 0 && (
              <label className="block bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-lg">
                <FieldLabel>Link Saved Agent Profile</FieldLabel>
                <select
                  value={d.agentId || ''}
                  onChange={e => {
                    const agentId = e.target.value;
                    const ag = agents.find(a => a.id === agentId);
                    if (ag) {
                      updateNode('agentId', agentId);
                      updateNode('provider', ag.provider);
                      updateNode('model', ag.model);
                      updateNode('systemPrompt', ag.systemPrompt);
                    } else {
                      updateNode('agentId', '');
                    }
                  }}
                  className={inputCls}
                >
                  <option value="">-- Custom Config --</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.provider} / {a.model})</option>)}
                </select>
              </label>
            )}
            {sel('Provider', 'provider', [
              ['openai', 'OpenAI (GPT-4o)'],
              ['anthropic', 'Anthropic Claude'],
              ['deepseek', 'DeepSeek (V3 / R1)'],
              ['groq', 'Groq (Llama 3.3)'],
              ['gemini', 'Google Gemini'],
              ['ollama', 'Ollama (Local)']
            ])}
            {field('Model', 'model', { placeholder: 'gpt-4o / claude-3-5-sonnet / deepseek-chat' })}
            {ta('System Prompt (optional)', 'systemPrompt', 2, { placeholder: 'You are a helpful WhatsApp assistant.' })}
            {ta('User Prompt', 'prompt', 3, { placeholder: '{{message}}' })}
            <label className="flex items-center gap-2 cursor-pointer bg-surface p-2 rounded-lg border border-border">
              <input
                type="checkbox"
                checked={d.enableHistory !== false}
                onChange={e => updateNode('enableHistory', e.target.checked)}
                className="accent-primary"
              />
              <span className="text-xs text-slate-300">Enable Multi-Turn Chat History</span>
            </label>
            {hint('AI response will be saved as {{aiResponse}} for downstream nodes.')}
          </>
        );
        break;

      case 'code_exec':
        body = (
          <>
            {ta('JavaScript Code', 'code', 8, { placeholder: 'const num = parseFloat(variables.message) || 0;\nreturn num * 1.18;' })}
            {field('Output Variable Name', 'outputVariable', { placeholder: 'codeResult' })}
            {hint('Access variables as `variables.foo` and return the result value.')}
          </>
        );
        break;

      case 'condition':
        body = (
          <>
            {field('Variable Path', 'variable', { placeholder: 'message or webhookPayload.type' })}
            {sel('Operator', 'operator', [
              ['equals', 'equals'], ['not_equals', 'not equals'], ['contains', 'contains'],
              ['not_contains', 'does not contain'], ['starts_with', 'starts with'], ['ends_with', 'ends with'],
              ['greater_than', '> greater than'], ['less_than', '< less than'],
              ['is_empty', 'is empty'], ['is_not_empty', 'is not empty'],
            ])}
            {field('Compare Value', 'value', { placeholder: 'hello' })}
            <div className="text-[10px] text-slate-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
              Connect <span className="text-emerald-400 font-bold">TRUE</span> for matching handle and <span className="text-red-400 font-bold">FALSE</span> for others.
            </div>
          </>
        );
        break;

      case 'delay':
        body = (
          <>
            {field('Delay (milliseconds)', 'delayMs', { type: 'number', min: 0, max: 30000, placeholder: '1000' })}
            {hint('Pauses execution before moving to next connected node.')}
          </>
        );
        break;

      case 'http_request':
        body = (
          <>
            {sel('Method', 'method', [['GET', 'GET'], ['POST', 'POST'], ['PUT', 'PUT'], ['PATCH', 'PATCH'], ['DELETE', 'DELETE']])}
            {field('URL', 'url', { placeholder: 'https://api.example.com/data' })}
            {ta('Headers (JSON)', 'headers', 3, { placeholder: '{\n  "Authorization": "Bearer {{token}}"\n}' })}
            {ta('Body (JSON)', 'body', 4, { placeholder: '{\n  "message": "{{message}}"\n}' })}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!d.continueOnError} onChange={e => updateNode('continueOnError', e.target.checked)} className="accent-primary" />
              <span className="text-xs text-slate-400">Continue on error status (4xx/5xx)</span>
            </label>
            {hint('Response saved as {{httpResponse}}, status code as {{httpStatus}}.')}
          </>
        );
        break;

      case 'set_variable':
        body = (
          <>
            {ta('Variables (JSON)', 'variables', 6, { placeholder: '{\n  "greeting": "Hello {{sender}}!",\n  "count": "1"\n}' })}
            {hint('Keys become available as {{key}} in all downstream nodes.')}
          </>
        );
        break;

      case 'text_formatter':
        body = (
          <>
            {ta('Template', 'template', 5, { placeholder: 'Hello {{sender}},\n\nAI reply:\n{{aiResponse}}' })}
            {field('Output Variable Name', 'outputVariable', { placeholder: 'formattedText' })}
            {hint('Rendered result available as {{formattedText}}.')}
          </>
        );
        break;

      default:
        body = hint('No configurable settings for this node type.');
    }

    return (
      <div className="absolute top-20 right-4 w-[340px] bg-[#0B1F19] border border-border rounded-xl shadow-2xl z-20 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Icon size={15} style={{ color }} />
            <div>
              <div className="text-[10px] uppercase text-slate-500 tracking-wider">Node Settings</div>
              <div className="text-white font-semibold text-sm mt-0.5">{d.label}</div>
            </div>
          </div>
          <button onClick={deleteSelected} className="text-danger hover:bg-danger/10 rounded-lg p-1.5 transition">
            <Trash2 size={14} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
          <label className="block">
            <FieldLabel>Label</FieldLabel>
            <input value={d.label || ''} onChange={e => updateNode('label', e.target.value)} className={inputCls} />
          </label>
          {body}
        </div>
      </div>
    );
  };

  const [openCats, setOpenCats] = useState({ Triggers: true, WhatsApp: true, AI: true, Logic: true, Integrations: true });
  const toggleCat = (cat) => setOpenCats(p => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      <div className="w-[300px] bg-surface border-r border-border flex flex-col shrink-0 z-10">
        <div className="p-4 border-b border-border shrink-0 space-y-2">
          <button onClick={createNewFlow}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition">
            <Plus size={15} /> New Flow
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-medium py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs transition"
            >
              <Sparkles size={13} /> AI Generator
            </button>
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="w-full bg-surface hover:bg-background text-slate-300 border border-border font-medium py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs transition"
            >
              <BookOpen size={13} /> Templates
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">

          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Saved Flows ({flows.length})</div>
              <div className="flex items-center gap-1">
                <button onClick={exportFlowJson} title="Export current flow as JSON" className="text-slate-500 hover:text-white p-1">
                  <Download size={13} />
                </button>
                <button onClick={() => fileInputRef.current?.click()} title="Import flow from JSON" className="text-slate-500 hover:text-white p-1">
                  <Upload size={13} />
                </button>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </div>
            </div>
            <div className="space-y-1.5">
              {flows.map(f => (
                <div
                  key={f.id}
                  onClick={() => loadFlow(f)}
                  className={`w-full p-2.5 rounded-lg border transition text-sm cursor-pointer group flex items-start justify-between gap-2 ${currentFlowId === f.id ? 'bg-primary/15 border-primary/50 text-white' : 'bg-background border-border hover:border-slate-600 text-slate-400'}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${f.isActive ? 'text-success' : 'text-slate-600'}`}>
                      {f.isActive ? 'ACTIVE' : 'DRAFT'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={(e) => handleDuplicateFlow(f.id, e)}
                      className="p-1 hover:text-white text-slate-500"
                      title="Duplicate flow"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteFlow(f.id, e)}
                      className="p-1 hover:text-danger text-slate-500"
                      title="Delete flow"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {!flows.length && <div className="text-xs text-slate-600 py-1">No saved flows yet</div>}
            </div>
          </div>

          <div className="p-4 border-b border-border">
            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Default Session</div>
            <select value={flowSessionId} onChange={e => setFlowSessionId(e.target.value)}
              className="w-full bg-background border border-border text-slate-300 text-sm rounded-lg p-2 outline-none focus:border-primary/50">
              <option value="">Use node session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
            </select>
          </div>

          <div className="p-4 border-b border-border">
            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-3">Add Nodes</div>
            {CATEGORIES.map(cat => {
              const items = Object.entries(NODE_DEFS).filter(([, d]) => d.category === cat);
              return (
                <div key={cat} className="mb-3">
                  <button onClick={() => toggleCat(cat)}
                    className="flex items-center gap-1.5 w-full text-left mb-1.5 text-[10px] uppercase text-slate-500 tracking-widest hover:text-slate-300 transition">
                    {openCats[cat] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    {cat}
                  </button>
                  {openCats[cat] && (
                    <div className="space-y-1 pl-2">
                      {items.map(([type, def]) => (
                        <button key={type} onClick={() => addNode(type)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg border border-border hover:border-slate-600 bg-background text-sm text-slate-400 hover:text-white transition group">
                          <def.Icon size={13} style={{ color: def.color }} />
                          <span className="flex-1 text-left text-xs">{def.label}</span>
                          <Plus size={10} className="text-slate-600 group-hover:text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4">
            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Test Variables</div>
            <textarea value={testVars} onChange={e => setTestVars(e.target.value)} rows={7}
              className="w-full bg-background border border-border text-slate-300 text-xs rounded-lg p-2 outline-none focus:border-primary/50 font-mono" />
            <div className="text-[10px] text-slate-600 mt-1">Used when clicking Test Run</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative bg-background">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            colorMode="dark"
            fitView
            deleteKeyCode="Delete"
            defaultEdgeOptions={{ animated: true, style: { stroke: '#25D366', strokeWidth: 2 } }}
          >
            <Panel position="top-left" className="m-4">
              <div className="bg-surface/90 backdrop-blur border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                <input value={flowName} onChange={e => setFlowName(e.target.value)}
                  className="bg-transparent border-none text-white font-bold text-sm outline-none w-48 placeholder:text-slate-600"
                  placeholder="Flow Name" />
                {currentFlowId && (
                  <span className="text-[10px] text-slate-600 font-mono shrink-0">#{currentFlowId.slice(-6)}</span>
                )}
              </div>
            </Panel>

            <Panel position="top-right" className="flex flex-col items-end gap-2 m-4">
              <div className="flex gap-2">
                <button onClick={handleToggleActive}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${flowIsActive ? 'bg-success/15 border-success/40 text-success' : 'bg-surface border-border text-slate-500 hover:text-white'}`}>
                  {flowIsActive ? '● ACTIVE' : '○ DRAFT'}
                </button>
                <button onClick={() => setShowLogs(v => !v)}
                  className="bg-surface border border-border text-slate-400 px-3 py-1.5 rounded-lg hover:text-white transition text-sm">
                  Logs {execLogs.length > 0 && <span className="ml-1 bg-primary/20 text-primary text-[10px] rounded px-1">{execLogs.length}</span>}
                </button>
                <button onClick={saveFlow} disabled={saving}
                  className="bg-surface border border-border text-slate-300 px-3 py-1.5 rounded-lg hover:text-white transition flex items-center gap-1.5 text-sm">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                </button>
                <button onClick={runFlow} disabled={running}
                  className="bg-success text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition flex items-center gap-1.5 text-sm disabled:opacity-60 font-semibold shadow-lg shadow-success/20">
                  {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Test Run
                </button>
              </div>
              {saveError && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-xs rounded-lg px-3 py-1.5 flex items-center gap-2">
                  {saveError}
                  <button onClick={() => setSaveError('')} className="ml-1 opacity-60 hover:opacity-100">✕</button>
                </div>
              )}
            </Panel>

            <Controls className="bg-surface border-border [&>button]:border-border [&>button]:bg-surface [&>button]:fill-slate-400 [&>button:hover]:bg-background" />
            <MiniMap nodeColor={n => NODE_DEFS[n.type]?.color || '#334155'} maskColor="rgba(6,19,15,0.8)"
              className="bg-surface border border-border" />
            <Background variant="dots" gap={20} size={1} color="#1D3A31" />
          </ReactFlow>

          {renderSettings()}
        </div>

        {showLogs && (
          <div className="border-t border-border bg-[#06130F] shrink-0 h-52 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                {running && <Loader2 size={11} className="animate-spin text-primary" />}
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Execution Log</span>
                <span className="text-[10px] text-slate-600">{execLogs.length} events</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setExecLogs([])} className="text-[10px] text-slate-600 hover:text-slate-400">Clear</button>
                <button onClick={() => setShowLogs(false)} className="text-slate-600 hover:text-white"><X size={13} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {execLogs.length === 0 && (
                <div className="text-xs text-slate-600 text-center py-6">Run the flow to see real-time execution events here.</div>
              )}
              {execLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs px-2 py-1.5 rounded bg-surface/30 hover:bg-surface/60 transition">
                  {log.status === 'COMPLETED' && <CheckCircle2 size={11} className="text-success shrink-0" />}
                  {log.status === 'FAILED'    && <XCircle     size={11} className="text-danger shrink-0" />}
                  {log.status === 'RUNNING'   && <Loader2     size={11} className="animate-spin text-warning shrink-0" />}
                  <span className={`font-bold shrink-0 text-[10px] ${log.status === 'COMPLETED' ? 'text-success' : log.status === 'FAILED' ? 'text-danger' : 'text-warning'}`}>{log.status}</span>
                  {log.node   && <span className="text-slate-500 shrink-0 font-mono text-[10px]">node:{log.node.slice(-6)}</span>}
                  {log.plugin && <span className="text-slate-400">{log.plugin}</span>}
                  {log.error  && <span className="text-danger">{log.error}</span>}
                  {log.message && !log.plugin && <span className="text-slate-400">{log.message}</span>}
                  <span className="text-slate-600 ml-auto shrink-0">{log.time ? new Date(log.time).toLocaleTimeString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles size={20} />
                <h3 className="text-lg font-bold text-white">AI Flow Generator</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Describe your WhatsApp bot in plain English or Urdu. The AI will automatically build the nodes, edges, and logic for you.
            </p>
            <textarea
              rows={4}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. Create a customer support bot that greets user, calls an API to check order status, branches on response, and replies on WhatsApp."
              className="w-full bg-background border border-border text-slate-200 text-xs rounded-lg p-3 outline-none focus:border-purple-500"
            />
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-slate-500 font-bold">Quick Prompts:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Customer Support Bot with AI Chat',
                  'E-commerce order tracking with HTTP API',
                  'Lead generation quiz with condition branching'
                ].map(p => (
                  <button
                    key={p}
                    onClick={() => setAiPrompt(p)}
                    className="text-[10px] bg-background hover:bg-surface border border-border text-slate-400 hover:text-purple-300 px-2 py-1 rounded"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-background border border-border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateWithAi}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="px-5 py-2 text-xs text-white bg-purple-600 hover:bg-purple-700 font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Generate Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <BookOpen size={20} />
                <h3 className="text-lg font-bold text-white">Flow Templates Library</h3>
              </div>
              <button onClick={() => setShowTemplatesModal(false)} className="text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Select any pre-built template to quickly customize and deploy.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {TEMPLATES.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className="bg-background border border-border hover:border-primary/50 p-4 rounded-xl cursor-pointer transition space-y-2 group"
                >
                  <div className="text-sm font-bold text-white group-hover:text-primary transition">{tpl.name}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{tpl.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-2 border-t border-border/50">
                    <span>{tpl.nodes.length} Nodes</span>
                    <span>{tpl.edges.length} Connections</span>
                    <span className="text-primary font-bold ml-auto flex items-center gap-1">Load Template →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FlowBuilder;
