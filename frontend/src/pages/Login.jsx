import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BotMessageSquare, Lock } from 'lucide-react';
import { useAuth } from '../auth';

const Login = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: 'admin', password: '' });
  const [error, setError] = useState('');
  const from = location.state?.from || '/';

  if (auth.isAuthenticated) return <Navigate to={from} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await auth.login(form.username, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <BotMessageSquare className="text-primary" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">WAAI Flow</h1>
            <p className="text-sm text-slate-400">Sign in to manage automation features.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase font-semibold text-slate-500">Username</span>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="mt-2 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase font-semibold text-slate-500">Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-2 w-full bg-background border border-border text-slate-200 rounded-lg p-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
              placeholder="Default: admin123"
            />
          </label>
          {error && <div className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-lg p-3">{error}</div>}
          <button className="w-full bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2.5 font-medium flex items-center justify-center gap-2">
            <Lock size={16} /> Sign In
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-5">
          Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `AUTH_SECRET` in `backend/.env` for production.
        </p>
        <div className="mt-4 pt-4 border-t border-border text-xs text-slate-500">
          Open source by <span className="text-slate-300 font-medium">ZQ Developers</span>
          <span className="mx-2">/</span>
          WhatsApp support: <span className="text-slate-300 font-medium">+923144916432</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
