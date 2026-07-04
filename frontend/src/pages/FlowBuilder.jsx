import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Play, Plus, Trash2 } from 'lucide-react';
import api from '../api';

const initialNodes = [
  {
    id: '1',
    position: { x: 250, y: 100 },
    data: { label: 'Webhook Trigger', pluginType: 'webhook_trigger' },
    type: 'default'
  },
];
const initialEdges = [];

const parseFlowJson = (value, fallback) => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error('Invalid saved flow JSON', error);
    return fallback;
  }
};

const FlowBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flows, setFlows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentFlowId, setCurrentFlowId] = useState(null);
  const [flowName, setFlowName] = useState('New Flow');
  const [flowSessionId, setFlowSessionId] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [testVariables, setTestVariables] = useState('{\n  "sender": "",\n  "message": "Hello",\n  "webhookPayload": {}\n}');

  useEffect(() => {
    fetchFlows();
    fetchSessions();
  }, []);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;

  const fetchFlows = async () => {
    try {
      const res = await api.get('/flows');
      setFlows(res.data);
    } catch (error) {
      console.error('Error fetching flows', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/session');
      setSessions(res.data);
    } catch (error) {
      console.error('Error fetching sessions', error);
    }
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const saveFlow = async () => {
    const payload = {
      name: flowName,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
      isActive: true,
      sessionId: flowSessionId || null
    };

    try {
      if (currentFlowId) {
        await api.put(`/flows/${currentFlowId}`, payload);
        alert('Flow updated successfully');
      } else {
        const res = await api.post('/flows', payload);
        setCurrentFlowId(res.data.id);
        alert('Flow created successfully');
      }
      fetchFlows();
    } catch (error) {
      alert(error.response?.data?.error || 'Error saving flow');
    }
  };

  const loadFlow = (flow) => {
    setCurrentFlowId(flow.id);
    setFlowName(flow.name);
    setFlowSessionId(flow.sessionId || '');
    setNodes(parseFlowJson(flow.nodes, initialNodes));
    setEdges(parseFlowJson(flow.edges, initialEdges));
    setSelectedNodeId(null);
  };

  const createNewFlow = () => {
    setCurrentFlowId(null);
    setFlowName('New Flow');
    setFlowSessionId('');
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId(null);
  };

  const runFlow = async () => {
    if (!currentFlowId) return alert('Save flow first!');
    try {
      const variables = JSON.parse(testVariables || '{}');
      await api.post(`/flows/run/${currentFlowId}`, { variables });
      alert('Flow execution triggered (check console/logs)');
    } catch (error) {
      alert(error.response?.data?.error || error.message || 'Error running flow');
    }
  };

  const defaultDataForNode = (type, label) => {
    const base = { label, pluginType: type };
    if (type === 'send_message') return { ...base, text: 'Hello {{sender}}', to: '{{sender}}', sessionId: '' };
    if (type === 'ai_chat') return { ...base, prompt: '{{message}}', provider: 'openai', model: 'gpt-4o' };
    return base;
  };

  const addNode = (type, label) => {
    const newNode = {
      id: `node_${Date.now()}`,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: defaultDataForNode(type, label),
      type: 'default' // Add custom types later
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(newNode.id);
  };

  const updateSelectedNodeData = (key, value) => {
    if (!selectedNodeId) return;
    setNodes((current) => current.map((node) => (
      node.id === selectedNodeId
        ? { ...node, data: { ...node.data, [key]: value } }
        : node
    )));
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar for Flows List and Nodes Palette */}
      <div className="w-[340px] bg-surface border-r border-border flex flex-col shrink-0 relative z-10">
        <div className="p-4 border-b border-border">
          <button 
            onClick={createNewFlow}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-primary/20"
          >
            <Plus size={18} /> New Flow
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Saved Flows</h3>
          <div className="space-y-2 mb-8">
            {flows.map(f => (
              <div 
                key={f.id} 
                onClick={() => loadFlow(f)}
                className={`p-3 rounded-lg cursor-pointer transition ${currentFlowId === f.id ? 'bg-primary/20 border-primary border' : 'bg-background border border-border hover:border-slate-600'}`}
              >
                <div className={`font-medium ${currentFlowId === f.id ? 'text-white' : 'text-slate-300'}`}>{f.name}</div>
                <div className="flex items-center space-x-2 text-[10px] uppercase font-bold tracking-wider mt-1.5">
                  <span className={f.isActive ? 'text-success' : 'text-slate-500'}>{f.isActive ? 'Active' : 'Draft'}</span>
                </div>
              </div>
            ))}
            {flows.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4">No saved flows.</div>
            )}
          </div>

          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Flow Session</h3>
          <select
            value={flowSessionId}
            onChange={(e) => setFlowSessionId(e.target.value)}
            className="w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 mb-8"
          >
            <option value="">Use node session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>{session.name} ({session.status})</option>
            ))}
          </select>

          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Nodes</h3>
          <div className="space-y-2">
            <button onClick={() => addNode('webhook_trigger', 'Webhook Trigger')} className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary bg-background text-sm font-medium text-slate-300 hover:text-white transition group">
              <span>Webhook Trigger</span>
              <Plus size={14} className="text-slate-500 group-hover:text-primary" />
            </button>
            <button onClick={() => addNode('send_message', 'Send Message')} className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary bg-background text-sm font-medium text-slate-300 hover:text-white transition group">
              <span>Send Message</span>
              <Plus size={14} className="text-slate-500 group-hover:text-primary" />
            </button>
            <button onClick={() => addNode('ai_chat', 'AI Chat')} className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary bg-background text-sm font-medium text-slate-300 hover:text-white transition group">
              <span>AI Chat</span>
              <Plus size={14} className="text-slate-500 group-hover:text-primary" />
            </button>
          </div>

          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-8 mb-3">Test Variables</h3>
          <textarea
            value={testVariables}
            onChange={(e) => setTestVariables(e.target.value)}
            rows={7}
            className="w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 font-mono text-xs"
          />
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          colorMode="dark"
          fitView
        >
          <Panel position="top-left" className="bg-surface p-2 rounded-lg border border-border flex items-center gap-4 m-4">
            <input 
              type="text" 
              value={flowName} 
              onChange={(e) => setFlowName(e.target.value)}
              className="border-none bg-transparent text-sm font-bold outline-none text-white w-48 focus:ring-0 placeholder:text-slate-600"
              placeholder="Flow Name"
            />
          </Panel>
          <Panel position="top-right" className="flex gap-2 m-4">
            <button 
              onClick={saveFlow}
              className="bg-surface border border-border text-slate-300 px-4 py-2 rounded-lg hover:text-white hover:bg-surface-hover transition flex items-center gap-2 text-sm font-medium"
            >
              <Save size={16} /> Save
            </button>
            <button 
              onClick={runFlow}
              className="bg-success text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-600 transition flex items-center gap-2 text-sm font-medium shadow-success/20"
            >
              <Play size={16} /> Test Run
            </button>
          </Panel>
          <Controls className="bg-surface border-border fill-white" />
          <MiniMap 
            nodeColor="#25D366" 
            maskColor="rgba(10, 13, 20, 0.7)" 
            className="bg-surface border border-border" 
          />
          <Background variant="dots" gap={16} size={1} color="#1E2532" />
        </ReactFlow>
        {selectedNode && (
          <div className="absolute top-20 right-4 w-[360px] bg-surface border border-border rounded-xl shadow-2xl p-4 z-20">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-xs uppercase text-slate-500 font-semibold">Node Settings</div>
                <div className="text-white font-semibold mt-1">{selectedNode.data.label}</div>
              </div>
              <button onClick={deleteSelectedNode} className="text-danger hover:bg-danger/10 rounded-lg p-2">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-slate-500 uppercase">Label</span>
                <input
                  value={selectedNode.data.label || ''}
                  onChange={(e) => updateSelectedNodeData('label', e.target.value)}
                  className="mt-1 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50"
                />
              </label>

              {selectedNode.data.pluginType === 'send_message' && (
                <>
                  <label className="block">
                    <span className="text-xs text-slate-500 uppercase">Session</span>
                    <select
                      value={selectedNode.data.sessionId || ''}
                      onChange={(e) => updateSelectedNodeData('sessionId', e.target.value)}
                      className="mt-1 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50"
                    >
                      <option value="">Use flow session</option>
                      {sessions.map((session) => (
                        <option key={session.id} value={session.sessionId}>{session.name} ({session.status})</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500 uppercase">Recipient JID</span>
                    <input
                      value={selectedNode.data.to || ''}
                      onChange={(e) => updateSelectedNodeData('to', e.target.value)}
                      placeholder="{{sender}} or 923...@s.whatsapp.net"
                      className="mt-1 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500 uppercase">Message Text</span>
                    <textarea
                      value={selectedNode.data.text || ''}
                      onChange={(e) => updateSelectedNodeData('text', e.target.value)}
                      rows={4}
                      placeholder="Hello {{sender}}"
                      className="mt-1 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50"
                    />
                  </label>
                </>
              )}

              {selectedNode.data.pluginType === 'ai_chat' && (
                <>
                  <label className="block">
                    <span className="text-xs text-slate-500 uppercase">Provider</span>
                    <select
                      value={selectedNode.data.provider || 'openai'}
                      onChange={(e) => updateSelectedNodeData('provider', e.target.value)}
                      className="mt-1 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Gemini</option>
                      <option value="ollama">Ollama</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500 uppercase">Model</span>
                    <input
                      value={selectedNode.data.model || 'gpt-4o'}
                      onChange={(e) => updateSelectedNodeData('model', e.target.value)}
                      className="mt-1 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500 uppercase">Prompt</span>
                    <textarea
                      value={selectedNode.data.prompt || ''}
                      onChange={(e) => updateSelectedNodeData('prompt', e.target.value)}
                      rows={5}
                      placeholder="Reply to: {{message}}"
                      className="mt-1 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50"
                    />
                  </label>
                </>
              )}

              {selectedNode.data.pluginType === 'webhook_trigger' && (
                <div className="text-sm text-slate-400 bg-background border border-border rounded-lg p-3">
                  Trigger this flow with <code className="text-primary">POST /api/webhook/{currentFlowId || ':flowId'}</code>.
                </div>
              )}

              <div className="text-xs text-slate-500">
                Variables support dot paths, for example <code>{'{{webhookPayload.sender}}'}</code>.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowBuilder;
