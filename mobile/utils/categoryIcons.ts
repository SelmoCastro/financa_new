/**
 * Maps Lucide icon names (from backend STANDARD_CATEGORIES) to emoji.
 * Used because React Native cannot render Lucide icon names as text.
 */
const LUCIDE_TO_EMOJI: Record<string, string> = {
  // Income
  Banknote: '💰',
  TrendingUp: '📈',
  Building2: '🏦',
  RefreshCw: '🔄',
  Handshake: '🤝',
  // Needs
  Home: '🏠',
  Lightbulb: '💡',
  ShoppingCart: '🛒',
  Bus: '🚌',
  Fuel: '⛽',
  Stethoscope: '💊',
  GraduationCap: '🎓',
  Shield: '🛡️',
  FileText: '📄',
  // Wants
  Utensils: '🍽️',
  Car: '🚗',
  Clapperboard: '🎬',
  ShoppingBag: '🛍️',
  Sparkles: '✨',
  Dog: '🐕',
  Plane: '✈️',
  // Goals
  PiggyBank: '🐷',
  CreditCard: '💳',
  // System
  Wallet: '👛',
  Tag: '🏷️',
  // Fallback for any unknown
};

/**
 * Converts a Lucide icon name (from backend) to an emoji.
 * Falls back to the raw string if not mapped (e.g. already an emoji).
 */
export function getCategoryEmoji(iconName: string | undefined | null): string {
  if (!iconName) return '📌';
  const emoji = LUCIDE_TO_EMOJI[iconName];
  if (emoji) return emoji;
  // If it's already a multi-byte char (emoji), return as-is
  if (iconName.length <= 2 && /\p{Emoji}/u.test(iconName)) return iconName;
  // Unknown Lucide name — return a generic icon
  return '📌';
}