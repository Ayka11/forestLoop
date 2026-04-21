import React from 'react';
import {
  Crown,
  Leaf,
  Magnet,
  Shield,
  Star,
  Sparkles,
  Zap,
  Package,
  Gem,
  Heart,
} from 'lucide-react';

const LUCIDE_MAP: Record<string, React.ComponentType<{ size?: number | string; color?: string; className?: string }>> = {
  crown: Crown,
  leaf: Leaf,
  magnet: Magnet,
  shield: Shield,
  star: Star,
  sparkles: Sparkles,
  zap: Zap,
  package: Package,
  gem: Gem,
  heart: Heart,
};

const EMOJI_MAP: Record<string, string> = {
  fox: '🦊',
  bunny: '🐰',
  cat: '🐱',
  owl: '🦉',
  flower: '🌸',
  wizard: '🧙',
  butterfly: '🦋',
  firefly: '✨',
  bird: '🐦',
  dragon: '🐉',
  crystal: '💎',
  gold: '🌟',
  berry: '🍓',
  panda: '🐼',
  mushroom: '🍄',
  starhat: '⭐',
  slime: '🟢',
  dandelion: '🌼',
  x2: '2️⃣',
  triple: '3️⃣',
  potion: '🧪',
  rainbow: '🌈',
  candy: '🍬',
};

interface ShopItemIconProps {
  icon: string;
  color?: string;
  size?: number;
  className?: string;
}

export default function ShopItemIcon({
  icon,
  color = '#fff',
  size = 28,
  className = '',
}: ShopItemIconProps) {
  const LucideIcon = LUCIDE_MAP[icon];

  if (LucideIcon) {
    return <LucideIcon size={size} color={color} className={className} />;
  }

  const emoji = EMOJI_MAP[icon] || '✨';
  return (
    <span
      className={`inline-block select-none leading-none ${className}`}
      style={{ fontSize: size, color }}
      role="img"
      aria-label={icon}
    >
      {emoji}
    </span>
  );
}
