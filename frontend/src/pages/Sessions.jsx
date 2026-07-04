import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Trash2, RefreshCw, Phone, RotateCcw, AlertCircle } from 'lucide-react';
import { SOCKET_URL } from '../config';
import api from '../api';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [qrCodes, setQrCodes] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/session');
      setSessions(res.data);
      const initialQrCodes = {};
      res.data.forEach(s => {
        if (s.qr) initialQrCodes[s.sessionId] = s.qr;
      });
      setQrCodes(prev => ({ ...prev, ...initialQrCodes }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sessions');
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('waai.auth.token') }
    });

    const onQr = (data) => setQrCodes(prev => ({ ...prev, [data.sessionId]: data.qr }));
    const onStatus = (data) => {
      setSessions(prev => prev.map(s =>
        s.sessionId === data.sessionId ? { ...s, status: data.status } : s
      ));
      if (data.status === 'CONNECTED') {
        setQrCodes(prev => { const next = { ...prev }; delete next[data.sessionId]; return next; });
      }
    };

    socket.on('qr', onQr);
    socket.on('status', onStatus);
    return () => {
      socket.off('qr', onQr);
      socket.off('status', onStatus);
      socket.disconnect();
    };
  }, [fetchSessions]);

  const handleCreate = async () => {
    if (!newSessionName.trim()) return;
    setLoading(true);
    setError('');
    const sessionId = newSessionName.trim().toLowerCase().replace(/\s+/g, '-');
    try {
      await api.post('/session/create', { name: newSessionName.trim(), sessionId });
      setNewSessionName('');
      await fetchSessions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create session');
    } finally { setLoading(false); }
  };

  const handleDelete = async (session) => {
    if (!window.confirm(`Delete session "${session.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/session/${session.id}`);
      setSessions(prev => prev.filter(s => s.id !== session.id));
      setQrCodes(prev => { const next = { ...prev }; delete next[session.sessionId]; return next; });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete session');
    }
  };

  const handleReconnect = async (session) => {
    setError('');
    try {
      await api.post(`/session/${session.id}/reconnect`);
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'CONNECTING' } : s));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reconnect session');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp Sessions</h1>
          <p className="text-slate-400 mt-2 text-sm">Manage your WhatsApp device connections</p>
        </div>
        <button onClick={fetchSessions}
          className="p-2 bg-surface border border-border rounded-lg hover:border-slate-600 hover:text-white transition text-slate-400">
          <RefreshCw size={18} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-5 flex items-center gap-2 text-sm">
          <AlertCircle size={15} className="shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
        </div>
      )}

      <div className="bg-surface border border-border p-5 rounded-xl mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            New Session Name
          </label>
          <input
            type="text"
            className="w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition placeholder:text-slate-600"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Support Line 1"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={loading || !newSessionName.trim()}
          className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-hover transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20 whitespace-nowrap w-full md:w-auto font-medium disabled:opacity-50"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={18} />}
          Add Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sessions.map(session => (
          <div key={session.id} className="bg-surface border border-border p-5 rounded-xl flex flex-col hover:border-slate-700 transition">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-white">{session.name}</h3>
                <code className="text-[10px] text-slate-600 font-mono">{session.sessionId}</code>
                <div className={`inline-flex items-center px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider mt-2 ${
                  session.status === 'CONNECTED'  ? 'bg-success-bg text-success' :
                  session.status === 'CONNECTING' ? 'bg-warning/20 text-warning' :
                  'bg-danger-bg text-danger'
                }`}>
                  {session.status === 'CONNECTED' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
                  )}
                  {session.status}
                </div>
              </div>
              <button onClick={() => handleDelete(session)}
                className="text-slate-500 hover:text-danger hover:bg-danger-bg p-2 rounded-lg transition">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[220px] bg-background rounded-lg border border-border overflow-hidden">
              {session.status === 'CONNECTED' ? (
                <div className="text-center text-success font-medium flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-success-bg rounded-full flex items-center justify-center">
                    <Phone size={32} />
                  </div>
                  <span>Device Linked</span>
                </div>
              ) : qrCodes[session.sessionId] ? (
                <div className="flex flex-col items-center p-4">
                  <div className="bg-white p-2 rounded-lg">
                    <QRCodeSVG value={qrCodes[session.sessionId]} size={160} />
                  </div>
                  <p className="text-xs text-center mt-3 text-slate-400">Scan in WhatsApp → Linked Devices</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw size={24} className="text-slate-500 animate-spin" />
                  <span className="text-slate-500 text-sm">Generating QR…</span>
                </div>
              )}
            </div>

            {session.status !== 'CONNECTED' && (
              <button onClick={() => handleReconnect(session)}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-background border border-border text-slate-400 hover:text-white hover:border-slate-600 rounded-lg py-2 text-sm transition">
                <RotateCcw size={14} /> Reconnect
              </button>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-surface border border-dashed border-slate-700 rounded-xl">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4 text-slate-500">
              <Phone size={24} />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">No active sessions</h3>
            <p className="text-slate-400 text-sm">Create a new WhatsApp session to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sessions;
