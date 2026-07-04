import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot, Play, MessageSquare, MessagesSquare, Megaphone, Webhook, Code2,
  Cpu, Puzzle, Folder, BarChart2, Settings, Globe, FileText, Plus, Trash2,
  RefreshCw, Save, Send, Upload, Power, Copy, CheckCircle2, XCircle, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { API_BASE_URL } from '../config';
import api from '../api';

const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';

const Page = ({ title, description, icon: Icon, actions, children }) => (
  <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <Icon size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <p className="text-slate-400 text-sm mt-1">{description}</p>
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

const Panel = ({ title, children, className = '' }) => (
  <section className={`bg-surface border border-border rounded-xl p-5 ${className}`}>
    {title && <h2 className="text-base font-semibold text-white mb-4">{title}</h2>}
    {children}
  </section>
);

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const styles = {
    primary: 'bg-primary hover:bg-primary-hover text-white shadow-primary/20',
    secondary: 'bg-background border border-border text-slate-300 hover:text-white hover:border-slate-600',
    danger: 'bg-danger-bg text-danger hover:bg-danger/20',
    success: 'bg-success text-white hover:bg-emerald-600'
  };
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = (props) => (
  <input {...props} className={`w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 placeholder:text-slate-600 ${props.className || ''}`} />
);

const Textarea = (props) => (
  <textarea {...props} className={`w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 placeholder:text-slate-600 ${props.className || ''}`} />
);

const Select = (props) => (
  <select {...props} className={`w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 ${props.className || ''}`} />
);

const Empty = ({ text = 'No records found.' }) => (
  <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-border rounded-lg">{text}</div>
);

const StatusPill = ({ status }) => {
  const upper = String(status || 'UNKNOWN').toUpperCase();
  const cls = upper.includes('CONNECTED') || upper.includes('COMPLETED') || upper === 'ACTIVE'
    ? 'bg-success-bg text-success'
    : upper.includes('FAILED') || upper.includes('DISABLED')
      ? 'bg-danger-bg text-danger'
      : 'bg-warning/20 text-warning';
  return <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>{upper}</span>;
};

const useResource = (path, initial = []) => {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(path);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [path]);
  return { data, setData, loading, error, load };
};

const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    api.get('/session').then((res) => setSessions(res.data)).catch(() => setSessions([]));
  }, []);
  return sessions;
};

export const AgentsPage = () => {
  const { data: agents, loading, error, load } = useResource('/modules/agents');
  const [form, setForm] = useState({ name: '', description: '', provider: 'openai', model: 'gpt-4o', systemPrompt: 'You are a helpful WhatsApp assistant.', temperature: 0.7 });

  const save = async () => {
    await api.post('/modules/agents', form);
    setForm({ ...form, name: '', description: '' });
    load();
  };

  const toggle = async (agent) => {
    await api.put(`/modules/agents/${agent.id}`, { isActive: !agent.isActive });
    load();
  };

  const remove = async (agent) => {
    await api.delete(`/modules/agents/${agent.id}`);
    load();
  };

  return (
    <Page title="AI Agents" description="Create reusable agent profiles for AI-powered WhatsApp flows." icon={Bot}>
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
        <Panel title="Create Agent">
          <div className="space-y-3">
            <Input placeholder="Agent name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="ollama">Ollama</option>
              </Select>
              <Input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <Textarea rows={5} placeholder="System prompt" value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} />
            <Input type="number" min="0" max="2" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
            <Button onClick={save} disabled={!form.name}><Plus size={16} /> Create Agent</Button>
          </div>
        </Panel>
        <Panel title="Agents">
          {error && <div className="text-danger text-sm mb-3">{error}</div>}
          {loading ? <Empty text="Loading agents..." /> : agents.length === 0 ? <Empty /> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="bg-background border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-semibold">{agent.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">{agent.description || 'No description'}</p>
                    </div>
                    <StatusPill status={agent.isActive ? 'active' : 'disabled'} />
                  </div>
                  <div className="text-xs text-slate-500 mt-4">{agent.provider} / {agent.model} / temp {agent.temperature}</div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="secondary" onClick={() => toggle(agent)}><Power size={14} /> Toggle</Button>
                    <Button variant="danger" onClick={() => remove(agent)}><Trash2 size={14} /> Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </Page>
  );
};

export const ExecutionsPage = () => {
  const { data, loading, error, load } = useResource('/modules/executions');
  const [selected, setSelected] = useState(null);
  return (
    <Page title="Executions" description="Inspect flow run history and node-level execution logs." icon={Play} actions={<Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5">
        <Panel title="Recent Executions">
          {error && <div className="text-danger text-sm mb-3">{error}</div>}
          {loading ? <Empty text="Loading executions..." /> : data.length === 0 ? <Empty /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase">
                  <tr><th className="text-left p-3">Flow</th><th className="text-left p-3">Status</th><th className="text-left p-3">Started</th><th className="text-right p-3">Logs</th></tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} onClick={() => setSelected(item)} className="border-t border-border hover:bg-background cursor-pointer">
                      <td className="p-3 text-white">{item.Flow?.name || item.flowId}</td>
                      <td className="p-3"><StatusPill status={item.status} /></td>
                      <td className="p-3 text-slate-400">{formatDate(item.createdAt)}</td>
                      <td className="p-3 text-right text-slate-400">{item.logs?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Execution Logs">
          {!selected ? <Empty text="Select an execution to inspect logs." /> : (
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-400">Status</span><StatusPill status={selected.status} /></div>
              <div className="text-xs text-slate-500 break-all">{selected.id}</div>
              <div className="space-y-2">
                {(selected.logs || []).map((log, index) => (
                  <div key={index} className="bg-background border border-border rounded-lg p-3">
                    <div className="flex justify-between gap-3"><StatusPill status={log.status} /><span className="text-xs text-slate-500">{formatDate(log.time)}</span></div>
                    <div className="text-sm text-slate-300 mt-2">{log.plugin || log.message || 'Execution step'}</div>
                    {log.error && <div className="text-sm text-danger mt-1">{log.error}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Page>
  );
};

export const ConversationsPage = () => {
  const { data: conversations, load } = useResource('/modules/conversations');
  const sessions = useSessions();
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState({ sessionId: '', text: '' });

  const open = async (conversation) => {
    setSelected(conversation);
    const res = await api.get(`/modules/messages?remoteJid=${encodeURIComponent(conversation.remoteJid)}`);
    setMessages(res.data.reverse());
  };

  const sendReply = async () => {
    if (!selected || !reply.text) return;
    await api.post('/modules/messages', { sessionId: reply.sessionId || undefined, to: selected.remoteJid, text: reply.text });
    setReply({ ...reply, text: '' });
    open(selected);
    load();
  };

  return (
    <Page title="Conversations" description="Group messages by WhatsApp contact and reply from a connected session." icon={MessageSquare}>
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        <Panel title="Contacts">
          {conversations.length === 0 ? <Empty /> : conversations.map((item) => (
            <button key={item.remoteJid} onClick={() => open(item)} className={`w-full text-left p-3 rounded-lg border mb-2 ${selected?.remoteJid === item.remoteJid ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-slate-600'}`}>
              <div className="text-white text-sm font-medium">{item.remoteJid}</div>
              <div className="text-xs text-slate-400 truncate mt-1">{item.lastText || 'No text'}</div>
              <div className="text-[10px] text-slate-500 mt-2">{item.messageCount} messages</div>
            </button>
          ))}
        </Panel>
        <Panel title={selected ? selected.remoteJid : 'Conversation'}>
          {!selected ? <Empty text="Select a contact to view the conversation." /> : (
            <div className="space-y-4">
              <div className="h-[420px] overflow-y-auto bg-background border border-border rounded-lg p-4 space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="max-w-[80%] bg-surface border border-border rounded-lg p-3">
                    <div className="text-sm text-slate-200">{message.text || '(empty message)'}</div>
                    <div className="text-[10px] text-slate-500 mt-2">{formatDate(message.createdAt)}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-3">
                <Select value={reply.sessionId} onChange={(e) => setReply({ ...reply, sessionId: e.target.value })}>
                  <option value="">Record only</option>
                  {sessions.map((session) => <option key={session.id} value={session.sessionId}>{session.name}</option>)}
                </Select>
                <Input placeholder="Reply text" value={reply.text} onChange={(e) => setReply({ ...reply, text: e.target.value })} />
                <Button onClick={sendReply}><Send size={16} /> Send</Button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Page>
  );
};

export const MessagesPage = () => {
  const { data: messages, load } = useResource('/modules/messages');
  const sessions = useSessions();
  const [form, setForm] = useState({ sessionId: '', to: '', type: 'text', text: '', payload: '{}' });
  const [schedule, setSchedule] = useState({ delayMs: '', scheduledTime: '' });
  const [autoReplyRules, setAutoReplyRules] = useState('[]');
  const [utility, setUtility] = useState({ action: 'search', value: '', result: '' });
  useEffect(() => {
    api.get('/modules/auto-replies')
      .then((res) => setAutoReplyRules(JSON.stringify(res.data, null, 2)))
      .catch(() => setAutoReplyRules('[]'));
  }, []);
  const parsePayload = () => {
    try {
      return form.payload ? JSON.parse(form.payload) : {};
    } catch {
      alert('Payload JSON is invalid');
      return null;
    }
  };
  const send = async () => {
    const payload = parsePayload();
    if (!payload) return;
    await api.post('/modules/messages', { ...payload, ...form, sessionId: form.sessionId || undefined });
    setForm({ ...form, text: '' });
    load();
  };
  const scheduleMessage = async () => {
    const payload = parsePayload();
    if (!payload) return;
    await api.post('/modules/scheduler', {
      ...payload,
      ...form,
      delayMs: schedule.delayMs || undefined,
      scheduledTime: schedule.scheduledTime || undefined
    });
    setSchedule({ delayMs: '', scheduledTime: '' });
  };
  const saveAutoReplies = async () => {
    try {
      await api.put('/modules/auto-replies', { rules: JSON.parse(autoReplyRules) });
      alert('Auto-reply rules saved');
    } catch {
      alert('Auto-reply JSON is invalid');
    }
  };
  const runUtility = async () => {
    const action = utility.action;
    let res;
    if (action === 'search') res = await api.get(`/modules/search?q=${encodeURIComponent(utility.value)}`);
    if (action === 'deleted') res = await api.get('/modules/deleted-messages');
    if (action === 'jid') res = await api.post('/modules/jid/plot', { value: utility.value });
    if (action === 'typing') res = await api.post('/modules/typing', { sessionId: form.sessionId, jid: form.to, duration: 1500 });
    if (action === 'vcard') res = await api.post('/modules/vcard', { fullName: utility.value || 'Contact', phones: [{ number: form.to }] });
    if (action === 'status') res = await api.post('/modules/status', { sessionId: form.sessionId, type: 'text', text: utility.value || form.text });
    if (action === 'group') res = await api.post('/modules/groups', { sessionId: form.sessionId, action: 'metadata', jid: utility.value });
    if (action === 'privacy') res = await api.post('/modules/privacy', { sessionId: form.sessionId, action: 'settings' });
    setUtility({ ...utility, result: JSON.stringify(res?.data, null, 2) });
  };
  return (
    <Page title="Messages" description="Send all supported Baileys message types and manage messaging automation." icon={MessagesSquare}>
      <Panel title="Send Message" className="mb-5">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_180px_2fr_auto] gap-3">
          <Select value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })}>
            <option value="">Record only</option>
            {sessions.map((session) => <option key={session.id} value={session.sessionId}>{session.name}</option>)}
          </Select>
          <Input placeholder="Recipient JID" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {['text', 'template', 'markdown', 'code', 'image', 'video', 'gif', 'audio', 'document', 'sticker', 'location', 'contact', 'contacts', 'poll', 'buttons', 'urlButtons', 'copyButton', 'combinedButtons', 'list', 'nativeFlow', 'richMessage', 'product', 'shop', 'collection', 'payment', 'raw'].map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Input placeholder="Message text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <Button onClick={send} disabled={!form.to || (!form.text && form.payload === '{}')}><Send size={16} /> Send</Button>
        </div>
        <Textarea className="mt-3 font-mono text-xs" rows={5} value={form.payload} onChange={(e) => setForm({ ...form, payload: e.target.value })} placeholder='Extra JSON, for example {"url":"https://...","caption":"Hello"}' />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 mt-3">
          <Input placeholder="Delay ms" value={schedule.delayMs} onChange={(e) => setSchedule({ ...schedule, delayMs: e.target.value })} />
          <Input type="datetime-local" value={schedule.scheduledTime} onChange={(e) => setSchedule({ ...schedule, scheduledTime: e.target.value })} />
          <Button variant="secondary" onClick={scheduleMessage} disabled={!form.sessionId || !form.to}><Play size={16} /> Schedule</Button>
        </div>
      </Panel>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <Panel title="Auto Reply Rules">
          <Textarea rows={8} className="font-mono text-xs" value={autoReplyRules} onChange={(e) => setAutoReplyRules(e.target.value)} placeholder='[{"keywords":["hi"],"response":{"type":"text","text":"Hello!"},"cooldown":3000,"active":true}]' />
          <Button className="mt-3" onClick={saveAutoReplies}><Save size={16} /> Save Rules</Button>
        </Panel>
        <Panel title="Utilities">
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3">
            <Select value={utility.action} onChange={(e) => setUtility({ ...utility, action: e.target.value })}>
              {['search', 'deleted', 'jid', 'typing', 'vcard', 'status', 'group', 'privacy'].map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Input placeholder="Query, JID, group JID, or status text" value={utility.value} onChange={(e) => setUtility({ ...utility, value: e.target.value })} />
            <Button variant="secondary" onClick={runUtility}><RefreshCw size={16} /> Run</Button>
          </div>
          <Textarea rows={8} readOnly className="mt-3 font-mono text-xs" value={utility.result} placeholder="Utility result" />
        </Panel>
      </div>
      <Panel title="Message Log">
        {messages.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Contact</th><th className="text-left p-3">Text</th><th className="text-left p-3">Sender</th><th className="text-left p-3">Time</th></tr></thead>
              <tbody>{messages.map((message) => <tr key={message.id} className="border-t border-border"><td className="p-3 text-white">{message.remoteJid}</td><td className="p-3 text-slate-300">{message.text}</td><td className="p-3 text-slate-400">{message.sender}</td><td className="p-3 text-slate-500">{formatDate(message.createdAt)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </Page>
  );
};

export const BroadcastPage = () => {
  const { data: broadcasts, load } = useResource('/modules/broadcasts');
  const sessions = useSessions();
  const [form, setForm] = useState({ name: '', sessionId: '', recipients: '', text: '' });
  const create = async () => {
    await api.post('/modules/broadcasts', form);
    setForm({ name: '', sessionId: '', recipients: '', text: '' });
    load();
  };
  const run = async (broadcast) => {
    await api.post(`/modules/broadcasts/${broadcast.id}/run`);
    load();
  };
  const remove = async (broadcast) => {
    await api.delete(`/modules/broadcasts/${broadcast.id}`);
    load();
  };
  return (
    <Page title="Broadcast" description="Create and run bulk WhatsApp message campaigns." icon={Megaphone}>
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
        <Panel title="New Broadcast">
          <div className="space-y-3">
            <Input placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })}>
              <option value="">Dry run / no sending</option>
              {sessions.map((session) => <option key={session.id} value={session.sessionId}>{session.name}</option>)}
            </Select>
            <Textarea rows={5} placeholder="Recipients, one JID per line" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} />
            <Textarea rows={4} placeholder="Message text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
            <Button onClick={create} disabled={!form.name || !form.text}><Plus size={16} /> Create</Button>
          </div>
        </Panel>
        <Panel title="Campaigns">
          {broadcasts.length === 0 ? <Empty /> : <div className="space-y-3">{broadcasts.map((item) => (
            <div key={item.id} className="bg-background border border-border rounded-lg p-4">
              <div className="flex justify-between gap-3"><div><h3 className="text-white font-semibold">{item.name}</h3><p className="text-sm text-slate-400 mt-1">{item.text}</p></div><StatusPill status={item.status} /></div>
              <div className="text-xs text-slate-500 mt-3">{item.recipients.length} recipients</div>
              <div className="flex gap-2 mt-4"><Button variant="success" onClick={() => run(item)}><Play size={14} /> Run</Button><Button variant="danger" onClick={() => remove(item)}><Trash2 size={14} /> Delete</Button></div>
            </div>
          ))}</div>}
        </Panel>
      </div>
    </Page>
  );
};

const CodeBlock = ({ code, lang = 'bash' }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative bg-[#06130F] border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-[10px] uppercase text-slate-500 tracking-wider font-bold">{lang}</span>
        <button onClick={copy} className="text-xs text-slate-500 hover:text-white transition flex items-center gap-1.5">
          {copied ? <><CheckCircle2 size={11} className="text-success" /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre className="p-4 text-xs text-slate-300 overflow-x-auto leading-relaxed font-mono">{code}</pre>
    </div>
  );
};

export const WebhooksPage = () => {
  const { data, load } = useResource('/modules/webhooks');
  const [testResult, setTestResult] = useState({});
  const [testBody, setTestBody] = useState('{\n  "sender": "923001234567@s.whatsapp.net",\n  "message": "Hello"\n}');
  const fullUrl = (path) => `${API_BASE_URL.replace(/\/api\/?$/, '')}${path}`;

  const testWebhook = async (item) => {
    setTestResult({ [item.id]: { loading: true } });
    try {
      let body = {};
      try { body = JSON.parse(testBody); } catch { /* ignore */ }
      // item.url is e.g. /api/webhook/:flowId — use fullUrl to avoid baseURL double-encoding
      const res = await fetch(fullUrl(item.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      setTestResult({ [item.id]: { ok: res.ok, data: JSON.stringify(data, null, 2) } });
    } catch (err) {
      setTestResult({ [item.id]: { ok: false, data: err.message } });
    }
  };

  return (
    <Page title="Webhooks" description="Trigger active flows from external systems using generated webhook URLs." icon={Webhook} actions={<Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 mb-5">
        <div className="space-y-5">
          {/* Flow webhook list */}
          <Panel title="Flow Webhooks">
            {data.length === 0 ? <Empty text="Create and save a flow first to generate its webhook URL." /> : (
              <div className="space-y-4">
                {data.map((item) => {
                  const url = fullUrl(item.url);
                  const curlExample = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${testBody.replace(/\n/g, ' ')}'`;
                  const jsExample = `await fetch("${url}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(${testBody})\n});`;
                  const res = testResult[item.id];
                  return (
                    <div key={item.id} className="bg-background border border-border rounded-xl p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-white font-semibold">{item.name}</h3>
                          <code className="text-xs text-slate-400 mt-1 block break-all">{url}</code>
                        </div>
                        <StatusPill status={item.isActive ? 'active' : 'disabled'} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(url)}><Copy size={13} /> Copy URL</Button>
                        <Button variant="secondary" onClick={() => testWebhook(item)}><Play size={13} /> Test</Button>
                      </div>
                      {res && (
                        <div className={`rounded-lg border p-3 text-xs font-mono ${res.loading ? 'border-border text-slate-500' : res.ok ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'}`}>
                          {res.loading ? 'Sending…' : res.data}
                        </div>
                      )}
                      <details className="group">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 list-none flex items-center gap-1">
                          <ChevronRight size={11} className="group-open:rotate-90 transition" /> Code examples
                        </summary>
                        <div className="mt-3 space-y-3">
                          <CodeBlock lang="curl" code={curlExample} />
                          <CodeBlock lang="javascript" code={jsExample} />
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Test payload editor */}
          <Panel title="Test Payload">
            <p className="text-sm text-slate-400 mb-3">JSON body sent when you click <strong className="text-white">Test</strong> on a webhook above.</p>
            <Textarea rows={6} className="font-mono text-xs" value={testBody} onChange={(e) => setTestBody(e.target.value)} />
          </Panel>
        </div>

        {/* Docs sidebar */}
        <div className="space-y-5">
          <Panel title="Payload Reference">
            <div className="space-y-3 text-sm">
              <p className="text-slate-400">Every webhook accepts a JSON body. The fields are mapped to flow template variables automatically.</p>
              <div className="space-y-1.5">
                {[
                  ['{{sender}}', 'WhatsApp JID of the contact (set this to simulate a real trigger)'],
                  ['{{message}}', 'Plain-text message body'],
                  ['{{messageId}}', 'Unique message ID'],
                  ['{{webhookPayload.*}}', 'Any field in the POST body, e.g. {{webhookPayload.type}}'],
                  ['{{httpResponse}}', 'Body from the last HTTP Request node'],
                  ['{{aiResponse}}', 'Text from the last AI Chat node'],
                  ['{{formattedText}}', 'Output of the last Text Formatter node'],
                ].map(([v, d]) => (
                  <div key={v} className="bg-background border border-border rounded-lg p-2.5">
                    <code className="text-primary text-xs">{v}</code>
                    <p className="text-xs text-slate-500 mt-0.5">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Security">
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <span className="text-warning text-lg">⚠</span>
                <p>Webhook URLs are <strong className="text-white">public by path</strong>. Anyone who knows the URL can trigger the flow.</p>
              </div>
              <ul className="space-y-2 list-disc list-inside text-slate-400">
                <li>Keep flow IDs out of public repos</li>
                <li>Add a secret field in payload and check with a <strong className="text-white">Condition</strong> node</li>
                <li>Disable flows you are not actively using</li>
                <li>Rate limiting: 300 requests/min per IP applies globally</li>
              </ul>
              <CodeBlock lang="flow tip" code={`// Condition node to verify secret:\nvariable: webhookPayload.secret\noperator: equals\nvalue:    my_secret_token`} />
            </div>
          </Panel>

          <Panel title="Webhook Format">
            <CodeBlock lang="http" code={`POST /api/webhook/:flowId\nContent-Type: application/json\n\n{\n  "sender": "923001234567@s.whatsapp.net",\n  "message": "Hello",\n  "customField": "anything"\n}`} />
            <p className="text-xs text-slate-500 mt-3">Response: <code className="text-success">{'200 { "success": true }'}</code></p>
          </Panel>
        </div>
      </div>
    </Page>
  );
};

const METHOD_COLOR = { GET: 'text-emerald-400', POST: 'text-blue-400', PUT: 'text-amber-400', PATCH: 'text-orange-400', DELETE: 'text-red-400' };
const API_CATEGORIES = [
  {
    title: 'Authentication',
    endpoints: [
      { method: 'POST', route: '/api/auth/login', description: 'Login with username + password → returns JWT token', request: '{ "username": "admin", "password": "changeme" }', response: '{ "token": "eyJ..." }' },
      { method: 'GET',  route: '/api/auth/me',    description: 'Get current authenticated user info', response: '{ "username": "admin" }' },
    ]
  },
  {
    title: 'Flows',
    endpoints: [
      { method: 'GET',    route: '/api/flows',              description: 'List all flows' },
      { method: 'POST',   route: '/api/flows',              description: 'Create a new flow', request: '{ "name": "My Flow", "nodes": "[]", "edges": "[]", "isActive": true, "sessionId": null }' },
      { method: 'GET',    route: '/api/flows/:id',          description: 'Get flow by ID' },
      { method: 'PUT',    route: '/api/flows/:id',          description: 'Update a flow' },
      { method: 'DELETE', route: '/api/flows/:id',          description: 'Delete a flow' },
      { method: 'POST',   route: '/api/flows/run/:id',      description: 'Test-run a flow with custom variables', request: '{ "variables": { "sender": "...", "message": "hi" } }', response: '{ "success": true }' },
      { method: 'POST',   route: '/api/webhook/:flowId',    description: 'Trigger flow externally (no auth required)', request: '{ "sender": "...", "message": "..." }' },
    ]
  },
  {
    title: 'Sessions',
    endpoints: [
      { method: 'GET',    route: '/api/session',            description: 'List WhatsApp sessions' },
      { method: 'POST',   route: '/api/session',            description: 'Create a new session', request: '{ "name": "My Phone", "sessionId": "mysession" }' },
      { method: 'GET',    route: '/api/session/:id/qr',     description: 'Get current QR code for a session' },
      { method: 'DELETE', route: '/api/session/:id',        description: 'Delete and disconnect a session' },
      { method: 'POST',   route: '/api/session/:id/logout', description: 'Logout a session without deleting it' },
    ]
  },
  {
    title: 'Messages & Broadcast',
    endpoints: [
      { method: 'POST',   route: '/api/modules/messages',   description: 'Send a WhatsApp message', request: '{ "sessionId": "...", "to": "923...@s.whatsapp.net", "type": "text", "text": "Hello!" }' },
      { method: 'GET',    route: '/api/modules/messages',   description: 'List stored messages' },
      { method: 'GET',    route: '/api/modules/conversations', description: 'List grouped conversations' },
      { method: 'POST',   route: '/api/modules/broadcasts', description: 'Create broadcast campaign' },
      { method: 'POST',   route: '/api/modules/broadcasts/:id/run', description: 'Execute a broadcast campaign' },
    ]
  },
  {
    title: 'AI & Agents',
    endpoints: [
      { method: 'GET',    route: '/api/modules/agents',     description: 'List AI agents' },
      { method: 'POST',   route: '/api/modules/agents',     description: 'Create AI agent', request: '{ "name": "Support Bot", "provider": "openai", "model": "gpt-4o", "systemPrompt": "..." }' },
      { method: 'GET',    route: '/api/modules/providers',  description: 'List configured AI providers' },
      { method: 'PUT',    route: '/api/modules/providers/:id', description: 'Update provider config / API key' },
    ]
  },
  {
    title: 'Executions & Analytics',
    endpoints: [
      { method: 'GET',    route: '/api/modules/executions', description: 'List recent flow executions with logs' },
      { method: 'GET',    route: '/api/modules/analytics',  description: 'Totals and messages-per-day chart data' },
    ]
  },
];

export const ApiPage = () => {
  const { data } = useResource('/modules/api-docs', { endpoints: [] });
  const baseUrl = data.baseUrl || (window.location.origin + '/api');
  const [openSections, setOpenSections] = useState({ Authentication: true, Flows: true });
  const toggleSection = (title) => setOpenSections(p => ({ ...p, [title]: !p[title] }));

  const curlExample = (ep) => {
    const url = `${baseUrl.replace(/\/api$/, '')}${ep.route}`;
    const auth = `-H "Authorization: Bearer $TOKEN" \\`;
    const body = ep.request ? `\n  -H "Content-Type: application/json" \\\n  -d '${ep.request}'` : '';
    return `curl -X ${ep.method} "${url}" \\\n  ${auth}${body}`;
  };

  const jsExample = (ep) => {
    const url = `${baseUrl.replace(/\/api$/, '')}${ep.route}`;
    const body = ep.request ? `,\n  body: JSON.stringify(${ep.request})` : '';
    return `const res = await fetch("${url}", {\n  method: "${ep.method}",\n  headers: {\n    "Authorization": "Bearer " + token,\n    "Content-Type": "application/json"\n  }${body}\n});\nconst data = await res.json();`;
  };

  const pyExample = (ep) => {
    const url = `${baseUrl.replace(/\/api$/, '')}${ep.route}`;
    const body = ep.request ? `, json=${ep.request}` : '';
    return `import requests\nheaders = {"Authorization": f"Bearer {token}"}\nres = requests.${ep.method.toLowerCase()}("${url}", headers=headers${body})\nprint(res.json())`;
  };

  return (
    <Page title="REST API" description="Complete reference for all endpoints exposed by this WAAI Flow instance." icon={Code2}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          {/* Auth section */}
          <Panel title="Authentication">
            <div className="space-y-4 text-sm text-slate-400">
              <p>All endpoints except <code className="text-primary">/api/auth/login</code> and <code className="text-primary">/api/webhook/:flowId</code> require a Bearer token.</p>
              <CodeBlock lang="step 1 — login" code={`curl -X POST "${baseUrl}/auth/login" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "username": "admin", "password": "changeme" }'\n# → { "token": "eyJ..." }`} />
              <CodeBlock lang="step 2 — use token" code={`export TOKEN="eyJ..."\ncurl "${baseUrl}/flows" \\\n  -H "Authorization: Bearer $TOKEN"`} />
            </div>
          </Panel>

          {/* Endpoint categories */}
          {API_CATEGORIES.map((cat) => (
            <Panel key={cat.title}>
              <button onClick={() => toggleSection(cat.title)} className="w-full flex items-center justify-between gap-2 mb-1 group">
                <h2 className="text-base font-semibold text-white">{cat.title}</h2>
                <ChevronRight size={15} className={`text-slate-500 transition ${openSections[cat.title] ? 'rotate-90' : ''}`} />
              </button>
              {openSections[cat.title] && (
                <div className="space-y-3 mt-4">
                  {cat.endpoints.map((ep, i) => (
                    <details key={i} className="group bg-background border border-border rounded-xl overflow-hidden">
                      <summary className="grid grid-cols-[70px_1fr] md:grid-cols-[70px_1fr_2fr] gap-3 items-center p-3 cursor-pointer list-none hover:bg-surface/40 transition">
                        <span className={`text-xs font-bold ${METHOD_COLOR[ep.method] || 'text-slate-400'}`}>{ep.method}</span>
                        <code className="text-slate-200 text-xs">{ep.route}</code>
                        <span className="text-slate-500 text-sm hidden md:block">{ep.description}</span>
                      </summary>
                      <div className="border-t border-border p-4 space-y-3">
                        <p className="text-sm text-slate-400 md:hidden">{ep.description}</p>
                        {ep.request && (
                          <>
                            <div className="text-[10px] uppercase text-slate-500 tracking-wider">Request Body</div>
                            <CodeBlock lang="json" code={ep.request} />
                          </>
                        )}
                        {ep.response && (
                          <>
                            <div className="text-[10px] uppercase text-slate-500 tracking-wider">Response</div>
                            <CodeBlock lang="json" code={ep.response} />
                          </>
                        )}
                        <div className="text-[10px] uppercase text-slate-500 tracking-wider mt-4">Examples</div>
                        <CodeBlock lang="curl" code={curlExample(ep)} />
                        <CodeBlock lang="javascript" code={jsExample(ep)} />
                        <CodeBlock lang="python" code={pyExample(ep)} />
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </Panel>
          ))}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <Panel title="Base URL">
            <CodeBlock lang="url" code={baseUrl} />
            <p className="text-xs text-slate-500 mt-3">Self-hosted — this is <strong className="text-white">your</strong> instance URL.</p>
          </Panel>

          <Panel title="Rate Limits">
            <div className="space-y-2 text-sm text-slate-400">
              <div className="bg-background border border-border rounded-lg p-3">
                <div className="text-white font-medium">Auth endpoints</div>
                <div className="text-xs mt-1">20 requests / 15 minutes per IP</div>
              </div>
              <div className="bg-background border border-border rounded-lg p-3">
                <div className="text-white font-medium">All other /api routes</div>
                <div className="text-xs mt-1">300 requests / 60 seconds per IP</div>
              </div>
              <p className="text-xs text-slate-600">Returns <code className="text-warning">429 Too Many Requests</code> when exceeded.</p>
            </div>
          </Panel>

          <Panel title="Error Format">
            <CodeBlock lang="json" code={`// All errors return:\n{\n  "error": "Human-readable message"\n}\n\n// Common status codes:\n// 400 Bad Request\n// 401 Unauthorized\n// 404 Not Found\n// 429 Rate Limited\n// 500 Internal Error`} />
          </Panel>

          <Panel title="Socket.IO Events">
            <div className="space-y-2 text-xs text-slate-400">
              <p>Connect to <code className="text-primary">ws://host</code> with <code className="text-slate-300">auth: {'{ token }'}</code>.</p>
              {[
                ['qr', 'QR code PNG base64 for a session'],
                ['session-status', 'Session connected/disconnected events'],
                ['flow-log', 'Real-time node execution events'],
              ].map(([ev, desc]) => (
                <div key={ev} className="bg-background border border-border rounded-lg p-2.5">
                  <code className="text-amber-400">{ev}</code>
                  <p className="text-slate-500 mt-0.5">{desc}</p>
                </div>
              ))}
              <CodeBlock lang="javascript" code={`import { io } from "socket.io-client";\nconst sock = io(BASE_URL, { auth: { token } });\nsock.on("flow-log", (log) => console.log(log));`} />
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  );
};

export const ProvidersPage = () => {
  const { data, load } = useResource('/modules/providers', { providers: [] });
  const [edits, setEdits] = useState({});
  const save = async (provider) => {
    await api.put(`/modules/providers/${provider.id}`, edits[provider.id] || {});
    load();
  };
  return (
    <Page title="AI Providers" description="Enable providers and configure default models or API keys." icon={Cpu}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {(data.providers || []).map((provider) => {
          const edit = edits[provider.id] || {};
          return (
            <Panel key={provider.id} title={provider.name}>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><StatusPill status={provider.enabled ? 'active' : 'disabled'} />{provider.hasApiKey ? <CheckCircle2 className="text-success" size={18} /> : <XCircle className="text-danger" size={18} />}</div>
                <Input placeholder={provider.model} value={edit.model ?? provider.model} onChange={(e) => setEdits({ ...edits, [provider.id]: { ...edit, model: e.target.value } })} />
                <Input type="password" placeholder="API key" value={edit.apiKey || ''} onChange={(e) => setEdits({ ...edits, [provider.id]: { ...edit, apiKey: e.target.value } })} />
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={edit.enabled ?? provider.enabled} onChange={(e) => setEdits({ ...edits, [provider.id]: { ...edit, enabled: e.target.checked } })} /> Enabled</label>
                <Button onClick={() => save(provider)}><Save size={16} /> Save</Button>
              </div>
            </Panel>
          );
        })}
      </div>
    </Page>
  );
};

export const PluginsPage = () => {
  const { data, load } = useResource('/modules/plugins');
  const toggle = async (plugin) => {
    await api.put(`/modules/plugins/${plugin.id}`, { isActive: !plugin.isActive });
    load();
  };
  return (
    <Page title="Plugins" description="View and enable node plugins loaded by the backend." icon={Puzzle}>
      <Panel title="Installed Plugins">
        {data.length === 0 ? <Empty /> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{data.map((plugin) => (
          <div key={plugin.id} className="bg-background border border-border rounded-lg p-4">
            <div className="flex justify-between gap-3"><h3 className="text-white font-semibold">{plugin.name}</h3><StatusPill status={plugin.isActive ? 'active' : 'disabled'} /></div>
            <p className="text-sm text-slate-400 mt-2">{plugin.description || 'Plugin'}</p>
            <Button className="mt-4" variant="secondary" onClick={() => toggle(plugin)}><Power size={14} /> Toggle</Button>
          </div>
        ))}</div>}
      </Panel>
    </Page>
  );
};

export const FilesPage = () => {
  const { data, load } = useResource('/modules/files');
  const [file, setFile] = useState(null);
  const upload = async () => {
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    await api.post('/modules/files', body);
    setFile(null);
    load();
  };
  const remove = async (item) => {
    await api.delete(`/modules/files/${item.id}`);
    load();
  };
  return (
    <Page title="Files" description="Upload and manage media assets for future message flows." icon={Folder}>
      <Panel title="Upload" className="mb-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button onClick={upload} disabled={!file}><Upload size={16} /> Upload</Button>
        </div>
      </Panel>
      <Panel title="Assets">
        {data.length === 0 ? <Empty /> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{data.map((item) => (
          <div key={item.id} className="bg-background border border-border rounded-lg p-4">
            <h3 className="text-white font-medium truncate">{item.originalName}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.mimeType} / {(item.size / 1024).toFixed(1)} KB</p>
            <Button className="mt-4" variant="danger" onClick={() => remove(item)}><Trash2 size={14} /> Delete</Button>
          </div>
        ))}</div>}
      </Panel>
    </Page>
  );
};

export const AnalyticsPage = () => {
  const { data, load } = useResource('/modules/analytics', { totals: {}, recentMessagesByDay: {} });
  const chartData = useMemo(() => Object.entries(data.recentMessagesByDay || {}).map(([name, value]) => ({ name, value })), [data]);
  return (
    <Page title="Analytics" description="Track platform totals and recent message activity." icon={BarChart2} actions={<Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>}>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-5">
        {Object.entries(data.totals || {}).map(([key, value]) => (
          <Panel key={key}><div className="text-xs uppercase text-slate-500">{key}</div><div className="text-2xl font-bold text-white mt-2">{value}</div></Panel>
        ))}
      </div>
      <Panel title="Recent Messages">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2532" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip cursor={{ fill: '#1E2532' }} />
              <Bar dataKey="value" fill="#25D366" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </Page>
  );
};

export const SettingsPage = () => {
  const { data, load } = useResource('/modules/settings', {});
  const [form, setForm] = useState({ appName: '', defaultTimezone: '', retentionDays: '30' });
  useEffect(() => {
    setForm({
      appName: data['app.name'] || data.appName || 'WAAI Flow',
      defaultTimezone: data['app.timezone'] || data.defaultTimezone || 'UTC',
      retentionDays: data['app.retentionDays'] || data.retentionDays || '30'
    });
  }, [data]);
  const save = async () => {
    await api.put('/modules/settings', {
      'app.name': form.appName,
      'app.timezone': form.defaultTimezone,
      'app.retentionDays': form.retentionDays
    });
    load();
  };
  return (
    <Page title="System Settings" description="Configure general self-hosted instance preferences." icon={Settings}>
      <Panel title="General">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="App name" value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })} />
          <Input placeholder="Timezone" value={form.defaultTimezone} onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })} />
          <Input type="number" placeholder="Retention days" value={form.retentionDays} onChange={(e) => setForm({ ...form, retentionDays: e.target.value })} />
        </div>
        <Button className="mt-4" onClick={save}><Save size={16} /> Save Settings</Button>
      </Panel>
    </Page>
  );
};

export const EnvironmentPage = () => {
  const { data, load } = useResource('/modules/env', {});
  const [form, setForm] = useState({});
  useEffect(() => setForm(data || {}), [data]);
  const save = async () => {
    await api.put('/modules/env', form);
    load();
  };
  return (
    <Page title="Environment" description="Manage runtime environment values stored in backend .env." icon={Globe}>
      <Panel title="Variables">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(form).map(([key, value]) => (
            <label key={key} className="block">
              <span className="text-xs text-slate-500 uppercase">{key}</span>
              <Input className="mt-1" value={value || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </label>
          ))}
        </div>
        <Button className="mt-4" onClick={save}><Save size={16} /> Save Environment</Button>
      </Panel>
    </Page>
  );
};

export const LogsPage = () => {
  const { data, load } = useResource('/modules/logs');
  return (
    <Page title="System Logs" description="View recent backend log events captured in memory." icon={FileText} actions={<Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>}>
      <Panel title="Recent Events">
        {data.length === 0 ? <Empty /> : <div className="space-y-2">{data.map((log, index) => (
          <div key={index} className="bg-background border border-border rounded-lg p-3 grid grid-cols-1 md:grid-cols-[180px_100px_1fr] gap-2 text-sm">
            <span className="text-slate-500">{formatDate(log.time)}</span>
            <span className="text-primary uppercase text-xs font-bold">{log.level}</span>
            <span className="text-slate-300 break-all">{log.message}</span>
          </div>
        ))}</div>}
      </Panel>
    </Page>
  );
};
