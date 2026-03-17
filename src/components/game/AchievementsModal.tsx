import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { X, Trophy, Lock, Star, Zap, Target, Leaf, Mountain, Sparkles } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  requirement: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_run', title: 'First Steps', description: 'Complete your first run', icon: <Star size={20} />, color: '#FFD700', requirement: 'Play once' },
  { id: 'dist_100', title: 'Forest Walker', description: 'Travel 100m in one run', icon: <Leaf size={20} />, color: '#4CAF50', requirement: '100m distance' },
  { id: 'dist_500', title: 'Forest Runner', description: 'Travel 500m in one run', icon: <Zap size={20} />, color: '#FF9800', requirement: '500m distance' },
  { id: 'dist_1000', title: 'Forest Champion', description: 'Travel 1000m in one run', icon: <Trophy size={20} />, color: '#E040FB', requirement: '1000m distance' },
  { id: 'dist_5000', title: 'Forest Legend', description: 'Travel 5000m in one run', icon: <Mountain size={20} />, color: '#FF5722', requirement: '5000m distance' },
  { id: 'combo_5', title: 'Combo Starter', description: 'Reach a 5x combo', icon: <Target size={20} />, color: '#2196F3', requirement: '5x combo' },
  { id: 'combo_10', title: 'Combo Master', description: 'Reach a 10x combo', icon: <Target size={20} />, color: '#9C27B0', requirement: '10x combo' },
  { id: 'combo_20', title: 'Combo King', description: 'Reach a 20x combo', icon: <Sparkles size={20} />, color: '#FFD700', requirement: '20x combo' },
  { id: 'tokens_100', title: 'Token Collector', description: 'Collect 100 Leaf Tokens total', icon: <Star size={20} />, color: '#FFC107', requirement: '100 total tokens' },
  { id: 'tokens_500', title: 'Token Hoarder', description: 'Collect 500 Leaf Tokens total', icon: <Star size={20} />, color: '#FF9800', requirement: '500 total tokens' },
  { id: 'tokens_1000', title: 'Token Tycoon', description: 'Collect 1000 Leaf Tokens total', icon: <Trophy size={20} />, color: '#FFD700', requirement: '1000 total tokens' },
  { id: 'craft_1', title: 'First Build', description: 'Craft your first item', icon: <Zap size={20} />, color: '#8D6E63', requirement: 'Craft 1 item' },
  { id: 'biome_crystal', title: 'Crystal Explorer', description: 'Reach Crystal Glow biome', icon: <Sparkles size={20} />, color: '#00E5FF', requirement: 'Reach Crystal biome' },
  { id: 'biome_autumn', title: 'Autumn Adventurer', description: 'Reach Autumn Magic biome', icon: <Leaf size={20} />, color: '#FF6F00', requirement: 'Reach Autumn biome' },
  { id: 'biome_firefly', title: 'Firefly Finder', description: 'Reach Firefly Wonderland', icon: <Star size={20} />, color: '#FFEB3B', requirement: 'Reach Firefly biome' },
  { id: 'score_1000', title: 'Score Hunter', description: 'Score 1000 points', icon: <Target size={20} />, color: '#4CAF50', requirement: '1000 score' },
  { id: 'score_5000', title: 'Score Master', description: 'Score 5000 points', icon: <Trophy size={20} />, color: '#E040FB', requirement: '5000 score' },
  { id: 'score_10000', title: 'Score Legend', description: 'Score 10000 points', icon: <Trophy size={20} />, color: '#FFD700', requirement: '10000 score' },
  { id: 'powerup_all', title: 'Power Collector', description: 'Use all 5 power-ups', icon: <Sparkles size={20} />, color: '#FF4081', requirement: 'Use all power-ups' },
  { id: 'streak_7', title: 'Weekly Warrior', description: 'Play 7 days in a row', icon: <Zap size={20} />, color: '#FF5722', requirement: '7 day streak' },
];

export default function AchievementsModal() {
  const { setScreen, totalTokens, highScore } = useGame();

  // Simple unlock logic based on stats
  const unlockedIds = new Set<string>();
  if (highScore > 0) unlockedIds.add('first_run');
  if (highScore >= 1000) unlockedIds.add('score_1000');
  if (highScore >= 5000) unlockedIds.add('score_5000');
  if (highScore >= 10000) unlockedIds.add('score_10000');
  if (totalTokens >= 100) unlockedIds.add('tokens_100');
  if (totalTokens >= 500) unlockedIds.add('tokens_500');
  if (totalTokens >= 1000) unlockedIds.add('tokens_1000');

  const unlocked = unlockedIds.size;
  const total = ACHIEVEMENTS.length;
  const progress = Math.round((unlocked / total) * 100);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400" size={24} />
            <h2 className="text-white font-black text-xl">Achievements</h2>
          </div>
          <button onClick={() => setScreen('menu')} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-white/60 font-bold">{unlocked}/{total} Unlocked</span>
            <span className="text-amber-400 font-bold">{progress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Achievements list */}
        <div className="p-4 overflow-y-auto space-y-2" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {ACHIEVEMENTS.map(ach => {
            const isUnlocked = unlockedIds.has(ach.id);
            return (
              <div
                key={ach.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isUnlocked
                    ? 'border-white/10 bg-white/5'
                    : 'border-white/5 bg-white/[0.02] opacity-60'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUnlocked ? '' : 'grayscale'
                  }`}
                  style={{ backgroundColor: isUnlocked ? ach.color + '30' : '#ffffff10', color: isUnlocked ? ach.color : '#666' }}
                >
                  {isUnlocked ? ach.icon : <Lock size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm">{ach.title}</div>
                  <div className="text-white/40 text-xs">{ach.description}</div>
                </div>
                {isUnlocked && (
                  <div className="text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-lg flex-shrink-0">
                    Done!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
