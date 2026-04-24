import React, { useEffect, useState } from 'react';
import { X, Trophy, Coins, Zap, ChevronRight } from 'lucide-react';

interface BonusData {
  baseBonus: number;
  distanceBonus: number;
  tokens: number;
  totalScore: number;
}

interface LevelCompletionRewardProps {
  visible: boolean;
  level: number;
  bonusData?: BonusData;
  onComplete?: () => void;
  onContinue?: () => void;
}

const biomeNames: Record<number, string> = {
  1: 'Enchanted Forest',
  2: 'Crystal Realm',
  3: 'Autumn Valley',
  4: 'Firefly Night',
};

const bioméColors: Record<number, { bg: string; border: string; text: string; glow: string }> = {
  1: { bg: 'from-green-900/50 to-green-800/40', border: 'border-green-500', text: 'text-green-300', glow: '#00FF88' },
  2: { bg: 'from-cyan-900/50 to-blue-800/40', border: 'border-cyan-400', text: 'text-cyan-300', glow: '#00BFFF' },
  3: { bg: 'from-orange-900/50 to-amber-800/40', border: 'border-orange-500', text: 'text-orange-300', glow: '#FF8C00' },
  4: { bg: 'from-indigo-900/50 to-purple-800/40', border: 'border-indigo-400', text: 'text-indigo-300', glow: '#FFD700' },
};

export default function LevelCompletionReward({
  visible,
  level,
  bonusData,
  onComplete,
  onContinue,
}: LevelCompletionRewardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [displayedTokens, setDisplayedTokens] = useState(0);

  const config = bioméColors[level] || bioméColors[1];
  const nextBiome = biomeNames[level + 1] || 'The Abyss';
  const currentBiome = biomeNames[level] || 'Unknown';

  // Animate score counter
  useEffect(() => {
    if (!visible || !bonusData) return;

    let scoreFrame = 0;
    let tokensFrame = 0;
    const scoreInterval = setInterval(() => {
      scoreFrame++;
      const progress = Math.min(1, scoreFrame / 20);
      setDisplayedScore(Math.floor(bonusData.totalScore * progress));
      if (progress >= 1) {
        clearInterval(scoreInterval);
      }
    }, 30);

    const tokensInterval = setInterval(() => {
      tokensFrame++;
      const progress = Math.min(1, tokensFrame / 20);
      setDisplayedTokens(Math.floor(bonusData.tokens * progress));
      if (progress >= 1) {
        clearInterval(tokensInterval);
      }
    }, 30);

    return () => {
      clearInterval(scoreInterval);
      clearInterval(tokensInterval);
    };
  }, [visible, bonusData]);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [visible]);

  const handleContinue = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onContinue?.();
      onComplete?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={`
          relative max-w-md w-[90vw] px-6 py-8 rounded-2xl shadow-2xl border-2
          bg-gradient-to-br ${config.bg} ${config.border}
          transform transition-all duration-300 ease-out pointer-events-auto
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
        style={{
          boxShadow: `0 0 30px ${config.glow}40, 0 0 60px ${config.glow}20`,
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleContinue}
          className="absolute -top-2 -right-2 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        >
          <X size={20} className="text-white/70 hover:text-white" />
        </button>

        {/* Header: Level Complete */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className={config.text} size={28} style={{ color: config.glow }} />
            <h2 className={`text-3xl font-black ${config.text}`}>LEVEL {level} COMPLETE!</h2>
          </div>
          <p className="text-white/60 text-sm">You've conquered {currentBiome}</p>
        </div>

        {/* Biome Transition Preview */}
        <div className="mb-6 p-4 rounded-lg bg-black/30 border border-white/10">
          <p className="text-white/50 text-xs font-semibold mb-2">NEXT DESTINATION</p>
          <p className={`text-lg font-bold ${config.text}`}>{nextBiome}</p>
          <p className="text-white/40 text-xs mt-1">Level {level + 1} awaits</p>
        </div>

        {/* Bonus Breakdown */}
        {bonusData && (
          <div className="space-y-3 mb-6">
            {/* Score */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" />
                <span className="text-white/70 text-sm">Total Score</span>
              </div>
              <span className="text-yellow-300 font-bold text-lg">{displayedScore.toLocaleString()}</span>
            </div>

            {/* Score Breakdown */}
            <div className="pl-8 space-y-1 text-xs text-white/50">
              <div className="flex justify-between">
                <span>Base Bonus:</span>
                <span>+{bonusData.baseBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Bonus:</span>
                <span>+{bonusData.distanceBonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Level Multiplier:</span>
                <span>+{(bonusData.totalScore - bonusData.baseBonus - bonusData.distanceBonus).toLocaleString()}</span>
              </div>
            </div>

            {/* Tokens */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-green-400" />
                <span className="text-white/70 text-sm">Tokens Earned</span>
              </div>
              <span className="text-green-300 font-bold text-lg">{displayedTokens}</span>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className={`
            w-full py-3 rounded-lg font-bold text-white uppercase tracking-wider
            transition-all transform hover:scale-105 active:scale-95
            flex items-center justify-center gap-2
          `}
          style={{
            background: `linear-gradient(135deg, ${config.glow}, ${config.glow}dd)`,
            boxShadow: `0 0 20px ${config.glow}60`,
          }}
        >
          Continue to Level {level + 1}
          <ChevronRight size={18} />
        </button>

        {/* Decorative particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                backgroundColor: config.glow,
                left: `${20 + i * 15}%`,
                top: `${20 + Math.sin(i) * 15}%`,
                opacity: 0.4 + Math.random() * 0.4,
                animation: `pulse ${2 + i * 0.3}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Backdrop blur */}
      <div
        className={`
          fixed inset-0 bg-black/40 backdrop-blur-sm z-40 pointer-events-auto
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleContinue}
      />
    </div>
  );
}
