import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Play, ShoppingBag, User, Trophy, Calendar, Settings, Volume2, VolumeX, BarChart3 } from 'lucide-react';
import * as Audio from '@/game/audio';
import { BIOME_COLORS, BIOME_UNLOCK_MILESTONES, DIFFICULTY_CONFIGS, AppGameMode } from '@/game/types';
import ProfilePage from '@/components/game/ProfilePage';
import Lobby from '@/components/game/Lobby';

const HERO_BG = 'https://d64gsuwffb70l.cloudfront.net/69b8f1f974d0e4f3bd07aa41_1773728406342_97a56aa9.png';
const FOX_IMG = 'https://d64gsuwffb70l.cloudfront.net/69b8f1f974d0e4f3bd07aa41_1773728440372_08f5360f.jpg';

export default function MainMenu() {
  const { engine, setScreen, avatar, highScore, totalTokens, musicEnabled, sfxEnabled, educationEnabled, toggleMusic, toggleSfx, toggleEducation, dailyChallenges, savedRunAvailable, resumeSavedRun, difficulty, setDifficulty, gameMode, setGameMode } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const playerId = avatar?.id || 'demo-player';
  const avatarUrl = avatar?.avatarUrl || '';

  useEffect(() => {
    setTimeout(() => setAnimReady(true), 100);
  }, []);

  const handlePlay = () => {
    Audio.resumeAudio();
    setScreen('playing');
  };

  return (
    <div className="relative w-full h-full overflow-auto" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      {/* Background */}
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
      </div>

      {/* Content — single scrollable column, compact on mobile */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-full px-3 py-4 gap-3 transition-all duration-700 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] tracking-tight leading-none">
            <span className="bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent">
              Forest Loop
            </span>
          </h1>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] leading-none">
            <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
              Odyssey
            </span>
          </h2>
        </div>

        {/* Character + stats row */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-white/40 shadow-xl bg-gradient-to-br from-emerald-400 to-teal-500">
              <img src={FOX_IMG} alt="Hero" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full capitalize whitespace-nowrap">
              {avatar.character}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-1.5 text-center">
              <div className="text-yellow-300 font-bold text-base leading-none">{totalTokens}</div>
              <div className="text-white/60 text-[10px]">Tokens</div>
            </div>
            <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-1.5 text-center">
              <div className="text-emerald-300 font-bold text-base leading-none">{highScore.toLocaleString()}</div>
              <div className="text-white/60 text-[10px]">Best</div>
            </div>
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="flex gap-2 w-full max-w-xs">
          {([
            { id: 'endless' as AppGameMode, label: 'Endless', icon: '🌿', desc: 'Relax & explore' },
            { id: 'adventure' as AppGameMode, label: 'Adventure', icon: '🔥', desc: 'Boss & battles' },
          ] as const).map(m => (
            <button
              key={m.id}
              onClick={() => setGameMode(m.id)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 border-2 ${
                gameMode === m.id
                  ? m.id === 'adventure'
                    ? 'bg-orange-500/80 border-orange-400 text-white shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                    : 'bg-emerald-500/80 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'
              }`}
            >
              <span className="text-base leading-none">{m.icon}</span>
              <span className="capitalize">{m.label}</span>
              <span className="text-[9px] opacity-70">{m.desc}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handlePlay}
          className={`group relative text-white font-black text-2xl sm:text-3xl px-12 py-4 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
            gameMode === 'adventure'
              ? 'bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-300 hover:to-rose-400 shadow-[0_8px_30px_rgba(249,115,22,0.5)] hover:shadow-[0_8px_40px_rgba(249,115,22,0.7)]'
              : 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-[0_8px_30px_rgba(16,185,129,0.5)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.7)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Play size={28} fill="white" />
            PLAY
          </div>
          <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {savedRunAvailable && (
          <button
            onClick={() => { Audio.resumeAudio(); resumeSavedRun(); }}
            className="text-sm font-bold text-white/80 underline underline-offset-4 hover:text-white transition-colors"
          >
            Resume Last Run
          </button>
        )}

        {/* Icon-only secondary nav — compact row */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <IconBtn icon={<ShoppingBag size={18} />} label="Shop" onClick={() => setScreen('shop')} color="bg-purple-600/80" />
          <IconBtn icon={<Trophy size={18} />} label="Rewards" onClick={() => setScreen('achievements')} color="bg-amber-600/80" />
          <IconBtn icon={<BarChart3 size={18} />} label="Scores" onClick={() => setScreen('leaderboard')} color="bg-yellow-600/80" />
          <IconBtn icon={<Calendar size={18} />} label="Daily" onClick={() => setScreen('daily')} color="bg-rose-600/80" badge={dailyChallenges.length} />
          <IconBtn icon={<User size={18} />} label="Profile" onClick={() => setShowProfile(true)} color="bg-blue-600/80" />
          <IconBtn icon={<Settings size={18} />} label="Settings" onClick={() => setShowSettings(s => !s)} color="bg-slate-600/80" />
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="w-full max-w-sm bg-black/60 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-3">
            {/* Difficulty */}
            <div>
              <p className="text-white text-xs font-bold mb-1.5 uppercase tracking-wider">Difficulty</p>
              <div className="flex gap-2">
                {(['easy', 'normal', 'hard'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${difficulty === level ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                  >
                    <div className="capitalize">{DIFFICULTY_CONFIGS[level].name}</div>
                    <div className="text-[10px] opacity-70">{DIFFICULTY_CONFIGS[level].ageRange}</div>
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-[10px] mt-1">{DIFFICULTY_CONFIGS[difficulty].description}</p>
            </div>

            {/* Audio & Education */}
            <div className="flex gap-3 border-t border-white/10 pt-3">
              <button onClick={toggleMusic} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg flex-1 justify-center transition-all ${musicEnabled ? 'bg-emerald-600/70 text-white' : 'bg-white/10 text-white/50'}`}>
                {musicEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                Music
              </button>
              <button onClick={toggleSfx} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg flex-1 justify-center transition-all ${sfxEnabled ? 'bg-emerald-600/70 text-white' : 'bg-white/10 text-white/50'}`}>
                {sfxEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                SFX
              </button>
              <button onClick={toggleEducation} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg flex-1 justify-center transition-all ${educationEnabled ? 'bg-purple-600/70 text-white' : 'bg-white/10 text-white/50'}`}>
                <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">E</span>
                Edu
              </button>
            </div>
          </div>
        )}

        {showProfile && <ProfilePage playerId={playerId} />}
        {showLobby && <Lobby playerId={playerId} avatar={avatarUrl} />}
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
}

function IconBtn({ icon, label, onClick, color, badge }: { icon: React.ReactNode; label: string; onClick: () => void; color: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative ${color} text-white rounded-xl px-3 py-2 flex flex-col items-center gap-0.5 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 backdrop-blur-sm`}
    >
      {icon}
      <span className="text-[10px] font-bold leading-none">{label}</span>
      {badge && badge > 0 && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold">
          {badge}
        </div>
      )}
    </button>
  );
}

// Kept for external imports
export function BiomeGallery({ unlockedBiomes }: { unlockedBiomes: string[] }) {
  const biomes = Object.keys(BIOME_COLORS);
  return (
    <div className="grid grid-cols-2 gap-3 p-3">
      {biomes.map(biome => (
        <div key={biome} className={`rounded-xl p-3 shadow-lg text-sm ${unlockedBiomes.includes(biome) ? 'bg-white/90' : 'bg-gray-200/60 opacity-60'}`}>
          <div className="font-bold mb-0.5 capitalize">{biome}</div>
          <div className="text-xs text-gray-600">
            {unlockedBiomes.includes(biome) ? 'Unlocked' : `Reach ${BIOME_UNLOCK_MILESTONES[biome] || 'N/A'}m`}
          </div>
        </div>
      ))}
    </div>
  );
}
