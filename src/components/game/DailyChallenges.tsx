import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { X, Calendar, Gift, Flame, Clock } from 'lucide-react';

export default function DailyChallenges() {
  const { setScreen, dailyChallenges, totalTokens } = useGame();

  // Simulated streak and daily reward
  const streak = parseInt(localStorage.getItem('flo_streak') || '0');
  const lastLogin = localStorage.getItem('flo_lastLogin');
  const today = new Date().toDateString();
  const canClaimDaily = lastLogin !== today;

  const handleClaimDaily = () => {
    localStorage.setItem('flo_lastLogin', today);
    const newStreak = lastLogin ? streak + 1 : 1;
    localStorage.setItem('flo_streak', String(newStreak));
    const reward = 10 + newStreak * 5;
    const newTokens = totalTokens + reward;
    localStorage.setItem('flo_totalTokens', String(newTokens));
    window.location.reload(); // Simple refresh to update
  };

  const streakRewards = [10, 15, 20, 30, 40, 50, 100];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Calendar className="text-rose-400" size={24} />
            <h2 className="text-white font-black text-xl">Daily Rewards</h2>
          </div>
          <button onClick={() => setScreen('menu')} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Streak */}
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="text-orange-400" size={20} />
              <span className="text-white font-bold">Login Streak</span>
              <span className="text-orange-400 font-black text-xl ml-auto">{streak} days</span>
            </div>
            {/* Streak calendar */}
            <div className="flex gap-1.5 mt-2">
              {streakRewards.map((reward, i) => {
                const completed = i < streak;
                const current = i === streak;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-lg p-1.5 text-center border transition-all ${
                      completed
                        ? 'bg-orange-500/30 border-orange-400/50'
                        : current
                        ? 'bg-white/10 border-white/30 animate-pulse'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className={`text-[9px] font-bold ${completed ? 'text-orange-300' : 'text-white/40'}`}>
                      Day {i + 1}
                    </div>
                    <div className={`text-[10px] font-bold ${completed ? 'text-yellow-300' : 'text-white/30'}`}>
                      +{reward}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily claim */}
          <button
            onClick={canClaimDaily ? handleClaimDaily : undefined}
            disabled={!canClaimDaily}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              canClaimDaily
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <Gift size={18} />
            {canClaimDaily ? `Claim Daily Reward (+${10 + (streak + 1) * 5} tokens)` : 'Already Claimed Today!'}
          </button>

          {/* Daily Challenges */}
          <div>
            <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
              <Clock size={16} className="text-blue-400" />
              Today's Challenges
            </h3>
            <div className="space-y-2">
              {dailyChallenges.map(challenge => {
                const progress = Math.min(challenge.progress / challenge.target, 1);
                return (
                  <div key={challenge.id} className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold text-sm">{challenge.title}</span>
                      <span className="text-yellow-400 text-xs font-bold">+{challenge.reward}</span>
                    </div>
                    <div className="text-white/40 text-xs mb-2">{challenge.description}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <span className="text-white/50 text-[10px] font-bold">
                        {challenge.progress}/{challenge.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lucky Spin */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/20 text-center">
            <h3 className="text-white font-bold mb-2">Lucky Spin Wheel</h3>
            <p className="text-white/50 text-xs mb-3">Spin once daily for bonus rewards!</p>
            <button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
              onClick={() => {
                const rewards = [5, 10, 15, 25, 50, 100];
                const reward = rewards[Math.floor(Math.random() * rewards.length)];
                const newTokens = totalTokens + reward;
                localStorage.setItem('flo_totalTokens', String(newTokens));
                alert(`You won ${reward} Leaf Tokens!`);
                window.location.reload();
              }}
            >
              Spin!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
