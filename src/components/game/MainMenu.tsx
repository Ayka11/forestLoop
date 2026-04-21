import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Play, ShoppingBag, User, Trophy, Calendar, Settings, Volume2, VolumeX, BarChart3 } from 'lucide-react';
import * as Audio from '@/game/audio';
import { BIOME_COLORS, BIOME_UNLOCK_MILESTONES } from '@/game/types';
import ProfilePage from '@/components/game/ProfilePage';
import Lobby from '@/components/game/Lobby';

const HERO_BG = 'https://d64gsuwffb70l.cloudfront.net/69b8f1f974d0e4f3bd07aa41_1773728406342_97a56aa9.png';
const FOX_IMG = 'https://d64gsuwffb70l.cloudfront.net/69b8f1f974d0e4f3bd07aa41_1773728440372_08f5360f.jpg';

export default function MainMenu() {
  const { engine, setScreen, avatar, highScore, totalTokens, musicEnabled, sfxEnabled, toggleMusic, toggleSfx, dailyChallenges, savedRunAvailable, resumeSavedRun, clearSavedProgress } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const playerId = avatar?.id || 'demo-player'; // Replace with actual player ID
  const avatarUrl = avatar?.avatarUrl || '';

  useEffect(() => {
    setTimeout(() => setAnimReady(true), 100);
  }, []);

  const handlePlay = () => {
    console.log('handlePlay called');
    Audio.resumeAudio();
    setScreen('playing');
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      {/* Background */}
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              backgroundColor: ['#FFD700', '#FF69B4', '#76FF03', '#00E5FF', '#E040FB'][i % 5],
              opacity: 0.4 + Math.random() * 0.4,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center justify-center h-full px-4 transition-all duration-1000 ${animReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] tracking-tight">
            <span className="bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent">
              Forest Loop
            </span>
          </h1>
          <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] -mt-1">
            <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
              Odyssey
            </span>
          </h2>
          <p className="text-white/70 text-sm md:text-base mt-2 font-medium">
            An endless forest adventure awaits!
          </p>
        </div>

        {/* Character preview */}
        <div className="relative mb-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/40 shadow-2xl bg-gradient-to-br from-emerald-400 to-teal-500">
            <img src={FOX_IMG} alt="Hero" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full capitalize">
            {avatar.character}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-6">
          <div className="bg-black/40 backdrop-blur-md rounded-xl px-4 py-2 text-center">
            <div className="text-yellow-300 font-bold text-lg">{totalTokens}</div>
            <div className="text-white/60 text-xs">Leaf Tokens</div>
          </div>
          <div className="bg-black/40 backdrop-blur-md rounded-xl px-4 py-2 text-center">
            <div className="text-emerald-300 font-bold text-lg">{highScore.toLocaleString()}</div>
            <div className="text-white/60 text-xs">High Score</div>
          </div>
        </div>

        {/* Play Button */}
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={handlePlay}
            className="group relative mb-6 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-white font-black text-xl md:text-2xl px-10 py-4 rounded-2xl shadow-[0_8px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.6)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
          <div className="flex items-center gap-3">
            <Play size={28} fill="white" />
            PLAY
          </div>
          <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          {savedRunAvailable && (
            <button
              onClick={() => {
                Audio.resumeAudio();
                resumeSavedRun();
              }}
              className="text-sm font-bold text-white underline underline-offset-4"
            >
              Resume Last Run
            </button>
          )}
        </div>

        {/* Menu buttons — flex and centered */}
        <div className="flex flex-wrap justify-center items-center gap-3 max-w-xl mx-auto w-full">
          <MenuButton icon={<BarChart3 size={20} />} label="Leaders" color="from-yellow-500 to-amber-600" onClick={() => setScreen('leaderboard')} />
          <MenuButton icon={<ShoppingBag size={20} />} label="Shop" color="from-purple-500 to-pink-500" onClick={() => setScreen('shop')} />
          <MenuButton icon={<User size={20} />} label="Profile" color="from-blue-500 to-cyan-500" onClick={() => setShowProfile(true)} />
          <MenuButton icon={<BarChart3 size={20} />} label="Multiplayer" color="from-green-500 to-teal-500" onClick={() => setShowLobby(true)} />
          <MenuButton icon={<Settings size={20} />} label="Settings" color="from-gray-500 to-slate-600" onClick={() => setShowSettings(!showSettings)} />
          <MenuButton icon={<Trophy size={20} />} label="Achieve" color="from-amber-500 to-orange-500" onClick={() => setScreen('achievements')} />
          <MenuButton icon={<Calendar size={20} />} label="Daily" color="from-rose-500 to-red-500" onClick={() => setScreen('daily')} badge={dailyChallenges.length} />
        </div>

        {/* Settings toggle removed, now in menu grid */}

        {showSettings && (
          <div className="mt-2 bg-black/50 backdrop-blur-md rounded-xl p-3 flex gap-4">
            <button onClick={toggleMusic} className="flex items-center gap-2 text-white text-sm hover:text-yellow-300 transition-colors">
              {musicEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              Music {musicEnabled ? 'ON' : 'OFF'}
            </button>
            <button onClick={toggleSfx} className="flex items-center gap-2 text-white text-sm hover:text-yellow-300 transition-colors">
              {sfxEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              SFX {sfxEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        )}

        <div className="flex gap-4 mt-6">
          {/* Removed repeating Profile and Multiplayer buttons */}
        </div>
        {showProfile && <ProfilePage playerId={playerId} />}
        {showLobby && <Lobby playerId={playerId} avatar={avatarUrl} />}
      </div>

      {/* Biome Unlock Gallery */}
      <div className="absolute left-0 right-0 mx-auto mt-8 max-w-2xl z-10">
        {engine.current && engine.current.state && (
          <BiomeGallery unlockedBiomes={engine.current.state.unlockedBiomes || []} />
        )}
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
}

function MenuButton({ icon, label, color, onClick, badge }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative bg-gradient-to-br ${color} text-white rounded-xl px-4 py-3 flex flex-col items-center gap-1 shadow-lg hover:scale-105 active:scale-95 transition-all duration-200`}
    >
      {icon}
      <span className="text-xs font-bold">{label}</span>
      {badge && badge > 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
          {badge}
        </div>
      )}
    </button>
  );
}

// Biome unlock gallery component
export function BiomeGallery({ unlockedBiomes }: { unlockedBiomes: string[] }) {
  const biomes = Object.keys(BIOME_COLORS);
  return (
    <div className="biome-gallery grid grid-cols-2 gap-4 p-4">
      {biomes.map(biome => (
        <div key={biome} className={`biome-card rounded-xl p-4 shadow-lg ${unlockedBiomes.includes(biome) ? 'bg-white' : 'bg-gray-200 opacity-60'}`}>
          <div className="biome-art mb-2">{/* Render biome preview art here */}</div>
          <div className="font-bold text-lg mb-1">{biome.charAt(0).toUpperCase() + biome.slice(1)}</div>
          <div className="mb-2">
            {unlockedBiomes.includes(biome)
              ? 'Unlocked'
              : `Locked (Reach ${BIOME_UNLOCK_MILESTONES[biome] || 'N/A'}m)`}
          </div>
          <button className="btn btn-sm" disabled={!unlockedBiomes.includes(biome)}>
            Preview Music
          </button>
        </div>
      ))}
    </div>
  );
}
