import React, { useState } from 'react';
import { View, Text, TextInput, Modal, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../services/api';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) {
            Alert.alert('Atenção', 'Por favor, escreva alguma mensagem antes de enviar.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/feedback', {
                content: content.trim(),
                platform: 'MOBILE'
            });
            Alert.alert('Sucesso', 'Feedback enviado com sucesso! Obrigado.');
            setContent('');
            onClose();
        } catch (error) {
            console.error('Erro ao enviar feedback:', error);
            Alert.alert('Erro', 'Não foi possível enviar seu feedback. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <View style={styles.iconBox}>
                            <MaterialIcons name="rate-review" size={24} color="#4f46e5" />
                        </View>
                        <Text style={styles.title}>Deixar Feedback</Text>
                    </View>

                    <Text style={styles.label}>O que você achou do app? Tem alguma sugestão?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Escreva sua ideia, elogio ou relato de bug..."
                        placeholderTextColor="#94a3b8"
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                    />

                    <View style={styles.footerRow}>
                        <Pressable style={styles.btnCancel} onPress={onClose}>
                            <Text style={styles.btnCancelText}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.btnSubmit, loading && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnSubmitText}>Enviar</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 15, color: '#334155', height: 120, marginBottom: 24 },
    footerRow: { flexDirection: 'row', gap: 12 },
    btnCancel: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    btnCancelText: { fontSize: 15, fontWeight: 'bold', color: '#475569' },
    btnSubmit: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    btnSubmitText: { fontSize: 15, fontWeight: 'bold', color: '#fff' }
});
