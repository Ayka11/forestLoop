import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Hammer, Pause, Volume2, VolumeX } from 'lucide-react';

import { Progress } from '@/components/ui/progress';

export default function GameHUD() {
  const { gameState, engine, setScreen, musicEnabled, toggleMusic, checkpointMessage } = useGame();
  const [showResources, setShowResources] = useState(false);
  if (!gameState || !gameState.isPlaying) return null;

  const { score, distance, leafTokens, resources, combo, multiplier, lives, biome, activePowerUp } = {
    ...gameState,
    activePowerUp: engine.current?.player?.activePowerUp,
  };

  // Progress bar config
  const milestones = [100, 500, 1000, 5000, 13000, 36000];
  const maxDistance = milestones[milestones.length - 1];
  const progressValue = Math.min((distance / maxDistance) * 100, 100);

  const biomeNames: Record<string, string> = {
    enchanted: 'Enchanted Forest',
    crystal: 'Crystal Glow',
    autumn: 'Autumn Magic',
    firefly: 'Firefly Wonderland',
  };

  const powerUpNames: Record<string, { name: string; color: string }> = {
    mushroom: { name: 'MEGA', color: '#FF4444' },
    star: { name: 'STAR POWER', color: '#FFD700' },
    fireFlower: { name: 'FIRE', color: '#FF5722' },
    leafWings: { name: 'GLIDE', color: '#76FF03' },
    speedBoots: { name: 'SPEED', color: '#00BCD4' },
    shield: { name: 'SHIELD', color: '#9C27B0' },
    timeSlow: { name: 'TIME SLOW', color: '#9C27B0' },
    magnet: { name: 'MAGNET', color: '#FF9800' },
    doubleJump: { name: 'DOUBLE JUMP', color: '#00BCD4' },
    ghostPhase: { name: 'GHOST', color: '#E91E63' },
  };

  const powerUpTimer = engine.current?.player?.powerUpTimer || 0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      {/* Progress Bar with Milestones */}
      <div className="absolute left-0 right-0 top-0 z-40 flex flex-col items-center px-4 pt-3">
        <div className="relative w-full max-w-2xl">
          <Progress value={progressValue} className="h-3 bg-white/10" />
          {/* Milestone markers */}
          <div className="absolute left-0 top-0 w-full h-3 pointer-events-none">
            {milestones.map((m, i) => (
              <div
                key={m}
                className="absolute flex flex-col items-center"
                style={{ left: `${(m / maxDistance) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <div className={`w-2 h-2 rounded-full ${distance >= m ? 'bg-amber-400' : 'bg-white/30'} border border-white/30`} />
                <div className="mt-1 text-[10px] font-bold text-white/60 whitespace-nowrap">{m >= 1000 ? `${m/1000}km` : `${m}m`}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {checkpointMessage && (
        <div className="absolute inset-x-0 top-16 flex justify-center px-3 pointer-events-none sm:top-20">
          <div className="max-w-[min(92vw,28rem)] rounded-full border border-white/15 bg-black/55 px-4 py-2 text-center text-xs font-bold text-white shadow-xl backdrop-blur-md">
            {checkpointMessage}
          </div>
        </div>
      )}

      <div className="absolute inset-x-2 top-10 flex flex-col gap-2 sm:inset-x-3 sm:top-12 lg:flex-row lg:items-start lg:justify-between">
        <div className="pointer-events-none flex flex-wrap gap-2">
          <HudPill tone="gold" title="Score" value={score.toLocaleString()} />
          <HudPill tone="slate" title="Distance" value={`${Math.floor(distance)}m`} />
          <HudPill tone="green" title="Biome" value={biomeNames[biome] || biome} />
          <HudPill tone="violet" title="Level" value={`Lvl ${engine.current?.currentLevel !== undefined ? engine.current.currentLevel + 1 : 1}`} />
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="rounded-2xl border border-white/12 bg-black/40 px-3 py-2 text-white shadow-xl backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
              <span>{leafTokens} tokens</span>
              <span>|</span>
              <span>{lives} lives</span>
            </div>
          </div>
          <button
            onClick={() => { engine.current?.pause(); setScreen('paused'); }}
            className="flex items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/5 px-3 py-2 text-white shadow-lg transition hover:border-white/40"
            aria-label="Pause game"
          >
            <Pause size={18} />
          </button>
          <button
            onClick={toggleMusic}
            className="flex items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/20 to-white/5 px-3 py-2 text-white shadow-lg transition hover:border-white/40"
            aria-label={musicEnabled ? 'Mute music' : 'Enable music'}
          >
            {musicEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      <div className="absolute left-3 top-[5.8rem] sm:top-[6.1rem] lg:top-[6.4rem]">
        <button
          onClick={() => setShowResources(!showResources)}
          className="pointer-events-auto rounded-2xl border border-white/12 bg-black/32 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-black/50 transition-colors"
        >
          {showResources ? '▼ Resources' : '▶ Resources'}
        </button>
        
        {showResources && (
          <div className="pointer-events-none mt-2 w-[min(88vw,16rem)] rounded-3xl border border-white/12 bg-black/32 p-2 shadow-xl backdrop-blur-md">
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <ResourceItem label="Wood" count={resources.wood} color="#8D6E63" icon="W" />
              <ResourceItem label="Stone" count={resources.stone} color="#90A4AE" icon="S" />
              <ResourceItem label="Flower" count={resources.flower} color="#FF69B4" icon="F" />
              <ResourceItem label="Leaf" count={resources.leaf} color="#4CAF50" icon="L" />
            </div>
            <button
              onClick={() => setScreen('crafting')}
              className="pointer-events-auto flex w-full items-center justify-center gap-1 rounded-xl bg-amber-500/90 px-2 py-1.5 text-xs font-bold text-white shadow-lg transition-colors hover:bg-amber-400"
            >
              <Hammer size={14} />
              Craft
            </button>
          </div>
        )}
      </div>

      {combo > 2 && (
        <div className="absolute right-3 top-[5.8rem] lg:right-4">
          <div className="rounded-3xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 shadow-xl">
            <div className="text-2xl font-black text-white">{combo}x</div>
            <div className="text-xs font-bold text-white/85">COMBO</div>
          </div>
          {multiplier > 1 && (
            <div className="mt-2 rounded-xl bg-purple-500/90 px-3 py-1 text-center text-xs font-bold text-white shadow-lg">
              {multiplier}x Multiplier
            </div>
          )}
        </div>
      )}

      {activePowerUp && powerUpNames[activePowerUp] && (
        <div className="absolute inset-x-0 bottom-28 flex justify-center px-3">
          <div
            className="rounded-full px-4 py-2 text-sm font-black tracking-wider shadow-xl animate-pulse"
            style={{ backgroundColor: powerUpNames[activePowerUp].color, color: '#FFF' }}
          >
            {powerUpNames[activePowerUp].name}
            <span className="ml-2 opacity-80">{Math.ceil(powerUpTimer / 60)}s</span>
          </div>
        </div>
      )}

      {gameState.showTutorial && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-900/80 px-6 py-4 text-center text-white shadow-2xl backdrop-blur-md animate-fade-in">
            <div className="text-lg font-black mb-2">Welcome to Forest Loop Odyssey!</div>
            <div className="text-base font-bold">Tap to jump. Double tap for double jump.<br/>Collect tokens and avoid hazards!</div>
            <div className="mt-2 text-xs text-emerald-200">This area is safe. Try jumping and collecting tokens!</div>
          </div>
        </div>
      )}
    </div>
  );
}

function HudPill({ title, value, tone }: { title: string; value: string; tone: 'gold' | 'slate' | 'green' | 'violet' }) {
  const palette: Record<'gold' | 'slate' | 'green' | 'violet', string> = {
    gold: 'from-amber-500/90 to-yellow-400/80',
    slate: 'from-slate-700/80 to-slate-900/70',
    green: 'from-emerald-500/80 to-green-400/70',
    violet: 'from-fuchsia-500/80 to-purple-500/70',
  };

  return (
    <div className={`min-w-[7.25rem] rounded-2xl border border-white/15 bg-gradient-to-br ${palette[tone]} px-3 py-2 text-white shadow-xl backdrop-blur-md`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">{title}</div>
      <div className="text-[15px] font-black leading-tight sm:text-base">{value}</div>
    </div>
  );
}

function ResourceItem({ icon, count, color, label }: { icon: string; count: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-white">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: color + '40' }}>
        <span className="text-sm font-black">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/60">{label}</div>
        <div className="text-sm font-bold leading-tight">{count}</div>
      </div>
    </div>
  );
}
