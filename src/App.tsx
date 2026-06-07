/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { User, Channel } from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const username = localStorage.getItem('auth_user');
    const serverUrl = localStorage.getItem('auth_server');
    
    if (token && username && serverUrl) {
      setUser({ token, username, serverUrl });
    }
    setLoading(false);
  }, []);

  // Fetch channels when logged in
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setLoading(true);
    
    fetch('/api/channels', {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Session expired. Please log in again.');
      return res.json();
    })
    .then(data => {
      if (isMounted) {
        setChannels(data.channels || []);
        setError('');
      }
    })
    .catch(err => {
      if (isMounted) {
         setError(err.message);
         handleLogout();
      }
    })
    .finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [user]);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_server');
    setUser(null);
    setChannels([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
        <h2 className="text-xl font-semibold mb-2 tracking-tight">Chargement des chaînes...</h2>
        <p className="text-slate-500 text-sm max-w-md text-center">
          Veuillez patienter. La récupération d'une liste IPTV complète (souvent plusieurs milliers de chaînes) peut prendre quelques instants.
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Dashboard 
      user={user} 
      onLogout={handleLogout} 
      channels={channels} 
    />
  );
}
