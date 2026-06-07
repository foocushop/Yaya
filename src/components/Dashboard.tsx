import { useState, useMemo } from 'react';
import { Channel, User } from '../types';
import { Player } from './Player';
import { Search, LogOut, LayoutGrid, List, Tv } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Dashboard({ user, onLogout, channels }: { user: User, onLogout: () => void, channels: Channel[] }) {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const categories = useMemo(() => {
    const cats = new Set(channels.map(c => c.category || 'Uncategorized'));
    return ['All', ...Array.from(cats)].sort();
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchCat = selectedCategory === 'All' || c.category === selectedCategory;
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [channels, search, selectedCategory]);

  const displayedChannels = useMemo(() => {
    return filteredChannels.slice(0, 150); // Prevent lag by rendering up to 150 items only
  }, [filteredChannels]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar Channels List */}
      <aside className="w-80 border-r border-slate-800/50 bg-slate-900/50 flex flex-col z-20 shadow-2xl backdrop-blur-xl">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/50 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Televizo Web
            </h1>
            <button onClick={onLogout} title="Logout" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <LogOut size={18} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search channels..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
             <div className="flex gap-2">
               {categories.map(cat => (
                 <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-3 py-1 text-xs font-medium rounded-full transition-colors",
                    selectedCategory === cat 
                      ? "bg-blue-600 text-white" 
                      : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                  )}
                 >
                   {cat}
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
          {displayedChannels.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No channels found</div>
          ) : (
            displayedChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group",
                  activeChannel?.id === channel.id 
                    ? "bg-blue-600/10 border border-blue-500/20 shadow-inner" 
                    : "hover:bg-slate-800/80 border border-transparent"
                )}
              >
                <div className="relative flex-shrink-0">
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt="" 
                      className="w-12 h-12 rounded object-cover bg-slate-950 border border-slate-800"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-slate-950 border border-slate-800 flex items-center justify-center">
                      <Tv size={20} className="text-slate-700" />
                    </div>
                  )}
                  {activeChannel?.id === channel.id && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                     </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "text-sm font-semibold truncate transition-colors",
                    activeChannel?.id === channel.id ? "text-blue-400" : "text-slate-200 group-hover:text-white"
                  )}>
                    {channel.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">{channel.category}</p>
                </div>
              </button>
            ))
          )}
          
          {filteredChannels.length > 150 && (
             <div className="p-6 text-center text-xs text-slate-500 opacity-80 border-t border-slate-800/50 mt-4">
                Affichage de 150 chaînes sur {filteredChannels.length}.<br/>Utilisez la barre de recherche ou les filtres de catégorie.
             </div>
          )}
        </div>

      </aside>

      {/* Main Player Area */}
      <main className="flex-1 relative bg-black">
        <Player channel={activeChannel} />
      </main>

    </div>
  );
}
