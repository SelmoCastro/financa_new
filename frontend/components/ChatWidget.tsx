import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, User, MessageCircle, Bot, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Olá! Sou seu assistente Finanza AI. Como posso ajudar com suas finanças hoje?',
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.post('/ai/chat', { message: userMsg.text });
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.data.response,
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: 'err',
                text: 'Desculpe, tive um problema ao processar sua pergunta.',
                sender: 'ai',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl transition-all duration-300 active:scale-90 flex items-center gap-2 group ${isOpen
                        ? 'bg-rose-500 text-white rotate-90 scale-110'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110'
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                {!isOpen && (
                    <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[200px] transition-all duration-500 ease-in-out font-bold text-sm pr-2">
                        Assistente AI
                    </span>
                )}
            </button>

            {/* Chat Panel */}
            <div className={`fixed bottom-24 right-6 z-50 w-[90vw] md:w-[400px] h-[70vh] max-h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-500 ease-in-out origin-bottom-right ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-90 pointer-events-none'
                }`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Finanza AI</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-indigo-100 font-medium">Online e Pronto para ajudar</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-indigo-600 shadow-sm'
                                    }`}>
                                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                </div>
                                <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${msg.sender === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                    <div className={`text-[10px] mt-2 opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-in fade-in">
                            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                <span className="text-xs font-bold text-slate-400">Pensando...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pergunte qualquer coisa..."
                        className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </>
    );
};
