import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Play, Home, Volume2, VolumeX, Settings } from 'lucide-react';
import * as Audio from '@/game/audio';

export default function PauseMenu() {
  const {
    engine,
    setScreen,
    musicEnabled,
    sfxEnabled,
    toggleMusic,
    toggleSfx,
    gameState,
    runForwardMode,
    setRunForwardMode,
    difficultyMode,
    setDifficultyMode,
  } = useGame();

  const handleResume = () => {
    Audio.resumeAudio();
    engine.current?.pause();
    setScreen('playing');
  };

  const handleQuit = () => {
    engine.current?.stop();
    setScreen('menu');
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl max-w-xs w-full shadow-2xl border border-white/10 p-6">
        <h2 className="text-white font-black text-2xl text-center mb-2">Paused</h2>

        {gameState && (
          <div className="text-center mb-4">
            <div className="text-white/50 text-sm">Score: <span className="text-white font-bold">{gameState.score.toLocaleString()}</span></div>
            <div className="text-white/50 text-sm">Distance: <span className="text-emerald-400 font-bold">{Math.floor(gameState.distance)}m</span></div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResume}
            className="w-full py-3 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Play size={20} fill="white" />
            Resume
          </button>

          {/* Settings */}
          <div className="bg-white/5 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-white/60 text-xs font-bold">
              <Settings size={14} />
              SETTINGS
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleMusic}
                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  musicEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'
                }`}
              >
                {musicEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                Music
              </button>
              <button
                onClick={toggleSfx}
                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  sfxEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'
                }`}
              >
                {sfxEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                SFX
              </button>
            </div>
            <div className="text-white/40 text-[11px] font-bold pt-1">Run Forward Mode</div>
            <div className="flex gap-2">
              <button
                onClick={() => setRunForwardMode('manual')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  runForwardMode === 'manual' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/5 text-white/40'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setRunForwardMode('automatic')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  runForwardMode === 'automatic' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/5 text-white/40'
                }`}
              >
                Automatic
              </button>
            </div>
            <div className="text-white/40 text-[11px] font-bold pt-1">Difficulty</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDifficultyMode('easy')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  difficultyMode === 'easy' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/5 text-white/40'
                }`}
              >
                Easy
              </button>
              <button
                onClick={() => setDifficultyMode('normal')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  difficultyMode === 'normal' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/5 text-white/40'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setDifficultyMode('hard')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  difficultyMode === 'hard' ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/5 text-white/40'
                }`}
              >
                Hard
              </button>
            </div>
          </div>

          <button
            onClick={handleQuit}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white/80 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Quit to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
