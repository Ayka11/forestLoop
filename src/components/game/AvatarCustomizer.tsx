import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { X, Check } from 'lucide-react';
import { CHARACTER_COLORS } from '@/game/types';

const CHARACTERS = [
  { id: 'fox', name: 'Foxy', desc: 'Quick and clever' },
  { id: 'bunny', name: 'Hoppy', desc: 'Jumps extra high' },
  { id: 'cat', name: 'Whiskers', desc: 'Graceful glider' },
  { id: 'owl', name: 'Hoot', desc: 'Wise collector' },
] as const;

const COLOR_PRESETS = [
  '#FF8C42', '#FF69B4', '#42A5F5', '#66BB6A', '#FFD700',
  '#E040FB', '#FF5722', '#00BCD4', '#9C27B0', '#F44336',
  '#8BC34A', '#FF9800', '#607D8B', '#795548', '#FFFFFF',
];

export default function AvatarCustomizer() {
  const { setScreen, avatar, setAvatar } = useGame();
  const [char, setChar] = useState(avatar.character);
  const [color, setColor] = useState(avatar.color);

  const handleSave = () => {
    setAvatar({ ...avatar, character: char, color });
    setScreen('menu');
  };

  const charColors = CHARACTER_COLORS[char];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white font-black text-xl">Customize Avatar</h2>
          <button onClick={() => setScreen('menu')} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Character preview */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                <svg width="80" height="90" viewBox="-40 -50 80 100">
                  {/* Body */}
                  <rect x="-16" y="-12" width="32" height="36" rx="8" fill={color} />
                  {/* Belly */}
                  <ellipse cx="0" cy="4" rx="10" ry="10" fill={charColors.belly} />
                  {/* Ears */}
                  <ellipse cx="-10" cy="-28" rx="5" ry={char === 'bunny' ? 16 : 10} fill={color} transform="rotate(-10 -10 -28)" />
                  <ellipse cx="10" cy="-28" rx="5" ry={char === 'bunny' ? 16 : 10} fill={color} transform="rotate(10 10 -28)" />
                  <ellipse cx="-10" cy="-28" rx="3" ry={char === 'bunny' ? 13 : 7} fill={charColors.ear} transform="rotate(-10 -10 -28)" />
                  <ellipse cx="10" cy="-28" rx="3" ry={char === 'bunny' ? 13 : 7} fill={charColors.ear} transform="rotate(10 10 -28)" />
                  {/* Eyes */}
                  <circle cx="-6" cy="-4" r="5" fill="white" />
                  <circle cx="6" cy="-4" r="5" fill="white" />
                  <circle cx="-5" cy="-4" r="2.5" fill="#333" />
                  <circle cx="7" cy="-4" r="2.5" fill="#333" />
                  <circle cx="-4" cy="-5.5" r="1" fill="white" />
                  <circle cx="8" cy="-5.5" r="1" fill="white" />
                  {/* Nose */}
                  <circle cx="0" cy="2" r="3" fill={charColors.nose} />
                  {/* Mouth */}
                  <path d="M-4 5 Q0 9 4 5" stroke="#333" strokeWidth="1" fill="none" />
                  {/* Legs */}
                  <rect x="-12" y="22" width="8" height="10" rx="3" fill={color} />
                  <rect x="4" y="22" width="8" height="10" rx="3" fill={color} />
                  {/* Tail for fox */}
                  {char === 'fox' && (
                    <>
                      <ellipse cx="-24" cy="10" rx="10" ry="6" fill={color} transform="rotate(-30 -24 10)" />
                      <ellipse cx="-28" cy="8" rx="5" ry="3" fill="white" transform="rotate(-30 -28 8)" />
                    </>
                  )}
                </svg>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full capitalize">
                {CHARACTERS.find(c => c.id === char)?.name}
              </div>
            </div>
          </div>

          {/* Character selection */}
          <div>
            <h3 className="text-white/80 font-bold text-sm mb-2">Choose Character</h3>
            <div className="grid grid-cols-4 gap-2">
              {CHARACTERS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setChar(c.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    char === c.id
                      ? 'border-emerald-400 bg-emerald-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {c.id === 'fox' ? '🦊' : c.id === 'bunny' ? '🐰' : c.id === 'cat' ? '🐱' : '🦉'}
                  </div>
                  <div className="text-white text-xs font-bold">{c.name}</div>
                  <div className="text-white/40 text-[9px]">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <h3 className="text-white/80 font-bold text-sm mb-2">Choose Color</h3>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 ${
                    color === c ? 'border-white scale-110 shadow-lg' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check size={16} className="mx-auto text-white drop-shadow-lg" />}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
