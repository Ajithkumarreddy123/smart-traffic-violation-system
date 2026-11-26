import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, Zap } from 'lucide-react';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('traffic_auth_token', data.access_token);
        localStorage.setItem('traffic_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        const err = await res.json();
        setError(err.detail || 'Invalid username or password');
      }
    } catch (err) {
      setError('Could not connect to authentication service');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    setUsername('demo');
    setPassword('demo');
    setTimeout(() => {
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'demo' })
      })
      .then(r => r.json())
      .then(data => {
        localStorage.setItem('traffic_auth_token', data.access_token);
        localStorage.setItem('traffic_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      })
      .catch(() => {
        // Fallback offline mock user
        const mockUser = { username: 'officer_sharma', role: 'admin', email: 'sharma@traffic.gov.in' };
        localStorage.setItem('traffic_user', JSON.stringify(mockUser));
        onLoginSuccess(mockUser);
      });
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/95 backdrop-blur-xl">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6 relative overflow-hidden animate-slide-in">
        {/* Background glow decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/10 blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">
            TRAFFICGUARD AI COMMAND
          </h2>
          <p className="text-xs text-slate-400">
            National Smart City Automated Traffic Enforcement Portal
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Officer Identifier / Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="admin"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Security Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="admin123"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2.5 rounded-lg transition shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Command Center'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-bold tracking-wider">Demo Quick Access</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
          onClick={handleDemoBypass}
          className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 font-medium py-2 rounded-lg text-xs transition flex items-center justify-center space-x-2"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>One-Click Demo Bypass (Skip Login)</span>
        </button>
      </div>
    </div>
  );
}
