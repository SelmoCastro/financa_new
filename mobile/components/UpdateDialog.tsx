import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useUpdateChecker } from '../hooks/useUpdateChecker';

export function UpdateDialog() {
    const {
        hasUpdate,
        isRequired,
        versionInfo,
        currentVersion,
        dismissed,
        dismissUpdate,
        showUpdate,
        goToDownloadPage,
        errorMessage,
    } = useUpdateChecker();
    const [showToast, setShowToast] = useState(false);

    // Subtle toast when returning from background with update available
    useEffect(() => {
        if (hasUpdate && dismissed && !isRequired) {
            setShowToast(true);
            const timer = setTimeout(() => setShowToast(false), 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [hasUpdate, dismissed, isRequired]);

    // Don't show dialog if no update or explicitly dismissed (and not required).
    if (!hasUpdate || (dismissed && !isRequired)) {
        // Show subtle toast for dismissed optional updates
        if (showToast && hasUpdate && !isRequired && versionInfo) {
            return (
                <View style={styles.toastContainer}>
                    <Pressable
                        style={styles.toast}
                        onPress={() => {
                            setShowToast(false);
                            showUpdate();
                        }}
                    >
                        <Text style={styles.toastEmoji}>📦</Text>
                        <Text style={styles.toastText}>
                            v{versionInfo.version} disponível
                        </Text>
                        <Text style={styles.toastAction}>Ver</Text>
                    </Pressable>
                </View>
            );
        }
        return null;
    }

    // Format release notes as bullet points
    const renderReleaseNotes = () => {
        if (!versionInfo?.releaseNotes) return null;
        const lines = versionInfo.releaseNotes
            .split('\n')
            .filter((l: string) => l.trim());
        return lines.map((line: string, i: number) => (
            <Text key={i} style={styles.noteItem}>
                • {line.replace(/^[-•*]\s*/, '').trim()}
            </Text>
        ));
    };

    return (
<Modal visible={true} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.emoji}>🚀</Text>
                    <Text style={styles.title}>
                        {isRequired ? 'Atualização obrigatória' : 'Nova versão disponível!'}
                    </Text>
                    <Text style={styles.versionText}>
                        v{currentVersion} → v{versionInfo?.version}
                    </Text>
                    {versionInfo?.releaseNotes ? (
                        <View style={styles.notesContainer}>
                            {renderReleaseNotes()}
                        </View>
                    ) : null}
                    {errorMessage ? (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    ) : null}
                    <Pressable
                        style={[styles.button, isRequired ? styles.buttonRequired : styles.buttonOptional]}
                        onPress={goToDownloadPage}
                    >
                        <Text style={styles.buttonText}>
                            {isRequired ? 'Atualizar agora' : 'Ver atualização'}
                        </Text>
                    </Pressable>
                    <Text style={styles.hintText}>
                        A página de download abrirá no seu navegador.
                    </Text>
                    <Pressable
                        onPress={dismissUpdate}
                        style={styles.skipButton}
                    >
                        <Text style={styles.skipText}>
                            {isRequired ? 'Lembrar mais tarde' : 'Depois'}
                        </Text>
                    </Pressable>
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
    notesContainer: {
        width: '100%',
        marginBottom: 20,
        padding: 12,
        backgroundColor: 'rgba(99,102,241,0.1)',
        borderRadius: 10,
    },
    noteItem: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 20,
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
    hintText: {
        color: '#64748b',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 12,
    },
    errorText: {
        color: '#f87171',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    skipButton: {
        paddingVertical: 8,
    },
    skipText: {
        color: '#64748b',
        fontSize: 14,
    },
    toastContainer: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e3a',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#6366f1',
        gap: 8,
    },
    toastEmoji: {
        fontSize: 18,
    },
    toastText: {
        color: '#e2e8f0',
        fontSize: 14,
        flex: 1,
    },
    toastAction: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: 'bold',
    },
});