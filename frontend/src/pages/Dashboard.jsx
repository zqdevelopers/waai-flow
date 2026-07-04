import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, GitBranch, MessageSquare, Bot, Server, RefreshCw,
  Webhook, Database, Play, FileText
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import api from '../api';

const colors = ['#25D366', '#128C7E', '#34B7F1', '#10B981', '#F59E0B', '#075E54'];

const emptyDashboard = {
  analytics: { totals: {}, recentMessagesByDay: {} },
  sessions: [],
  flows: [],
  executions: [],
  messages: [],
  providers: { providers: [] },
  webhooks: [],
  logs: []
};

const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';
const dayKey = (value) => new Date(value).toISOString().slice(0, 10);

const lastSevenDays = () => {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
};

const normalizeArray = (value) => Array.isArray(value) ? value : value?.value || [];

const KPICard = ({ title, value, icon: Icon, iconBg, iconColor, status, statusColor, subtext }) => (
  <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition duration-200">
    <div className="flex items-start justify-between mb-4 gap-3">
      <div className={`p-3 rounded-xl ${iconBg}`}>
        <Icon size={24} className={iconColor} />
      </div>
      <div className="text-right">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
    </div>
    <div className="flex items-center space-x-2 text-xs">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
      <span style={{ color: statusColor }} className="font-medium">{status}</span>
      <span className="text-slate-500">{subtext}</span>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border p-3 rounded-lg shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-lg">{payload[0].value}</p>
    </div>
  );
};

const EmptyState = ({ text }) => (
  <div className="h-full min-h-[160px] flex items-center justify-center text-sm text-slate-500 border border-dashed border-border rounded-lg">
    {text}
  </div>
);

const StatusBadge = ({ status }) => {
  const value = String(status || 'UNKNOWN').toUpperCase();
  const cls = value.includes('CONNECTED') || value.includes('COMPLETED') || value === 'ACTIVE'
    ? 'bg-success-bg text-success'
    : value.includes('FAILED') || value.includes('DISCONNECTED')
      ? 'bg-danger-bg text-danger'
      : 'bg-warning/20 text-warning';
  return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>{value}</span>;
};

const Dashboard = () => {
  const [data, setData] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [analytics, sessions, flows, executions, messages, providers, webhooks, logs] = await Promise.all([
        api.get('/modules/analytics'),
        api.get('/session'),
        api.get('/flows'),
        api.get('/modules/executions'),
        api.get('/modules/messages'),
        api.get('/modules/providers'),
        api.get('/modules/webhooks'),
        api.get('/modules/logs')
      ]);

      setData({
        analytics: analytics.data || emptyDashboard.analytics,
        sessions: normalizeArray(sessions.data),
        flows: normalizeArray(flows.data),
        executions: normalizeArray(executions.data),
        messages: normalizeArray(messages.data),
        providers: providers.data || emptyDashboard.providers,
        webhooks: normalizeArray(webhooks.data),
        logs: normalizeArray(logs.data)
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const derived = useMemo(() => {
    const totals = data.analytics.totals || {};
    const connectedSessions = data.sessions.filter((session) => session.status === 'CONNECTED').length;
    const activeFlows = data.flows.filter((flow) => flow.isActive).length;
    const today = new Date().toISOString().slice(0, 10);
    const messagesToday = data.messages.filter((message) => dayKey(message.createdAt) === today).length;
    const completedExecutions = data.executions.filter((execution) => execution.status === 'COMPLETED').length;
    const failedExecutions = data.executions.filter((execution) => execution.status === 'FAILED').length;
    const enabledProviders = (data.providers.providers || []).filter((provider) => provider.enabled).length;
    const activeWebhooks = data.webhooks.filter((webhook) => webhook.isActive).length;
    const errorLogs = data.logs.filter((log) => ['error', 'fatal'].includes(String(log.level).toLowerCase())).length;

    const messageDayMap = { ...(data.analytics.recentMessagesByDay || {}) };
    for (const message of data.messages) {
      const key = dayKey(message.createdAt);
      messageDayMap[key] = (messageDayMap[key] || 0) + 1;
    }
    const messageSeries = lastSevenDays().map((key) => ({
      name: key.slice(5),
      value: Number(messageDayMap[key] || 0)
    }));

    const executionStatusMap = data.executions.reduce((acc, execution) => {
      const status = execution.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const executionSeries = ['COMPLETED', 'FAILED', 'RUNNING', 'PENDING'].map((status) => ({
      name: status,
      value: executionStatusMap[status] || 0
    }));

    const providerSeries = (data.providers.providers || []).map((provider, index) => ({
      name: provider.name,
      value: provider.enabled ? 1 : 0,
      color: colors[index % colors.length]
    }));

    const systemHealthy = errorLogs === 0;

    return {
      totals,
      connectedSessions,
      activeFlows,
      messagesToday,
      completedExecutions,
      failedExecutions,
      enabledProviders,
      activeWebhooks,
      errorLogs,
      messageSeries,
      executionSeries,
      providerSeries,
      systemHealthy
    };
  }, [data]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Live operational data from your local backend. Empty cards mean no records exist yet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadDashboard} className="flex items-center gap-2 bg-surface border border-border text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:text-white hover:border-slate-600 transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/flows" className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-primary/20 transition">
            <GitBranch size={16} />
            Flow Builder
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-danger-bg border border-danger/20 text-danger rounded-lg p-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
        <KPICard title="Sessions" value={`${derived.connectedSessions}/${data.sessions.length}`} icon={Phone} iconBg="bg-success-bg" iconColor="text-success" status={`${derived.connectedSessions} connected`} statusColor="#10B981" subtext={`${data.sessions.length} total`} />
        <KPICard title="Flows" value={data.flows.length || 0} icon={GitBranch} iconBg="bg-primary/20" iconColor="text-primary" status={`${derived.activeFlows} active`} statusColor={derived.activeFlows ? '#10B981' : '#F59E0B'} subtext="automation flows" />
        <KPICard title="Messages Today" value={derived.messagesToday} icon={MessageSquare} iconBg="bg-info/20" iconColor="text-info" status={`${derived.totals.messages || 0} total`} statusColor="#3B82F6" subtext="stored messages" />
        <KPICard title="Executions" value={derived.totals.executions || 0} icon={Play} iconBg="bg-warning/20" iconColor="text-warning" status={`${derived.failedExecutions} failed`} statusColor={derived.failedExecutions ? '#EF4444' : '#10B981'} subtext={`${derived.completedExecutions} completed`} />
        <KPICard title="AI Providers" value={derived.enabledProviders} icon={Bot} iconBg="bg-danger-bg" iconColor="text-danger" status={`${(data.providers.providers || []).length} configured`} statusColor={derived.enabledProviders ? '#10B981' : '#F59E0B'} subtext="enabled providers" />
        <KPICard title="System" value={derived.systemHealthy ? 'Healthy' : 'Issues'} icon={Server} iconBg="bg-[#0D9488]/20" iconColor="text-[#14B8A6]" status={`${derived.errorLogs} errors`} statusColor={derived.systemHealthy ? '#10B981' : '#EF4444'} subtext={`${data.logs.length} logs`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white">Messages Overview</h2>
            <span className="text-xs text-slate-500">Last 7 days</span>
          </div>
          <div className="h-[220px] w-full">
            {derived.messageSeries.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={derived.messageSeries} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="value" stroke="#25D366" strokeWidth={3} dot={{ r: 4, fill: '#25D366', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fff', stroke: '#128C7E', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState text="No messages recorded in the last 7 days." />}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">AI Providers</h2>
            <Link to="/ai-providers" className="text-xs text-primary hover:text-primary-hover">Manage</Link>
          </div>
          <div className="flex-1 flex items-center justify-between min-h-[220px]">
            {(data.providers.providers || []).length > 0 ? (
              <>
                <div className="h-[180px] w-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={derived.providerSeries} cx="50%" cy="50%" innerRadius={58} outerRadius={78} paddingAngle={2} dataKey="value" stroke="none">
                        {derived.providerSeries.map((entry, index) => <Cell key={entry.name} fill={entry.value ? entry.color : '#334155'} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-white">{derived.enabledProviders}</span>
                    <span className="text-[10px] text-slate-400 uppercase">Enabled</span>
                  </div>
                </div>
                <div className="flex-1 ml-4 space-y-3">
                  {data.providers.providers.map((provider, index) => (
                    <div key={provider.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: provider.enabled ? colors[index % colors.length] : '#64748B' }} />
                        <span className="text-xs font-medium text-slate-300">{provider.name}</span>
                      </div>
                      <StatusBadge status={provider.enabled ? 'active' : 'disabled'} />
                    </div>
                  ))}
                </div>
              </>
            ) : <EmptyState text="No providers configured." />}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white">Flow Executions</h2>
            <Link to="/executions" className="text-xs text-primary hover:text-primary-hover">View all</Link>
          </div>
          <div className="h-[220px] w-full">
            {derived.executionSeries.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={derived.executionSeries} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'var(--color-border)' }} content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#25D366" radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState text="No flow executions yet." />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Recent Executions</h2>
            <Link to="/executions" className="text-xs font-medium text-primary hover:text-primary-hover">View all</Link>
          </div>
          <div className="space-y-3">
            {data.executions.length === 0 ? <EmptyState text="No executions recorded." /> : data.executions.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20">
                    <GitBranch size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-slate-200 truncate">{item.Flow?.name || item.flowId}</h4>
                    <div className="text-[11px] text-slate-500 mt-0.5">{formatDate(item.createdAt)}</div>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Recent Messages</h2>
            <Link to="/messages" className="text-xs font-medium text-primary hover:text-primary-hover">View all</Link>
          </div>
          <div className="space-y-3">
            {data.messages.length === 0 ? <EmptyState text="No messages stored yet." /> : data.messages.slice(0, 5).map((message) => (
              <div key={message.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center">
                    <MessageSquare size={16} className="text-info" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-slate-200 truncate">{message.remoteJid}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">{message.text || '(empty message)'}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{formatDate(message.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">System Status</h2>
            <Link to="/logs" className="text-xs font-medium text-primary hover:text-primary-hover">Logs</Link>
          </div>
          <div className="space-y-4">
            {[
              { name: 'WhatsApp Sessions', desc: `${derived.connectedSessions} connected / ${data.sessions.length} total`, icon: Phone, status: derived.connectedSessions ? 'active' : 'idle' },
              { name: 'Database', desc: `${derived.totals.messages || 0} messages, ${derived.totals.flows || 0} flows`, icon: Database, status: 'healthy' },
              { name: 'AI Providers', desc: `${derived.enabledProviders} enabled / ${(data.providers.providers || []).length} configured`, icon: Bot, status: derived.enabledProviders ? 'active' : 'disabled' },
              { name: 'Webhooks', desc: `${derived.activeWebhooks} active flow webhook URLs`, icon: Webhook, status: derived.activeWebhooks ? 'active' : 'idle' },
              { name: 'Recent Logs', desc: `${data.logs.length} events, ${derived.errorLogs} errors`, icon: FileText, status: derived.errorLogs ? 'issues' : 'healthy' }
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center">
                    <item.icon size={16} className={item.status === 'issues' ? 'text-danger' : 'text-success'} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-slate-200">{item.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.desc}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
