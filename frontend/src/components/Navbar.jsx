import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sun, 
  Moon, 
  Menu, 
  X,
  LogOut
} from 'lucide-react';

const Navbar = ({ onMobileMenuToggle, isMobileMenuOpen }) => {
  const { 
    user, 
    theme, 
    activeTab, 
    toggleTheme, 
    logout 
  } = useApp();

  if (!user) return null;

  const getTabTitle = () => {
    switch (activeTab) {
      case 'feed': return 'FAQ & Support';
      case 'dashboard': return 'My Dashboard';
      case 'leaderboard': return 'Leaderboard';
      case 'profile': return 'My Profile';
      case 'admin': return 'Admin Terminal';
      case 'analytics': return 'Analytics & Insights';
      default: return 'IIT Ropar Support';
    }
  };

  return (
    <header className="sticky top-0 bg-white dark:bg-brand-900 border-b border-slate-200 dark:border-brand-950 px-6 py-4 flex items-center justify-between transition-colors z-10">
      
      {/* Title / Hamburger */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-brand-950 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white capitalize">{getTabTitle()}</h2>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4">
        
        {/* Simple SP Display */}
        <div className="text-xs font-bold text-brand-500 dark:text-brand-400 bg-brand-500/10 px-2.5 py-1.5 rounded-lg">
          SP: {user.spPoints}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-brand-950 hover:bg-slate-200 transition-all"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center space-x-1"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[10px] font-bold hidden sm:inline">Sign Out</span>
        </button>

      </div>

    </header>
  );
};

export default Navbar;
