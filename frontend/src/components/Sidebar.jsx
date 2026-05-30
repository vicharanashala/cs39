import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  User
} from 'lucide-react';

const Sidebar = ({ collapsed = false, onToggle, mobile = false, onNavigate }) => {
  const { user, theme, activeTab, setActiveTab, setSelectedThreadId, logout } = useApp();

  if (!user) return null;

  const menuItems = user.role === 'admin'
    ? [
        { id: 'feed', label: 'FAQ Feed', icon: HelpCircle },
        { id: 'admin', label: 'Command Center', icon: ShieldCheck },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'profile', label: 'Profile', icon: User }
      ]
    : [
        { id: 'feed', label: 'FAQ Feed', icon: HelpCircle },
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { id: 'profile', label: 'Profile', icon: User }
      ];

  const handleNavigation = (tabId) => {
    setSelectedThreadId(null);
    setActiveTab(tabId);
    onNavigate?.();
  };

  const shellWidth = mobile ? 'w-72' : collapsed ? 'w-[88px]' : 'w-72';

  return (
    <aside className={`${shellWidth} h-full shrink-0 border-r transition-all duration-300 ${
      mobile ? 'flex' : 'hidden md:flex'
    } flex-col ${
      theme === 'dark'
        ? 'bg-[#0B0C0E] border-white/10 text-slate-200'
        : 'bg-white border-slate-200 text-slate-700'
    }`}>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {/* Header container */}
        <div className={`flex items-center ${collapsed && !mobile ? 'justify-center' : 'justify-between'} gap-3 rounded-lg border p-3 ${
          theme === 'dark' ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {(!collapsed || mobile) && (
              <div className="min-w-0">
                <h1 className={`truncate text-sm font-black tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>FAQ Nexus</h1>
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-blue-500/80">
                  {user.role === 'admin' ? 'Admin Platform' : 'Student Portal'}
                </p>
              </div>
            )}
          </div>

          {!mobile && (
            <button
              onClick={onToggle}
              className={`rounded-lg p-2 transition ${
                theme === 'dark' ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation links */}
        <nav className="mt-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-bold transition-all ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white ring-1 ring-blue-400/30 shadow-lg shadow-blue-950/20'
                      : 'bg-slate-100 text-slate-900 ring-1 ring-slate-200/85 shadow-sm'
                    : theme === 'dark'
                    ? 'text-slate-450 hover:bg-white/[0.06] hover:text-white'
                    : 'text-slate-550 hover:bg-slate-50 hover:text-slate-900'
                } ${collapsed && !mobile ? 'justify-center' : ''}`}
                title={collapsed && !mobile ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${
                  isActive 
                    ? theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                    : theme === 'dark' ? 'text-slate-500 group-hover:text-blue-300' : 'text-slate-400 group-hover:text-blue-600'
                }`} />
                {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Health status widget */}
        <div className={`mt-auto rounded-lg p-3 ${
          theme === 'dark' ? 'border border-blue-400/20 bg-blue-500/10' : 'border border-slate-200 bg-slate-50'
        }`}>
          {(!collapsed || mobile) ? (
            <>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-blue-200/70' : 'text-blue-600'}`}>System Health</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>FAQ response SLA</span>
                <span className="font-black text-emerald-500 dark:text-emerald-300">98%</span>
              </div>
              <div className={`mt-2 h-1.5 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div className="h-full w-[98%] rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" />
              </div>
            </>
          ) : (
            <div className="mx-auto h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/40" title="System health 98%" />
          )}
        </div>
      </div>

      {/* Footer / User controls */}
      <div className={`border-t p-4 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`flex items-center gap-3 ${collapsed && !mobile ? 'justify-center' : 'between'}`}>
          <div className={`flex min-w-0 items-center gap-3 ${collapsed && !mobile ? 'hidden' : ''}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black uppercase ring-1 ${
              theme === 'dark' ? 'bg-white/10 text-white ring-white/10' : 'bg-slate-100 text-slate-800 ring-slate-200'
            }`}>
              {user.username?.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className={`truncate text-xs font-black capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{user.username}</h4>
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
