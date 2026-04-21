import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { X, Info, Sparkles, Shield, Zap } from 'lucide-react';

const EDUCATION_CONTENT = {
  leafToken: {
    title: 'Leaf Token',
    description: 'Primary currency for the shop',
    tip: 'Collect these to buy skins, hats, and pets!'
  },
  flower: {
    title: 'Flower',
    description: 'Crafting resource',
    tip: 'Used in crafting recipes for building items'
  },
  mushroom_powerup: {
    title: 'Super Mushroom',
    description: 'Makes you bigger and stronger',
    tip: '1.5x size for 10 seconds'
  },
  star: {
    title: 'Star Power',
    description: 'Temporary invincibility',
    tip: 'Run through enemies without taking damage'
  },
  fireFlower: {
    title: 'Fire Flower',
    description: 'Enhanced abilities',
    tip: 'Shoot fire projectiles at enemies'
  },
  leafWings: {
    title: 'Leaf Wings',
    description: 'Gliding capability',
    tip: 'Hold jump to glide through the air'
  },
  speedBoots: {
    title: 'Speed Boots',
    description: 'Movement speed boost',
    tip: 'Run faster and jump higher'
  },
  shield: {
    title: 'Shield',
    description: 'One-hit protection',
    tip: 'Blocks damage from one enemy or hazard'
  },
};

interface EducationOverlayProps {
  visible: boolean;
  item: string;
  position: { x: number; y: number };
}

export default function EducationOverlay({ visible, item, position }: EducationOverlayProps) {
  const { educationEnabled } = useGame();
  
  if (!educationEnabled || !visible) return null;
  
  const content = EDUCATION_CONTENT[item as keyof typeof EDUCATION_CONTENT];
  
  return (
    <div 
      className="absolute z-50 bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-white/20 max-w-xs"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 200)}px`,
        top: `${Math.min(position.y, window.innerHeight - 150)}px`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-400" />
          <h3 className="font-bold text-sm">{content?.title || 'Unknown Item'}</h3>
        </div>
        <button 
          className="text-white/40 hover:text-white/60 transition-colors"
          onClick={() => {}}
        >
          <X size={14} />
        </button>
      </div>
      
      <p className="text-xs text-white/80 mb-2">{content?.description || 'A mysterious item'}</p>
      
      <div className="flex items-center gap-1 text-xs text-yellow-300">
        <Sparkles size={12} />
        <span>{content?.tip || 'Collect to learn more!'}</span>
      </div>
    </div>
  );
}
