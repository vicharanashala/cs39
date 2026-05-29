import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';
import { initSocket, disconnectSocket, onSPChange, onNewNotification } from '../utils/socket';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'dashboard' | 'leaderboard' | 'profile' | 'admin'
  const [selectedThreadId, setSelectedThreadId] = useState(null); // Track drill-down thread detail view
  const [alert, setAlert] = useState(null); // Simple alert banner: { message, type }
  const [bookmarks, setBookmarks] = useState([]); // Array of bookmarked thread IDs

  // Theme management effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load user profile on start if token exists
  useEffect(() => {
    if (token) {
      checkSession();
    }
  }, [token]);

  const checkSession = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.user;
      setUser({
        id: userData._id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        spPoints: userData.spPoints,
        level: userData.level,
        trustScore: userData.trustScore,
        contributionRating: userData.contributionRating,
        badges: userData.badges || []
      });
    } catch (error) {
      console.error('Session validation failed:', error.message);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: jwtToken, user: userData } = res.data;
      localStorage.setItem('token', jwtToken);
      setToken(jwtToken);
      setUser(userData);
      showAlert(`Welcome back, ${userData.username}!`, 'success');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      showAlert(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await api.post('/auth/register', { username, email, password });
      const { token: jwtToken, user: userData } = res.data;
      localStorage.setItem('token', jwtToken);
      setToken(jwtToken);
      setUser(userData);
      showAlert(`Registered account for ${userData.username}!`, 'success');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      showAlert(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSelectedThreadId(null);
    setActiveTab('feed');
    showAlert('Successfully logged out.', 'info');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 4000);
  };

  const fetchBookmarks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/bookmarks');
      setBookmarks(res.data.map(b => b.threadId));
    } catch (err) {
      console.error('[AppContext] fetchBookmarks error:', err.message);
    }
  }, [token]);

  const toggleBookmark = useCallback(async (threadId) => {
    if (!token) return;
    try {
      const res = await api.post('/bookmarks/toggle', { threadId });
      setBookmarks(prev =>
        res.data.bookmarked
          ? [...prev, threadId]
          : prev.filter(id => id !== threadId)
      );
      return res.data.bookmarked;
    } catch (err) {
      showAlert('Could not update bookmark.', 'error');
      return null;
    }
  }, [token]);

  // Load bookmarks when user logs in
  useEffect(() => {
    if (user) {
      fetchBookmarks();
    }
  }, [user, fetchBookmarks]);

  const addToast = (title, message, type = 'info') => {
    showAlert(`${title}: ${message}`, type === 'error' || type === 'verification' ? 'error' : 'success');
  };

  // ── Socket.IO real-time subscriptions ─────────────────────────────────
  const socketSetup = useCallback((authToken) => {
    if (!authToken) return;
    initSocket(authToken);

    // Live SP changes
    const unsubSP = onSPChange((data) => {
      setUser(prev => {
        if (!prev) return prev;
        const direction = data.pointsChange >= 0 ? 'gained' : 'lost';
        const abs = Math.abs(data.pointsChange);
        showAlert(
          `${direction === 'gained' ? '✨' : '⚠️'} SP ${direction} ${abs}!  (Total: ${data.newTotal})`,
          direction === 'gained' ? 'success' : 'error'
        );
        return { ...prev, spPoints: data.newTotal, level: data.level };
      });
    });

    // Live notifications
    const unsubNotif = onNewNotification((notif) => {
      showAlert(`🔔 ${notif.title} — ${notif.message}`, 'info');
    });

    return () => {
      unsubSP();
      unsubNotif();
      disconnectSocket();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect socket on login; disconnect on logout
  useEffect(() => {
    if (token) {
      const cleanup = socketSetup(token);
      return cleanup;
    }
  }, [token, socketSetup]);

  return (
    <AppContext.Provider value={{
      user,
      token,
      theme,
      activeTab,
      selectedThreadId,
      alert,
      setSelectedThreadId,
      setActiveTab,
      login,
      register,
      logout,
      toggleTheme,
      showAlert,
      setAlert,
      addToast,
      bookmarks,
      fetchBookmarks,
      toggleBookmark
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
