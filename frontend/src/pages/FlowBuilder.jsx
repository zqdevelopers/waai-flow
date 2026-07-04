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
import { Save, Play, Plus } from 'lucide-react';
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
  const [currentFlowId, setCurrentFlowId] = useState(null);
  const [flowName, setFlowName] = useState('New Flow');

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const res = await api.get('/flows');
      setFlows(res.data);
    } catch (error) {
      console.error('Error fetching flows', error);
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
      isActive: true
    };

    try {
      if (currentFlowId) {
        await api.put(`/flows/${currentFlowId}`, payload);
        alert('Flow updated successfully');
      } else {
        const res = await api.post('/flows', payload);
        setCurrentFlowId(res.data.id);
        fetchFlows();
        alert('Flow created successfully');
      }
    } catch (error) {
      alert('Error saving flow');
    }
  };

  const loadFlow = (flow) => {
    setCurrentFlowId(flow.id);
    setFlowName(flow.name);
    setNodes(parseFlowJson(flow.nodes, initialNodes));
    setEdges(parseFlowJson(flow.edges, initialEdges));
  };

  const createNewFlow = () => {
    setCurrentFlowId(null);
    setFlowName('New Flow');
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const runFlow = async () => {
    if (!currentFlowId) return alert('Save flow first!');
    try {
      await api.post(`/flows/run/${currentFlowId}`, { variables: {} });
      alert('Flow execution triggered (check console/logs)');
    } catch (error) {
      alert('Error running flow');
    }
  };

  const addNode = (type, label) => {
    const newNode = {
      id: `node_${Date.now()}`,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label, pluginType: type },
      type: 'default' // Add custom types later
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar for Flows List and Nodes Palette */}
      <div className="w-[300px] bg-surface border-r border-border flex flex-col shrink-0 relative z-10">
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
      </div>
    </div>
  );
};

export default FlowBuilder;
