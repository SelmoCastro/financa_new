/**
 * Maps Lucide icon names (from backend STANDARD_CATEGORIES) to emoji.
 * HTML <option> elements cannot render React components, so we use emoji.
 * Mobile also uses this via categoryIcons.ts.
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
};

/**
 * Converts a Lucide icon name (from backend) to an emoji string.
 * Falls back to a generic pin if not mapped.
 * Used in <option> elements where React components can't be rendered.
 */
export function getCategoryEmoji(iconName: string | undefined | null): string {
  if (!iconName) return '📌';
  const emoji = LUCIDE_TO_EMOJI[iconName];
  if (emoji) return emoji;
  // If it's already a multi-byte char (emoji), return as-is
  if (iconName.length <= 2 && /\p{Emoji}/u.test(iconName)) return iconName;
  return '📌';
}