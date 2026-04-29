import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/lib/supabase';
import { X, Trophy, Clock, CalendarDays, Crown, Medal, Award, RefreshCw, ArrowLeft, Loader2, MapPin, Zap } from 'lucide-react';

type TimeFilter = 'today' | 'week' | 'alltime';

interface ScoreEntry {
  id: string;
  player_name: string;
  score: number;
  distance: number;
  biome_reached: string;
  leaf_tokens: number;
  best_combo: number;
  avatar_character: string;
  avatar_color: string;
  created_at: string;
}

const BIOME_LABELS: Record<string, { label: string; color: string }> = {
  enchanted: { label: 'Enchanted', color: '#4CAF50' },
  crystal: { label: 'Crystal', color: '#00E5FF' },
  autumn: { label: 'Autumn', color: '#FF6F00' },
  firefly: { label: 'Firefly', color: '#FFEB3B' },
};

const CHAR_EMOJIS: Record<string, string> = {
  fox: '🦊', bunny: '🐰', cat: '🐱', owl: '🦉',
};

export default function Leaderboard() {
  const { setScreen, highScore } = useGame();
  const [tab, setTab] = useState<TimeFilter>('alltime');
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchScores = useCallback(async (filter: TimeFilter) => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('game_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(50);

      if (filter === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        query = query.gte('created_at', todayStart.toISOString());
      } else if (filter === 'week') {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        query = query.gte('created_at', weekStart.toISOString());
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setScores(data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Leaderboard fetch error:', err.message);
      } else {
        console.error('Leaderboard fetch error:', err);
      }
      setError('Could not load scores. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores(tab);
  }, [tab, fetchScores]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={18} className="text-gray-300" />;
    if (rank === 3) return <Award size={18} className="text-amber-600" />;
    return <span className="text-white/40 font-bold text-sm w-[18px] text-center">{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/15 to-gray-500/5 border-gray-400/20';
    if (rank === 3) return 'bg-gradient-to-r from-amber-700/15 to-amber-800/5 border-amber-600/20';
    return 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]';
  };

  const tabs: { key: TimeFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'today', label: 'Today', icon: <Clock size={14} /> },
    { key: 'week', label: 'This Week', icon: <CalendarDays size={14} /> },
    { key: 'alltime', label: 'All Time', icon: <Trophy size={14} /> },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg leading-tight">Leaderboard</h2>
              <p className="text-white/40 text-[10px] font-medium">Top 50 Forest Runners</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchScores(tab)}
              className="text-white/40 hover:text-white/80 transition-colors p-1.5 rounded-lg hover:bg-white/5"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setScreen('menu')} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 flex-shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.key
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Your best */}
        {highScore > 0 && (
          <div className="mx-3 mb-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 flex items-center justify-between flex-shrink-0">
            <span className="text-emerald-300 text-xs font-bold">Your Personal Best</span>
            <span className="text-emerald-200 font-black text-sm">{highScore.toLocaleString()}</span>
          </div>
        )}

        {/* Scores list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="text-amber-400 animate-spin" />
              <p className="text-white/40 text-sm font-medium">Loading scores...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <X size={24} className="text-red-400" />
              </div>
              <p className="text-red-300 text-sm font-medium text-center">{error}</p>
              <button
                onClick={() => fetchScores(tab)}
                className="text-sm text-amber-400 hover:text-amber-300 font-bold transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : scores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Trophy size={28} className="text-amber-400/50" />
              </div>
              <p className="text-white/40 text-sm font-medium">No scores yet{tab === 'today' ? ' today' : tab === 'week' ? ' this week' : ''}!</p>
              <p className="text-white/25 text-xs">Play a run and be the first on the board.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {scores.map((entry, i) => {
                const rank = i + 1;
                const biome = BIOME_LABELS[entry.biome_reached] || BIOME_LABELS.enchanted;
                const charEmoji = CHAR_EMOJIS[entry.avatar_character] || '🦊';
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${getRankBg(rank)}`}
                  >
                    {/* Rank */}
                    <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center flex-shrink-0">
                      {getRankIcon(rank)}
                    </div>

                    {/* Avatar circle */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm border border-white/10"
                      style={{ backgroundColor: (entry.avatar_color || '#FF8C42') + '30' }}
                    >
                      {charEmoji}
                    </div>

                    {/* Name + details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-sm truncate">{entry.player_name}</span>
                        {rank <= 3 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300">
                            TOP {rank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white/30 text-[10px] flex items-center gap-0.5">
                          <MapPin size={8} />
                          {Math.floor(entry.distance)}m
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0 rounded"
                          style={{ color: biome.color, backgroundColor: biome.color + '15' }}
                        >
                          {biome.label}
                        </span>
                        {entry.best_combo > 5 && (
                          <span className="text-orange-400/60 text-[10px] flex items-center gap-0.5">
                            <Zap size={8} />
                            {entry.best_combo}x
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score + time */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-white font-black text-sm">{entry.score.toLocaleString()}</div>
                      <div className="text-white/25 text-[10px]">{formatDate(entry.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <button
            onClick={() => setScreen('menu')}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
