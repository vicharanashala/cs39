import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, User, Shield, Sparkles, AlertCircle, ArrowRight, X, Sun, Moon, BookOpen, MessageSquare, ShieldCheck, Heart } from 'lucide-react';

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
    <div className="soft-page soft-page-bg min-h-screen flex text-slate-900 dark:text-slate-100 transition-colors duration-300 relative font-sans overflow-hidden">
      
      {/* Background visual graphics */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(105,96,82,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(105,96,82,0.025)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] dark:opacity-30" />
      
      {/* ── LEFT PANE (Desktop Hero) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0b0c10] to-[#121620] relative flex-col justify-between p-12 text-white overflow-hidden border-r border-white/5">
        
        {/* Glow dots overlay */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl animate-pulse-slow" />
        
        {/* Logo/Insignia */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9933] to-[#E07A15] flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-xl">🎓</span>
          </div>
          <div>
            <h2 className="text-sm font-black tracking-widest text-white uppercase">IIT ROPAR</h2>
            <p className="text-[9px] font-bold tracking-[0.25em] text-[#FF9933] uppercase">Nexus System</p>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-white xl:text-5xl">
            Academics & Support, <br />
            <span className="bg-gradient-to-r from-[#FF9933] via-[#FFAE59] to-amber-200 bg-clip-text text-transparent">
              Elevated with AI
            </span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-350">
            Welcome to the official student question board and peer operations center. Browse pre-verified staff FAQ guides or discuss assignments, selection processes, and certificates in real-time.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="border border-white/5 bg-white/[0.03] backdrop-blur p-4 rounded-2xl">
              <BookOpen className="w-5 h-5 text-[#FF9933] mb-2" />
              <h4 className="text-xl font-black">98%</h4>
              <p className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider mt-0.5">SLA Solved</p>
            </div>
            <div className="border border-white/5 bg-white/[0.03] backdrop-blur p-4 rounded-2xl">
              <MessageSquare className="w-5 h-5 text-indigo-400 mb-2" />
              <h4 className="text-xl font-black">2.4k+</h4>
              <p className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider mt-0.5">Discussions</p>
            </div>
            <div className="border border-white/5 bg-white/[0.03] backdrop-blur p-4 rounded-2xl">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xl font-black">100%</h4>
              <p className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider mt-0.5">Verified</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-medium pt-4 border-t border-white/5">
          <span>IIT Ropar Student Portal © 2026</span>
          <span className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Academic Excellence
          </span>
        </div>
      </div>

      {/* ── RIGHT PANE (Auth Form Workspace) ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 relative">
        
        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <button
            onClick={toggleTheme}
            className="nexus-glass p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-white/80 dark:bg-[#0f111a]/80 shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-200/50 dark:border-white/5"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 animate-pulse" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Brand insignia header on mobile */}
        <div className="lg:hidden text-center mb-8 flex flex-col items-center">
          <div className="soft-primary p-3 rounded-2xl shadow-xl mb-4 flex items-center justify-center">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-2xl font-black tracking-wide text-slate-900 dark:text-white">IIT ROPAR</h1>
          <p className="soft-accent text-[9px] font-bold uppercase tracking-widest mt-1">FAQ & Community Platform</p>
        </div>

        {/* Main Glassmorphic Card Container */}
        <div className="nexus-glass w-full max-w-md rounded-3xl p-6 sm:p-8 relative border border-slate-200/50 dark:border-white/5 shadow-2xl">
          
          {/* Header titles */}
          <div className="text-left mb-6">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isLogin ? 'Log in to raise questions or view daily operations' : 'Join the academic intern board and earn SP rewards'}
            </p>
          </div>

          {/* Toggle Form Tabs */}
          <div className="flex bg-slate-100 dark:bg-[#07080b]/80 p-1 rounded-2xl mb-6 border border-slate-200/50 dark:border-white/5">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all duration-200 cursor-pointer ${
                isLogin 
                  ? 'soft-primary shadow-md' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all duration-200 cursor-pointer ${
                !isLogin 
                  ? 'soft-primary shadow-md' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2 animate-slide-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Auth form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="sanjay_kumar"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sanjay@iitr.ac.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotMessage(''); }}
                    className="soft-accent text-[10px] font-bold hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="soft-primary w-full py-2.5 disabled:opacity-50 font-black rounded-xl text-xs shadow-lg flex items-center justify-center space-x-2 mt-4 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : isLogin ? 'Access Portal' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {showDemoLogin && (
            <div className="mt-6 pt-5 border-t border-slate-200/50 dark:border-white/5 space-y-2">
              <h4 className="soft-accent text-[9px] font-extrabold uppercase tracking-widest">Quick Demo Pre-fills</h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleQuickLogin('priya@iitr.ac.in', 'student123')}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-black border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#07080b] hover:bg-slate-100 dark:hover:bg-[#121620] hover:border-amber-500/40 text-slate-600 dark:text-slate-450 hover:text-amber-500 dark:hover:text-[#FFAE59] transition-all cursor-pointer"
                >
                  🎓 Priya (Student)
                </button>
                <button
                  onClick={() => handleQuickLogin('sanjay@iitr.ac.in', 'student123')}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-black border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#07080b] hover:bg-slate-100 dark:hover:bg-[#121620] hover:border-amber-500/40 text-slate-600 dark:text-slate-450 hover:text-amber-500 dark:hover:text-[#FFAE59] transition-all cursor-pointer"
                >
                  🎓 Sanjay (Student)
                </button>
                <button
                  onClick={() => handleQuickLogin('admin@iitr.ac.in', 'admin123')}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-black border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#07080b] hover:bg-slate-100 dark:hover:bg-[#121620] hover:border-amber-500/40 text-slate-600 dark:text-slate-450 hover:text-amber-500 dark:hover:text-[#FFAE59] transition-all cursor-pointer"
                >
                  👮 Staff Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal Overlay */}
      {showForgot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="nexus-glass w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-slate-200/50 dark:border-white/5 animate-slide-in">
            <button 
              onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">Password Recovery</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Enter your registered email address and we'll dispatch secure recovery directions to your inbox.
            </p>
            
            {forgotMessage ? (
              <p className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded-xl text-xs font-bold leading-relaxed mb-2 animate-slide-in">
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
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
                />
                <button
                  type="submit"
                  className="soft-primary w-full py-2.5 font-black rounded-xl text-xs transition-colors cursor-pointer"
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

export default Login;
