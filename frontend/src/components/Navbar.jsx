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
  Trophy,
  Calendar,
  Clock
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
    feed: ['FAQ Feed'],
    dashboard: [user.role === 'admin' ? 'Admin Command Center' : 'My Dashboard', 'Daily FAQ operations and moderation'],
    admin: ['Admin Command Center', 'Daily FAQ operations and moderation'],
    attendance: ['Attendance Support', 'Session access requests and issue reporting'],
    analytics: ['Analytics', 'Measure engagement, quality, and response flow'],
    'user-activity': ['User Activity Tracking', 'Audit logins, searches, support, and FAQ actions'],
    updates: ["What's New", 'Official FAQ changes and update tours'],
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
    <header className={`sticky top-0 z-30 border-b px-4 py-3.5 backdrop-blur-2xl sm:px-6 transition-all duration-300 ${theme === 'dark'
        ? 'border-white/5 bg-[#050608]/75 text-white'
        : 'border-slate-100 bg-white/75 text-slate-800 shadow-sm'
      }`}>
      <div className="flex items-center justify-between gap-4">
        {/* Brand/Tab Section */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className={`rounded-xl p-2 border transition md:hidden ${theme === 'dark'
                ? 'border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            title={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black tracking-tight sm:text-lg">{title}</h2>
            <p className={`hidden truncate text-[10px] font-bold sm:block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>
          </div>
        </div>

        {/* Live Date & Time Clock Badge */}
        <div className={`hidden items-center gap-2 px-3.5 py-2 rounded-xl border text-[10px] font-black tracking-wider uppercase md:flex ${theme === 'dark'
            ? 'border-white/5 bg-white/[0.01] text-slate-400'
            : 'border-slate-100 bg-slate-50/50 text-slate-500 shadow-sm'
          }`}>
          <Clock className="w-3.5 h-3.5 text-[#E07A15] dark:text-[#FFAE59]" />
          <span>{formattedTime}</span>
        </div>

        {/* Global actions */}
        <div className="flex shrink-0 items-center gap-2">

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) fetchNotifications();
              }}
              className={`relative rounded-xl border p-2.5 transition ${theme === 'dark'
                  ? 'border-white/5 bg-white/[0.01] text-slate-350 hover:bg-white/5 hover:text-white'
                  : 'border-slate-150 bg-slate-50/50 text-slate-650 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                } ${showNotifications ? 'ring-2 ring-indigo-500/30' : ''}`}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9933] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E07A15]"></span>
                </span>
              )}
            </button>

            {/* Notifications slide-out overlay drawer */}
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />

                <div className={`absolute right-0 mt-2.5 z-50 w-80 sm:w-96 rounded-2xl border shadow-2xl backdrop-blur-3xl overflow-hidden transition-all duration-300 origin-top-right transform scale-100 ${theme === 'dark'
                    ? 'border-white/5 bg-[#0b0c10]/95 text-white'
                    : 'border-slate-100 bg-white/95 text-slate-800'
                  }`}>
                  <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="rounded-md bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 px-2 py-0.5 text-[9px] font-black">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[9px] font-black text-[#E07A15] dark:text-[#FFAE59] hover:underline uppercase tracking-wider"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <span className="text-2xl mb-1">🔔</span>
                        <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">All caught up!</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">No recent alerts in the last 48 hours.</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const isRead = readNotifs.includes(notif._id);
                        return (
                          <div
                            key={notif._id}
                            onClick={() => markAsRead(notif._id)}
                            className={`flex items-start gap-3 p-4 text-left transition-colors cursor-pointer ${isRead
                                ? 'bg-transparent hover:bg-slate-50/40 dark:hover:bg-white/[0.01]'
                                : 'bg-indigo-500/[0.02] hover:bg-indigo-500/[0.05]'
                              }`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${notif.type === 'approval'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : notif.type === 'rejection'
                                  ? 'bg-rose-500/10 text-rose-500'
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
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 animate-pulse" />
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

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className={`rounded-xl border p-2.5 transition ${theme === 'dark'
                ? 'border-white/5 bg-white/[0.01] text-slate-350 hover:bg-white/5 hover:text-white'
                : 'border-slate-150 bg-slate-50/50 text-slate-650 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
              }`}
            title="Toggle dark/light theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300 animate-pulse" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User badge */}
          <div
            className={`flex items-center gap-2 rounded-xl border py-1.5 pl-2 pr-3.5 text-left shadow-sm ${theme === 'dark' ? 'border-white/5 bg-[#0b0c10]' : 'border-slate-150 bg-slate-50/50'
              }`}
            title="Active profile badge"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-500 text-xs font-black uppercase text-white shadow-md">
              {user.username?.charAt(0)}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[100px] truncate text-xs font-black capitalize">{user.username}</span>
              {user.role !== 'admin' && (
                <span className="block text-[9px] font-black uppercase tracking-widest text-[#E07A15] dark:text-[#FFAE59]">{user.spPoints} SP</span>
              )}
              {user.role === 'admin' && (
                <span className="block text-[8px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Admin</span>
              )}
            </span>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
