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

  const checkAndSyncFAQCache = useCallback(async () => {
    if (!token) return;
    try {
      const localTimestamp = localStorage.getItem('faq_last_updated');
      const cachedData = localStorage.getItem('cached_official_faqs');

      let needFetch = !localTimestamp || !cachedData;

      if (!needFetch) {
        const tsRes = await api.get('/threads/last-updated');
        const serverTimestamp = tsRes.data.timestamp;
        if (serverTimestamp > parseInt(localTimestamp, 10)) {
          needFetch = true;
        }
      }

      if (needFetch) {
        console.log('[FAQ Cache] Cache missing or stale. Fetching fresh FAQs...');
        const res = await api.get('/threads', {
          params: { isOfficial: 'true', sort: 'newest' }
        });
        const tsRes = await api.get('/threads/last-updated');
        localStorage.setItem('cached_official_faqs', JSON.stringify(res.data));
        localStorage.setItem('faq_last_updated', String(tsRes.data.timestamp || Date.now()));
      } else {
        console.log('[FAQ Cache] Cache is up-to-date.');
      }
    } catch (error) {
      console.error('[FAQ Cache] Failed to sync cache:', error.message);
    }
  }, [token]);

  // Load user profile on start if token exists
  useEffect(() => {
    if (token) {
      checkSession();
      checkAndSyncFAQCache();
    }
  }, [token, checkAndSyncFAQCache]);

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

  const toggleBookmark = useCallback(async (threadId, threadData = null) => {
    if (!token || !user) return null;
    const storageKey = `saved_faqs_${user.id}`;
    let savedList = [];
    try {
      savedList = JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch (e) {
      savedList = [];
    }

    const isSaved = savedList.some(item => item._id === threadId);

    if (isSaved) {
      savedList = savedList.filter(item => item._id !== threadId);
      localStorage.setItem(storageKey, JSON.stringify(savedList));
      setBookmarks(savedList.map(item => item._id));
      showAlert('FAQ removed from saved list.', 'info');
      return false;
    } else {
      let threadToSave = threadData;
      if (!threadToSave) {
        try {
          const res = await api.get(`/threads/${threadId}`);
          threadToSave = res.data;
        } catch (e) {
          console.error('Failed to fetch thread for bookmark:', e);
        }
      }

      if (!threadToSave) {
        showAlert('Could not save FAQ.', 'error');
        return null;
      }

      // Fetch answers to save the top/verified answer
      let answerText = '';
      try {
        const ansRes = await api.get(`/threads/${threadId}/answers`);
        const topAns = ansRes.data.find(a => a.isVerified) || ansRes.data[0];
        if (topAns) {
          answerText = topAns.body;
        }
      } catch (e) {
        console.error('Failed to fetch answer for bookmark:', e);
      }

      const newItem = {
        _id: threadToSave._id,
        title: threadToSave.title,
        body: threadToSave.body,
        category: threadToSave.category,
        faqNumber: threadToSave.faqNumber,
        isOfficial: threadToSave.isOfficial,
        answerText: answerText || 'No reply available yet.'
      };

      savedList.push(newItem);
      localStorage.setItem(storageKey, JSON.stringify(savedList));
      setBookmarks(savedList.map(item => item._id));
      showAlert('FAQ saved to local storage!', 'success');
      return true;
    }
  }, [token, user]);

  // Load bookmarks when user logs in
  useEffect(() => {
    if (user) {
      const storageKey = `saved_faqs_${user.id}`;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey)) || [];
        setBookmarks(saved.map(item => item._id));
      } catch (e) {
        setBookmarks([]);
      }
    } else {
      setBookmarks([]);
    }
  }, [user]);

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
      toggleBookmark
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
