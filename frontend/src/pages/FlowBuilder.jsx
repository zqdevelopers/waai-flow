import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow, MiniMap, Controls, Background,
  useNodesState, useEdgesState, addEdge,
  Panel, Handle, Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save, Play, Plus, Trash2, Zap, MessageSquare, Bot,
  GitBranch, Clock, Globe, Variable, Type, X,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api';
import { SOCKET_URL } from '../config';

// ─── Node metadata ────────────────────────────────────────────────────────────
const NODE_DEFS = {
  webhook_trigger: { label: 'Webhook Trigger', color: '#3B82F6', Icon: Zap,            category: 'Triggers',     desc: 'Starts flow via HTTP POST' },
  send_message:    { label: 'Send Message',    color: '#25D366', Icon: MessageSquare,   category: 'WhatsApp',     desc: 'Send WhatsApp message' },
  ai_chat:         { label: 'AI Chat',         color: '#8B5CF6', Icon: Bot,             category: 'AI',           desc: 'Generate AI response' },
  condition:       { label: 'Condition',       color: '#F59E0B', Icon: GitBranch,       category: 'Logic',        desc: 'Branch on condition (true/false)' },
  delay:           { label: 'Delay',           color: '#F59E0B', Icon: Clock,           category: 'Logic',        desc: 'Wait before next step' },
  set_variable:    { label: 'Set Variable',    color: '#F59E0B', Icon: Variable,        category: 'Logic',        desc: 'Set context variables' },
  text_formatter:  { label: 'Text Formatter',  color: '#F59E0B', Icon: Type,            category: 'Logic',        desc: 'Format text with template' },
  http_request:    { label: 'HTTP Request',    color: '#06B6D4', Icon: Globe,           category: 'Integrations', desc: 'Call external API' },
};
const CATEGORIES = ['Triggers', 'WhatsApp', 'AI', 'Logic', 'Integrations'];

// ─── Shared node shell ────────────────────────────────────────────────────────
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

// ─── Custom node components ────────────���──────────────────────────────────────
const WebhookTriggerNode = ({ data, selected }) => (
  <NodeShell nodeType="webhook_trigger" selected={selected} noTargetHandle>
    <div className="text-blue-400 font-mono text-[10px]">POST /api/webhook/…</div>
    {data.secret && <div className="text-amber-400 text-[9px] font-mono">🔒 secret set</div>}
  </NodeShell>
);

const SendMessageNode = ({ data, selected }) => (
  <NodeShell nodeType="send_message" selected={selected}>
    <div className="text-emerald-400 truncate">{data.to || '{{sender}}'}</div>
    <div className="text-slate-500 truncate">{data.text || 'Message text…'}</div>
  </NodeShell>
);

const AiChatNode = ({ data, selected }) => (
  <NodeShell nodeType="ai_chat" selected={selected}>
    <div className="text-purple-400">{data.provider || 'openai'} / {data.model || 'gpt-4o'}</div>
    <div className="text-slate-500 truncate">{data.prompt || 'Prompt…'}</div>
  </NodeShell>
);

const ConditionNode = ({ data, selected }) => (
  <NodeShell nodeType="condition" selected={selected} bottomHandles={
    <div className="relative" style={{ height: 28 }}>
      {/* TRUE side */}
      <div className="absolute left-0 bottom-0" style={{ width: '50%' }}>
        <div className="text-center text-[9px] text-emerald-400 font-bold pb-1">TRUE</div>
        <Handle type="source" id="true" position={Position.Bottom}
          style={{ left: '50%', borderColor: '#10B981', background: '#0B1F19', width: 12, height: 12, borderWidth: 2, transform: 'translate(-50%, 50%)' }} />
      </div>
      {/* FALSE side */}
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
  ai_chat: AiChatNode,
  condition: ConditionNode,
  delay: DelayNode,
  set_variable: SetVariableNode,
  text_formatter: TextFormatterNode,
  http_request: HttpRequestNode,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const defaultData = (type) => {
  const label = NODE_DEFS[type]?.label || type;
  const base = { label, pluginType: type };
  switch (type) {
    case 'send_message':   return { ...base, text: 'Hello {{sender}}', to: '{{sender}}', sessionId: '' };
    case 'ai_chat':        return { ...base, prompt: '{{message}}', provider: 'openai', model: 'gpt-4o' };
    case 'condition':      return { ...base, variable: 'message', operator: 'contains', value: '' };
    case 'delay':          return { ...base, delayMs: 1000 };
    case 'http_request':   return { ...base, method: 'GET', url: '', headers: '{}', body: '' };
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

// ─── FlowBuilder ──────────────────────────────────────────────────────────────
const FlowBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INIT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INIT_EDGES);
  const [flows, setFlows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentFlowId, setCurrentFlowId] = useState(null);
  const [flowName, setFlowName] = useState('New Flow');
  const [flowSessionId, setFlowSessionId] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [testVars, setTestVars] = useState('{\n  "sender": "923001234567@s.whatsapp.net",\n  "message": "Hello"\n}');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [execLogs, setExecLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const socketRef = useRef(null);

  const selectedNode = nodes.find(n => n.id === selectedId) || null;

  useEffect(() => {
    api.get('/flows').then(r => setFlows(r.data)).catch(() => {});
    api.get('/session').then(r => setSessions(r.data)).catch(() => {});
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#25D366', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const saveFlow = async () => {
    setSaving(true);
    const payload = { name: flowName, nodes: JSON.stringify(nodes), edges: JSON.stringify(edges), isActive: true, sessionId: flowSessionId || null };
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
      alert(err.response?.data?.error || 'Error saving flow');
    } finally { setSaving(false); }
  };

  const loadFlow = (flow) => {
    setCurrentFlowId(flow.id);
    setFlowName(flow.name);
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
    setCurrentFlowId(null); setFlowName('New Flow'); setFlowSessionId('');
    setNodes(INIT_NODES); setEdges(INIT_EDGES);
    setSelectedId(null); setExecLogs([]); setShowLogs(false);
  };

  const runFlow = async () => {
    if (!currentFlowId) { alert('Save the flow first!'); return; }
    let vars = {};
    try { vars = JSON.parse(testVars || '{}'); } catch { alert('Test Variables JSON is invalid'); return; }

    setRunning(true); setExecLogs([]); setShowLogs(true);

    if (!socketRef.current) {
      const token = localStorage.getItem('waai.auth.token');
      socketRef.current = io(SOCKET_URL || window.location.origin, { auth: { token } });
    }
    const sock = socketRef.current;
    const onLog = (log) => {
      if (log.flowId === currentFlowId) setExecLogs(p => [...p, { ...log, time: new Date().toISOString() }]);
    };
    sock.on('flow-log', onLog);

    try {
      await api.post(`/flows/run/${currentFlowId}`, { variables: vars });
    } catch (err) {
      setExecLogs(p => [...p, { status: 'FAILED', message: err.response?.data?.error || err.message, time: new Date().toISOString() }]);
    } finally {
      setTimeout(() => { sock.off('flow-log', onLog); setRunning(false); }, 2000);
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

  // ─── Node settings panel content per type ──────────────────────────────────
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
            {field('Webhook Secret (optional)', 'secret', { placeholder: 'my-secret-token', type: 'password' })}
            <p className="text-[10px] text-slate-500 -mt-1">When set, requests must include <code className="text-slate-400">X-Webhook-Secret: your-token</code></p>
            <label className="block">
              <FieldLabel>Variable Mappings (optional)</FieldLabel>
              <textarea
                rows={5}
                value={d.variableMappings ?? ''}
                onChange={e => updateNode('variableMappings', e.target.value)}
                placeholder={'{\n  "customerName": "webhookPayload.customer.name",\n  "orderId": "webhookPayload.order.id"\n}'}
                className={inputCls + ' font-mono text-[11px]'}
              />
            </label>
            <p className="text-[10px] text-slate-500 -mt-1">Map nested payload fields to simple variable names. Use <code className="text-blue-400">{'{{customerName}}'}</code> in downstream nodes.</p>
          </>
        );
        break;

      case 'send_message':
        body = (
          <>
            {sel('Session', 'sessionId', [['', 'Use flow session'], ...sessions.map(s => [s.sessionId, `${s.name} (${s.status})`])])}
            {field('Recipient JID', 'to', { placeholder: '{{sender}} or 923...@s.whatsapp.net' })}
            {ta('Message Text', 'text', 4, { placeholder: 'Hello {{sender}}!\n\nAI reply: {{aiResponse}}' })}
            {hint('Supports all template variables: {{sender}}, {{message}}, {{aiResponse}}, {{httpResponse}}, etc.')}
          </>
        );
        break;

      case 'ai_chat':
        body = (
          <>
            {sel('Provider', 'provider', [['openai', 'OpenAI'], ['gemini', 'Gemini'], ['ollama', 'Ollama']])}
            {field('Model', 'model', { placeholder: 'gpt-4o / gemini-2.0-flash / llama3' })}
            {ta('System Prompt (optional)', 'systemPrompt', 2, { placeholder: 'You are a helpful WhatsApp assistant.' })}
            {ta('User Prompt', 'prompt', 4, { placeholder: 'User says: {{message}}\nReply helpfully.' })}
            {hint('Response is saved as {{aiResponse}} for use in downstream nodes.')}
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
              Connect the <span className="text-emerald-400 font-bold">TRUE</span> handle for the match path and <span className="text-red-400 font-bold">FALSE</span> for the other path.
            </div>
          </>
        );
        break;

      case 'delay':
        body = (
          <>
            {field('Delay (milliseconds)', 'delayMs', { type: 'number', min: 0, max: 30000, placeholder: '1000' })}
            {hint('Maximum 30 seconds (30000 ms). Flow pauses here before continuing.')}
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
            {hint('Response saved as {{httpResponse}}, status code as {{httpStatus}}.')}
          </>
        );
        break;

      case 'set_variable':
        body = (
          <>
            {ta('Variables (JSON)', 'variables', 6, { placeholder: '{\n  "greeting": "Hello {{sender}}!",\n  "count": "1"\n}' })}
            {hint('Values support template syntax. Keys become available as {{key}} in all downstream nodes.')}
          </>
        );
        break;

      case 'text_formatter':
        body = (
          <>
            {ta('Template', 'template', 5, { placeholder: 'Hello {{sender}},\n\nYour AI reply:\n{{aiResponse}}' })}
            {field('Output Variable Name', 'outputVariable', { placeholder: 'formattedText' })}
            {hint('Rendered result available as {{formattedText}} (or your chosen name) in downstream nodes.')}
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

  // ─── Categorised palette ────────────────────────────────────────────────────
  const [openCats, setOpenCats] = useState({ Triggers: true, WhatsApp: true, AI: true, Logic: true, Integrations: true });
  const toggleCat = (cat) => setOpenCats(p => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-[280px] bg-surface border-r border-border flex flex-col shrink-0 z-10">
        <div className="p-4 border-b border-border shrink-0">
          <button onClick={createNewFlow}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition">
            <Plus size={15} /> New Flow
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Saved flows */}
          <div className="p-4 border-b border-border">
            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Saved Flows</div>
            <div className="space-y-1.5">
              {flows.map(f => (
                <button key={f.id} onClick={() => loadFlow(f)}
                  className={`w-full text-left p-2.5 rounded-lg border transition text-sm ${currentFlowId === f.id ? 'bg-primary/15 border-primary/50 text-white' : 'bg-background border-border hover:border-slate-600 text-slate-400'}`}>
                  <div className="font-medium truncate">{f.name}</div>
                  <div className={`text-[10px] font-bold mt-0.5 ${f.isActive ? 'text-success' : 'text-slate-600'}`}>{f.isActive ? 'ACTIVE' : 'DRAFT'}</div>
                </button>
              ))}
              {!flows.length && <div className="text-xs text-slate-600 py-1">No saved flows yet</div>}
            </div>
          </div>

          {/* Flow session */}
          <div className="p-4 border-b border-border">
            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Default Session</div>
            <select value={flowSessionId} onChange={e => setFlowSessionId(e.target.value)}
              className="w-full bg-background border border-border text-slate-300 text-sm rounded-lg p-2 outline-none focus:border-primary/50">
              <option value="">Use node session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
            </select>
          </div>

          {/* Node palette */}
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

          {/* Test variables */}
          <div className="p-4">
            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">Test Variables</div>
            <textarea value={testVars} onChange={e => setTestVars(e.target.value)} rows={7}
              className="w-full bg-background border border-border text-slate-300 text-xs rounded-lg p-2 outline-none focus:border-primary/50 font-mono" />
            <div className="text-[10px] text-slate-600 mt-1">Used when clicking Test Run</div>
          </div>
        </div>
      </div>

      {/* ── MAIN CANVAS + LOG PANEL ── */}
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
            {/* Top-left: flow name */}
            <Panel position="top-left" className="m-4">
              <div className="bg-surface/90 backdrop-blur border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                <input value={flowName} onChange={e => setFlowName(e.target.value)}
                  className="bg-transparent border-none text-white font-bold text-sm outline-none w-44 placeholder:text-slate-600"
                  placeholder="Flow Name" />
                {currentFlowId && (
                  <span className="text-[10px] text-slate-600 font-mono shrink-0">#{currentFlowId.slice(-6)}</span>
                )}
              </div>
            </Panel>

            {/* Top-right: actions */}
            <Panel position="top-right" className="flex gap-2 m-4">
              <button onClick={() => setShowLogs(v => !v)}
                className="bg-surface border border-border text-slate-400 px-3 py-1.5 rounded-lg hover:text-white transition text-sm">
                Logs {execLogs.length > 0 && <span className="ml-1 bg-primary/20 text-primary text-[10px] rounded px-1">{execLogs.length}</span>}
              </button>
              <button onClick={saveFlow} disabled={saving}
                className="bg-surface border border-border text-slate-300 px-3 py-1.5 rounded-lg hover:text-white transition flex items-center gap-1.5 text-sm">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
              </button>
              <button onClick={runFlow} disabled={running}
                className="bg-success text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition flex items-center gap-1.5 text-sm disabled:opacity-60">
                {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Test Run
              </button>
            </Panel>

            <Controls className="bg-surface border-border [&>button]:border-border [&>button]:bg-surface [&>button]:fill-slate-400 [&>button:hover]:bg-background" />
            <MiniMap nodeColor={n => NODE_DEFS[n.type]?.color || '#334155'} maskColor="rgba(6,19,15,0.8)"
              className="bg-surface border border-border" />
            <Background variant="dots" gap={20} size={1} color="#1D3A31" />
          </ReactFlow>

          {/* Node settings panel */}
          {renderSettings()}
        </div>

        {/* Execution log panel */}
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
    </div>
  );
};

export default FlowBuilder;
