import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../services/api';
import * as Haptics from 'expo-haptics';

export function InviteNotification() {
    const [invites, setInvites] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const [acceptingInvite, setAcceptingInvite] = useState<any>(null);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const fetchData = async () => {
        try {
            const [inviteRes, accRes, catRes] = await Promise.all([
                api.get('/social/invites'),
                api.get('/accounts'),
                api.get('/categories')
            ]);
            setInvites(inviteRes.data);
            setAccounts(accRes.data);
            setCategories(catRes.data);
        } catch (error) {
            console.error('Failed to fetch social data', error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleAccept = async () => {
        if (!selectedAccount || !selectedCategory) {
            Alert.alert('Ação necessária', 'Selecione uma conta e categoria.');
            return;
        }

        setLoading(true);
        try {
            await api.post(`/social/invites/${acceptingInvite.id}/accept`, {
                accountId: selectedAccount,
                categoryId: selectedCategory
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setInvites(invites.filter(i => i.id !== acceptingInvite.id));
            setAcceptingInvite(null);
            Alert.alert('Sucesso', 'Lançamento adicionado ao seu extrato!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível aceitar este lançamento.');
        } finally {
            setLoading(false);
        }
    };

    if (invites.length === 0) return null;

    return (
        <View style={styles.container}>
            <Pressable
                onPress={() => { setModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={styles.pill}
            >
                <MaterialIcons name="notifications-active" size={16} color="white" />
                <Text style={styles.pillText}>{invites.length} {invites.length === 1 ? 'pendência' : 'pendências'}</Text>
            </Pressable>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Lançamentos Compartilhados</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#64748b" />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.scroll}>
                            {invites.map(invite => (
                                <View key={invite.id} style={styles.inviteCard}>
                                    <View style={styles.inviteRow}>
                                        <View style={[styles.iconContainer, { backgroundColor: invite.type === 'EXPENSE' ? '#ecfdf5' : '#fff1f2' }]}>
                                            <MaterialIcons
                                                name={invite.type === 'EXPENSE' ? 'arrow-downward' : 'arrow-upward'}
                                                size={18}
                                                color={invite.type === 'EXPENSE' ? '#059669' : '#e11d48'}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.senderText}>{invite.sender?.name || invite.sender?.email}</Text>
                                            <Text style={styles.descText}>{invite.description}</Text>
                                            <Text style={styles.valueText}>R$ {invite.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                                        </View>
                                    </View>

                                    {acceptingInvite?.id === invite.id ? (
                                        <View style={styles.formContainer}>
                                            <Text style={styles.label}>ONDE CREDITAR/DEBITAR?</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                                {accounts.map(acc => (
                                                    <Pressable
                                                        key={acc.id}
                                                        onPress={() => setSelectedAccount(acc.id)}
                                                        style={[styles.chip, selectedAccount === acc.id && styles.chipActive]}
                                                    >
                                                        <Text style={[styles.chipText, selectedAccount === acc.id && styles.chipTextActive]}>{acc.name}</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>

                                            <Text style={[styles.label, { marginTop: 12 }]}>CATEGORIA</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                                {categories.filter(c => c.type === (invite.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE')).map(cat => (
                                                    <Pressable
                                                        key={cat.id}
                                                        onPress={() => setSelectedCategory(cat.id)}
                                                        style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
                                                    >
                                                        <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>{cat.icon} {cat.name}</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>

                                            <View style={styles.btnRow}>
                                                <Pressable onPress={() => setAcceptingInvite(null)} style={[styles.btn, styles.btnGhost]}>
                                                    <Text style={styles.btnGhostText}>Voltar</Text>
                                                </Pressable>
                                                <Pressable onPress={handleAccept} disabled={loading} style={[styles.btn, styles.btnConfirm]}>
                                                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnConfirmText}>Confirmar</Text>}
                                                </Pressable>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.btnRow}>
                                            <Pressable
                                                onPress={() => { setAcceptingInvite(invite); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                                                style={[styles.btn, styles.btnAction]}
                                            >
                                                <Text style={styles.btnActionText}>ACEITAR</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    pill: {
        backgroundColor: '#4f46e5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'center',
    },
    pillText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        minHeight: '60%',
        maxHeight: '90%',
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1e293b',
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    inviteCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    inviteRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    senderText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1e293b',
    },
    descText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    valueText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1e293b',
        marginTop: 4,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    btn: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnAction: {
        backgroundColor: '#4f46e5',
    },
    btnActionText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '900',
    },
    formContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        marginBottom: 6,
        letterSpacing: 1,
    },
    chipScroll: {
        marginHorizontal: -4,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginHorizontal: 4,
    },
    chipActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    chipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
    },
    chipTextActive: {
        color: 'white',
    },
    btnConfirm: {
        backgroundColor: '#10b981',
        flex: 2,
    },
    btnConfirmText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 11,
    },
    btnGhost: {
        backgroundColor: '#f1f5f9',
    },
    btnGhostText: {
        color: '#64748b',
        fontWeight: '700',
        fontSize: 11,
    },
});
