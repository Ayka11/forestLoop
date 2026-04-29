import React, { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/lib/supabase';
import { RotateCcw, Home, Share2, Trophy, Upload, Check, Loader2, BarChart3 } from 'lucide-react';
import * as Audio from '@/game/audio';

export default function GameOverScreen() {
  const { gameState, engine, setScreen, highScore, avatar, clearSavedProgress } = useGame();
  const [animReady, setAnimReady] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('flo_playerName') || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  useEffect(() => {
    setTimeout(() => setAnimReady(true), 200);
    setSubmitted(false);
    setShowSubmit(false);
    setSubmitError('');
    setGlobalRank(null);
  }, [gameState?.score]);

  if (!gameState) return null;

  const isNewHighScore = gameState.score >= highScore && gameState.score > 0;

  const handleRetry = () => {
    Audio.resumeAudio();
    clearSavedProgress();
    // Force a complete restart by going to menu first, then playing
    setScreen('menu');
    // Small delay to ensure proper state reset
    setTimeout(() => {
      setScreen('playing');
    }, 100);
  };

  const handleMenu = () => {
    clearSavedProgress();
    setScreen('menu');
  };

  const handleShare = () => {
    const text = `I scored ${gameState.score.toLocaleString()} in Forest Loop Odyssey! Can you beat my record?`;
    if (navigator.share) {
      navigator.share({ title: 'Forest Loop Odyssey', text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const handleSubmitScore = async () => {
    const name = playerName.trim();
    if (!name || name.length < 1) {
      setSubmitError('Please enter a name');
      return;
    }
    if (name.length > 20) {
      setSubmitError('Name must be 20 characters or less');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      localStorage.setItem('flo_playerName', name);

      const { error: insertError } = await supabase
        .from('game_scores')
        .insert({
          player_name: name,
          score: gameState.score,
          distance: Math.floor(gameState.distance),
          biome_reached: gameState.biome,
          leaf_tokens: gameState.leafTokens,
          best_combo: gameState.combo,
          avatar_character: avatar.character,
          avatar_color: avatar.color,
        });

      if (insertError) throw insertError;

      // Fetch rank
      const { count } = await supabase
        .from('game_scores')
        .select('*', { count: 'exact', head: true })
        .gt('score', gameState.score);

      setGlobalRank((count ?? 0) + 1);
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Score submit error:', err.message);
      } else {
        console.error('Score submit error:', err);
      }
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const biomeNames: Record<string, string> = {
    enchanted: 'Enchanted Forest',
    crystal: 'Crystal Glow',
    autumn: 'Autumn Magic',
    firefly: 'Firefly Wonderland',
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      <div className={`bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl max-w-sm w-full shadow-2xl border border-white/10 overflow-hidden transition-all duration-700 max-h-[92vh] overflow-y-auto ${animReady ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-rose-500 to-orange-500 p-6 text-center">
          {isNewHighScore && (
            <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
              NEW RECORD!
            </div>
          )}
          <div className="text-4xl mb-2">
            {gameState.score > 5000 ? (
              <Trophy size={40} className="mx-auto text-yellow-300" />
            ) : gameState.score > 2000 ? (
              <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ) : (
              <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="#FFF176"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            )}
          </div>
          <h2 className="text-white font-black text-2xl">
            {gameState.score > 5000 ? 'Amazing Run!' : gameState.score > 2000 ? 'Great Job!' : 'Nice Try!'}
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Score */}
          <div className="text-center">
            <div className="text-white/50 text-sm font-bold">SCORE</div>
            <div className="text-white font-black text-4xl">{gameState.score.toLocaleString()}</div>
            {isNewHighScore && (
              <div className="text-yellow-400 text-xs font-bold flex items-center justify-center gap-1 mt-1">
                <Trophy size={12} /> New High Score!
              </div>
            )}
            {submitted && globalRank !== null && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                <BarChart3 size={12} />
                Global Rank #{globalRank}
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Distance" value={`${Math.floor(gameState.distance)}m`} color="text-emerald-400" />
            <StatBox label="Leaf Tokens" value={String(gameState.leafTokens)} color="text-yellow-400" />
            <StatBox label="Best Combo" value={`${gameState.combo}x`} color="text-orange-400" />
            <StatBox label="Biome" value={biomeNames[gameState.biome] || 'Forest'} color="text-purple-400" small />
          </div>

          {/* Resources collected */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="text-white/50 text-xs font-bold mb-2">RESOURCES COLLECTED</div>
            <div className="flex justify-around">
              <ResItem icon="🪵" count={gameState.resources.wood} />
              <ResItem icon="🪨" count={gameState.resources.stone} />
              <ResItem icon="🌸" count={gameState.resources.flower} />
              <ResItem icon="🍃" count={gameState.resources.leaf} />
            </div>
          </div>

          {/* Submit Score Section */}
          {!submitted ? (
            !showSubmit ? (
              <button
                onClick={() => setShowSubmit(true)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Submit Score to Leaderboard
              </button>
            ) : (
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2.5">
                <div className="text-white/70 text-xs font-bold">ENTER YOUR NAME</div>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name..."
                  maxLength={20}
                  autoFocus
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white font-bold text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitScore(); }}
                />
                {submitError && (
                  <p className="text-red-400 text-xs font-medium">{submitError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowSubmit(false); setSubmitError(''); }}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 font-bold rounded-lg text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitScore}
                    disabled={submitting || !playerName.trim()}
                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    {submitting ? (
                      <><Loader2 size={14} className="animate-spin" /> Saving...</>
                    ) : (
                      <><Upload size={14} /> Submit</>
                    )}
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check size={18} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-emerald-300 font-bold text-sm">Score Submitted!</div>
                <div className="text-emerald-400/50 text-[10px]">
                  {globalRank ? `You're ranked #${globalRank} globally` : 'Check the leaderboard to see your rank'}
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleRetry}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-white font-black text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              Play Again
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleMenu}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home size={16} />
                Menu
              </button>
              <button
                onClick={() => setScreen('leaderboard')}
                className="flex-1 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Trophy size={16} />
                Ranks
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="bg-white/5 rounded-xl p-2.5 text-center">
      <div className="text-white/40 text-[10px] font-bold">{label}</div>
      <div className={`font-black ${small ? 'text-xs' : 'text-lg'} ${color}`}>{value}</div>
    </div>
  );
}

function ResItem({ icon, count }: { icon: string; count: number }) {
  return (
    <div className="text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-white font-bold text-sm">{count}</div>
    </div>
  );
}
