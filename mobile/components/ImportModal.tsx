import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, Pressable, ActivityIndicator,
    ScrollView, SafeAreaView, Platform, Alert, Image, Switch, TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import * as Haptics from 'expo-haptics';

const ERROR_MESSAGES: Record<string, string> = {
    no_data_found: 'Não foi possível identificar transações neste documento. Verifique se é um comprovante financeiro válido e tente com uma imagem mais nítida.',
    unsupported_format: 'Formato não suportado. Use JPG, PNG, WEBP ou PDF.',
    rate_limit: 'Muitas solicitações em sequência. Aguarde um momento e tente novamente.',
    api_error: 'Erro temporário no serviço de IA. Tente novamente em alguns instantes.',
    service_unavailable: 'Serviço de IA indisponível no momento. Tente novamente mais tarde.',
    unknown_error: 'Erro inesperado ao processar o documento. Tente novamente.',
};

const getCategoryGroup = (name: string, type: 'INCOME' | 'EXPENSE') => {
    if (type === 'INCOME') return 'Entradas (Rendas)';

    const needs = ['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Combustível / Gasolina', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais'];
    const desires = ['Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Cuidados com Pets', 'Viagens'];
    const goals = ['Aplicações / Poupança', 'Pagamento de Dívidas'];

    if (needs.includes(name)) return 'Necessidades (Essencial)';
    if (desires.includes(name)) return 'Desejos (Estilo de Vida)';
    if (goals.includes(name)) return 'Objetivos (Quitação e Reserva)';

    return 'Outras Despesas';
};

interface ImportModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: any[];
    accounts: any[];
}

export function ImportModal({ visible, onClose, onSuccess, categories, accounts }: ImportModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [rejectedIds, setRejectedIds] = useState<string[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [fileInfo, setFileInfo] = useState<{ name: string, uri: string, type: 'ofx' | 'receipt' } | null>(null);
    const [receiptPreviewUri, setReceiptPreviewUri] = useState<string | null>(null);

    // Filter states
    const [filterType, setFilterType] = useState<'ALL' | 'NEW' | 'REJECTED'>('ALL');
    const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
    const [activeTxId, setActiveTxId] = useState<string | null>(null);
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

    const getFilteredGroups = (type: 'INCOME' | 'EXPENSE') => {
        const groups: Record<string, any[]> = {
            'Entradas (Rendas)': [],
            'Necessidades (Essencial)': [],
            'Desejos (Estilo de Vida)': [],
            'Objetivos (Quitação e Reserva)': [],
            'Outras Despesas': []
        };

        categories.forEach(cat => {
            const groupName = getCategoryGroup(cat.name, cat.type);
            if (groups[groupName]) {
                groups[groupName].push(cat);
            }
        });

        return Object.entries(groups)
            .filter(([name, items]) => {
                if (items.length === 0) return false;
                if (type === 'INCOME') return name === 'Entradas (Rendas)';
                return name !== 'Entradas (Rendas)';
            })
            .map(([name, items]) => ({ name, items }));
    };

    useEffect(() => {
        if (visible) {
            setStep(1);
            setTransactions([]);
            setRejectedIds([]);
            setFileInfo(null);
            setReceiptPreviewUri(null);
            setFilterType('ALL');
            setDuplicateIds([]);
            setIsAccountDropdownOpen(false);
            if (accounts.length > 0 && !selectedAccountId) {
                setSelectedAccountId(accounts[0].id);
            }
        }
    }, [visible, accounts]);

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/x-ofx', 'text/ofx', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            setFileInfo({ name: file.name, uri: file.uri, type: 'ofx' });
            processFile(file.uri, file.name, 'application/x-ofx', 'ofx');

        } catch (err) {
            Alert.alert('Erro', 'Falha ao selecionar arquivo');
        }
    };

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permissão necessária", "Você precisa permitir o acesso a galeria.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.7,
            });

            if (result.canceled) return;

            const asset = result.assets[0];
            // Usa mimeType do asset quando disponível, evita crash no Android
            const filename = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';

            const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
            let mimeType = asset.mimeType || 'image/jpeg';
            if (!mimeType.startsWith('image/')) {
                if (ext === 'png') mimeType = 'image/png';
                else if (ext === 'webp') mimeType = 'image/webp';
                else mimeType = 'image/jpeg';
            }

            setFileInfo({ name: filename, uri: asset.uri, type: 'receipt' });
            setReceiptPreviewUri(asset.uri);
            processFile(asset.uri, filename, mimeType, 'receipt');

        } catch (err) {
            console.error('ImagePicker error:', err);
            Alert.alert('Erro', 'Falha ao selecionar imagem. Tente novamente.');
        }
    };

    const handlePickPdf = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            setFileInfo({ name: file.name, uri: file.uri, type: 'receipt' });
            setReceiptPreviewUri(null);
            processFile(file.uri, file.name, 'application/pdf', 'receipt');

        } catch (err) {
            Alert.alert('Erro', 'Falha ao selecionar PDF');
        }
    };

    const processFile = async (uri: string, name: string, mimeType: string, type: 'ofx' | 'receipt') => {
        if (!selectedAccountId) {
            Alert.alert('Erro', 'Selecione uma conta de destino primeiro.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            // No Android, URIs content:// precisam ser tratadas;
            // No iOS, remove file:// prefix
            let fileUri = uri;
            if (Platform.OS === 'ios') {
                fileUri = uri.replace('file://', '');
            }
            formData.append('file', {
                uri: fileUri,
                name: name,
                type: mimeType,
            } as any);
            formData.append('accountId', selectedAccountId);

            const endpoint = type === 'ofx' ? '/transactions/import/validate' : '/transactions/import/receipt';

            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const fetchedTx = res.data.preview || res.data.valid || [];

            // Atribui categoria sugerida
            const processedList = fetchedTx.map((tx: any) => ({
                ...tx,
                categoryId: tx.suggestedCategoryId || tx.categoryId || null,
                selected: true,
                id: tx.id || Math.random().toString(), // fake ID for list rendering if missing
            }));

            setTransactions(processedList);
            if (res.data.duplicateFitIds) {
                setDuplicateIds(res.data.duplicateFitIds);
            }
            setStep(2);
        } catch (error: any) {
            console.error('Import error:', error);
            const errorCode = error.response?.data?.errorCode;
            const msg = ERROR_MESSAGES[errorCode] || error.response?.data?.message || 'Falha ao ler arquivo. Tente novamente.';
            Alert.alert('Erro de Importação', msg);
            setFileInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const toggleTransactionSelection = (id: string, fitId?: string) => {
        setTransactions(prev => prev.map(t => {
            if (t.id === id || t.fitId === fitId) {
                const isSelecting = !t.selected;
                // Se está desmarcando um OFX que tem fitId, adiciona aos rejeitados
                if (!isSelecting && fitId) {
                    setRejectedIds(curr => [...curr, fitId]);
                } else if (isSelecting && fitId) {
                    setRejectedIds(curr => curr.filter(item => item !== fitId));
                }
                return { ...t, selected: isSelecting };
            }
            return t;
        }));
    };

    const updateTransactionCategory = (id: string, categoryId: string) => {
        setTransactions(prev => prev.map(t =>
            t.id === id ? { ...t, categoryId } : t
        ));
    };

    const updateTransactionAmount = (id: string, rawValue: string) => {
        const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(',', '.');
        const amount = parseFloat(cleaned);
        if (!isNaN(amount) && amount >= 0) {
            setTransactions(prev => prev.map(t => t.id === id ? { ...t, amount } : t));
        }
    };

    const handleConfirm = async () => {
        const selectedTxs = transactions.filter(t => t.selected);
        if (selectedTxs.length === 0) {
            Alert.alert('Aviso', 'Nenhuma transação selecionada para importação.');
            return;
        }

        const missingCategory = selectedTxs.some(t => !t.categoryId);
        if (missingCategory) {
            Alert.alert('Atenção', 'Algumas transações estão sem categoria. Isso pode poluir os relatórios. Deseja continuar?', [
                { text: 'Revisar', style: 'cancel' },
                { text: 'Continuar', onPress: submitImport }
            ]);
            return;
        }

        submitImport();
    };

    const submitImport = async () => {
        setLoading(true);
        try {
            const selectedTxs = transactions.filter(t => t.selected).map(t => ({
                ...t,
                // Garantir accountId
                accountId: selectedAccountId
            }));

            await api.post('/transactions/import/confirm', {
                transactions: selectedTxs,
                rejectedFitIds: rejectedIds
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Sucesso', `${selectedTxs.length} transações importadas com sucesso!`);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Confirm error:', error);
            Alert.alert('Erro', 'Falha ao salvar transações no banco de dados.');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredTransactions = () => {
        switch (filterType) {
            case 'NEW': return transactions.filter(t => !duplicateIds.includes(t.fitId));
            case 'REJECTED': return transactions.filter(t => duplicateIds.includes(t.fitId));
            default: return transactions;
        }
    };

    // UI Helper for category selection
    const renderCategoryButtons = (tx: any) => {
        const cat = categories.find(c => c.id === tx.categoryId);
        const isOpen = activeTxId === tx.id;

        return (
            <View>
                <Pressable
                    onPress={() => setActiveTxId(isOpen ? null : tx.id)}
                    style={[styles.selectInput, isOpen && styles.selectInputActive]}
                >
                    <View style={styles.selectInputContent}>
                        <View style={styles.selectInputLabelRow}>
                            <MaterialIcons
                                name="category"
                                size={18}
                                color={cat ? '#4f46e5' : '#94a3b8'}
                            />
                            <Text style={[styles.selectInputText, !cat && styles.selectInputPlaceholder]}>
                                {cat ? `${cat.icon} ${cat.name}` : 'Selecione uma categoria'}
                            </Text>
                        </View>
                        <MaterialIcons
                            name={isOpen ? "expand-less" : "expand-more"}
                            size={20}
                            color="#64748b"
                        />
                    </View>
                </Pressable>

                {isOpen && (
                    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setActiveTxId(null)}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', padding: 24 }}>
                            <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 16, maxHeight: '80%' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 8 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>Escolher Categoria</Text>
                                    <Pressable onPress={() => setActiveTxId(null)} style={{ padding: 4 }}>
                                        <MaterialIcons name="close" size={24} color="#94a3b8" />
                                    </Pressable>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {getFilteredGroups(tx.type).map(group => (
                                        <View key={group.name} style={{ marginBottom: 20 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 8 }}>{group.name}</Text>
                                            <View style={{ gap: 8 }}>
                                                {group.items.map(c => (
                                                    <Pressable
                                                        key={c.id}
                                                        onPress={() => {
                                                            updateTransactionCategory(tx.id, c.id);
                                                            setActiveTxId(null);
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            padding: 16,
                                                            backgroundColor: tx.categoryId === c.id ? '#f1f5f9' : 'transparent',
                                                            borderRadius: 16,
                                                            borderWidth: 1,
                                                            borderColor: tx.categoryId === c.id ? '#e2e8f0' : 'transparent'
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 18, marginRight: 12 }}>{c.icon}</Text>
                                                        <Text style={{ fontSize: 16, fontWeight: '700', color: tx.categoryId === c.id ? '#4f46e5' : '#475569', flex: 1 }}>{c.name}</Text>
                                                        {tx.categoryId === c.id && <MaterialIcons name="check" size={20} color="#4f46e5" />}
                                                    </Pressable>
                                                ))}
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{step === 1 ? 'Importar Transações' : 'Revisar & Importar'}</Text>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <MaterialIcons name="close" size={24} color="#64748b" />
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.loadingArea}>
                        <ActivityIndicator size="large" color="#4f46e5" />
                        <Text style={styles.loadingText}>
                            {step === 1 ? 'Analisando documento com IA...' : 'Salvando transações...'}
                        </Text>
                    </View>
                ) : step === 1 ? (
                    <View style={styles.step1Container}>
                        <View style={{ zIndex: isAccountDropdownOpen ? 999 : 1, position: 'relative' }}>
                            <Text style={styles.label}>Conta de Destino</Text>
                            <Pressable
                                onPress={() => { setIsAccountDropdownOpen(!isAccountDropdownOpen); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                style={[styles.selectInput, isAccountDropdownOpen && styles.selectInputActive]}
                            >
                                <View style={styles.selectInputContent}>
                                    <View style={styles.selectInputLabelRow}>
                                        <MaterialIcons name="account-balance" size={18} color={selectedAccountId ? '#4f46e5' : '#94a3b8'} />
                                        <Text style={[styles.selectInputText, !selectedAccountId && styles.selectInputPlaceholder]}>
                                            {accounts.find(a => a.id === selectedAccountId)?.name || 'Selecione uma conta'}
                                        </Text>
                                    </View>
                                    <MaterialIcons name={isAccountDropdownOpen ? "expand-less" : "expand-more"} size={20} color="#64748b" />
                                </View>
                            </Pressable>

                            {isAccountDropdownOpen && (
                                <View style={styles.accountDropdownContainer}>
                                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                                        {accounts.map(acc => (
                                            <Pressable
                                                key={acc.id}
                                                style={[styles.dropdownItem, selectedAccountId === acc.id && styles.dropdownItemActive]}
                                                onPress={() => {
                                                    setSelectedAccountId(acc.id);
                                                    setIsAccountDropdownOpen(false);
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }}
                                            >
                                                <Text style={[styles.dropdownItemText, selectedAccountId === acc.id && styles.dropdownItemTextActive]}>
                                                    {acc.name}
                                                </Text>
                                                {selectedAccountId === acc.id && <MaterialIcons name="check" size={16} color="#4f46e5" />}
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <Text style={[styles.subLabel, { marginTop: isAccountDropdownOpen ? 180 : 16 }]}>Como você quer importar?</Text>

                        <Pressable style={styles.optionCard} onPress={handlePickDocument}>
                            <View style={styles.iconCircle}>
                                <MaterialIcons name="insert-drive-file" size={24} color="#4f46e5" />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={styles.optionTitle}>Extrato OFX / QFX</Text>
                                <Text style={styles.optionDesc}>Puxe direto do aplicativo do seu banco (Itaú, Nubank, etc)</Text>
                            </View>
                        </Pressable>

                        <Pressable style={styles.optionCard} onPress={handlePickImage}>
                            <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                                <MaterialIcons name="add-a-photo" size={24} color="#10b981" />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={styles.optionTitle}>Foto / Comprovante (IA)</Text>
                                <Text style={styles.optionDesc}>Tire foto de comprovantes Pix, TED ou notas fiscais.</Text>
                            </View>
                        </Pressable>

                        <Pressable style={styles.optionCard} onPress={handlePickPdf}>
                            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
                                <MaterialIcons name="picture-as-pdf" size={24} color="#f59e0b" />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={styles.optionTitle}>PDF / Extrato (IA)</Text>
                                <Text style={styles.optionDesc}>Importe extratos ou comprovantes em PDF para extração.</Text>
                            </View>
                        </Pressable>

                    </View>
                ) : (
                    <View style={styles.step2Container}>
                        {/* Receipt Preview */}
                        {receiptPreviewUri && fileInfo?.type === 'receipt' && (
                            <View style={styles.receiptPreviewContainer}>
                                <Image
                                    source={{ uri: receiptPreviewUri }}
                                    style={styles.receiptPreviewImage}
                                    resizeMode="contain"
                                />
                                <Text style={styles.receiptPreviewLabel}>📷 Comprovante — toque para ampliar</Text>
                            </View>
                        )}

                        <View style={styles.filterRow}>
                            <Pressable
                                style={[styles.filterChip, filterType === 'ALL' && styles.filterChipActive]}
                                onPress={() => setFilterType('ALL')}
                            >
                                <Text style={[styles.filterText, filterType === 'ALL' && styles.filterTextActive]}>Todas</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.filterChip, filterType === 'NEW' && styles.filterChipActive]}
                                onPress={() => setFilterType('NEW')}
                            >
                                <Text style={[styles.filterText, filterType === 'NEW' && styles.filterTextActive]}>Novas</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.filterChip, filterType === 'REJECTED' && styles.filterChipActive]}
                                onPress={() => setFilterType('REJECTED')}
                            >
                                <Text style={[styles.filterText, filterType === 'REJECTED' && styles.filterTextActive]}>Dúvidas / Rejeitadas</Text>
                            </Pressable>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
                            {getFilteredTransactions().map(tx => (
                                <View key={tx.id || tx.fitId} style={[styles.txCard, !tx.selected && styles.txCardDisabled]}>
                                    <View style={styles.txRow}>
                                        <Switch
                                            value={tx.selected}
                                            onValueChange={() => toggleTransactionSelection(tx.id, tx.fitId)}
                                            trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
                                            thumbColor={tx.selected ? '#4f46e5' : '#f8fafc'}
                                        />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString('pt-BR')}</Text>
                                            <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                                            <TextInput
                                                style={[styles.txAmountInput, { color: tx.amount < 0 ? '#e11d48' : '#059669' }]}
                                                value={Math.abs(tx.amount).toFixed(2)}
                                                onChangeText={(val) => updateTransactionAmount(tx.id, val)}
                                                keyboardType="decimal-pad"
                                                returnKeyType="done"
                                                underlineColorAndroid="transparent"
                                            />
                                            {duplicateIds.includes(tx.fitId) && (
                                                <View style={styles.rejectBadge}>
                                                    <Text style={{ fontSize: 10, color: '#f43f5e', fontWeight: '700' }}>⛔ Rejeitada antes</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Category Area */}
                                    <View style={styles.categoryArea}>
                                        {renderCategoryButtons(tx)}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.footer}>
                            <Pressable style={styles.btnSecondary} onPress={() => setStep(1)}>
                                <Text style={styles.btnSecondaryText}>Voltar</Text>
                            </Pressable>
                            <Pressable style={styles.btnPrimary} onPress={handleConfirm}>
                                <Text style={styles.btnPrimaryText}>
                                    Confirmar {transactions.filter(t => t.selected).length} itens
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    closeBtn: { padding: 8 },
    loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#64748b', fontWeight: '500' },

    // Step 1
    step1Container: { padding: 24, gap: 16 },
    label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 4 },
    subLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 8 },
    optionCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 20, alignItems: 'center', gap: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
    optionInfo: { flex: 1 },
    optionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    optionDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },

    // Step 2
    step2Container: { flex: 1 },
    filterRow: { flexDirection: 'row', padding: 16, gap: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
    filterChipActive: { backgroundColor: '#4f46e5' },
    filterText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    filterTextActive: { color: 'white' },

    txCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', opacity: 1 },
    txCardDisabled: { opacity: 0.5 },
    txRow: { flexDirection: 'row', alignItems: 'center' },
    txDate: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
    txDesc: { fontSize: 15, color: '#1e293b', fontWeight: '700', marginVertical: 2 },
    txAmount: { fontSize: 16, fontWeight: '800' },
    txAmountInput: { fontSize: 16, fontWeight: '800', padding: 0, borderWidth: 0, borderBottomWidth: 1, borderBottomColor: 'transparent', backgroundColor: 'transparent' },
    rejectBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#ffe4e6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

    categoryArea: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 8 },

    receiptPreviewContainer: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
    receiptPreviewImage: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#f8fafc' },
    receiptPreviewLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },
    selectInput: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    selectInputActive: {
        borderColor: '#4f46e5',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    selectInputContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectInputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectInputText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1e293b',
    },
    selectInputPlaceholder: {
        color: '#94a3b8',
        fontWeight: '500',
    },
    dropdownContainer: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderTopWidth: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        maxHeight: 200,
        zIndex: 1000,
    },
    accountDropdownContainer: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderTopWidth: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 999,
        zIndex: 999,
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
    },
    dropdownScroll: {
        padding: 4,
    },
    dropdownGroup: {
        marginBottom: 8,
    },
    dropdownGroupLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 8,
    },
    dropdownItemActive: {
        backgroundColor: '#f0f7ff',
    },
    dropdownItemText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#475569',
    },
    dropdownItemTextActive: {
        color: '#4f46e5',
        fontWeight: '700',
    },
    footer: { flexDirection: 'row', padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 12 },
    btnSecondary: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center' },
    btnSecondaryText: { color: '#475569', fontWeight: '700', fontSize: 16 },
    btnPrimary: { flex: 2, padding: 16, borderRadius: 16, backgroundColor: '#4f46e5', alignItems: 'center' },
    btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
