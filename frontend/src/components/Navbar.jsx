import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { onNewNotification } from '../utils/socket';
import {
  Bell,
  Menu,
  Moon,
  Search,
  Sun,
  UserCircle,
  X,
  CheckCircle2,
  Trophy
} from 'lucide-react';

const Navbar = ({ onMobileMenuToggle, isMobileMenuOpen }) => {
  const { user, theme, activeTab, toggleTheme } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotifs, setReadNotifs] = useState([]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load local read notifications list
  useEffect(() => {
    if (user) {
      try {
        const stored = JSON.parse(localStorage.getItem(`read_notifs_${user.id}`)) || [];
        setReadNotifs(stored);
      } catch (e) {
        setReadNotifs([]);
      }
    }
  }, [user]);

  // Fetch from dynamic backend notifications list
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Real-time socket updates and initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const cleanup = onNewNotification(() => {
        fetchNotifications();
      });
      return cleanup;
    }
  }, [user]);

  if (!user) return null;

  const titles = {
    feed: ['FAQ Feed', 'Resolve and discover platform questions'],
    dashboard: [user.role === 'admin' ? 'Admin Command Center' : 'My Dashboard', 'Daily FAQ operations and moderation'],
    admin: ['Admin Command Center', 'Daily FAQ operations and moderation'],
    analytics: ['Analytics', 'Measure engagement, quality, and response flow'],
    profile: ['Profile', 'Account, trust score, and contribution profile']
  };

  const [title, subtitle] = titles[activeTab] || ['FAQ Platform', 'Knowledge operations workspace'];

  // Format date and time
  const formattedTime = currentTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const unreadCount = notifications.filter(n => !readNotifs.includes(n._id)).length;

  const markAsRead = (id) => {
    if (user && !readNotifs.includes(id)) {
      const updated = [...readNotifs, id];
      setReadNotifs(updated);
      localStorage.setItem(`read_notifs_${user.id}`, JSON.stringify(updated));
    }
  };

  const markAllAsRead = () => {
    if (user) {
      const allIds = notifications.map(n => n._id);
      setReadNotifs(allIds);
      localStorage.setItem(`read_notifs_${user.id}`, JSON.stringify(allIds));
    }
  };

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <header className={`sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-2xl sm:px-6 transition-colors duration-300 ${
      theme === 'dark'
        ? 'border-white/10 bg-[#0B0C0E]/70 text-white'
        : 'border-slate-200 bg-white/70 text-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className={`rounded-lg p-2 transition md:hidden ${
              theme === 'dark' ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <h2 className={`truncate text-base font-black tracking-tight sm:text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{title}</h2>
            <p className={`hidden truncate text-xs font-semibold sm:block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
          </div>
        </div>

        

        {/* Live Date & Time Clock */}
        <div className={`hidden items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-extrabold md:flex ${
          theme === 'dark' ? 'border-white/10 bg-white/[0.04] text-slate-350' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <span className="text-[11px]">📅</span>
          <span>{formattedTime}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Notifications Trigger & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) fetchNotifications();
              }}
              className={`relative rounded-lg border p-2 transition ${
                theme === 'dark'
                  ? 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/10 hover:text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${showNotifications ? 'ring-2 ring-violet-500/50' : ''}`}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                
                <div className={`absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border shadow-xl backdrop-blur-3xl overflow-hidden transition-all duration-300 origin-top-right transform scale-100 ${
                  theme === 'dark'
                    ? 'border-white/10 bg-[#0B0C0E]/95 text-white shadow-black/80'
                    : 'border-slate-200 bg-white/95 text-slate-800 shadow-slate-200'
                }`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-violet-500/10 dark:bg-violet-400/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 text-[10px] font-black">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 transition-colors uppercase"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <span className="text-2xl mb-1">🔔</span>
                        <p className="text-xs text-slate-400 font-medium">All quiet! No notifications in the last 48 hours.</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const isRead = readNotifs.includes(notif._id);
                        return (
                          <div
                            key={notif._id}
                            onClick={() => markAsRead(notif._id)}
                            className={`flex items-start gap-3 p-4 text-left transition-colors cursor-pointer ${
                              isRead 
                                ? 'bg-transparent hover:bg-slate-50/40 dark:hover:bg-white/[0.02]' 
                                : 'bg-violet-500/5 dark:bg-violet-400/5 hover:bg-violet-500/10 dark:hover:bg-violet-400/10'
                            }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                              notif.type === 'approval' 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : notif.type === 'rejection' 
                                ? 'bg-red-500/10 text-red-500' 
                                : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {notif.type === 'approval' ? <CheckCircle2 className="h-4 w-4" /> : notif.type === 'rejection' ? <X className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                            </span>
                            
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-bold leading-none ${isRead ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                                  {notif.title}
                                </p>
                                <span className="text-[9px] text-slate-400 shrink-0 font-medium leading-none">
                                  {formatRelativeTime(notif.createdAt)}
                                </span>
                              </div>
                              <p className={`text-[11px] leading-snug break-words ${isRead ? 'text-slate-500' : 'text-slate-600 dark:text-slate-350'}`}>
                                {notif.message}
                              </p>
                            </div>
                            
                            {!isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0 mt-1.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={toggleTheme}
            className={`rounded-lg border p-2 transition ${
              theme === 'dark' ? 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/10 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            className={`flex items-center gap-2 rounded-lg border py-1.5 pl-2 pr-3 text-left transition ${
              theme === 'dark' ? 'border-white/10 bg-white/[0.06] hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
            title="Profile"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-black uppercase text-white">
              {user.username?.charAt(0)}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className={`block max-w-[110px] truncate text-xs font-black capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{user.username}</span>
              {user.role !== 'admin' && (
                <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-200/70">{user.spPoints} SP</span>
              )}
              {user.role === 'admin' && (
                <span className="block text-[9px] font-bold uppercase tracking-wider text-brand-500">Admin</span>
              )}
            </span>
            <UserCircle className={`hidden h-4 w-4 sm:block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
