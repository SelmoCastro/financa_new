import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const triggerHaptic = {
  success: async () => {
    if (isWeb) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error: async () => {
    if (isWeb) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  warning: async () => {
    if (isWeb) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  selection: async () => {
    if (isWeb) return;
    await Haptics.selectionAsync();
  },
  impactLight: async () => {
    if (isWeb) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  impactMedium: async () => {
    if (isWeb) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  impactHeavy: async () => {
    if (isWeb) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
};
