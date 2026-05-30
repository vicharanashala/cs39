import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  UserCircle,
  X
} from 'lucide-react';

const Navbar = ({ onMobileMenuToggle, isMobileMenuOpen }) => {
  const { user, theme, activeTab, toggleTheme } = useApp();

  if (!user) return null;

<<<<<<< HEAD
  const titles = {
    feed: ['FAQ Feed', 'Resolve and discover platform questions'],
    dashboard: [user.role === 'admin' ? 'Admin Command Center' : 'My Dashboard', 'Daily FAQ operations and moderation'],
    admin: ['Admin Command Center', 'Daily FAQ operations and moderation'],
    analytics: ['Analytics', 'Measure engagement, quality, and response flow'],
    profile: ['Profile', 'Account, trust score, and contribution profile']
=======
  const getTabTitle = () => {
    switch (activeTab) {
      case 'feed': return 'FAQ & Support';
      case 'dashboard': return 'My Dashboard';
      case 'leaderboard': return 'Leaderboard';
      case 'profile': return 'My Profile';
      case 'admin': return 'Admin Terminal';
      case 'analytics': return 'Analytics & Insights';
      default: return 'IIT Ropar Support';
    }
>>>>>>> ebd79f7b49a7a8f4c0860e4c38e20347dce9e852
  };

  const [title, subtitle] = titles[activeTab] || ['FAQ Platform', 'Knowledge operations workspace'];

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-4 py-3 text-white backdrop-blur-2xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
            title={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black tracking-tight text-white sm:text-lg">{title}</h2>
            <p className="hidden truncate text-xs font-medium text-slate-400 sm:block">{subtitle}</p>
          </div>
        </div>

        <div className="hidden min-w-[240px] max-w-md flex-1 items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-slate-400 lg:flex">
          <Search className="h-4 w-4 shrink-0" />
          <span className="ml-2 truncate text-xs font-semibold">Search FAQs, users, flagged topics...</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            className="relative rounded-lg border border-white/10 bg-white/[0.06] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-400 ring-2 ring-slate-950" />
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-lg border border-white/10 bg-white/[0.06] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            className="hidden rounded-lg border border-white/10 bg-white/[0.06] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:block"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] py-1.5 pl-2 pr-3 text-left transition hover:bg-white/10"
            title="Profile"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-black uppercase">
              {user.username?.charAt(0)}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[110px] truncate text-xs font-black capitalize text-white">{user.username}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-200/70">{user.spPoints} SP</span>
            </span>
            <UserCircle className="hidden h-4 w-4 text-slate-500 sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
