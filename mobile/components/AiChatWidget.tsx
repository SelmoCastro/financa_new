import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, Pressable, Modal,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../services/api';
import * as Haptics from 'expo-haptics';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    // Mensagem inicial quando abre
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                { id: 'welcome', role: 'assistant', content: 'Olá! Sou o Finanza AI. Como posso ajudar com suas finanças hoje?' }
            ]);
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        scrollToBottom();

        try {
            // Pegar o histórico para contexto (limitando aos últimos 6)
            const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

            const res = await api.post('/ai/chat', {
                message: userMsg.content,
                history: history
            });

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data?.reply || 'Desculpe, não consegui processar sua mensagem.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Desculpe, ocorreu um erro ao conectar com o servidor.'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };

    return (
        <>
            {/* Botão Flutuante (FAB) */}
            <Pressable
                style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setIsOpen(true);
                }}
            >
                <MaterialIcons name="auto-awesome" size={24} color="white" />
            </Pressable>

            {/* Modal do Chat */}
            <Modal visible={isOpen} animationType="slide" transparent={true}>
                <SafeAreaView style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.modalContent}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <View style={styles.avatarContainer}>
                                    <MaterialIcons name="smart-toy" size={20} color="white" />
                                </View>
                                <Text style={styles.headerTitle}>Finanza AI</Text>
                            </View>
                            <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
                                <MaterialIcons name="close" size={24} color="#64748b" />
                            </Pressable>
                        </View>

                        {/* Lista de Mensagens */}
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.messagesContainer}
                            contentContainerStyle={styles.messagesContent}
                            onContentSizeChange={scrollToBottom}
                        >
                            {messages.map((msg) => (
                                <View
                                    key={msg.id}
                                    style={[
                                        styles.messageBubble,
                                        msg.role === 'user' ? styles.userBubble : styles.aiBubble
                                    ]}
                                >
                                    <Text style={[
                                        styles.messageText,
                                        msg.role === 'user' ? styles.userText : styles.aiText
                                    ]}>
                                        {msg.content}
                                    </Text>
                                </View>
                            ))}
                            {isLoading && (
                                <View style={[styles.messageBubble, styles.aiBubble, { paddingVertical: 12, paddingHorizontal: 16, width: 60 }]}>
                                    <ActivityIndicator size="small" color="#8b5cf6" />
                                </View>
                            )}
                        </ScrollView>

                        {/* Input Area */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Pergunte sobre seus gastos..."
                                placeholderTextColor="#94a3b8"
                                value={input}
                                onChangeText={setInput}
                                onSubmitEditing={sendMessage}
                                returnKeyType="send"
                            />
                            <Pressable
                                style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
                                onPress={sendMessage}
                                disabled={!input.trim() || isLoading}
                            >
                                <MaterialIcons name="send" size={20} color={input.trim() ? "white" : "#94a3b8"} />
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        zIndex: 1000,
    },
    fabPressed: {
        transform: [{ scale: 0.95 }],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#f8fafc',
        height: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#8b5cf6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    closeButton: {
        padding: 8,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    messagesContent: {
        padding: 16,
        gap: 16,
        paddingBottom: 24,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 16,
        borderRadius: 20,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#4f46e5',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: 'white',
    },
    aiText: {
        color: '#334155',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        alignItems: 'center',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1e293b',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#e2e8f0',
    }
});
