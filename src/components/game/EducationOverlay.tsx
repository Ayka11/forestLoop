import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Info, Sparkles } from 'lucide-react';

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
  const content = EDUCATION_CONTENT[item as keyof typeof EDUCATION_CONTENT];
  // Early return after all hooks are called
  if (!educationEnabled || !visible) return null;
  
  return (
    <div 
      className="fixed z-50 pointer-events-none max-w-[min(65vw,14rem)] rounded-2xl border border-white/15 bg-slate-950/88 p-2 text-white shadow-2xl backdrop-blur-md"
      style={{
        right: '1rem',
        top: '6.2rem',
      }}
    >
      <div className="flex items-start gap-1 mb-1">
        <Info size={14} className="text-blue-400 flex-shrink-0" />
        <h3 className="font-bold text-xs">{content?.title || 'Unknown Item'}</h3>
      </div>
      
      <p className="mb-1 text-[11px] text-white/70">{content?.description || 'A mysterious item'}</p>
      
      <div className="flex items-center gap-1 text-[10px] text-yellow-300">
        <Sparkles size={10} />
        <span>{content?.tip || 'Collect to learn more!'}</span>
      </div>
    </div>
  );
}
