
import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid' },
    { id: 'timeline', label: 'Linha do Tempo', icon: 'clock' },
    { id: 'recent', label: 'Lançamentos', icon: 'list' },
    { id: 'fixed', label: 'Controle Fixos', icon: 'anchor' },
    { id: 'history', label: 'Extrato', icon: 'receipt' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 text-white z-50 sidebar-transition hidden lg:flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-6 flex items-center gap-3 overflow-hidden border-b border-slate-800/50">
          <div className="min-w-[40px] h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">F</div>
          {isOpen && <span className="font-bold text-xl tracking-tight whitespace-nowrap">Finanza Lite</span>}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${activeTab === item.id
                ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/20 translate-x-1 ring-1 ring-white/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
            >
              <i data-lucide={item.icon} className="w-5 h-5"></i>
              {isOpen && <span className="font-semibold text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          {isOpen ? (
            <div
              onClick={() => setActiveTab('settings')}
              className={`bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50 group cursor-pointer hover:bg-slate-800 transition-all ${activeTab === 'settings' ? 'ring-2 ring-indigo-500 border-indigo-500/50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-black">
                  <i data-lucide="user" className="w-5 h-5"></i>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">Usuário</p>
                  <p className="text-[10px] text-slate-500 font-medium">Configurações</p>
                </div>
                <i data-lucide="settings" className={`w-4 h-4 text-slate-500 ml-auto group-hover:rotate-90 transition-transform ${activeTab === 'settings' ? 'text-indigo-400 rotate-90' : ''}`}></i>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full aspect-square bg-slate-800/50 rounded-xl mb-4 flex items-center justify-center transition-colors ${activeTab === 'settings' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white'}`}
            >
              <i data-lucide="settings" className="w-5 h-5"></i>
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full p-3 text-slate-400 hover:text-white flex justify-center hover:bg-slate-800 rounded-xl transition-colors"
          >
            <i data-lucide={isOpen ? 'chevron-left' : 'chevron-right'} className="w-6 h-6"></i>
          </button>

          {isOpen && (
            <div className="mt-4 text-center">
              <p className="text-[10px] font-mono text-slate-600 opacity-50">v1.0.0</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 flex lg:hidden justify-around items-center p-4 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] overflow-x-auto">
        {[...menuItems, { id: 'settings', label: 'Ajustes', icon: 'settings' }].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-colors px-2 min-w-[60px] ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <i data-lucide={item.icon} className="w-5 h-5"></i>
            <span className="text-[8px] font-bold tracking-wider uppercase whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};
