
import React, { useState, useEffect } from 'react';
import { LogIn, ShieldAlert, Check } from 'lucide-react';
import { db } from '../db';

const Login = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // Load saved credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem('rf_remembered_creds');
    if (saved) {
      const { u, p } = JSON.parse(saved);
      setUsername(u);
      setPassword(p);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = db.login(username, password);
    if (user) {
      if (rememberMe) {
        localStorage.setItem('rf_remembered_creds', JSON.stringify({ u: username, p: password }));
      } else {
        localStorage.removeItem('rf_remembered_creds');
      }
      onLoginSuccess();
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-8 text-center bg-primary">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary shadow-lg">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RetailFlow Barcelona</h1>
          <p className="text-primary-100 text-sm mt-1">Store Management Platform</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm border border-rose-100 animate-pulse">
                <ShieldAlert size={18} />
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Username</label>
              <input
                type="text"
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:text-slate-400"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Password</label>
              <input
                type="password"
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:text-slate-400"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${rememberMe ? 'bg-primary border-primary' : 'bg-white border-slate-300 group-hover:border-primary-400'}`}>
                  {rememberMe && <Check size={14} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-600">Remember Me</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-100"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-xs">
              Protected by RetailFlow Enterprise Security<br />
              © 2025 RetailFlow Barcelona
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
