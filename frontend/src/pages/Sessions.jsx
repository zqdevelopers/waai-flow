import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Trash2, RefreshCw, Phone } from 'lucide-react';
import { SOCKET_URL } from '../config';
import api from '../api';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [qrCodes, setQrCodes] = useState({});

  const fetchSessions = async () => {
    try {
      const res = await api.get('/session');
      setSessions(res.data);
      // Pre-fill QR codes from the API payload
      const initialQrCodes = {};
      res.data.forEach(s => {
        if (s.qr) initialQrCodes[s.sessionId] = s.qr;
      });
      setQrCodes(prev => ({ ...prev, ...initialQrCodes }));
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('waai.auth.token') }
    });

    socket.on('connect', () => console.log('Connected to WS'));
    
    // Global events to prevent race conditions when creating new sessions
    const onQr = (data) => setQrCodes(prev => ({ ...prev, [data.sessionId]: data.qr }));
    const onStatus = (data) => {
      setSessions(prev => prev.map(session => 
        session.sessionId === data.sessionId ? { ...session, status: data.status } : session
      ));
    };

    socket.on('qr', onQr);
    socket.on('status', onStatus);

    return () => {
      socket.off('connect');
      socket.off('qr', onQr);
      socket.off('status', onStatus);
      socket.disconnect();
    };
  }, []);

  const handleCreate = async () => {
    if (!newSessionName) return;
    const sessionId = newSessionName.toLowerCase().replace(/\s+/g, '-');
    try {
      await api.post('/session/create', { name: newSessionName, sessionId });
      setNewSessionName('');
      fetchSessions();
    } catch (error) {
      alert('Failed to create session');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/session/${id}`);
      fetchSessions();
    } catch (error) {
      alert('Failed to delete session');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">WhatsApp Sessions</h1>
          <p className="text-slate-400 mt-2 text-sm">Manage your WhatsApp device connections</p>
        </div>
        <button onClick={fetchSessions} className="p-2 bg-surface border border-border rounded-lg hover:bg-surface-hover hover:text-white transition text-slate-400">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="bg-surface border border-border p-5 rounded-xl mb-8 flex flex-col md:flex-row gap-4 items-end shadow-sm">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">New Session Name</label>
          <input 
            type="text" 
            className="w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition placeholder:text-slate-600"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="e.g. Support Line 1"
          />
        </div>
        <button 
          onClick={handleCreate}
          className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-hover transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20 whitespace-nowrap w-full md:w-auto font-medium"
        >
          <Plus size={18} /> Add Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sessions.map(session => (
          <div key={session.id} className="bg-surface border border-border p-5 rounded-xl flex flex-col hover:border-slate-700 transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-white">{session.name}</h3>
                <div className={`inline-flex items-center px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider mt-2 ${
                  session.status === 'CONNECTED' ? 'bg-success-bg text-success' :
                  session.status === 'CONNECTING' ? 'bg-warning/20 text-warning' :
                  'bg-danger-bg text-danger'
                }`}>
                  {session.status === 'CONNECTED' && <div className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse"></div>}
                  {session.status}
                </div>
              </div>
              <button onClick={() => handleDelete(session.id)} className="text-slate-500 hover:text-danger hover:bg-danger-bg p-2 rounded-lg transition">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center min-h-[220px] bg-background rounded-lg border border-border overflow-hidden relative">
              {session.status === 'CONNECTED' ? (
                <div className="text-center text-success font-medium flex flex-col items-center">
                  <div className="w-16 h-16 bg-success-bg rounded-full flex items-center justify-center mb-3">
                    <Phone size={32} />
                  </div>
                  Device Linked
                </div>
              ) : qrCodes[session.sessionId] ? (
                <div className="flex flex-col items-center p-4">
                  <div className="bg-white p-2 rounded-lg">
                    <QRCodeSVG value={qrCodes[session.sessionId]} size={160} />
                  </div>
                  <p className="text-xs text-center mt-3 text-slate-400 font-medium">Scan in WhatsApp Settings</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <RefreshCw size={24} className="text-slate-500 animate-spin" />
                  <span className="text-slate-500 text-sm font-medium">Generating QR...</span>
                </div>
              )}
            </div>
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
