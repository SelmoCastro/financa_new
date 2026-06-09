/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { getCategoryEmoji } from '../utils/categoryIcons';

interface CategoryIconProps {
  iconName: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ iconName, className = "w-4 h-4", color }) => {
  // @ts-ignore
  const IconComponent = LucideIcons[iconName];

  if (!IconComponent) {
    // Fallback to emoji if iconName is not a valid Lucide icon
    return <span className={className}>{getCategoryEmoji(iconName)}</span>;
  }

  return <IconComponent className={className} style={{ color }} />;
};
