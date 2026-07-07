import React from 'react';
import * as Icons from 'lucide-react';

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number;
}

export default function LucideIcon({ name, className = '', size = 20 }: LucideIconProps) {
  // Safe lookup of icon from lucide-react exports
  const IconComponent = (Icons as any)[name];
  
  if (!IconComponent) {
    // Fallback if not found
    return <Icons.Utensils className={className} size={size} />;
  }
  
  return <IconComponent className={className} size={size} />;
}

export const AVAILABLE_ICONS = [
  'Utensils',
  'CupSoda',
  'Salad',
  'Cake',
  'Pizza',
  'Coffee',
  'Beer',
  'Beef',
  'Wine',
  'IceCream',
  'Cookie',
  'Soup',
  'ChefHat',
  'Apple'
];
