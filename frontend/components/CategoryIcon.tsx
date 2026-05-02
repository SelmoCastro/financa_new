import React from 'react';
import * as LucideIcons from 'lucide-react';

interface CategoryIconProps {
  iconName: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ iconName, className = "w-4 h-4", color }) => {
  // @ts-ignore
  const IconComponent = LucideIcons[iconName];

  if (!IconComponent) {
    // Fallback if iconName is an emoji or invalid
    return <span className={className}>{iconName}</span>;
  }

  return <IconComponent className={className} style={{ color }} />;
};
