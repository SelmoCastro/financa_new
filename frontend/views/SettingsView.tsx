import React, { useState } from 'react';
import { LogOut, User, Mail, Lock, Trash2, Crown, Shield, ChevronDown, Check, Loader2, X } from 'lucide-react';
import { Transaction } from '../types';
import api from '../services/api';

interface SettingsViewProps {
    userName: string;
    userEmail: string;
    userPlan: string;
    transactions: Transaction[];
    onLogout: () => void;
    onNameChange?: (name: string) => void;
    onEmailChange?: (email: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userName, userEmail, userPlan, transactions, onLogout, onNameChange, onEmailChange }) => {
    // Edit name
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(userName);
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

    const handleSaveName = async () => {
        if (!nameValue.trim()) return;
        setNameSaving(true);
        try {
            await api.patch('/auth/change-name', { name: nameValue.trim() });
            setEditingName(false);
            onNameChange?.(nameValue.trim());
            showFeedback('success', 'Nome atualizado com sucesso!');
        } catch (e: any) {
            showFeedback('error', e?.response?.data?.message || 'Erro ao alterar nome');
        } finally {
            setNameSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPass !== confirmPass) {
            showFeedback('error', 'As senhas não coincidem');
            return;
        }
        if (newPass.length < 8) {
            showFeedback('error', 'A nova senha deve ter pelo menos 8 caracteres, incluindo letras e números');
            return;
        }
        setPassSaving(true);
        try {
            await api.post('/auth/change-password', { currentPassword: currentPass, newPassword: newPass });
            setCurrentPass(''); setNewPass(''); setConfirmPass('');
            setShowChangePassword(false);
            showFeedback('success', 'Senha alterada com sucesso!');
        } catch (e: any) {
            showFeedback('error', e?.response?.data?.message || 'Erro ao alterar senha');
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
            showFeedback('success', res.data?.message || 'E-mail alterado! Verifique seu novo endereço.');
        } catch (e: any) {
            showFeedback('error', e?.response?.data?.message || 'Erro ao alterar e-mail');
        } finally {
            setEmailSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteSaving(true);
        try {
            await api.delete('/auth/delete-account', { data: { password: deletePass } });
            onLogout();
        } catch (e: any) {
            showFeedback('error', e?.response?.data?.message || 'Erro ao excluir conta');
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
        } catch (error) {
            console.error('Erro ao exportar:', error);
        }
    };

    const isPremium = userPlan === 'premium';

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
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] mb-2">Conta</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Configurações</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Gerencie seus dados pessoais e plano.</p>
                </div>

                <div className="p-8 md:p-12 space-y-10">

                    {/* NOME DE EXIBIÇÃO */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <User className="w-3 h-3" /> Nome de Exibição
                        </label>
                        <div className="mt-3 flex gap-3">
                            <input
                                type="text"
                                value={nameValue}
                                onChange={(e) => { setNameValue(e.target.value); if (!editingName) setEditingName(true); }}
                                className={`flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl font-black text-slate-700 dark:text-white outline-none transition-all ${editingName ? 'border-cyan-500 ring-4 ring-cyan-500/10' : 'border-slate-200 dark:border-slate-800'}`}
                                placeholder="Seu nome"
                            />
                            {editingName && (
                                <button
                                    onClick={handleSaveName}
                                    disabled={nameSaving}
                                    className="px-6 py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Salvar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* EMAIL */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Mail className="w-3 h-3" /> E-mail
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
                                Alterar
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
                                    placeholder="Novo e-mail"
                                />
                                <input
                                    type="password"
                                    value={emailPass}
                                    onChange={(e) => setEmailPass(e.target.value)}
                                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                                    placeholder="Confirme sua senha"
                                />
                                <div className="flex gap-3">
                                    <button onClick={handleChangeEmail} disabled={emailSaving || !newEmail || !emailPass}
                                        className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                                        {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Confirmar Alteração
                                    </button>
                                    <button onClick={() => { setShowChangeEmail(false); setNewEmail(''); setEmailPass(''); }}
                                        className="px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm text-slate-500 transition-all">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SENHA */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Lock className="w-3 h-3" /> Senha
                        </label>
                        <div className="mt-3">
                            <button
                                onClick={() => setShowChangePassword(!showChangePassword)}
                                className="px-5 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 transition-all active:scale-95 w-full text-left flex items-center justify-between"
                            >
                                <span>Alterar senha de acesso</span>
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
                                    placeholder="Senha atual"
                                />
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                                    placeholder="Nova senha (mín. 8 caracteres, letras e números)"
                                />
                                <input
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                                    placeholder="Confirmar nova senha"
                                />
                                {newPass && confirmPass && newPass !== confirmPass && (
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider px-1">As senhas não coincidem</p>
                                )}
                                <div className="flex gap-3">
                                    <button onClick={handleChangePassword} disabled={passSaving || !currentPass || !newPass || newPass !== confirmPass}
                                        className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                                        {passSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Alterar Senha
                                    </button>
                                    <button onClick={() => { setShowChangePassword(false); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }}
                                        className="px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm text-slate-500 transition-all">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PLANO */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Crown className="w-3 h-3" /> Plano Atual
                        </label>
                        <div className="mt-3 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 border border-cyan-100 dark:border-cyan-500/20 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                                            {isPremium ? 'Premium' : 'Gratuito'}
                                        </span>
                                        {isPremium && (
                                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-full tracking-wider">Ativo</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                        {isPremium
                                            ? 'IA ilimitada, contas e orçamentos sem limite'
                                            : '1 pedido de IA/dia, 1 conta, 1 cartão, 3 orçamentos, 3 metas'}
                                    </p>
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isPremium ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                    <Crown className="w-7 h-7" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* EXCLUIR CONTA */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <div className="p-6 bg-rose-50/30 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-black text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
                                        <Trash2 className="w-4 h-4" /> Excluir Conta
                                    </p>
                                    <p className="text-[10px] text-rose-400 dark:text-rose-500 font-bold uppercase tracking-widest mt-1">Ação irreversível — todos os dados serão perdidos</p>
                                </div>
                                <button
                                    onClick={() => setShowDeleteAccount(!showDeleteAccount)}
                                    className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-sm transition-all active:scale-95"
                                >
                                    Excluir
                                </button>
                            </div>

                            {showDeleteAccount && (
                                <div className="mt-4 pt-4 border-t border-rose-100 dark:border-rose-500/20 space-y-4">
                                    <div className="p-4 bg-rose-100/50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/30 space-y-2">
                                        <p className="text-sm text-rose-700 dark:text-rose-300 font-black">
                                            ⚠️ Esta ação é irreversível!
                                        </p>
                                        <ul className="text-xs text-rose-600 dark:text-rose-400 font-semibold space-y-1 list-disc list-inside">
                                            <li>Todas as suas transações serão excluídas</li>
                                            <li>Contas bancárias, cartões e saldos serão apagados</li>
                                            <li>Metas, orçamentos e categorias personalizados serão perdidos</li>
                                            <li>Seu plano premium será cancelado sem reembolso</li>
                                            <li>Não será possível recuperar os dados depois</li>
                                        </ul>
                                    </div>

                                    <input
                                        type="password"
                                        value={deletePass}
                                        onChange={(e) => setDeletePass(e.target.value)}
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-500/30 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500"
                                        placeholder="Digite sua senha para confirmar"
                                    />

                                    <div>
                                        <label className="text-xs font-black text-rose-500 uppercase tracking-widest mb-2 block">
                                            Digite <span className="bg-rose-600 text-white px-2 py-0.5 rounded-lg mx-1">EXCLUIR</span> para confirmar
                                        </label>
                                        <input
                                            type="text"
                                            value={deleteConfirm}
                                            onChange={(e) => setDeleteConfirm(e.target.value)}
                                            className="w-full px-5 py-4 bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-500/30 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                            placeholder="EXCLUIR"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={handleDeleteAccount} disabled={deleteSaving || !deletePass || deleteConfirm !== 'EXCLUIR'}
                                            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                            {deleteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            Excluir Permanentemente
                                        </button>
                                        <button onClick={() => { setShowDeleteAccount(false); setDeletePass(''); setDeleteConfirm(''); }}
                                            className="px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm text-slate-500 transition-all">
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DADOS */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 ml-1">Manutenção & Dados</h4>
                        <button
                            onClick={handleExportData}
                            className="flex items-center gap-6 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group shadow-sm active:scale-95 w-full"
                        >
                            <div className="w-14 h-14 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </div>
                            <div className="text-left">
                                <p className="font-black text-slate-800 dark:text-white text-sm tracking-tight">Exportar Tudo</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Backup em CSV</p>
                            </div>
                        </button>
                    </div>

                    {/* LOGOUT */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-3 p-6 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                        >
                            <LogOut className="w-5 h-5" />
                            Encerrar Sessão
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};