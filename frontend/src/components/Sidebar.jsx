import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  BellDot,
  ShieldCheck,
  Sparkles,
  User,
  Activity
} from 'lucide-react';

const Sidebar = ({ collapsed = false, onToggle, mobile = false, onNavigate }) => {
  const { user, theme, activeTab, setActiveTab, setSelectedThreadId, logout } = useApp();

  if (!user) return null;

  const menuItems = user.role === 'admin'
    ? [
        { id: 'feed', label: 'FAQ Feed', icon: HelpCircle },
        { id: 'updates', label: "What's New", icon: BellDot },
        { id: 'attendance', label: 'Attendance Support', icon: Activity },
        { id: 'admin', label: 'Command Center', icon: ShieldCheck },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'user-activity', label: 'User Activity', icon: Activity },
        { id: 'profile', label: 'Profile', icon: User }
      ]
    : [
        { id: 'feed', label: 'FAQ Feed', icon: HelpCircle },
        { id: 'updates', label: "What's New", icon: BellDot },
        { id: 'attendance', label: 'Attendance Support', icon: Activity },
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
        ? 'bg-[#08090c] border-white/5 text-slate-200'
        : 'bg-white border-slate-100 text-slate-700 shadow-sm'
    }`}>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {/* Header container */}
        <div className={`flex items-center ${collapsed && !mobile ? 'justify-center' : 'justify-between'} gap-3 rounded-2xl border p-3.5 ${
          theme === 'dark' 
            ? 'border-white/5 bg-white/[0.02] shadow-sm' 
            : 'border-slate-100 bg-slate-50/50'
        }`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF9933] to-[#E07A15] shadow-md shadow-amber-500/10">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {(!collapsed || mobile) && (
              <div className="min-w-0">
                <h1 className={`truncate text-sm font-black tracking-wide ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>FAQ Nexus</h1>
                <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#E07A15] dark:text-[#FFAE59]">
                  {user.role === 'admin' ? 'Staff Admin' : 'Student'}
                </p>
              </div>
            )}
          </div>

          {!mobile && (
            <button
              onClick={onToggle}
              className={`rounded-xl p-1.5 border transition ${
                theme === 'dark' 
                  ? 'border-white/5 text-slate-400 hover:bg-white/5 hover:text-white' 
                  : 'border-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation links */}
        <nav className="mt-6 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-bold transition-all relative ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-white/[0.03] text-white ring-1 ring-white/5 shadow-md'
                      : 'bg-slate-100 text-slate-900 ring-1 ring-slate-200/50 shadow-sm'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                } ${collapsed && !mobile ? 'justify-center' : ''}`}
                title={collapsed && !mobile ? item.label : undefined}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-[#FF9933] to-[#E07A15]" />
                )}

                <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive 
                    ? theme === 'dark' ? 'text-[#FFAE59]' : 'text-[#E07A15]'
                    : theme === 'dark' ? 'text-slate-500 group-hover:text-[#FFAE59]' : 'text-slate-400 group-hover:text-[#E07A15]'
                }`} />
                {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Health status widget */}
        <div className={`mt-auto rounded-2xl p-4 border ${
          theme === 'dark' 
            ? 'border-white/5 bg-white/[0.01]' 
            : 'border-slate-100 bg-slate-50/50'
        }`}>
          {(!collapsed || mobile) ? (
            <>
              <div className="flex items-center justify-between">
                <p className={`text-[9px] font-extrabold uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-450'}`}>System Status</p>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-black text-emerald-500 dark:text-emerald-400">ONLINE</span>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between text-xs font-bold">
                <span className={theme === 'dark' ? 'text-slate-450' : 'text-slate-500'}>FAQ SLA Flow</span>
                <span className="font-extrabold text-[#E07A15] dark:text-[#FFAE59]">98%</span>
              </div>
              <div className={`mt-2 h-1.5 rounded-full ${theme === 'dark' ? 'bg-[#12141c]' : 'bg-slate-200/60'}`}>
                <div className="h-full w-[98%] rounded-full bg-gradient-to-r from-[#E07A15] to-[#FF9933] shadow-md shadow-amber-500/20" />
              </div>
            </>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 shadow-sm" title="System SLA 98%">
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
          )}
        </div>
      </div>

      {/* Footer / User controls */}
      <div className={`border-t p-4 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
        <div className={`flex items-center gap-3 ${collapsed && !mobile ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex min-w-0 items-center gap-3 ${collapsed && !mobile ? 'hidden' : ''}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 text-xs font-black uppercase text-white shadow-md shadow-indigo-500/10">
              {user.username?.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className={`truncate text-xs font-black capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{user.username}</h4>
              <p className="truncate text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 border border-transparent hover:border-rose-500/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
