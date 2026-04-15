import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, User, MessageCircle, Bot, Loader2, Zap } from 'lucide-react';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

const QUICK_SUGGESTIONS = [
    "Resumo deste mês",
    "Gastei muito com o quê?",
    "Dicas de economia",
    "Previsão de fechamento"
];

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

    const handleSend = async (e?: React.FormEvent, predefinedText?: string) => {
        if (e) e.preventDefault();

        const messageText = predefinedText || input;

        if (!messageText.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: messageText,
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
                className={`fixed bottom-24 lg:bottom-6 right-6 z-[999] p-4 rounded-2xl shadow-2xl transition-all duration-300 active:scale-90 flex items-center gap-2 group ${isOpen
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
            <div className={`fixed bottom-40 lg:bottom-24 right-6 z-[999] w-[90vw] md:w-[450px] h-[65vh] lg:h-[75vh] max-h-[700px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-500 ease-in-out origin-bottom-right ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-90 pointer-events-none'
                }`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white flex items-center justify-between shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl relative">
                            <Bot className="w-6 h-6" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-indigo-700"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Finanza AI</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-indigo-100 font-medium">Mentor Financeiro Virtual</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-xl">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-indigo-600 shadow-sm'
                                    }`}>
                                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                </div>
                                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                                    : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none prose prose-sm prose-slate prose-p:leading-normal prose-headings:mb-2 prose-headings:mt-0 prose-li:my-0'
                                    }`}>
                                    {msg.sender === 'ai' ? (
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    ) : (
                                        msg.text
                                    )}
                                    <div className={`text-[10px] mt-2 opacity-50 ${msg.sender === 'user' ? 'text-right text-indigo-200' : 'text-left text-slate-400 font-medium'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-in fade-in">
                            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                <span className="text-xs font-bold text-slate-500">Finanza AI está pensando...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestions */}
                {messages.length < 5 && !isLoading && (
                    <div className="px-4 py-3 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-hide">
                        {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(undefined, suggestion)}
                                className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold rounded-full hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center gap-1.5"
                            >
                                <Zap className="w-3 h-3" />
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pergunte qualquer coisa sobre suas finanças..."
                        className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </>
    );
};

