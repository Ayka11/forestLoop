import React, { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Pause, Volume2, VolumeX, Hammer } from 'lucide-react';

export default function GameHUD() {
  const { gameState, engine, setScreen, musicEnabled, toggleMusic, runForwardMode, setRunForwardMode } = useGame();
  const [tutorialDismissed, setTutorialDismissed] = useState<boolean>(() => localStorage.getItem('flo_controlsTutorialSeen') === '1');

  useEffect(() => {
    if (!gameState || tutorialDismissed) return;
    if (gameState.distance >= 220) {
      localStorage.setItem('flo_controlsTutorialSeen', '1');
      setTutorialDismissed(true);
    }
  }, [gameState, tutorialDismissed]);

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
  };

  const powerUpTimer = engine.current?.player?.powerUpTimer || 0;
  const showTutorial = !tutorialDismissed && gameState.distance < 220;

  const handleTutorialDismiss = () => {
    localStorage.setItem('flo_controlsTutorialSeen', '1');
    setTutorialDismissed(true);
  };

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
        <div className="flex flex-col gap-1 pointer-events-auto">
          <button
            onClick={() => { engine.current?.pause(); setScreen('paused'); }}
            className="bg-black/40 backdrop-blur-sm rounded-xl p-2 text-white hover:bg-black/60 transition-colors"
          >
            <Pause size={20} />
          </button>
          <button
            onClick={toggleMusic}
            className="bg-black/40 backdrop-blur-sm rounded-xl p-2 text-white hover:bg-black/60 transition-colors"
          >
            {musicEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
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
          onTouchStart={(e) => { e.preventDefault(); engine.current?.jump(); }}
          onTouchEnd={(e) => { e.preventDefault(); engine.current?.releaseJump(); }}
          onTouchCancel={(e) => { e.preventDefault(); engine.current?.releaseJump(); }}
          className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center active:bg-white/50 transition-colors"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>
        </button>
      </div>

      {/* Mobile movement controls */}
      <div className="absolute bottom-4 left-4 md:hidden pointer-events-auto flex items-center gap-3">
        <button
          onTouchStart={(e) => { e.preventDefault(); engine.current?.setBackwardPressed(true); }}
          onTouchEnd={(e) => { e.preventDefault(); engine.current?.setBackwardPressed(false); }}
          onTouchCancel={(e) => { e.preventDefault(); engine.current?.setBackwardPressed(false); }}
          className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center active:bg-white/45 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M15.5 5l-7 7 7 7" /></svg>
        </button>
        {runForwardMode === 'manual' && (
          <button
            onTouchStart={(e) => { e.preventDefault(); engine.current?.setForwardPressed(true); }}
            onTouchEnd={(e) => { e.preventDefault(); engine.current?.setForwardPressed(false); }}
            onTouchCancel={(e) => { e.preventDefault(); engine.current?.setForwardPressed(false); }}
            className="w-16 h-16 rounded-full bg-emerald-400/55 backdrop-blur-sm border-2 border-emerald-200/80 flex items-center justify-center active:bg-emerald-300/80 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8.5 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      {/* Mobile quick run mode toggle */}
      <div className="absolute bottom-24 left-4 md:hidden pointer-events-auto">
        <button
          onClick={() => setRunForwardMode(runForwardMode === 'manual' ? 'automatic' : 'manual')}
          className="px-3 py-1.5 rounded-lg bg-black/45 backdrop-blur-sm border border-white/20 text-white text-xs font-bold"
        >
          Run: {runForwardMode === 'manual' ? 'Manual' : 'Auto'}
        </button>
      </div>

      {/* Level feedback */}
      <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 text-white flex items-center gap-2 mt-2">
        <span className="font-bold">Level:</span>
        <span className="text-lg">{engine.current?.currentLevel !== undefined ? engine.current.currentLevel + 1 : 1}</span>
      </div>

      {/* Tutorial hint */}
      {showTutorial && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/55 backdrop-blur-sm rounded-xl px-4 py-3 text-white text-sm w-[min(92vw,560px)]">
          <div className="font-bold text-emerald-300 mb-1">Quick Controls</div>
          <div className="hidden md:block">
            {runForwardMode === 'manual'
              ? 'Hold D/Right Arrow to run, release to brake. Press Space/Up to jump (double jump supported).'
              : 'Auto mode runs forward continuously. Use A/Left for slight drift and Space/Up to jump.'}
          </div>
          <div className="md:hidden">
            {runForwardMode === 'manual'
              ? 'Hold right button to run, release to brake. Tap jump to leap; tap again for double jump.'
              : 'Auto mode runs by default. Use left button for small drift and jump button to leap.'}
          </div>
          <button
            onClick={handleTutorialDismiss}
            className="pointer-events-auto mt-2 text-xs font-bold px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 transition-colors"
          >
            Got it
          </button>
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
