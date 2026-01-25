import React, { useState } from 'react';
import { Transaction } from '../types';

interface FixedItemData {
    name: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    day: number;
    lastSeen: string;
    lastTransactionId: string;
    category: string;
}

interface FixedItemsProps {
    items: FixedItemData[];
    onUpdateTransaction: (tx: Transaction) => void;
    transactions: Transaction[]; // Needed to find original tx to update
}

export const FixedItems: React.FC<FixedItemsProps> = ({ items, onUpdateTransaction, transactions }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const handleEditClick = (item: FixedItemData) => {
        setEditingId(item.lastTransactionId);
        setEditValue(item.amount.toString());
    };

    const handleSave = (item: FixedItemData) => {
        // Find the original full transaction object
        const originalTx = transactions.find(t => t.id === item.lastTransactionId);
        if (!originalTx) return;

        const newAmount = parseFloat(editValue);
        if (isNaN(newAmount) || newAmount <= 0) {
            alert('Valor inválido');
            return;
        }

        onUpdateTransaction({
            ...originalTx,
            amount: newAmount
        });
        setEditingId(null);
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue('');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Controle de Fixos</h3>
                        <p className="text-sm text-slate-500">Gerencie seus valores recorrentes</p>
                    </div>
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <i data-lucide="anchor" className="w-5 h-5 text-indigo-600"></i>
                    </div>
                </div>

                <div className="space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p>Nenhum item fixo identificado ainda.</p>
                            <p className="text-xs mt-2">Marque trasnações como "Fixo" ao criar para vê-las aqui.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {items.map((item, idx) => (
                                <div key={`${item.name}-${idx}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${item.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {item.day}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-700">{item.name}</h4>
                                            <p className="text-xs text-slate-400 font-medium">{item.category}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {editingId === item.lastTransactionId ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-24 px-3 py-1.5 text-right font-bold text-slate-700 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSave(item)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                                                    <i data-lucide="check" className="w-4 h-4"></i>
                                                </button>
                                                <button onClick={handleCancel} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors">
                                                    <i data-lucide="x" className="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4 group-hover:gap-6 transition-all">
                                                <span className={`font-black text-lg ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                    R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <button
                                                    onClick={() => handleEditClick(item)}
                                                    className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Ajustar valor atual"
                                                >
                                                    <i data-lucide="edit-2" className="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <div className="flex gap-3">
                        <i data-lucide="info" className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5"></i>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                            <strong>Como funciona?</strong> O sistema identifica automaticamente seus gastos fixos com base nas descrições repetidas marcadas como "Fixo".
                            Ao alterar o valor aqui, você atualiza o lançamento mais recente, o que ajustará automaticamente a projeção de saldo deste mês.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
