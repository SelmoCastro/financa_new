import React from 'react';
import { View, Text, Modal, Pressable, Linking, StyleSheet } from 'react-native';
import { useUpdateChecker } from '../hooks/useUpdateChecker';

export function UpdateDialog() {
    const { hasUpdate, isRequired, versionInfo, dismissed, dismissUpdate, openDownload } = useUpdateChecker();

    if (!hasUpdate || dismissed) return null;

    return (
        <Modal visible={true} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.emoji}>🚀</Text>
                    <Text style={styles.title}>
                        {isRequired ? 'Atualização obrigatória' : 'Nova versão disponível!'}
                    </Text>
                    <Text style={styles.versionText}>
                        v{versionInfo?.version} disponível (você está na versão anterior)
                    </Text>
                    {versionInfo?.releaseNotes ? (
                        <Text style={styles.notes}>{versionInfo.releaseNotes}</Text>
                    ) : null}
                    <Pressable
                        style={[styles.button, isRequired ? styles.buttonRequired : styles.buttonOptional]}
                        onPress={openDownload}
                    >
                        <Text style={styles.buttonText}>
                            {isRequired ? 'Baixar agora' : 'Baixar atualização'}
                        </Text>
                    </Pressable>
                    {!isRequired && (
                        <Pressable onPress={dismissUpdate} style={styles.skipButton}>
                            <Text style={styles.skipText}>Depois</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#1e1e3a',
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        width: '100%',
        maxWidth: 360,
        borderWidth: 1,
        borderColor: '#6366f1',
    },
    emoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    versionText: {
        color: '#a5b4fc',
        fontSize: 14,
        marginBottom: 12,
    },
    notes: {
        color: '#94a3b8',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 18,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonRequired: {
        backgroundColor: '#ef4444',
    },
    buttonOptional: {
        backgroundColor: '#6366f1',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipButton: {
        paddingVertical: 8,
    },
    skipText: {
        color: '#64748b',
        fontSize: 14,
    },
});