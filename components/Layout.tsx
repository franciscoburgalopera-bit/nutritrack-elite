
import React from 'react';
import { View } from '../types';

interface LayoutProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  const navItems = [
    { id: 'dashboard' as View, label: 'Home', icon: 'home' },
    { id: 'diary' as View, label: 'Log', icon: 'book' },
    { id: 'analytics' as View, label: 'Stats', icon: 'monitoring' },
    { id: 'profile' as View, label: 'Me', icon: 'person' },
  ];

  // Dynamic Background classes based on view
  const getBgClass = () => {
    switch(currentView) {
      case 'dashboard': return 'bg-fit-woman';
      case 'profile': return 'bg-fit-man';
      default: return 'bg-fit-couple';
    }
  };

  return (
    <div className={`flex flex-col h-screen text-white overflow-hidden max-w-md mx-auto relative shadow-2xl ${getBgClass()} transition-all duration-1000`}>
      <main className="flex-1 overflow-y-auto pb-32 no-scrollbar pt-2">
        {children}
      </main>

      {/* Action Button */}
      {['dashboard', 'diary', 'analytics', 'profile'].includes(currentView) && (
        <button 
          onClick={() => onNavigate('add-food')}
          className="fixed bottom-28 right-6 z-[60] bg-gradient-to-br from-primary to-secondary text-background-dark size-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 transition-all hover:scale-110 active:scale-95 group"
        >
          <span className="material-symbols-outlined text-3xl font-bold transition-transform group-hover:rotate-90">add</span>
        </button>
      )}

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[380px] glass-nav rounded-[32px] py-3 px-6 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-0.5 transition-all duration-300 relative ${
              currentView === item.id ? 'text-primary' : 'text-white/30 hover:text-white/70'
            }`}
          >
            <span className={`material-symbols-outlined text-2xl ${currentView === item.id ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wide transition-all ${currentView === item.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 h-0'}`}>
              {item.label}
            </span>
            {currentView === item.id && (
              <span className="absolute -top-1 w-1 h-1 bg-primary rounded-full blur-[2px]"></span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
