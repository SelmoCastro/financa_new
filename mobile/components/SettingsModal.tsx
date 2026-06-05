import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useOfflineActionGuard } from '../hooks/useOfflineActionGuard';
import { getThemePreference, setThemePreference, ThemePreference } from '../services/themePreference';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { useLanguage, AppLanguage } from '../context/LanguageContext';
import { authenticateBiometric, getBiometricLockEnabled, isBiometricProtectionAvailable, setBiometricLockEnabled } from '../services/biometricLock';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { logout, user, updateUserName, updateUserEmail } = useAuth();
  const { ensureOnline } = useOfflineActionGuard();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = React.useMemo(() => createStyles(isDark), [isDark]);
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const deleteConfirmKeyword = language === 'en' ? 'DELETE' : 'EXCLUIR';

  // Nome
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);

  // Senha
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSaving, setPassSaving] = useState(false);

  // Email
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  // Deletar conta
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePass, setDeletePass] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Tema
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [themeSaving, setThemeSaving] = useState(false);

  // Proteção do app
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricSaving, setBiometricSaving] = useState(false);

  // Sincronizar nameValue quando user muda
  React.useEffect(() => {
    if (user?.name) setNameValue(user.name);
  }, [user?.name]);

  React.useEffect(() => {
    if (!visible) return;
    getThemePreference().then(setThemePreferenceState).catch(() => setThemePreferenceState('system'));
    getBiometricLockEnabled().then(setBiometricEnabledState).catch(() => setBiometricEnabledState(false));
  }, [visible]);

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    if (!ensureOnline('atualizar seu nome')) return;
    setNameSaving(true);
    try {
      await api.patch('/auth/change-name', { name: nameValue.trim() });
      updateUserName(nameValue.trim());
      setEditingName(false);
      Alert.alert(t('settings.success'), t('settings.nameUpdated'));
    } catch (e: any) {
      Alert.alert(t('settings.error'), e?.response?.data?.message || t('settings.error'));
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPass !== confirmPass) {
      Alert.alert(t('settings.error'), t('settings.passwordMismatch'));
      return;
    }
    if (newPass.length < 8) {
      Alert.alert(t('settings.error'), t('settings.passwordTooShort'));
      return;
    }
    if (!ensureOnline('alterar sua senha')) return;
    setPassSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: currentPass, newPassword: newPass });
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setShowChangePassword(false);
      Alert.alert(t('settings.success'), t('settings.passwordUpdated'));
    } catch (e: any) {
      Alert.alert(t('settings.error'), e?.response?.data?.message || t('settings.error'));
    } finally {
      setPassSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    if (!ensureOnline('alterar seu e-mail')) return;
    setEmailSaving(true);
    try {
      const res = await api.post('/auth/change-email', { newEmail: newEmail.trim(), password: emailPass });
      updateUserEmail(newEmail.trim());
      setNewEmail(''); setEmailPass('');
      setShowChangeEmail(false);
      Alert.alert(t('settings.success'), res.data?.message || t('settings.emailUpdated'));
    } catch (e: any) {
      Alert.alert(t('settings.error'), e?.response?.data?.message || t('settings.error'));
    } finally {
      setEmailSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== deleteConfirmKeyword) {
      Alert.alert(t('settings.error'), t('settings.deleteTypeConfirm'));
      return;
    }
    if (!ensureOnline('excluir sua conta')) return;
    setDeleteSaving(true);
    try {
      await api.delete('/auth/delete-account', { data: { password: deletePass } });
      await logout();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Erro ao excluir conta');
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleThemeChange = async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    setThemeSaving(true);
    try {
      await setThemePreference(preference);
    } catch {
      Alert.alert(t('settings.error'), t('settings.themeError'));
    } finally {
      setThemeSaving(false);
    }
  };

  const handleCurrencyChange = async (nextCurrency: CurrencyCode) => {
    await setCurrency(nextCurrency);
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    await setLanguage(nextLanguage);
  };

  const handleToggleBiometric = async (nextValue: boolean) => {
    if (biometricSaving) return;

    setBiometricSaving(true);
    try {
      if (nextValue) {
        const available = await isBiometricProtectionAvailable();
        if (!available) {
          Alert.alert(t('settings.error'), t('settings.biometric.unavailable'));
          return;
        }

        const result = await authenticateBiometric({
          promptMessage: t('settings.biometric.enablePrompt'),
          cancelLabel: t('settings.cancel'),
        });

        if (!result.success) {
          return;
        }
      }

      await setBiometricLockEnabled(nextValue);
      setBiometricEnabledState(nextValue);
      Alert.alert(
        t('settings.success'),
        nextValue ? t('settings.biometric.enabled') : t('settings.biometric.disabled')
      );
    } catch {
      Alert.alert(t('settings.error'), t('settings.biometric.error'));
    } finally {
      setBiometricSaving(false);
    }
  };

  const isPremium = user?.plan === 'premium';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('settings.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* PREFERÊNCIAS */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('settings.preferences')}</Text>
              <View style={styles.preferenceBlock}>
                <Text style={styles.preferenceLabel}>{t('settings.currency')}</Text>
                <View style={styles.themeGroup}>
                  {(['BRL', 'USD', 'EUR'] as const).map((option) => {
                    const selected = currency === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.themeOption, selected && styles.themeOptionSelected]}
                        onPress={() => handleCurrencyChange(option)}
                      >
                        <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.preferenceBlock}>
                <Text style={styles.preferenceLabel}>{t('settings.language')}</Text>
                <View style={styles.themeGroup}>
                  {([
                    { key: 'pt-BR', label: t('settings.language.pt') },
                    { key: 'en', label: t('settings.language.en') },
                  ] as const).map((option) => {
                    const selected = language === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[styles.themeOption, selected && styles.themeOptionSelected]}
                        onPress={() => handleLanguageChange(option.key)}
                      >
                        <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.preferenceBlock}>
                <View style={styles.switchRow}>
                  <View style={styles.switchTextWrap}>
                    <Text style={styles.preferenceLabel}>{t('settings.biometric')}</Text>
                    <Text style={styles.helperText}>{t('settings.biometric.helper')}</Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleToggleBiometric}
                    disabled={biometricSaving}
                    trackColor={{ false: '#94a3b8', true: '#818cf8' }}
                    thumbColor={biometricEnabled ? '#4f46e5' : '#f8fafc'}
                  />
                </View>
              </View>

              <Text style={styles.helperText}>{t('settings.preferences.helper')}</Text>
            </View>

            {/* NOME */}
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('settings.displayName')}</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, editingName && styles.inputEditing]}
                  value={nameValue}
                  onChangeText={(t) => { setNameValue(t); if (!editingName) setEditingName(true); }}
                  placeholder={t('settings.namePlaceholder')}
                />
                {editingName && (
                  <TouchableOpacity
                    style={[styles.btnSmall, nameSaving && styles.btnDisabled]}
                    onPress={handleSaveName}
                    disabled={nameSaving}
                  >
                    {nameSaving ? <ActivityIndicator size="small" color="#fff" /> : (
                      <MaterialIcons name="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* TEMA */}
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('settings.appearance')}</Text>
              <View style={styles.themeGroup}>
                {([
                  { key: 'system', label: t('settings.appearance.system'), icon: 'brightness-auto' },
                  { key: 'light', label: t('settings.appearance.light'), icon: 'light-mode' },
                  { key: 'dark', label: t('settings.appearance.dark'), icon: 'dark-mode' },
                ] as const).map((option) => {
                  const selected = themePreference === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.themeOption, selected && styles.themeOptionSelected, themeSaving && styles.btnDisabled]}
                      onPress={() => handleThemeChange(option.key)}
                      disabled={themeSaving}
                    >
                      <MaterialIcons
                        name={option.icon}
                        size={18}
                        color={selected ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569')}
                      />
                      <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.helperText}>
                {themePreference === 'system'
                  ? t('settings.appearance.systemHelper')
                  : t('settings.appearance.manualHelper', {
                      theme: themePreference === 'dark'
                        ? t('settings.appearance.manualHelper.dark')
                        : t('settings.appearance.manualHelper.light'),
                    })}
              </Text>
            </View>

            {/* EMAIL */}
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('settings.email')}</Text>
              <View style={styles.row}>
                <View style={styles.emailBox}>
                  <Text style={styles.emailText} numberOfLines={1}>{user?.email || ''}</Text>
                  <MaterialIcons
                    name={user?.isEmailVerified ? "verified" : "warning"}
                    size={16}
                    color={user?.isEmailVerified ? "#10b981" : "#f59e0b"}
                  />
                </View>
                <TouchableOpacity style={styles.btnGhost} onPress={() => setShowChangeEmail(!showChangeEmail)}>
                  <Text style={styles.btnGhostText}>{t('settings.change')}</Text>
                </TouchableOpacity>
              </View>

              {showChangeEmail && (
                <View style={styles.expandBox}>
                  <TextInput style={styles.inputFull} placeholder={t('settings.newEmail')} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
                  <TextInput style={styles.inputFull} placeholder={t('settings.yourPassword')} value={emailPass} onChangeText={setEmailPass} secureTextEntry />
                  <View style={styles.rowButtons}>
                    <TouchableOpacity
                      style={[styles.btnPrimary, (!newEmail || !emailPass || emailSaving) && styles.btnDisabled]}
                      onPress={handleChangeEmail}
                      disabled={!newEmail || !emailPass || emailSaving}
                    >
                      {emailSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>{t('settings.confirm')}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSecondary} onPress={() => { setShowChangeEmail(false); setNewEmail(''); setEmailPass(''); }}>
                      <Text style={styles.btnSecondaryText}>{t('settings.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* SENHA */}
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('settings.password')}</Text>
              <TouchableOpacity style={styles.btnFull} onPress={() => setShowChangePassword(!showChangePassword)}>
                <Text style={styles.btnFullText}>{t('settings.passwordButton')}</Text>
                <MaterialIcons name={showChangePassword ? "expand-less" : "expand-more"} size={20} color="#64748b" />
              </TouchableOpacity>

              {showChangePassword && (
                <View style={styles.expandBox}>
                  <TextInput style={styles.inputFull} placeholder={t('settings.currentPassword')} value={currentPass} onChangeText={setCurrentPass} secureTextEntry />
                  <TextInput style={styles.inputFull} placeholder={t('settings.newPassword')} value={newPass} onChangeText={setNewPass} secureTextEntry />
                  <TextInput style={styles.inputFull} placeholder={t('settings.confirmPassword')} value={confirmPass} onChangeText={setConfirmPass} secureTextEntry />
                  {newPass && confirmPass && newPass !== confirmPass && (
                    <Text style={styles.errorText}>{t('settings.passwordMismatch')}</Text>
                  )}
                  <View style={styles.rowButtons}>
                    <TouchableOpacity
                      style={[styles.btnPrimary, (!currentPass || !newPass || newPass !== confirmPass || passSaving) && styles.btnDisabled]}
                      onPress={handleChangePassword}
                      disabled={!currentPass || !newPass || newPass !== confirmPass || passSaving}
                    >
                      {passSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>{t('settings.change')}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSecondary} onPress={() => { setShowChangePassword(false); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }}>
                      <Text style={styles.btnSecondaryText}>{t('settings.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* PLANO */}
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('settings.plan')}</Text>
              <View style={styles.planBox}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{isPremium ? t('settings.premiumPlan') : t('settings.freePlan')}</Text>
                  <Text style={styles.planDesc}>
                    {isPremium ? t('settings.premiumPlanDesc') : t('settings.freePlanDesc')}
                  </Text>
                </View>
                <View style={[styles.planIcon, isPremium ? styles.planIconPremium : styles.planIconFree]}>
                  <MaterialIcons name="star" size={24} color={isPremium ? "#fff" : "#94a3b8"} />
                </View>
              </View>
            </View>

            {/* EXCLUIR CONTA */}
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabelDanger}>{t('settings.deleteAccount')}</Text>
              <View style={styles.dangerBox}>
                <Text style={styles.dangerWarning}>{t('settings.deleteWarning')}</Text>
                <TouchableOpacity style={styles.btnDanger} onPress={() => setShowDeleteAccount(!showDeleteAccount)}>
                  <Text style={styles.btnDangerText}>{t('settings.delete')}</Text>
                </TouchableOpacity>
              </View>

              {showDeleteAccount && (
                <View style={styles.expandBoxDanger}>
                  <Text style={styles.dangerAlertText}>{t('settings.deleteIrreversible')}</Text>
                  <View style={styles.dangerList}>
                    <Text style={styles.dangerItem}>• Todas as transações serão excluídas</Text>
                    <Text style={styles.dangerItem}>• Contas bancárias, cartões e saldos serão apagados</Text>
                    <Text style={styles.dangerItem}>• Metas, orçamentos e categorias personalizados serão perdidos</Text>
                    <Text style={styles.dangerItem}>• Seu plano premium será cancelado sem reembolso</Text>
                  </View>
                  <TextInput style={styles.inputFullDanger} placeholder={t('settings.deletePasswordPlaceholder')} value={deletePass} onChangeText={setDeletePass} secureTextEntry />
                  <TextInput style={styles.inputFullDanger} placeholder={t('settings.deleteConfirmPlaceholder')} value={deleteConfirm} onChangeText={setDeleteConfirm} autoCapitalize="characters" />
                  <View style={styles.rowButtons}>
                    <TouchableOpacity
                      style={[styles.btnDangerSolid, (!deletePass || deleteConfirm !== deleteConfirmKeyword || deleteSaving) && styles.btnDisabled]}
                      onPress={handleDeleteAccount}
                      disabled={!deletePass || deleteConfirm !== deleteConfirmKeyword || deleteSaving}
                    >
                      {deleteSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnDangerSolidText}>{t('settings.deletePermanent')}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSecondary} onPress={() => { setShowDeleteAccount(false); setDeletePass(''); setDeleteConfirm(''); }}>
                      <Text style={styles.btnSecondaryText}>{t('settings.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* SAIR */}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.logoutButton} onPress={async () => { onClose(); await logout(); }}>
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>{t('settings.logout')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: isDark ? '#0f172a' : '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f8fafc' : '#0f172a',
  },
  scroll: {
    maxHeight: '90%',
  },
  divider: {
    height: 1,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    marginVertical: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? '#64748b' : '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionLabelDanger: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: isDark ? '#111827' : '#f8fafc',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#f8fafc' : '#0f172a',
  },
  inputEditing: {
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  inputFull: {
    backgroundColor: isDark ? '#111827' : '#fff',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#f8fafc' : '#0f172a',
  },
  inputFullDanger: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  emailBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#111827' : '#f8fafc',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  emailText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#cbd5e1' : '#64748b',
  },
  btnSmall: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#cbd5e1' : '#475569',
  },
  btnFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  btnFullText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#cbd5e1' : '#475569',
  },
  expandBox: {
    marginTop: 8,
    padding: 14,
    backgroundColor: isDark ? '#1e1b4b' : '#eef2ff',
    borderRadius: 12,
    gap: 8,
  },
  expandBoxDanger: {
    marginTop: 8,
    padding: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    gap: 8,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  btnSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#cbd5e1' : '#64748b',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  preferenceBlock: {
    gap: 8,
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: isDark ? '#e2e8f0' : '#334155',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  switchTextWrap: {
    flex: 1,
    gap: 4,
  },
  themeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#cbd5e1',
    backgroundColor: isDark ? '#111827' : '#f8fafc',
  },
  themeOptionSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#cbd5e1' : '#475569',
  },
  themeOptionTextSelected: {
    color: '#ffffff',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: isDark ? '#94a3b8' : '#64748b',
  },
  planBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#1e1b4b' : '#eef2ff',
    borderRadius: 12,
    padding: 14,
  },
  planInfo: {
    flex: 1,
    gap: 2,
  },
  planName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#6366f1',
  },
  planDesc: {
    fontSize: 11,
    color: isDark ? '#94a3b8' : '#94a3b8',
    fontWeight: '600',
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconPremium: {
    backgroundColor: '#6366f1',
  },
  planIconFree: {
    backgroundColor: '#e2e8f0',
  },
  dangerBox: {
    gap: 6,
  },
  dangerWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f87171',
    letterSpacing: 0.5,
  },
  btnDanger: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ef4444',
  },
  btnDangerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  dangerAlertText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#b91c1c',
  },
  dangerList: {
    gap: 2,
  },
  dangerItem: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  btnDangerSolid: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDangerSolidText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
});