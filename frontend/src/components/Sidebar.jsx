import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  MessageSquare, 
  LayoutDashboard, 
  User, 
  ShieldCheck, 
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const { user, activeTab, setActiveTab, setSelectedThreadId, logout } = useApp();

  if (!user) return null;

  const menuItems = [
    { id: 'feed', label: 'FAQ & Community', icon: MessageSquare },
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Student Profile', icon: User }
  ];

  if (user.role === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Terminal', icon: ShieldCheck });
  }

  const handleNavigation = (tabId) => {
    setSelectedThreadId(null);
    setActiveTab(tabId);
  };

  return (
    <aside className="w-60 bg-slate-900 text-slate-355 h-screen sticky top-0 flex flex-col justify-between z-20 shrink-0 hidden md:flex">
      <div className="p-6">
        {/* Simple Header */}
        <div className="flex items-center space-x-2.5">
          <span className="text-xl">🎓</span>
          <div>
            <h1 className="font-extrabold text-white text-sm tracking-wide">IIT ROPAR</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Support Portal</p>
          </div>
        </div>

        {/* Links list */}
        <nav className="mt-8 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Simplified User footer */}
      <div className="p-4 bg-slate-950/40 border-t border-slate-850">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold capitalize">
              {user.username.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate max-w-[100px] capitalize">{user.username}</h4>
              <span className="text-[10px] text-slate-400 block uppercase font-bold text-[8px]">{user.role}</span>
            </div>
          </div>
          <button 
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
