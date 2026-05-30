import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, User, Shield, Sparkles, AlertCircle, ArrowRight, X, Sun, Moon } from 'lucide-react';

const Login = () => {
  const { login, register, theme, toggleTheme } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const showDemoLogin = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message);
      }
    } else {
      if (!username.trim()) {
        setError('Username is required');
        setLoading(false);
        return;
      }
      const res = await register(username, email, password);
      if (!res.success) {
        setError(res.message);
      }
    }
    setLoading(false);
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setForgotMessage('');
    if (!forgotEmail.trim()) return;
    
    // Simulated behavior
    setTimeout(() => {
      setForgotMessage('If an account exists, a secure password reset link has been dispatched to your email.');
    }, 500);
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="soft-page soft-page-bg min-h-screen flex flex-col justify-center items-center p-4 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <button
          onClick={toggleTheme}
          className="soft-panel p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 shadow-sm hover:shadow-md transition-all cursor-pointer"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Brand Header */}
      <div className="text-center mb-8 flex flex-col items-center">
        <div className="soft-primary p-3 rounded-2xl shadow-xl mb-4 flex items-center justify-center">
          <span className="text-3xl">🎓</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-wide">IIT ROPAR</h1>
        <p className="soft-accent text-xs font-semibold uppercase tracking-widest mt-1">FAQ & Community Platform</p>
      </div>

      {/* Main Glassmorphic Container */}
      <div className="soft-panel w-full max-w-md bg-white dark:bg-brand-900/60 border border-slate-200 dark:border-brand-850/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative transition-all duration-300">
        
        {/* Toggle Form Tabs */}
        <div className="flex bg-slate-100 dark:bg-brand-950/80 p-1.5 rounded-2xl mb-6 border border-slate-200 dark:border-brand-850/40">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
              isLogin ? 'soft-primary shadow-md' : 'text-slate-500 dark:text-slate-450 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
              !isLogin ? 'soft-primary shadow-md' : 'text-slate-500 dark:text-slate-450 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 tracking-wider">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-450 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sanjay_kumar"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-brand-955 border border-slate-200 dark:border-brand-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 placeholder-slate-400 dark:placeholder-slate-600 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-455 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sanjay@iitr.ac.in"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-brand-955 border border-slate-200 dark:border-brand-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 placeholder-slate-400 dark:placeholder-slate-600 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Password</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotMessage(''); }}
                  className="soft-accent text-[10px] font-bold hover:opacity-80 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-455 dark:text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-brand-955 border border-slate-200 dark:border-brand-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 placeholder-slate-400 dark:placeholder-slate-600 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="soft-primary w-full py-2.5 disabled:opacity-50 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 mt-2 cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {showDemoLogin && (
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-brand-850/80">
            <h4 className="soft-accent text-[10px] font-bold uppercase tracking-wider mb-2">Local Demo Accounts</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickLogin('priya@iitr.ac.in', 'student123')}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-brand-950 dark:hover:bg-brand-900/80 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-brand-800 hover:border-brand-500/30 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-all capitalize cursor-pointer"
              >
                Student (Priya)
              </button>
              <button
                onClick={() => handleQuickLogin('sanjay@iitr.ac.in', 'student123')}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-brand-950 dark:hover:bg-brand-900/80 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-brand-800 hover:border-brand-500/30 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-all capitalize cursor-pointer"
              >
                Student (Sanjay)
              </button>
              <button
                onClick={() => handleQuickLogin('admin@iitr.ac.in', 'admin123')}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-brand-950 dark:hover:bg-brand-900/80 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-brand-800 hover:border-brand-500/30 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-white transition-all capitalize cursor-pointer"
              >
                Staff (Admin)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Forgot Password Modal Overlay */}
      {showForgot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="soft-panel w-full max-w-sm bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-3xl p-6 shadow-2xl relative animate-slide-in">
            <button 
              onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Forgot Password</h3>
            <p className="text-xs text-slate-650 dark:text-slate-400 mb-4 leading-relaxed">Enter your registered email address and we'll send a password recovery link to your mailbox.</p>
            
            {forgotMessage ? (
              <p className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold leading-relaxed mb-2">
                {forgotMessage}
              </p>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@iitr.ac.in"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-brand-950 border border-slate-200 dark:border-brand-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400 dark:placeholder-slate-600 transition-all"
                />
                <button
                  type="submit"
                  className="soft-primary w-full py-2 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Send Recovery Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper inside file for toast mock
const addToast = (title, message, type) => {
  const customEvent = new CustomEvent('toast_alert', { detail: { title, message, type } });
  window.dispatchEvent(customEvent);
};

// Listen to customized page level alerts
window.addEventListener('toast_alert', (e) => {
  // Triggers mock alert bindings
});

export default Login;

