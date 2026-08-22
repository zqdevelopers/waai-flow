import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus, Trash2, RefreshCw, Phone, RotateCcw, AlertCircle,
  Key, QrCode, Edit2, Copy, CheckCircle2, ShieldCheck, Clock
} from 'lucide-react';
import { SOCKET_URL } from '../config';
import api from '../api';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [qrCodes, setQrCodes] = useState({});
  const [pairingCodes, setPairingCodes] = useState({});
  const [phoneInputs, setPhoneInputs] = useState({});
  const [activeTab, setActiveTab] = useState({}); // { [sessionId]: 'qr' | 'pairing' }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [copiedCode, setCopiedCode] = useState('');
  const [renameModal, setRenameModal] = useState(null); // { id, name }
  const [qrTimer, setQrTimer] = useState(25);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/session');
      setSessions(res.data);
      const initialQrCodes = {};
      const initialPairingCodes = {};
      res.data.forEach(s => {
        if (s.qr) initialQrCodes[s.sessionId] = s.qr;
        if (s.pairingCode) initialPairingCodes[s.sessionId] = s.pairingCode;
      });
      setQrCodes(prev => ({ ...prev, ...initialQrCodes }));
      setPairingCodes(prev => ({ ...prev, ...initialPairingCodes }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sessions');
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('waai.auth.token') }
    });

    const onQr = (data) => {
      setQrCodes(prev => ({ ...prev, [data.sessionId]: data.qr }));
      setQrTimer(25);
    };

    const onPairing = (data) => {
      setPairingCodes(prev => ({ ...prev, [data.sessionId]: data.code }));
    };

    const onStatus = (data) => {
      setSessions(prev => prev.map(s =>
        s.sessionId === data.sessionId ? { ...s, status: data.status } : s
      ));
      if (data.status === 'CONNECTED') {
        setQrCodes(prev => { const next = { ...prev }; delete next[data.sessionId]; return next; });
        setPairingCodes(prev => { const next = { ...prev }; delete next[data.sessionId]; return next; });
      }
    };

    socket.on('qr', onQr);
    socket.on('pairing-code', onPairing);
    socket.on('status', onStatus);

    const timer = setInterval(() => {
      setQrTimer(t => (t <= 1 ? 25 : t - 1));
    }, 1000);

    return () => {
      socket.off('qr', onQr);
      socket.off('pairing-code', onPairing);
      socket.off('status', onStatus);
      socket.disconnect();
      clearInterval(timer);
    };
  }, [fetchSessions]);

  const handleCreate = async () => {
    if (!newSessionName.trim()) return;
    setLoading(true);
    setError('');
    const sessionId = newSessionName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
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
      setPairingCodes(prev => { const next = { ...prev }; delete next[session.sessionId]; return next; });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete session');
    }
  };

  const handleReconnect = async (session) => {
    setError('');
    try {
      await api.post(`/session/${session.id}/reconnect`);
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'CONNECTING' } : s));
      setQrTimer(25);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reconnect session');
    }
  };

  const handleRequestPairingCode = async (session) => {
    const phone = phoneInputs[session.sessionId] || '';
    if (!phone.trim()) {
      setError('Please enter a phone number with country code (e.g. 923001234567)');
      return;
    }
    setActionLoading(prev => ({ ...prev, [session.sessionId]: true }));
    setError('');
    try {
      const res = await api.post(`/session/${session.id}/pairing-code`, { phoneNumber: phone });
      setPairingCodes(prev => ({ ...prev, [session.sessionId]: res.data.code }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request pairing code');
    } finally {
      setActionLoading(prev => ({ ...prev, [session.sessionId]: false }));
    }
  };

  const handleRename = async () => {
    if (!renameModal || !renameModal.name.trim()) return;
    try {
      await api.put(`/session/${renameModal.id}`, { name: renameModal.name.trim() });
      setSessions(prev => prev.map(s => s.id === renameModal.id ? { ...s, name: renameModal.name.trim() } : s));
      setRenameModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rename session');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp Sessions</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Manage multi-device WhatsApp sessions with QR Scan or 8-digit Pairing Code.
          </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map(session => {
          const tab = activeTab[session.sessionId] || 'qr';
          const isConnected = session.status === 'CONNECTED';
          const qr = qrCodes[session.sessionId];
          const pairingCode = pairingCodes[session.sessionId];

          return (
            <div key={session.id} className="bg-surface border border-border p-5 rounded-xl flex flex-col hover:border-slate-700 transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white">{session.name}</h3>
                    <button
                      onClick={() => setRenameModal({ id: session.id, name: session.name })}
                      className="text-slate-500 hover:text-white p-1 rounded"
                      title="Rename Session"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                  <code className="text-[10px] text-slate-600 font-mono">{session.sessionId}</code>
                  <div className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded uppercase font-bold tracking-wider mt-2 ${
                    isConnected ? 'bg-success-bg text-success' :
                    session.status === 'CONNECTING' ? 'bg-warning/20 text-warning' :
                    'bg-danger-bg text-danger'
                  }`}>
                    {isConnected && (
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

              {!isConnected && (
                <div className="flex bg-background rounded-lg p-1 mb-3 border border-border text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab(p => ({ ...p, [session.sessionId]: 'qr' }))}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition ${tab === 'qr' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <QrCode size={13} /> QR Code
                  </button>
                  <button
                    onClick={() => setActiveTab(p => ({ ...p, [session.sessionId]: 'pairing' }))}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition ${tab === 'pairing' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Key size={13} /> Pairing Code
                  </button>
                </div>
              )}

              <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] bg-background rounded-lg border border-border p-4 relative overflow-hidden">
                {isConnected ? (
                  <div className="text-center text-success font-medium flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-success-bg rounded-full flex items-center justify-center text-success shadow-lg shadow-success/20">
                      <ShieldCheck size={36} />
                    </div>
                    <span className="text-base font-bold text-white mt-1">Device Connected</span>
                    <span className="text-xs text-slate-400">Ready for visual flows & broadcasts</span>
                  </div>
                ) : tab === 'qr' ? (
                  qr ? (
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-2 rounded-lg shadow-lg">
                        <QRCodeSVG value={qr} size={150} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 font-mono">
                        <Clock size={12} className="text-amber-400 animate-spin" />
                        <span>Refreshes in {qrTimer}s</span>
                      </div>
                      <p className="text-[11px] text-center mt-1 text-slate-500">Scan in WhatsApp → Linked Devices</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw size={24} className="text-slate-500 animate-spin" />
                      <span className="text-slate-500 text-sm">Generating QR Code…</span>
                    </div>
                  )
                ) : (
                  <div className="w-full space-y-3">
                    <div className="text-center">
                      <h4 className="text-sm font-semibold text-white">Login via Phone Number</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Enter number with country code</p>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. 923001234567"
                      value={phoneInputs[session.sessionId] || ''}
                      onChange={e => setPhoneInputs({ ...phoneInputs, [session.sessionId]: e.target.value })}
                      className="w-full bg-surface border border-border text-slate-200 text-xs rounded-lg p-2.5 text-center font-mono outline-none focus:border-primary"
                    />

                    <button
                      onClick={() => handleRequestPairingCode(session)}
                      disabled={actionLoading[session.sessionId]}
                      className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      {actionLoading[session.sessionId] ? <RefreshCw size={13} className="animate-spin" /> : <Key size={13} />}
                      Get Pairing Code
                    </button>

                    {pairingCode && (
                      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center space-y-1 mt-2">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Your 8-Digit Pairing Code</div>
                        <div className="text-2xl font-bold tracking-widest text-primary font-mono select-all">
                          {pairingCode}
                        </div>
                        <button
                          onClick={() => copyCode(pairingCode)}
                          className="mt-1 text-xs text-slate-300 hover:text-white inline-flex items-center gap-1 bg-surface px-2.5 py-1 rounded border border-border"
                        >
                          {copiedCode === pairingCode ? <><CheckCircle2 size={12} className="text-success" /> Copied</> : <><Copy size={12} /> Copy Code</>}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1">Open WhatsApp notification or Linked Devices → Link with phone number</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isConnected && (
                <button onClick={() => handleReconnect(session)}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-background border border-border text-slate-400 hover:text-white hover:border-slate-600 rounded-lg py-2 text-sm transition">
                  <RotateCcw size={14} /> Reconnect
                </button>
              )}
            </div>
          );
        })}

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

      {renameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Rename Session</h3>
            <input
              type="text"
              value={renameModal.name}
              onChange={e => setRenameModal({ ...renameModal, name: e.target.value })}
              className="w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameModal(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-background border border-border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 text-sm text-white bg-primary hover:bg-primary-hover rounded-lg font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
