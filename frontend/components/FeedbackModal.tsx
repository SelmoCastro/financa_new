import React, { useState, useEffect } from 'react';
import { X, MessageSquareHeart } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface FeedbackModalProps {
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsLoading(true);
        try {
            await api.post('/feedback', {
                content: content.trim(),
                platform: 'WEB'
            });
            addToast('Feedback enviado com sucesso! Muito obrigado.', 'success');
            onClose();
        } catch (error) {
            console.error('Erro ao enviar feedback:', error);
            addToast('Ocorreu um erro ao enviar seu feedback.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                <div className="px-8 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Comunicação</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                                <MessageSquareHeart className="w-6 h-6" />
                            </div>
                            Feedback
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all active:scale-95">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Sua mensagem é muito importante</label>
                        <textarea
                            required
                            rows={6}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-5 text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none text-base leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            placeholder="Escreva aqui sua ideia, elogio ou relato de algum bug..."
                        />
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-6 py-5 text-white font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Enviando...' : 'Enviar Feedback'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
