import React from 'react';
import { Settings2, Moon, Sun, Eye, EyeOff, Upload, ShieldCheck, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionMenuProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  isPrivacyEnabled: boolean;
  setIsPrivacyEnabled: (val: boolean) => void;
  onOpenImport: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  isDarkMode,
  setIsDarkMode,
  isPrivacyEnabled,
  setIsPrivacyEnabled,
  onOpenImport
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200/50 dark:border-slate-700/50 shadow-sm sm:hidden flex items-center justify-center"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      <div className="hidden sm:flex items-center gap-2">
         {/* Desktop Actions (Optional: stay here or also move to menu) */}
         <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
           {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
         </button>
         <button onClick={() => setIsPrivacyEnabled(!isPrivacyEnabled)} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
           {isPrivacyEnabled ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
         </button>
         <button onClick={onOpenImport} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs uppercase tracking-widest">
            <Upload className="w-4 h-4" />
            Importar
         </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[110] sm:hidden" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl z-[120] p-2 sm:hidden overflow-hidden backdrop-blur-xl bg-white/90 dark:bg-slate-900/90"
            >
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Opções Rápidas</span>
              </div>
              
              <button
                onClick={() => { setIsDarkMode(!isDarkMode); setIsOpen(false); }}
                className="w-full flex items-center gap-3 p-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors font-bold text-sm"
              >
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                  {isDarkMode ? <Sun className="w-4 h-4 text-indigo-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                </div>
                {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
              </button>

              <button
                onClick={() => { setIsPrivacyEnabled(!isPrivacyEnabled); setIsOpen(false); }}
                className="w-full flex items-center gap-3 p-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors font-bold text-sm"
              >
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                  {isPrivacyEnabled ? <EyeOff className="w-4 h-4 text-emerald-500" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                </div>
                {isPrivacyEnabled ? 'Mostrar Valores' : 'Modo Privacidade'}
              </button>

              <button
                onClick={() => { onOpenImport(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 p-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors font-bold text-sm"
              >
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                  <Upload className="w-4 h-4 text-amber-500" />
                </div>
                Importar Dados (BS)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
