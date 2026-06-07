import { useState } from 'react';
import { User } from '../types';
import { Tv, Lock, User as UserIcon, Server } from 'lucide-react';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl, username, password })
      });

      if (!res.ok) {
        throw new Error('Invalid credentials or server URL');
      }

      const data = await res.json();
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', data.user.username);
      localStorage.setItem('auth_server', data.user.serverUrl);
      
      onLogin({ username: data.user.username, token: data.token, serverUrl: data.user.serverUrl });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
      <div className="w-full max-w-sm p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full mb-3">
            <Tv size={32} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">IPTV Stream</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to access your channels</p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-red-950/50 border border-red-900/50 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Server URL / Host</label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="url" 
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="http://example.com:8080"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter any username"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter any password"
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Authenticating...' : 'Connect to Server'}
          </button>
        </form>
      </div>
    </div>
  );
}
