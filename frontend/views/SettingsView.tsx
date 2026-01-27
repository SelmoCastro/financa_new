
import React from 'react';
import { LogOut } from 'lucide-react';
import { Transaction } from '../types';

interface SettingsViewProps {
    userName: string;
    transactions: Transaction[];
    onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userName, transactions, onLogout }) => {
    const handleExportData = () => {
        const dataStr = JSON.stringify(transactions, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'finanza-backup.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleResetApp = () => {
        alert('Esta funcionalidade não está disponível na versão com Banco de Dados para sua segurança.');
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right duration-500">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-800">Configurações do Perfil</h3>
                    <p className="text-sm text-slate-500 font-medium">Gerencie seus dados e preferências do sistema</p>
                </div>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome de Exibição</label>
                            <div className="relative">
                                <i data-lucide="user" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                <input
                                    type="text"
                                    value={userName}
                                    readOnly
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 cursor-not-allowed opacity-70"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moeda Padrão</label>
                            <div className="relative">
                                <i data-lucide="banknote" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                <select className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none appearance-none font-bold text-slate-700">
                                    <option>Real Brasileiro (BRL)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Gestão de Dados</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={handleExportData}
                                className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-[1.5rem] hover:bg-slate-50 transition-all group"
                            >
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <i data-lucide="download"></i>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 text-sm">Exportar Dados</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Baixar backup em JSON</p>
                                </div>
                            </button>
                            <button
                                onClick={handleResetApp}
                                className="flex items-center gap-4 p-5 bg-rose-50/30 border border-rose-100 rounded-[1.5rem] hover:bg-rose-50 transition-all group opacity-50 cursor-not-allowed"
                            >
                                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <i data-lucide="refresh-cw"></i>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-rose-700 text-sm">Resetar Sistema</p>
                                    <p className="text-[10px] text-rose-500 font-medium">Desativado (Web)</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 p-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
