import React, { useState, useEffect } from 'react';

interface VoiceInputProps {
    onResult: (text: string) => void;
    isProcessing?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onResult, isProcessing = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            setIsSupported(false);
        }
    }, []);

    const toggleListening = () => {
        if (!isSupported) {
            alert('Seu navegador não suporta reconhecimento de voz. Tente usar o Chrome ou Edge.');
            return;
        }

        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        setIsListening(true);
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error('Voice recognition error', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const stopListening = () => {
        setIsListening(false);
        // Logic to visually stop (actual stop handled by recognition instance if we kept ref, 
        // but distinct start/stop instances are safer for simple one-shot commands)
    };

    if (!isSupported) return null;

    return (
        <button
            type="button"
            onClick={toggleListening}
            disabled={isProcessing}
            className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg ${isListening
                    ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'
                }`}
            title={isListening ? 'Ouvindo... (Toque para parar)' : 'Falar Transação'}
        >
            {isListening ? (
                <span className="flex items-center gap-2">
                    <i data-lucide="mic" className="w-6 h-6"></i>
                </span>
            ) : (
                <i data-lucide="mic" className="w-6 h-6"></i>
            )}
        </button>
    );
};
