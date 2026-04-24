import React, { useEffect, useState } from 'react';
import { X, Star, Sparkles, Trophy, Crown } from 'lucide-react';

interface LevelUpToastProps {
  visible: boolean;
  level: number;
  message: string;
  color: string;
  onComplete?: () => void;
  onResumeGame?: () => void;
}

const levelConfig = {
  2: {
    message: 'LEVEL UP!',
    color: '#00FF00',
    icon: Star,
    bgGradient: 'from-green-500/20 to-green-600/30',
    borderColor: 'border-green-500',
    textColor: 'text-green-300',
    particles: 'green'
  },
  3: {
    message: 'ADVANCED!',
    color: '#00BFFF',
    icon: Sparkles,
    bgGradient: 'from-blue-500/20 to-blue-600/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-300',
    particles: 'blue'
  },
  4: {
    message: 'MASTER!',
    color: '#FF00FF',
    icon: Trophy,
    bgGradient: 'from-purple-500/20 to-purple-600/30',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-300',
    particles: 'purple'
  },
  5: {
    message: 'LEGENDARY!',
    color: '#FFD700',
    icon: Crown,
    bgGradient: 'from-yellow-500/20 to-yellow-600/30',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-300',
    particles: 'rainbow'
  }
};

export default function LevelUpToast({ visible, level, message, color, onComplete, onResumeGame }: LevelUpToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const config = levelConfig[level as keyof typeof levelConfig] || levelConfig[2];

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
      onResumeGame?.(); // Resume game when dismissed
    }, 300);
  };

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete, onResumeGame]);

  // Add keyboard event listener for ESC key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleDismiss();
      }
    };

    if (isVisible) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const Icon = config.icon;

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none sm:top-24">
      <div 
        className={`
          relative min-w-[15rem] px-4 py-3 rounded-xl shadow-xl border
          bg-gradient-to-br ${config.bgGradient} ${config.borderColor}
          transform transition-all duration-500 ease-out pointer-events-auto
          ${isAnimating ? 'scale-105 opacity-100 translate-x-0' : 'scale-95 opacity-0 translate-x-4'}
        `}
        style={{
          boxShadow: `0 0 20px ${config.color}40, 0 0 40px ${config.color}20`,
          backdropFilter: 'blur(8px)',
          minWidth: '240px'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-1 -right-1 p-1 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
        >
          <X size={14} className="text-white/70 hover:text-white" />
        </button>

        {/* Content */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div 
            className="p-2 rounded-full bg-white/10 backdrop-blur-sm"
            style={{ 
              boxShadow: `0 0 15px ${config.color}60`,
              animation: 'pulse 2s infinite'
            }}
          >
            <Icon size={24} className={config.textColor} style={{ color: config.color }} />
          </div>

          {/* Text */}
          <div className="flex flex-col flex-1">
            <div className={`text-xl font-bold ${config.textColor}`} style={{ color: config.color }}>
              {config.message}
            </div>
            <div className="text-white/60 text-xs">
              Level {level} Reached
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-2 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${Math.min(100, (level - 1) * 25)}%`,
              backgroundColor: config.color,
              boxShadow: `0 0 8px ${config.color}`
            }}
          />
        </div>

        {/* Dismiss hint */}
        <div className="mt-2 text-white/40 text-xs text-center">
          ESC to continue
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + Math.sin(i) * 20}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${2 + i * 0.3}s`
            }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: config.particles === 'rainbow' 
                  ? `hsl(${i * 60}, 100%, 50%)`
                  : config.color,
                opacity: 0.6 + Math.random() * 0.4,
                boxShadow: `0 0 8px ${config.color}`
              }}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
