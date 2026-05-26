import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { Category } from '../../types';
import { parseOFX } from '../../utils/ofxParser';
import { toYYYYMMDD } from '../../utils/dateUtils';
import { ParsedTransaction, ImportMode, FilterMode, ERROR_MESSAGES } from './types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_OFX_TYPES = ['.ofx', '.qfx'];
const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

interface UseImportLogicReturn {
    step: 1 | 2;
    file: File | null;
    accountId: string;
    creditCardId: string;
    isLoading: boolean;
    aiStatus: string;
    importMode: ImportMode;
    filterMode: FilterMode;
    receiptPreviewUrl: string | null;
    parsedTxs: ParsedTransaction[];
    categories: Category[];
    rejectedCount: number;
    filteredTxs: ParsedTransaction[];
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    setFile: (f: File | null) => void;
    setAccountId: (id: string) => void;
    setCreditCardId: (id: string) => void;
    setImportMode: (m: ImportMode) => void;
    setFilterMode: (f: FilterMode) => void;
    setParsedTxs: React.Dispatch<React.SetStateAction<ParsedTransaction[]>>;
    setStep: (s: 1 | 2) => void;
    processFile: () => void;
    switchMode: (mode: ImportMode) => void;
    toggleSelect: (id: string) => void;
    updateCategory: (id: string, newCatId: string) => void;
    updateAmount: (id: string, rawValue: string) => void;
    handleSelectAll: () => void;
    handleSubmit: () => Promise<void>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
}

export function useImportLogic(
    propCategories: Category[],
    onImportSuccess: () => void,
    onClose: () => void,
): UseImportLogicReturn {
    const [step, setStep] = useState<1 | 2>(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedTxs, setParsedTxs] = useState<ParsedTransaction[]>([]);
    const [accountId, setAccountId] = useState('');
    const [creditCardId, setCreditCardId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState('');
    const [importMode, setImportMode] = useState<ImportMode>('ofx');
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [categories, setCategories] = useState<Category[]>(propCategories || []);
    useEffect(() => {
        api.get<Category[]>('/categories')
            .then(res => setCategories(res.data))
            .catch(() => setCategories(propCategories || []));
    }, [propCategories]);

    // Cleanup: revoke object URL and abort pending requests on unmount
    useEffect(() => {
        return () => {
            if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
            abortControllerRef.current?.abort();
        };
    }, [receiptPreviewUrl]);

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            // Validate by extension for OFX, or MIME type for receipts
            if (importMode === 'ofx') {
                const ext = '.' + (droppedFile.name.split('.').pop() || '').toLowerCase();
                if (!ALLOWED_OFX_TYPES.includes(ext)) {
                    alert('Formato inválido. Use arquivos .ofx ou .qfx.');
                    return;
                }
            } else {
                if (!ALLOWED_RECEIPT_TYPES.includes(droppedFile.type) && !droppedFile.type.startsWith('image/')) {
                    alert('Formato inválido. Use imagens (JPG, PNG, WebP, HEIC) ou PDF.');
                    return;
                }
            }
            if (droppedFile.size > MAX_FILE_SIZE) {
                alert('Arquivo muito grande. O limite é 10MB.');
                return;
            }
            setFile(droppedFile);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (importMode === 'ofx') {
                const ext = '.' + (selectedFile.name.split('.').pop() || '').toLowerCase();
                if (!ALLOWED_OFX_TYPES.includes(ext)) {
                    alert('Formato inválido. Use arquivos .ofx ou .qfx.');
                    e.target.value = '';
                    return;
                }
            } else {
                if (!ALLOWED_RECEIPT_TYPES.includes(selectedFile.type) && !selectedFile.type.startsWith('image/')) {
                    alert('Formato inválido. Use imagens (JPG, PNG, WebP, HEIC) ou PDF.');
                    e.target.value = '';
                    return;
                }
            }
            if (selectedFile.size > MAX_FILE_SIZE) {
                alert('Arquivo muito grande. O limite é 10MB.');
                e.target.value = '';
                return;
            }
            setFile(selectedFile);
            if (receiptPreviewUrl) {
                URL.revokeObjectURL(receiptPreviewUrl);
                setReceiptPreviewUrl(null);
            }
        }
    };

    const switchMode = (mode: ImportMode) => {
        setImportMode(mode);
        setFile(null);
        if (receiptPreviewUrl) {
            URL.revokeObjectURL(receiptPreviewUrl);
            setReceiptPreviewUrl(null);
        }
        abortControllerRef.current?.abort();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // OFX flow
    const processOfxFile = async () => {
        if (!file || !accountId) {
            alert('Selecione um arquivo e uma conta de destino.');
            return;
        }
        setIsLoading(true);
        setAiStatus('Lendo arquivo local...');
        try {
            const text = await file.text();
            const localTransactions = await parseOFX(text);
            if (localTransactions.length === 0) {
                alert('Nenhuma transação encontrada no arquivo OFX/QFX.');
                setIsLoading(false);
                setAiStatus('');
                return;
            }
            const payload = localTransactions.map(t => ({
                ...t, accountId, creditCardId: creditCardId || undefined
            }));
            setAiStatus('✨ A IA está analisando seus gastos...');
            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const response = await api.post('/transactions/import/validate', payload, {
                signal: controller.signal,
            });
            const { preview, skippedCount } = response.data;
            if (skippedCount > 0) {
                console.log(`Silent Skip: ${skippedCount} transações ignoradas (FITID já existia).`);
            }
            buildReviewScreen(preview);
        } catch (error) {
            console.error('Erro ao processar OFX:', error);
            alert('Falha ao processar o arquivo OFX.');
        } finally {
            setIsLoading(false);
            setAiStatus('');
        }
    };

    // Receipt flow
    const processReceiptFile = async () => {
        if (!file || !accountId) {
            alert('Selecione um arquivo e uma conta de destino.');
            return;
        }
        setIsLoading(true);
        setAiStatus('📷 Enviando comprovante para análise...');
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setReceiptPreviewUrl(url);
        }
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('accountId', accountId);
            if (creditCardId) formData.append('creditCardId', creditCardId);
            setAiStatus('🤖 IA extraindo dados do comprovante...');
            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const response = await api.post('/transactions/import/receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                signal: controller.signal,
            });
            const { preview, message, errorCode } = response.data;
            if (!preview || preview.length === 0) {
                const userMsg = ERROR_MESSAGES[errorCode] || message || 'Não foi possível extrair transações deste comprovante. Tente com uma imagem mais nítida.';
                alert(userMsg);
                setIsLoading(false);
                setAiStatus('');
                return;
            }
            buildReviewScreen(preview);
        } catch (error: any) {
            console.error('Erro ao processar comprovante:', error);
            const errorCode = error?.response?.data?.errorCode;
            const userMsg = ERROR_MESSAGES[errorCode] || error?.response?.data?.message || 'Falha ao processar o comprovante. Verifique se a imagem está legível.';
            alert(userMsg);
        } finally {
            setIsLoading(false);
            setAiStatus('');
        }
    };

    const processFile = () => {
        if (importMode === 'ofx') return processOfxFile();
        return processReceiptFile();
    };

    const buildReviewScreen = (preview: any[]) => {
        const uiTransactions: ParsedTransaction[] = preview.map((t: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            fitId: t.fitId,
            date: toYYYYMMDD(t.date),
            description: t.description,
            amount: t.amount,
            type: t.type,
            cnpj: t.cnpj,
            confidence: t.confidence,
            categoryLegacy: t.suggestedCategory || 'Outros',
            categoryId: t.suggestedCategoryId,
            classificationRule: t.suggestedRule || 30,
            suggestedCategory: t.suggestedCategory,
            suggestedCategoryId: t.suggestedCategoryId,
            suggestedIcon: t.suggestedIcon,
            isPotentialDuplicate: t.isFuzzyDuplicate,
            isPreviouslyRejected: t.isPreviouslyRejected,
            selected: !t.isFuzzyDuplicate &&
                !t.isPreviouslyRejected &&
                !['SALDO ANTERIOR', 'SALDO FINAL', 'RESGATE AUTOMATICO', 'APLICACAO'].some(kw => t.description?.toUpperCase().includes(kw)),
        }));
        setParsedTxs(uiTransactions);
        setFilterMode('all');
        setStep(2);
    };

    const toggleSelect = (id: string) => {
        setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
    };

    const updateCategory = (id: string, newCatId: string) => {
        const cat = categories.find(c => c.id === newCatId);
        setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, categoryId: newCatId, categoryLegacy: cat?.name || 'Outros' } : t));
    };

    const updateAmount = (id: string, rawValue: string) => {
        const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(',', '.');
        const amount = parseFloat(cleaned);
        if (!isNaN(amount) && amount >= 0) {
            setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, amount } : t));
        }
    };

    const filteredTxs = parsedTxs.filter(tx => {
        if (filterMode === 'new') return !tx.isPreviouslyRejected && !tx.isPotentialDuplicate;
        if (filterMode === 'rejected') return tx.isPreviouslyRejected;
        return true;
    });

    const handleSelectAll = () => {
        const allSelected = filteredTxs.every(t => t.selected);
        setParsedTxs(prev => prev.map(t => {
            if (filteredTxs.some(ft => ft.id === t.id)) {
                return { ...t, selected: !allSelected };
            }
            return t;
        }));
    };

    const handleSubmit = async () => {
        const selectedTxs = parsedTxs.filter(t => t.selected);
        if (selectedTxs.length === 0 || !accountId) return;
        setIsLoading(true);
        const rejectedFitIds = parsedTxs
            .filter(t => !t.selected && t.fitId)
            .map(t => t.fitId as string);
        const payload = {
            transactions: selectedTxs.map(t => ({
                description: t.description, amount: t.amount, date: t.date, type: t.type,
                fitId: t.fitId, classificationRule: t.classificationRule,
                categoryId: t.categoryId, categoryLegacy: t.categoryLegacy,
                accountId, creditCardId: creditCardId || undefined
            })),
            rejectedFitIds,
        };
        try {
            const res = await api.post('/transactions/import/confirm', payload);
            alert(`${res.data.importedCount} transações importadas com sucesso!`);
            onImportSuccess();
            onClose();
        } catch (error) {
            console.error('Erro na importação:', error);
            alert('Falha ao importar as transações. Verifique se não são duplicadas.');
        } finally {
            setIsLoading(false);
        }
    };

    const rejectedCount = parsedTxs.filter(t => t.isPreviouslyRejected).length;

    return {
        step, file, accountId, creditCardId, isLoading, aiStatus, importMode,
        filterMode, receiptPreviewUrl, parsedTxs, categories, rejectedCount, filteredTxs,
        fileInputRef, setFile, setAccountId, setCreditCardId, setImportMode, setFilterMode,
        setParsedTxs, setStep, processFile, switchMode, toggleSelect, updateCategory,
        updateAmount, handleSelectAll, handleSubmit, handleFileChange, handleDragOver, handleDrop,
    };
}