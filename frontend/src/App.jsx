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
import Analytics from './pages/Analytics';
import AttendanceSupport from './pages/AttendanceSupport';
import WhatsNew from './pages/WhatsNew';
import UserActivityTracking from './pages/UserActivityTracking';
import { X } from 'lucide-react';

const AppContent = () => {
  const { 
    user, 
    token, 
    activeTab, 
    selectedThreadId, 
    alert,
    setAlert
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      case 'analytics':
        return <Analytics />;
      case 'profile':
        return <Profile />;
      case 'attendance':
        return <AttendanceSupport />;
      case 'updates':
        return <WhatsNew />;
      case 'user-activity':
        return <UserActivityTracking />;
      default:
        return <FAQFeed />;
    }
  };

  return (

    <div className="soft-page-bg flex min-h-screen overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(105,96,82,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(105,96,82,0.055)_1px,transparent_1px)] bg-[size:42px_42px] opacity-50 dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] dark:opacity-30" />

      <div className="relative z-10 hidden h-screen md:block">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((current) => !current)}
        />
      </div>

      {/* 2. Mobile Menu Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <Sidebar mobile onNavigate={() => setIsMobileMenuOpen(false)} />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="ml-auto p-5 text-slate-300"
            title="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* 3. Main content viewport wrapper */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        
        {/* Sticky navbar */}
        <Navbar 
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          isMobileMenuOpen={isMobileMenuOpen} 
        />
        
        {/* Simple Notification Banner */}
        {false && (
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
