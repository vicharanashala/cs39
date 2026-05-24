import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import FloatingChatbot from './components/FloatingChatbot';
import Login from './pages/Login';
import FAQFeed from './pages/FAQFeed';
import ThreadDetail from './pages/ThreadDetail';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import { X } from 'lucide-react';

const AppContent = () => {
  const { 
    user, 
    token, 
    activeTab, 
    setActiveTab, 
    selectedThreadId, 
    setSelectedThreadId, 
    alert,
    setAlert,
    logout
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If token exists but user session is still loading from server, show spinner
  if (token && !user) {
    return (
      <div className="min-h-screen bg-slate-900 dark:bg-brand-950 flex flex-col justify-center items-center font-sans">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <h3 className="text-xs font-bold text-slate-400">Loading Session...</h3>
      </div>
    );
  }

  // Render Login page if not authenticated
  if (!user) {
    return <Login />;
  }

  const renderActiveTabContent = () => {
    if (selectedThreadId) {
      return <ThreadDetail />;
    }

    switch (activeTab) {
      case 'feed':
        return <FAQFeed />;
      case 'dashboard':
      case 'admin':
        return <Dashboard />;
      case 'profile':
        return <Profile />;
      default:
        return <FAQFeed />;
    }
  };

  const handleMobileNavClick = (tabId) => {
    setSelectedThreadId(null);
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-brand-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* 1. Desktop Sidebar Removed per request */}

      {/* 2. Mobile Menu Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="w-64 bg-slate-900 h-full p-6 flex flex-col justify-between border-r border-slate-800 text-slate-350 animate-slide-in">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-slate-850">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🎓</span>
                  <span className="font-extrabold text-white text-sm tracking-wide">IIT ROPAR</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="mt-8 space-y-2">
                <button
                  onClick={() => handleMobileNavClick('feed')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold ${
                    activeTab === 'feed' && !selectedThreadId ? 'bg-brand-500/10 text-brand-400' : ''
                  }`}
                >
                  FAQ & Community
                </button>
                <button
                  onClick={() => handleMobileNavClick('dashboard')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold ${
                    activeTab === 'dashboard' && !selectedThreadId ? 'bg-brand-500/10 text-brand-400' : ''
                  }`}
                >
                  My Dashboard
                </button>

                <button
                  onClick={() => handleMobileNavClick('profile')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold ${
                    activeTab === 'profile' ? 'bg-brand-500/10 text-brand-400' : ''
                  }`}
                >
                  Student Profile
                </button>
                {user.role === 'admin' && (
                  <button
                    onClick={() => handleMobileNavClick('admin')}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold ${
                      activeTab === 'admin' ? 'bg-brand-500/10 text-brand-400' : ''
                    }`}
                  >
                    Admin Panel
                  </button>
                )}
              </nav>
            </div>

            {/* Logout */}
            <button 
              onClick={() => { logout(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center space-x-3 px-4 py-3 bg-slate-950/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-450 rounded-xl text-xs font-bold transition-all"
            >
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main content viewport wrapper */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Sticky navbar */}
        <Navbar 
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          isMobileMenuOpen={isMobileMenuOpen} 
        />
        
        {/* Simple Notification Banner */}
        {alert && (
          <div className={`w-full px-6 py-2.5 text-center text-xs font-bold text-white transition-all shadow-sm ${
            alert.type === 'success' ? 'bg-emerald-500' : alert.type === 'error' ? 'bg-rose-500' : 'bg-brand-500'
          }`}>
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <span>{alert.message}</span>
              <button onClick={() => setAlert(null)} className="hover:opacity-85 text-white/90">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        
        {/* Router Tab Views */}
        <main className="flex-1 overflow-y-auto">
          {renderActiveTabContent()}
        </main>

        {/* Floating Chatbot overlay */}
        <FloatingChatbot />
      </div>

    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
