
import React from 'react';
import { LogOut } from 'lucide-react';
import { Transaction } from '../types';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';

interface SettingsViewProps {
    userName: string;
    transactions: Transaction[];
    onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userName, transactions, onLogout }) => {
    const { currency, setCurrency } = useCurrency();

    const handleExportData = async () => {
        try {
            // Using require/import based on how you access api
            // Assuming api is imported from services/api
            const { default: api } = await import('../services/api');

            const response = await api.get('/transactions/export', {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'finanza-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Erro ao exportar:', error);
            alert('Falha ao baixar o relatório.');
        }
    };

    const handleResetApp = () => {
        alert('Esta funcionalidade não está disponível na versão com Banco de Dados para sua segurança.');
    };

    React.useEffect(() => {
        // @ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, []);

    return (
        <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-right duration-700">
            <div className="glass-card rounded-[2.5rem] md:rounded-[3rem] overflow-hidden">
                <div className="p-8 md:p-12 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] mb-2">Preferências</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Configurações do Sistema</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Personalize sua experiência e gerencie seus dados.</p>
                </div>
                <div className="p-8 md:p-12 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Nome de Exibição</label>
                            <div className="relative">
                                <i data-lucide="user" className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600"></i>
                                <input
                                    type="text"
                                    value={userName}
                                    readOnly
                                    className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-700 dark:text-slate-300 cursor-not-allowed opacity-70 tracking-tight"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Moeda de Trabalho</label>
                            <div className="relative group">
                                <i data-lucide="banknote" className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                                    className="w-full pl-14 pr-12 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none appearance-none font-black text-slate-700 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
                                >
                                    <option value="BRL">Real Brasileiro (BRL)</option>
                                    <option value="USD">Dólar Americano (USD)</option>
                                    <option value="EUR">Euro (EUR)</option>
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <i data-lucide="chevron-down" className="w-4 h-4"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8 ml-1">Manutenção & Dados</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <button
                                onClick={handleExportData}
                                className="flex items-center gap-6 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group shadow-sm active:scale-95"
                            >
                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <i data-lucide="download" className="w-6 h-6"></i>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-slate-800 dark:text-white text-sm tracking-tight">Exportar Tudo</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Backup em CSV</p>
                                </div>
                            </button>
                            <button
                                onClick={handleResetApp}
                                className="flex items-center gap-6 p-6 bg-rose-50/20 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-900/30 rounded-[2rem] transition-all group opacity-40 cursor-not-allowed"
                            >
                                <div className="w-14 h-14 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <i data-lucide="refresh-cw" className="w-6 h-6"></i>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-rose-700 dark:text-rose-400 text-sm tracking-tight">Limpar Dados</p>
                                    <p className="text-[10px] text-rose-400 dark:text-rose-600 font-bold uppercase tracking-widest mt-1">Ação Irreversível</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-3 p-6 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                        >
                            <LogOut className="w-5 h-5" />
                            Encerrar Sessão
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
