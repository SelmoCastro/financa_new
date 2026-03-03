import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { MessageSquare, LayoutGrid, Smartphone, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface FeedbackItem {
    id: string;
    content: string;
    platform: string;
    createdAt: string;
    user: {
        name: string;
        email: string;
    }
}

export const FeedbackAdminView: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        const loadFeedbacks = async () => {
            try {
                const response = await api.get('/feedback');
                setFeedbacks(response.data);
            } catch (error: any) {
                console.error(error);
                if (error?.response?.status === 403) {
                    addToast('Você não tem permissão para acessar esta área.', 'error');
                } else {
                    addToast('Erro ao carregar feedbacks.', 'error');
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadFeedbacks();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir este feedback?')) return;

        try {
            await api.delete(`/feedback/${id}`);
            setFeedbacks(prev => prev.filter(f => f.id !== id));
            addToast('Feedback excluído com sucesso.', 'success');
        } catch (error) {
            console.error(error);
            addToast('Erro ao excluir feedback.', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-20 bg-slate-200 rounded-3xl" />
                <div className="h-64 bg-slate-200 rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in mt-4 fade-in duration-500">
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <MessageSquare className="w-5 h-5" />
                        </span>
                        Feedback dos Usuários
                    </h3>
                </div>

                {feedbacks.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                        <div className="w-16 h-16 bg-white mx-auto rounded-3xl flex items-center justify-center shadow-lg shadow-slate-200/50 mb-6 border border-slate-100">
                            <MessageSquare className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-lg font-black text-slate-800 mb-2">Nenhum feedback recebido ainda</h4>
                        <p className="text-sm text-slate-500">Volte mais tarde.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {feedbacks.map(item => (
                            <div key={item.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 relative">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <h5 className="font-bold text-slate-800">{item.user.name || 'Sem nome'}</h5>
                                        <p className="text-xs text-slate-500">{item.user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                        <div className="flex items-center gap-1">
                                            {item.platform === 'WEB' ? <LayoutGrid className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                                            {item.platform}
                                        </div>
                                        <span className="text-slate-300">•</span>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                                            title="Excluir Feedback"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className={`p-4 bg-slate-50 rounded-2xl text-slate-700 text-sm font-medium border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors ${expandedId === item.id ? '' : 'line-clamp-2'}`}
                                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                    title="Clique para expandir/recolher"
                                >
                                    {item.content}
                                </div>
                                {item.content.length > 150 && (
                                    <div className="flex justify-center mt-2">
                                        <button
                                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                            className="text-xs font-bold text-indigo-500 flex items-center gap-1"
                                        >
                                            {expandedId === item.id ? <><ChevronUp className="w-3 h-3" /> Menos</> : <><ChevronDown className="w-3 h-3" /> Ler mais</>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
