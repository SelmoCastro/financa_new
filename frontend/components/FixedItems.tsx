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
    onDeleteTransaction: (id: string) => void;
    transactions: Transaction[]; // Needed to find original tx to update
}

export const FixedItems: React.FC<FixedItemsProps> = ({ items, onUpdateTransaction, onDeleteTransaction, transactions }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', day: '', amount: '' });

    const handleEditClick = (item: FixedItemData) => {
        setEditingId(item.lastTransactionId);
        setEditForm({
            name: item.name,
            day: item.day.toString(),
            amount: item.amount.toString()
        });
    };

    const handleSave = (item: FixedItemData) => {
        const originalTx = transactions.find(t => t.id === item.lastTransactionId);
        if (!originalTx) return;

        const newAmount = parseFloat(editForm.amount);
        const newDay = parseInt(editForm.day);

        if (isNaN(newAmount) || newAmount <= 0) {
            alert('Valor inválido');
            return;
        }
        if (isNaN(newDay) || newDay < 1 || newDay > 31) {
            alert('Dia inválido (1-31)');
            return;
        }
        if (!editForm.name.trim()) {
            alert('Nome é obrigatório');
            return;
        }

        // Update Date keeping the same month/year but changing the day
        const newDate = new Date(originalTx.date);
        newDate.setDate(newDay);

        onUpdateTransaction({
            ...originalTx,
            description: editForm.name,
            amount: newAmount,
            date: newDate.toISOString()
        });
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja remover este item fixo? Isso apagará o lançamento mais recente e removerá das previsões futuras.')) {
            onDeleteTransaction(id);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
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
                                <div key={`${item.name}-${idx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md hover:border-indigo-100 group">
                                    {editingId === item.lastTransactionId ? (
                                        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center w-full">
                                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-3">
                                                <div className="md:col-span-6">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Descrição</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                        className="w-full px-3 py-2 text-slate-700 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="Nome"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Dia</label>
                                                    <input
                                                        type="number"
                                                        min="1" max="31"
                                                        value={editForm.day}
                                                        onChange={(e) => setEditForm({ ...editForm, day: e.target.value })}
                                                        className="w-full px-3 py-2 text-center text-slate-700 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div className="md:col-span-4">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Valor</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.amount}
                                                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                                        className="w-full px-3 py-2 text-right font-bold text-slate-700 bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => handleSave(item)} className="p-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm" title="Salvar">
                                                    <i data-lucide="check" className="w-4 h-4"></i>
                                                </button>
                                                <button onClick={handleCancel} className="p-2.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors" title="Cancelar">
                                                    <i data-lucide="x" className="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${item.type === 'INCOME' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                                    <span className="text-[10px] font-bold uppercase tracking-wide">Dia</span>
                                                    <span className="text-lg font-black leading-none">{item.day}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-700 text-lg">{item.name}</h4>
                                                    <p className="text-xs text-slate-400 font-medium">{item.category}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <span className={`font-black text-lg ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                    R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(item)}
                                                        className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Editar Detalhes"
                                                    >
                                                        <i data-lucide="edit-2" className="w-4 h-4"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.lastTransactionId)}
                                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Excluir Fixo"
                                                    >
                                                        <i data-lucide="trash-2" className="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <div className="flex gap-3">
                        <i data-lucide="info" className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5"></i>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                            <strong>Controle Total:</strong> Aqui você edita o lançamento mais recente de cada conta fixa.
                            Alterar o <strong>Nome</strong>, <strong>Dia</strong> ou <strong>Valor</strong> refletirá imediatamente nas suas projeções.
                            Ao <strong>Excluir</strong>, você remove o lançamento atual e o sistema deixará de considerá-lo nas previsões futuras até que apareça novamente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
