import React, { useState } from 'react';
import api from '../services/api';

interface AccountFormProps {
    onSave: () => void;
    onClose: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({ onSave, onClose }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('CHECKING');
    const [balance, setBalance] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.post('/accounts', {
                name,
                type,
                balance: Number(balance),
            });
            onSave();
        } catch (error) {
            console.error('Erro ao salvar conta', error);
            alert('Erro ao salvar conta. Verifique os dados.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <i data-lucide="wallet" className="w-5 h-5"></i>
                        </div>
                        Adicionar Conta
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <i data-lucide="x" className="w-5 h-5"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nome da Instituição ou Local</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                            placeholder="Ex: Banco Itaú, Carteira..."
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Conta</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="CHECKING">Conta Corrente</option>
                            <option value="SAVINGS">Conta Poupança</option>
                            <option value="INVESTMENT">Corretora / Investimentos</option>
                            <option value="WALLET">Carteira (Dinheiro Físico)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Saldo Inicial Atual</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={balance}
                                onChange={e => setBalance(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                                placeholder="0,00"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 ml-1">Para garantir consistência, preencha o saldo real que se encontra nesta conta neste momento.</p>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Salvando...' : 'Criar Conta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
