/**
 * Tela principal do frontend para Settings; reúne estado visual, ações do usuário e composição de componentes.
 */
import React, { useEffect, useState } from 'react';
import { LogOut, User, Mail, Lock, Trash2, Crown, Shield, ChevronDown, Check, Loader2, X, Sparkles, Globe } from 'lucide-react';
import { Transaction } from '../types';
import api from '../services/api';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { useLanguage, AppLanguage, AppLocale } from '../context/LanguageContext';

const SUPPORTED_CURRENCIES: CurrencyCode[] = ['BRL', 'USD', 'EUR'];
const SUPPORTED_LANGUAGES: AppLanguage[] = ['pt-BR', 'en'];
const SUPPORTED_LOCALES: AppLocale[] = ['pt-BR', 'en-US', 'pt-PT', 'de-DE', 'en-IE'];

interface SettingsViewProps {
    userName?: string;
    userEmail?: string;
    userPlan?: string;
    transactions?: Transaction[];
    onLogout?: () => void;
    onNameChange?: (name: string) => void;
    onEmailChange?: (email: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userName, userEmail, userPlan, transactions, onLogout, onNameChange, onEmailChange }) => {
    const { currency, setCurrency } = useCurrency();
    const { language, setLanguage, locale, setLocale, t } = useLanguage();
    // Edit name
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(userName ?? '');
    const [nameSaving, setNameSaving] = useState(false);

    // Change password
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [passSaving, setPassSaving] = useState(false);

    // Change email
    const [showChangeEmail, setShowChangeEmail] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailPass, setEmailPass] = useState('');
    const [emailSaving, setEmailSaving] = useState(false);

    // Delete account
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [deletePass, setDeletePass] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [deleteSaving, setDeleteSaving] = useState(false);

    // Feedback
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const handlePreferenceChange = async (change: () => void | Promise<void>) => {
        try {
            await change();
            showFeedback('success', t('settings.preferencesSaved'));
        } catch {
            showFeedback('error', t('settings.preferencesError'));
        }
    };

    const handleSaveName = async () => {
        if (!nameValue.trim()) return;
        setNameSaving(true);
        try {
            const nextName = nameValue.trim();
            await api.patch('/auth/change-name', { name: nextName });
            setEditingName(false);
            setNameValue(nextName);
            onNameChange?.(nextName);
            showFeedback('success', t('settings.success.name'));
        } catch (e: any) {
            showFeedback('error', e?.response?.data?.message || t('settings.error.name'));
        } finally {
            setNameSaving(false);
        }
    };

    useEffect(() => {
        if (!editingName) {
            setNameValue(userName ?? '');
        }
    }, [userName, editingName]);

    const handleChangePassword = async () => {
        if (newPass !== confirmPass) {
            showFeedback('error', t('settings.passwordMismatch'));
            return;
        }
        if (newPass.length < 8) {
            showFeedback('error', t('settings.error.passwordLength'));
            return;
        }
        setPassSaving(true);
        try {
            await api.post('/auth/change-password', { currentPassword: currentPass, newPassword: newPass });
            setCurrentPass(''); setNewPass(''); setConfirmPass('');
            setShowChangePassword(false);
            showFeedback('success', t('settings.success.password'));
        } catch (e: any) {
            showFeedback('error', e?.response?.data?.message || t('settings.error.password'));
        } finally {
            setPassSaving(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!newEmail.trim()) return;
        setEmailSaving(true);
        try {
            const res = await api.post('/auth/change-email', { newEmail: newEmail.trim(), password: emailPass });
            setNewEmail(''); setEmailPass('');
            setShowChangeEmail(false);
            onEmailChange?.(newEmail.trim());
            showFeedback('success', res.data?.message || t('settings.success.email'));
        } catch (e: any) {
            showFeedback('error', e?.response?.data?.message || t('settings.error.email'));
        } finally {
            setEmailSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirm.trim().toUpperCase() !== deleteConfirmKeyword) return;
        setDeleteSaving(true);
        try {
            await api.delete('/auth/delete-account', { data: { password: deletePass } });
            onLogout();
        } catch (e: any) {
            showFeedback('error', e?.response?.data?.message || t('settings.deleteError'));
            setDeleteSaving(false);
        }
    };

    const handleExportData = async () => {
        try {
            const response = await api.get('/transactions/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'finanza-export.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            showFeedback('success', t('settings.exportSuccess'));
        } catch (error) {
            console.error(t('settings.exportError'), error);
        }
    };

    // LGPD: data portability right — full personal data export (JSON)
    const handleExportAllData = async () => {
        try {
            const response = await api.get('/auth/export-data', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'finanza-personal-data.json');
            document.body.appendChild(link);
            link.click();
            link.remove();
            showFeedback('success', t('settings.exportPersonalDataSuccess'));
        } catch (error) {
            showFeedback('error', t('settings.exportError'));
        }
    };

    const isPremium = userPlan === 'premium';
    const deleteConfirmKeyword = t('settings.deleteConfirmPlaceholder').toUpperCase();
    const getLanguageLabel = (option: AppLanguage) => (option === 'pt-BR' ? t('settings.language.pt') : t('settings.language.en'));
    const getLocaleLabel = (option: AppLocale) => {
        switch (option) {
            case 'pt-BR': return t('settings.locale.ptBR');
            case 'en-US': return t('settings.locale.enUS');
            case 'pt-PT': return t('settings.locale.ptPT');
            case 'de-DE': return t('settings.locale.deDE');
            case 'en-IE': return t('settings.locale.enIE');
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right duration-700">
            {/* Feedback toast */}
            {feedback && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {feedback.message}
                </div>
            )}

            <div className="glass-card rounded-2xl md:rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden">
                {/* Header */}
                <div className="p-8 md:p-12 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] mb-2">{t('common.management')}</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('settings.title')}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('settings.subtitle')}</p>
                </div>

                <div className="p-8 md:p-12 space-y-10">

                    <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Globe className="w-3 h-3" /> {t('settings.preferences')}
                        </label>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 mb-2">{t('settings.currency')}</label>
                                <select
                                    value={currency}
                                    onChange={(e) => { void handlePreferenceChange(() => setCurrency(e.target.value as CurrencyCode)); }}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-700 dark:text-white outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                                >
                                    {SUPPORTED_CURRENCIES.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 mb-2">{t('settings.language')}</label>
                                <select
                                    value={language}
                                    onChange={(e) => { void handlePreferenceChange(() => setLanguage(e.target.value as AppLanguage)); }}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-700 dark:text-white outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                                >
                                    {SUPPORTED_LANGUAGES.map((option) => (
                                        <option key={option} value={option}>{getLanguageLabel(option)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 mb-2">{t('settings.locale')}</label>
                                <select
                                    value={locale}
                                    onChange={(e) => { void handlePreferenceChange(() => setLocale(e.target.value as AppLocale)); }}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-slate-700 dark:text-white outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                                >
                                    {SUPPORTED_LOCALES.map((option) => (
                                        <option key={option} value={option}>{getLocaleLabel(option)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-3">{t('settings.preferences.helper')}</p>
                    </div>

                    {/* Display name */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <User className="w-3 h-3" /> {t('settings.displayName')}
                        </label>
                        <div className="mt-3 flex gap-3">
                            <input
                                type="text"
                                value={nameValue}
                                onChange={(e) => { setNameValue(e.target.value); if (!editingName) setEditingName(true); }}
                                className={`flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl font-black text-slate-700 dark:text-white outline-none transition-all ${editingName ? 'border-cyan-500 ring-4 ring-cyan-500/10' : 'border-slate-200 dark:border-slate-800'}`}
                                placeholder={t('settings.namePlaceholder')}
                            />
                            {editingName && (
                                <button
                                    onClick={handleSaveName}
                                    disabled={nameSaving}
                                    className="px-6 py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {t('common.save')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Mail className="w-3 h-3" /> {t('settings.email')}
                        </label>
                        <div className="mt-3 flex items-center gap-4">
                            <div className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3">
                                <span className="truncate">{userEmail}</span>
                                <Shield className={`w-4 h-4 flex-shrink-0 ${true ? 'text-emerald-500' : 'text-amber-500'}`} />
                            </div>
                            <button
                                onClick={() => setShowChangeEmail(!showChangeEmail)}
                                className="px-5 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                            >
                                {t('common.change')}
                            </button>
                        </div>

                        {/* Change email form */}
                        {showChangeEmail && (
                            <div className="mt-4 p-6 bg-cyan-50/50 dark:bg-cyan-500/5 border border-cyan-100 dark:border-cyan-500/20 rounded-2xl space-y-4">
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                                    placeholder={t('settings.newEmail')}
                                />
                                <input
                                    type="password"
                                    value={emailPass}
                                    onChange={(e) => setEmailPass(e.target.value)}
                                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                                    placeholder={t('settings.confirmPasswordCurrent')}
                                />
                                <div className="flex gap-3">
                                    <button onClick={handleChangeEmail} disabled={emailSaving || !newEmail || !emailPass}
                                        className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                                        {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        {t('settings.confirmEmailChange')}
                                    </button>
                                    <button onClick={() => { setShowChangeEmail(false); setNewEmail(''); setEmailPass(''); }}
                                        className="px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm text-slate-500 transition-all">
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Lock className="w-3 h-3" /> {t('settings.password')}
                        </label>
                        <div className="mt-3">
                            <button
                                onClick={() => setShowChangePassword(!showChangePassword)}
                                className="px-5 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 transition-all active:scale-95 w-full text-left flex items-center justify-between"
                            >
                                <span>{t('settings.passwordButton')}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showChangePassword ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {showChangePassword && (
                            <div className="mt-4 p-6 bg-cyan-50/50 dark:bg-cyan-500/5 border border-cyan-100 dark:border-cyan-500/20 rounded-2xl space-y-4">
                                <input
                                    type="password"
                                    value={currentPass}
                                    onChange={(e) => setCurrentPass(e.target.value)}
                                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                                    placeholder={t('settings.currentPassword')}
                                />
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                                    placeholder={t('settings.newPassword')}
                                />
                                <input
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                                    placeholder={t('settings.confirmPassword')}
                                />
                                {newPass && confirmPass && newPass !== confirmPass && (
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider px-1">{t('settings.passwordMismatch')}</p>
                                )}
                                <div className="flex gap-3">
                                    <button onClick={handleChangePassword} disabled={passSaving || !currentPass || !newPass || newPass !== confirmPass}
                                        className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                                        {passSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        {t('settings.changePassword')}
                                    </button>
                                    <button onClick={() => { setShowChangePassword(false); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }}
                                        className="px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm text-slate-500 transition-all">
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Plan */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Crown className="w-3 h-3" /> {t('settings.plan')}
                        </label>
                        <div className="mt-3 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 border border-cyan-100 dark:border-cyan-500/20 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                                            {isPremium ? t('settings.plan.premium') : t('settings.plan.free')}
                                        </span>
                                        {isPremium && (
                                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-full tracking-wider">{t('common.active')}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                        {isPremium
                                            ? t('settings.plan.premiumDesc')
                                            : t('settings.plan.freeDesc')}
                                    </p>
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isPremium ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                    <Crown className="w-7 h-7" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Delete account */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <div className="p-6 bg-rose-50/30 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-black text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
                                        <Trash2 className="w-4 h-4" /> {t('settings.deleteAccount')}
                                    </p>
                                    <p className="text-[10px] text-rose-400 dark:text-rose-500 font-bold uppercase tracking-widest mt-1">{t('settings.deleteAccountDesc')}</p>
                                </div>
                                <button
                                    onClick={() => setShowDeleteAccount(!showDeleteAccount)}
                                    className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-sm transition-all active:scale-95"
                                >
                                    {t('settings.delete')}
                                </button>
                            </div>

                            {showDeleteAccount && (
                                <div className="mt-4 pt-4 border-t border-rose-100 dark:border-rose-500/20 space-y-4">
                                    <div className="p-4 bg-rose-100/50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/30 space-y-2">
                                        <p className="text-sm text-rose-700 dark:text-rose-300 font-black">
                                            {t('settings.deleteWarning')}
                                        </p>
                                        <ul className="text-xs text-rose-600 dark:text-rose-400 font-semibold space-y-1 list-disc list-inside">
                                            {t('settings.deleteItems').split('\\n').map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <input
                                        type="password"
                                        value={deletePass}
                                        onChange={(e) => setDeletePass(e.target.value)}
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-500/30 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500"
                                        placeholder={t('settings.deletePasswordPlaceholder')}
                                    />

                                    <div>
                                        <label className="text-xs font-black text-rose-500 uppercase tracking-widest mb-2 block">
                                            {t('settings.deleteConfirmLabel')}
                                        </label>
                                        <input
                                            type="text"
                                            value={deleteConfirm}
                                            onChange={(e) => setDeleteConfirm(e.target.value)}
                                            className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-500/30 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                            placeholder={t('settings.deleteConfirmPlaceholder')}
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={handleDeleteAccount} disabled={deleteSaving || !deletePass || deleteConfirm.trim().toUpperCase() !== deleteConfirmKeyword}
                                            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                            {deleteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            {t('settings.deletePermanently')}
                                        </button>
                                        <button onClick={() => { setShowDeleteAccount(false); setDeletePass(''); setDeleteConfirm(''); }}
                                            className="px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm text-slate-500 transition-all">
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 ml-1">{t('settings.maintenance')}</h4>
                        <div className="space-y-4">
                            <button
                                onClick={handleExportData}
                                className="flex items-center gap-6 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group shadow-sm active:scale-95 w-full"
                            >
                                <div className="w-14 h-14 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{t('settings.exportTransactions')}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">{t('settings.exportCSV')}</p>
                                </div>
                            </button>
                            <button
                                onClick={handleExportAllData}
                                className="flex items-center gap-6 p-6 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-[2rem] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group shadow-sm active:scale-95 w-full"
                            >
                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{t('settings.exportPersonalData')}</p>
                                    <p className="text-[10px] text-indigo-400 dark:text-indigo-500 font-bold uppercase tracking-widest mt-1">{t('settings.exportLGPD')}</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* LOGOUT */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-3 p-6 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                        >
                            <LogOut className="w-5 h-5" />
                            {t('settings.logout')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
