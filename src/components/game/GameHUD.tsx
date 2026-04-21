import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Pause, Volume2, VolumeX, Hammer } from 'lucide-react';

export default function GameHUD() {
  const { gameState, engine, setScreen, musicEnabled, toggleMusic, checkpointMessage } = useGame();
  if (!gameState || !gameState.isPlaying) return null;

  const { score, distance, leafTokens, resources, combo, multiplier, lives, biome, activePowerUp } = {
    ...gameState,
    activePowerUp: engine.current?.player?.activePowerUp,
  };

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
      {/* Top bar */}
      <div className="flex items-start justify-between p-3 md:p-4">
        {/* Score & Distance */}
        <div className="space-y-1">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 text-white flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span className="font-bold text-lg">{score.toLocaleString()}</span>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1 text-white/80 text-sm">
            {Math.floor(distance)}m
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1 text-emerald-300 text-xs">
            {biomeNames[biome] || biome}
          </div>
        </div>

        {/* Leaf Tokens */}
        <div className="flex flex-col items-center gap-1">
          <div className="bg-yellow-500/90 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
            <div className="w-5 h-5 rounded-full bg-yellow-300 border-2 border-yellow-600 flex items-center justify-center">
              <span className="text-yellow-800 font-bold text-xs">L</span>
            </div>
            <span className="font-bold text-white">{leafTokens}</span>
          </div>
          {/* Lives */}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1 flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < lives ? '#FF4444' : '#555'}>
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-1 pointer-events-auto text-white">
          <div className="flex items-center gap-2">
            <div className="text-xs tracking-wider uppercase bg-white/10 rounded-full px-3 py-1 border border-white/20">
              Lvl {engine.current?.currentLevel !== undefined ? engine.current.currentLevel + 1 : 1}
            </div>
            <div className="text-xs text-white/70">{Math.floor(distance)}m</div>
          </div>
        <div className="flex gap-2">
          <button
            onClick={() => { engine.current?.pause(); setScreen('paused'); }}
              className="group flex items-center justify-center rounded-2xl px-3 py-2 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-lg transition hover:border-white/40"
              aria-label="Pause game"
            >
              <Pause size={18} className="text-white" />
            </button>
            <button
              onClick={toggleMusic}
              className="group flex items-center justify-center rounded-2xl px-3 py-2 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-lg transition hover:border-white/40"
              aria-label={musicEnabled ? 'Mute music' : 'Enable music'}
            >
              {musicEnabled ? <Volume2 size={18} className="text-white" /> : <VolumeX size={18} className="text-white" />}
          </button>
        </div>
        {checkpointMessage && (
          <div className="absolute inset-x-0 top-4 flex justify-center pointer-events-none">
            <div className="bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse shadow-lg">
              {checkpointMessage}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Resources bar */}
      <div className="absolute left-3 md:left-4 top-28 md:top-32">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-2 space-y-1">
          <ResourceItem icon="🪵" count={resources.wood} color="#8D6E63" label="Wood" />
          <ResourceItem icon="🪨" count={resources.stone} color="#90A4AE" label="Stone" />
          <ResourceItem icon="🌸" count={resources.flower} color="#FF69B4" label="Flower" />
          <ResourceItem icon="🍃" count={resources.leaf} color="#4CAF50" label="Leaf" />
        </div>
        {/* Craft button */}
        <button
          onClick={() => setScreen('crafting')}
          className="pointer-events-auto mt-2 bg-amber-500/90 hover:bg-amber-400 text-white rounded-xl px-3 py-2 flex items-center gap-1.5 text-sm font-bold shadow-lg transition-colors w-full justify-center"
        >
          <Hammer size={16} />
          Craft
        </button>
      </div>

      {/* Combo display */}
      {combo > 2 && (
        <div className="absolute top-1/4 right-4 md:right-8 animate-bounce">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl px-4 py-2 shadow-xl">
            <div className="text-white font-black text-2xl">{combo}x</div>
            <div className="text-white/80 text-xs font-bold">COMBO!</div>
          </div>
          {multiplier > 1 && (
            <div className="text-center mt-1 bg-purple-500/90 rounded-lg px-2 py-0.5 text-white text-xs font-bold">
              {multiplier}x Multiplier
            </div>
          )}
        </div>
      )}

      {/* Active power-up */}
      {activePowerUp && powerUpNames[activePowerUp] && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <div
            className="rounded-full px-4 py-1.5 font-black text-sm tracking-wider animate-pulse shadow-xl"
            style={{ backgroundColor: powerUpNames[activePowerUp].color, color: '#FFF' }}
          >
            {powerUpNames[activePowerUp].name}
            <span className="ml-2 opacity-80">{Math.ceil(powerUpTimer / 60)}s</span>
          </div>
        </div>
      )}

      {/* Mobile jump button */}
      <div className="absolute bottom-4 right-4 md:hidden pointer-events-auto">
        <button
          onTouchStart={(e) => { e.preventDefault(); engine.current?.jumpPress(); }}
          onTouchEnd={(e) => { e.preventDefault(); engine.current?.releaseJump(); }}
          className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center active:bg-white/50 transition-colors"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>
        </button>
      </div>

      {/* Tutorial hint */}
      {gameState.distance < 100 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm animate-pulse">
          <span className="hidden md:inline">Press SPACE or click to jump! Double tap for double jump!</span>
          <span className="md:hidden">Tap to jump! Double tap for double jump!</span>
        </div>
      )}
    </div>
  );
}

function ResourceItem({ icon, count, color, label }: { icon: string; count: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white text-xs">
      <div className="w-5 h-5 rounded flex items-center justify-center text-sm" style={{ backgroundColor: color + '40' }}>
        <span style={{ fontSize: '12px' }}>{icon}</span>
      </div>
      <span className="font-bold min-w-[16px]">{count}</span>
    </div>
  );
}
