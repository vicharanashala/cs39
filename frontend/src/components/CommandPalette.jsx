import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search, HelpCircle, LayoutDashboard, BarChart3, User,
  LogOut, Moon, Sun, Sparkles, ArrowRight, Command,
  Zap, Hash, Clock, ChevronRight, Shield, BellDot
} from 'lucide-react';

const COMMANDS = (user, setActiveTab, setSelectedThreadId, logout, toggleTheme, theme) => [
  {
    group: 'Navigation',
    items: [
      {
        id: 'nav-feed',
        label: 'FAQ Feed',
        description: 'Browse official & community FAQs',
        icon: HelpCircle,
        iconColor: 'text-brand-500',
        shortcut: 'G F',
        action: () => { setSelectedThreadId(null); setActiveTab('feed'); }
      },
      {
        id: 'nav-dashboard',
        label: user?.role === 'admin' ? 'Command Center' : 'My Dashboard',
        description: user?.role === 'admin' ? 'Admin moderation workspace' : 'Your activity & queue',
        icon: user?.role === 'admin' ? Shield : LayoutDashboard,
        iconColor: 'text-violet-500',
        shortcut: 'G D',
        action: () => { setSelectedThreadId(null); setActiveTab(user?.role === 'admin' ? 'admin' : 'dashboard'); }
      },
      {
        id: 'nav-updates',
        label: "What's New",
        description: 'Official FAQ changelog and tours',
        icon: BellDot,
        iconColor: 'text-violet-500',
        shortcut: 'G N',
        action: () => { setSelectedThreadId(null); setActiveTab('updates'); }
      },
      {
        id: 'nav-attendance',
        label: 'Attendance Support',
        description: 'Report issues and track session access requests',
        icon: Clock,
        iconColor: 'text-amber-500',
        shortcut: 'G S',
        action: () => { setSelectedThreadId(null); setActiveTab('attendance'); }
      },
      ...(user?.role === 'admin' ? [{
        id: 'nav-analytics',
        label: 'Analytics',
        description: 'System telemetry & insights',
        icon: BarChart3,
        iconColor: 'text-cyan-500',
        shortcut: 'G A',
        action: () => { setSelectedThreadId(null); setActiveTab('analytics'); }
      }] : []),
      {
        id: 'nav-profile',
        label: 'Profile',
        description: 'Account settings & contributions',
        icon: User,
        iconColor: 'text-emerald-500',
        shortcut: 'G P',
        action: () => { setSelectedThreadId(null); setActiveTab('profile'); }
      },
    ]
  },
  {
    group: 'Actions',
    items: [
      {
        id: 'toggle-theme',
        label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        description: 'Toggle visual theme',
        icon: theme === 'dark' ? Sun : Moon,
        iconColor: 'text-amber-500',
        action: toggleTheme
      },
      {
        id: 'logout',
        label: 'Sign Out',
        description: 'Log out of your account',
        icon: LogOut,
        iconColor: 'text-rose-500',
        action: logout
      }
    ]
  }
];

const CommandPalette = ({ open, onClose }) => {
  const { user, theme, activeTab, setActiveTab, setSelectedThreadId, logout, toggleTheme } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const commands = COMMANDS(user, setActiveTab, setSelectedThreadId, logout, toggleTheme, theme);

  const filteredCommands = query.trim()
    ? commands.map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
        )
      })).filter(g => g.items.length > 0)
    : commands;

  const allItems = filteredCommands.flatMap(g => g.items);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = useCallback((item) => {
    item.action();
    onClose();
    setQuery('');
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) handleSelect(allItems[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, allItems, selectedIndex, handleSelect, onClose]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!open) return null;

  let globalIndex = 0;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div
        className="cmd-palette dark:bg-[#0d0e16] bg-white shadow-2xl"
        style={{ border: '1px solid rgba(99,102,241,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${theme === 'dark' ? 'border-white/[0.07]' : 'border-slate-200/70'}`}>
          <Search className="w-4 h-4 text-brand-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands, pages, actions..."
            className={`flex-1 bg-transparent outline-none text-sm font-medium placeholder:font-normal ${
              theme === 'dark' ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />
          <div className={`flex items-center gap-1 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
              theme === 'dark' ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
            }`}>ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[400px] py-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="w-6 h-6 mx-auto text-brand-500/40 mb-2" />
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                No commands found for "{query}"
              </p>
            </div>
          ) : (
            filteredCommands.map((group) => (
              <div key={group.group} className="mb-1">
                <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                  theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedIndex === globalIndex;
                  const idx = globalIndex++;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? theme === 'dark'
                            ? 'bg-brand-500/10'
                            : 'bg-brand-50'
                          : 'hover:bg-transparent'
                      }`}
                    >
                      <span className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
                        theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'
                      } ${isSelected ? '!bg-brand-500/15' : ''}`}>
                        <Icon className={`w-4 h-4 ${item.iconColor}`} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-xs font-semibold ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                        }`}>{item.label}</span>
                        {item.description && (
                          <span className={`block text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {item.description}
                          </span>
                        )}
                      </span>
                      {item.shortcut && (
                        <span className="flex items-center gap-1 shrink-0">
                          {item.shortcut.split(' ').map((k, ki) => (
                            <kbd key={ki} className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                              theme === 'dark' ? 'border-white/10 bg-white/5 text-slate-500' : 'border-slate-200 bg-slate-100 text-slate-400'
                            }`}>{k}</kbd>
                          ))}
                        </span>
                      )}
                      {isSelected && <ChevronRight className="w-3 h-3 text-brand-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-t text-[10px] font-medium ${
          theme === 'dark'
            ? 'border-white/[0.07] text-slate-600'
            : 'border-slate-100 text-slate-400'
        }`}>
          <span className="flex items-center gap-1.5">
            <Command className="w-3 h-3" />
            <span>Command Palette</span>
          </span>
          <span className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
