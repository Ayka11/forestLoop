import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Resources, AvatarConfig, ShopItem, DailyChallenge, ChallengeProgress, DifficultyLevel, AppGameMode, DIFFICULTY_CONFIGS } from '@/game/types';
import { GameEngine, SavedRun } from '@/game/engine';

export type ScreenType = 'menu' | 'playing' | 'paused' | 'gameover' | 'shop' | 'avatar' | 'achievements' | 'crafting' | 'daily' | 'leaderboard';

interface GameContextType {
  gameState: GameState | null;
  engine: React.MutableRefObject<GameEngine | null>;
  screen: ScreenType;
  setScreen: (s: ScreenType) => void;
  avatar: AvatarConfig;
  setAvatar: (a: AvatarConfig) => void;
  shopItems: ShopItem[];
  ownedItems: string[];
  equippedItems: string[];
  buyItem: (id: string) => boolean;
  equipItem: (id: string) => void;
  dailyChallenges: DailyChallenge[];
  updateChallengeProgress: (type: DailyChallenge['type'], amount: number) => void;
  claimDailyReward: (id: string) => boolean;
  currentStreak: number;
  totalChallengesCompletedToday: number;
  totalTokens: number;
  setTotalTokens: (n: number) => void;
  highScore: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  educationEnabled: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleEducation: () => void;
  updateGameState: (state: GameState) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  returnToMenu: () => void;
  savedRunSnapshot: SavedRun | null;
  savedRunAvailable: boolean;
  saveProgress: () => void;
  clearSavedProgress: () => void;
  resumeSavedRun: () => void;
  pendingResume: boolean;
  markResumeConsumed: () => void;
  checkpointMessage: string | null;
  showCheckpointToast: () => void;
  educationOverlay: { visible: boolean; item: string; position: { x: number; y: number } };
  showEducationOverlay: (item: string, position: { x: number; y: number }) => void;
  hideEducationOverlay: () => void;
  difficulty: DifficultyLevel;
  setDifficulty: (d: DifficultyLevel) => void;
  gameMode: AppGameMode;
  setGameMode: (m: AppGameMode) => void;
}

const GameContext = createContext<GameContextType | null>(null);

// Check hard mode exclusive unlock flags from localStorage
const brambleFoxUnlocked = localStorage.getItem('flo_unlockedBrambleFox') === '1';
const thornlingUnlocked  = localStorage.getItem('flo_unlockedThornling')  === '1';

const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  // ── Skins ──
  { id: 'skin_golden', name: 'Golden Fox', description: 'Shimmering golden fur', price: 500, category: 'skin', rarity: 'rare', owned: false, equipped: false, icon: 'fox', color: '#FFD700' },
  { id: 'skin_crystal', name: 'Crystal Bunny', description: 'Sparkly crystal coat', price: 800, category: 'skin', rarity: 'epic', owned: false, equipped: false, icon: 'bunny', color: '#00E5FF' },
  { id: 'skin_shadow', name: 'Shadow Cat', description: 'Mysterious dark fur', price: 600, category: 'skin', rarity: 'rare', owned: false, equipped: false, icon: 'cat', color: '#37474F' },
  { id: 'skin_sunset', name: 'Sunset Owl', description: 'Warm sunset feathers', price: 700, category: 'skin', rarity: 'rare', owned: false, equipped: false, icon: 'owl', color: '#FF7043' },
  { id: 'skin_rainbow', name: 'Rainbow Fox', description: 'All the colors!', price: 1500, category: 'skin', rarity: 'legendary', owned: false, equipped: false, icon: 'rainbow', color: '#E040FB' },
  { id: 'skin_berry', name: 'Berry Fox', description: 'Sweet strawberry scent', price: 250, category: 'skin', rarity: 'common', owned: false, equipped: false, icon: 'berry', color: '#FF69B4' },
  { id: 'skin_panda', name: 'Panda Bear', description: 'Adorable and fluffy', price: 450, category: 'skin', rarity: 'rare', owned: false, equipped: false, icon: 'panda', color: '#FF8A80' },
  // ── Hard Mode Exclusive Skins (unlocked by defeating Bramble King / reaching 1000m) ──
  { id: 'skin_bramble_fox', name: 'Bramble Fox 🌿', description: brambleFoxUnlocked ? 'Defeat Bramble King reward — thorny and fierce!' : '🔒 Defeat the Bramble King in Hard Mode', price: 0, category: 'skin', rarity: 'legendary', owned: brambleFoxUnlocked, equipped: false, icon: 'fox', color: '#2E7D32' },
  { id: 'skin_thornling',   name: 'Thornling Buddy 🌵', description: thornlingUnlocked  ? 'Hard Mode veteran — 1000m survived!' : '🔒 Run 1000m in Hard Mode', price: 0, category: 'skin', rarity: 'epic', owned: thornlingUnlocked, equipped: false, icon: 'bunny', color: '#558B2F' },

  // ── Hats ──
  { id: 'hat_crown', name: 'Royal Crown', description: 'Feel like royalty', price: 300, category: 'hat', rarity: 'rare', owned: false, equipped: false, icon: 'crown', color: '#FFD700' },
  { id: 'hat_flower', name: 'Flower Wreath', description: 'Nature\'s crown', price: 150, category: 'hat', rarity: 'common', owned: false, equipped: false, icon: 'flower', color: '#FF69B4' },
  { id: 'hat_wizard', name: 'Wizard Hat', description: 'Magical headwear', price: 400, category: 'hat', rarity: 'rare', owned: false, equipped: false, icon: 'wizard', color: '#7C4DFF' },
  { id: 'hat_leaf', name: 'Leaf Cap', description: 'Forest camouflage', price: 100, category: 'hat', rarity: 'common', owned: false, equipped: false, icon: 'leaf', color: '#4CAF50' },
  { id: 'hat_mushroom', name: 'Mushroom Cap', description: 'Cute fungi fashion', price: 180, category: 'hat', rarity: 'common', owned: false, equipped: false, icon: 'mushroom', color: '#E53935' },
  { id: 'hat_starband', name: 'Star Band', description: 'Twinkle on your head', price: 350, category: 'hat', rarity: 'rare', owned: false, equipped: false, icon: 'starhat', color: '#FFC107' },

  // ── Pets ──
  { id: 'pet_butterfly', name: 'Sparkle Butterfly', description: 'Follows you around', price: 600, category: 'pet', rarity: 'rare', owned: false, equipped: false, icon: 'butterfly', color: '#E040FB' },
  { id: 'pet_firefly', name: 'Glow Firefly', description: 'Lights your path', price: 400, category: 'pet', rarity: 'common', owned: false, equipped: false, icon: 'firefly', color: '#FFEB3B' },
  { id: 'pet_bird', name: 'Songbird', description: 'Sings as you run', price: 500, category: 'pet', rarity: 'rare', owned: false, equipped: false, icon: 'bird', color: '#42A5F5' },
  { id: 'pet_dragon', name: 'Baby Dragon', description: 'Tiny but mighty!', price: 2000, category: 'pet', rarity: 'legendary', owned: false, equipped: false, icon: 'dragon', color: '#FF5722' },
  { id: 'pet_slime', name: 'Tiny Slime', description: 'Bouncy little buddy', price: 220, category: 'pet', rarity: 'common', owned: false, equipped: false, icon: 'slime', color: '#76FF03' },
  { id: 'pet_dandelion', name: 'Floating Dandelion', description: 'Drifts in the breeze', price: 550, category: 'pet', rarity: 'rare', owned: false, equipped: false, icon: 'dandelion', color: '#FFF176' },

  // ── Boosts ──
  { id: 'boost_magnet', name: 'Coin Magnet', description: 'Attract nearby tokens', price: 200, category: 'boost', rarity: 'common', owned: false, equipped: false, icon: 'magnet', color: '#F44336' },
  { id: 'boost_double', name: 'Double Tokens', description: '2x tokens for one run', price: 300, category: 'boost', rarity: 'rare', owned: false, equipped: false, icon: 'x2', color: '#FFD700' },
  { id: 'boost_shield', name: 'Extra Shield', description: 'Start with a shield', price: 250, category: 'boost', rarity: 'common', owned: false, equipped: false, icon: 'shield', color: '#9C27B0' },
  { id: 'boost_triple', name: 'Triple Jump', description: 'Three jumps in a row', price: 450, category: 'boost', rarity: 'rare', owned: false, equipped: false, icon: 'triple', color: '#00E676' },
  { id: 'boost_potion', name: 'Speed Potion', description: 'Zoom like the wind', price: 650, category: 'boost', rarity: 'epic', owned: false, equipped: false, icon: 'potion', color: '#2979FF' },

  // ── Blocks ──
  { id: 'block_crystal', name: 'Crystal Blocks', description: 'Sparkly building blocks', price: 350, category: 'block', rarity: 'rare', owned: false, equipped: false, icon: 'crystal', color: '#00E5FF' },
  { id: 'block_gold', name: 'Gold Blocks', description: 'Luxurious building', price: 500, category: 'block', rarity: 'epic', owned: false, equipped: false, icon: 'gold', color: '#FFD700' },
  { id: 'block_rainbow', name: 'Rainbow Blocks', description: 'Colorful creations', price: 750, category: 'block', rarity: 'epic', owned: false, equipped: false, icon: 'rainbow', color: '#FF4081' },
  { id: 'block_mushroom', name: 'Mushroom Blocks', description: 'Cute toadstool tiles', price: 200, category: 'block', rarity: 'common', owned: false, equipped: false, icon: 'mushroom', color: '#EC407A' },
  { id: 'block_candy', name: 'Candy Blocks', description: 'Sweet construction', price: 400, category: 'block', rarity: 'rare', owned: false, equipped: false, icon: 'candy', color: '#F48FB1' },
];

// Challenge pool — all achievable in a normal session
// time targets are in seconds (engine sends dt/60 per frame ≈ 1 unit/second)
// distance targets are in pixels (engine sends distanceDelta each frame)
// collect targets are item counts (engine sends 1 per collect)
// combo targets are combo count (engine sends comboDelta per collect)
// jump targets are jump counts (engine sends 1 per jump)
const CHALLENGE_POOL = {
  easy: [
    { id: 'dist_80',    title: 'Forest Stroll',   description: 'Run 80m',                    type: 'distance' as const, target: 80,  reward: 20 },
    { id: 'collect_5',  title: 'Leaf Picker',      description: 'Collect 5 tokens',            type: 'collect'  as const, target: 5,   reward: 20 },
    { id: 'jump_8',     title: 'Boing!',           description: 'Jump 8 times',                type: 'jump'     as const, target: 8,   reward: 20 },
    { id: 'time_60',    title: 'One Minute',       description: 'Play for 1 minute',           type: 'time'     as const, target: 60,  reward: 25 },
    { id: 'dist_120',   title: 'Explorer',         description: 'Run 120m',                    type: 'distance' as const, target: 120, reward: 25 },
    { id: 'collect_8',  title: 'Token Trot',       description: 'Collect 8 tokens',            type: 'collect'  as const, target: 8,   reward: 25 },
  ],
  medium: [
    { id: 'dist_200',   title: 'Trail Blazer',     description: 'Run 200m in one go',          type: 'distance' as const, target: 200, reward: 40 },
    { id: 'collect_15', title: 'Token Hoarder',    description: 'Collect 15 tokens',           type: 'collect'  as const, target: 15,  reward: 35 },
    { id: 'combo_3',    title: 'Chain Reaction',   description: 'Build a 3× combo',            type: 'combo'    as const, target: 3,   reward: 40 },
    { id: 'jump_20',    title: 'Springy Legs',     description: 'Jump 20 times',               type: 'jump'     as const, target: 20,  reward: 35 },
    { id: 'time_120',   title: 'Two Minutes',      description: 'Play for 2 minutes',          type: 'time'     as const, target: 120, reward: 40 },
    { id: 'platform_8', title: 'Platform Hopper',  description: 'Land on 8 platforms',         type: 'platform' as const, target: 8,   reward: 35 },
  ],
  hard: [
    { id: 'dist_350',   title: 'Long Haul',        description: 'Run 350m in one go',          type: 'distance' as const, target: 350, reward: 60 },
    { id: 'collect_25', title: 'Token Master',     description: 'Collect 25 tokens',           type: 'collect'  as const, target: 25,  reward: 55 },
    { id: 'combo_5',    title: 'Combo King',       description: 'Build a 5× combo',            type: 'combo'    as const, target: 5,   reward: 60 },
    { id: 'time_180',   title: 'Endurance Run',    description: 'Play for 3 minutes',          type: 'time'     as const, target: 180, reward: 55 },
    { id: 'jump_35',    title: 'Jump Legend',      description: 'Jump 35 times',               type: 'jump'     as const, target: 35,  reward: 50 },
    { id: 'platform_15',title: 'Platform Master',  description: 'Land on 15 platforms',        type: 'platform' as const, target: 15,  reward: 55 },
  ],
};

// Generate daily challenges — rotate pool by day-of-week so they vary each day
function generateDailyChallenges(): DailyChallenge[] {
  const dayOfWeek = new Date().getDay(); // 0=Sun … 6=Sat
  const dayOfMonth = new Date().getDate();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Rotate within each pool using day-of-week so the set changes daily
  const easyPool  = CHALLENGE_POOL.easy;
  const medPool   = CHALLENGE_POOL.medium;
  const hardPool  = CHALLENGE_POOL.hard;

  const pick = (pool: typeof easyPool, offset: number, count: number) =>
    Array.from({ length: count }, (_, i) => {
      const src = pool[(offset + i) % pool.length];
      return { ...src, progress: 0, completed: false, claimed: false };
    });

  const challenges: DailyChallenge[] = [
    ...pick(easyPool,  dayOfWeek,     2),  // 2 easy
    ...pick(medPool,   dayOfWeek + 1, 2),  // 2 medium
    ...pick(hardPool,  dayOfWeek,     1),  // 1 hard
  ];

  // Weekend bonus — uses 'collect' type so it can actually be tracked
  if (isWeekend) {
    challenges.push({
      id: 'weekend_bonus', title: 'Weekend Hunter',
      description: 'Collect 30 tokens this weekend',
      type: 'collect', target: 30, reward: 80, progress: 0, completed: false, claimed: false,
    });
  }

  // First-week-of-month bonus — uses 'distance' type
  if (dayOfMonth <= 7) {
    challenges.push({
      id: 'monthly_bonus', title: 'Month Opener',
      description: 'Run 500m to start the month',
      type: 'distance', target: 500, reward: 150, progress: 0, completed: false, claimed: false,
    });
  }

  return challenges;
}

const DEFAULT_CHALLENGES_BASE: Omit<DailyChallenge, 'progress' | 'completed' | 'claimed'>[] = generateDailyChallenges();

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  // ====================== Existing States ======================
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<ScreenType>('menu');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => {
    const saved = localStorage.getItem('flo_difficulty');
    return (saved as DifficultyLevel) || 'normal';
  });
  const [gameMode, setGameModeState] = useState<AppGameMode>(() => {
    const saved = localStorage.getItem('flo_gameMode');
    return (saved as AppGameMode) || 'endless';
  });
  const [avatar, setAvatar] = useState<AvatarConfig>(() => {
    const saved = localStorage.getItem('flo_avatar');
    return saved ? JSON.parse(saved) : { character: 'fox', color: '#FF8C42', hat: null, accessory: null, pet: null, trail: null };
  });
  const [totalTokens, setTotalTokens] = useState(() => parseInt(localStorage.getItem('flo_totalTokens') || '0'));
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('flo_highScore') || '0'));
  const [ownedItems, setOwnedItems] = useState<string[]>(() => JSON.parse(localStorage.getItem('flo_owned') || '[]'));
  const [equippedItems, setEquippedItems] = useState<string[]>(() => JSON.parse(localStorage.getItem('flo_equipped') || '[]'));
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [educationEnabled, setEducationEnabled] = useState(() => 
    localStorage.getItem('flo_educationEnabled') !== 'false'
  );
  const [savedRunSnapshot, setSavedRunSnapshot] = useState<SavedRun | null>(() => {
    const saved = localStorage.getItem('flo_savedRun');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [pendingResume, setPendingResume] = useState(false);
  const engineRef = useRef<GameEngine | null>(null);
  const [checkpointMessage, setCheckpointMessage] = useState<string | null>(null);
  const checkpointTimer = useRef<number | null>(null);
  const [educationOverlay, setEducationOverlay] = useState<{ visible: boolean; item: string; position: { x: number; y: number } }>({ visible: false, item: '', position: { x: 0, y: 0 } });

  // ====================== NEW: Daily Challenges ======================
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress>(() => {
    const saved = localStorage.getItem('flo_dailyProgress');
    const today = getTodayString();

    if (saved) {
      const parsed: ChallengeProgress = JSON.parse(saved);
      if (parsed.date === today) return parsed;
    }

    // New day → generate fresh challenges
    const freshChallenges: DailyChallenge[] = DEFAULT_CHALLENGES_BASE.map(base => ({
      ...base,
      progress: 0,
      completed: false,
      claimed: false,
    }));

    const newProgress: ChallengeProgress = {
      date: today,
      challenges: freshChallenges,
      streak: (JSON.parse(saved || '{}').streak || 0) + 1, // simple streak
    };

    localStorage.setItem('flo_dailyProgress', JSON.stringify(newProgress));
    return newProgress;
  });

  const currentStreak = challengeProgress.streak;
  const dailyChallenges = challengeProgress.challenges;

  const totalChallengesCompletedToday = dailyChallenges.filter(c => c.completed).length;

  // Update challenge progress (call this from GameEngine during gameplay)
  const updateChallengeProgress = useCallback((type: DailyChallenge['type'], amount: number) => {
    if (screen !== 'playing') return;

    setChallengeProgress(prev => {
      const newChallenges = prev.challenges.map(challenge => {
        if (challenge.type !== type || challenge.completed || challenge.claimed) return challenge;

        const newProgress = Math.min(challenge.target, challenge.progress + amount);
        const completed = newProgress >= challenge.target;

        return {
          ...challenge,
          progress: newProgress,
          completed,
        };
      });

      const newState = { ...prev, challenges: newChallenges };
      localStorage.setItem('flo_dailyProgress', JSON.stringify(newState));
      return newState;
    });
  }, [screen]);

  const showCheckpointToast = useCallback(() => {
    setCheckpointMessage('Checkpoint saved!');
    if (checkpointTimer.current) window.clearTimeout(checkpointTimer.current);
    checkpointTimer.current = window.setTimeout(() => {
      setCheckpointMessage(null);
    }, 2500);
  }, []);

  const showEducationOverlay = useCallback((item: string, position: { x: number; y: number }) => {
    setEducationOverlay({ visible: true, item, position });
  }, []);

  const hideEducationOverlay = useCallback(() => {
    setEducationOverlay(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (checkpointTimer.current) window.clearTimeout(checkpointTimer.current);
    };
  }, []);

  const claimDailyReward = useCallback((id: string) => {
    const challenge = dailyChallenges.find(c => c.id === id);
    if (!challenge || !challenge.completed || challenge.claimed) return false;

    setChallengeProgress(prev => {
      const newChallenges = prev.challenges.map(c =>
        c.id === id ? { ...c, claimed: true } : c
      );

      const newState = { ...prev, challenges: newChallenges };
      localStorage.setItem('flo_dailyProgress', JSON.stringify(newState));
      return newState;
    });

    // Give reward
    const rewardAmount = challenge.reward;
    const newTotal = totalTokens + rewardAmount;
    setTotalTokens(newTotal);
    localStorage.setItem('flo_totalTokens', String(newTotal));

    return true;
  }, [dailyChallenges, totalTokens]);

  const saveProgress = useCallback(() => {
    if (!engineRef.current) return;
    try {
      const snapshot = engineRef.current.saveProgress();
      localStorage.setItem('flo_savedRun', JSON.stringify(snapshot));
      setSavedRunSnapshot(snapshot);
    } catch (error) {
      console.warn('Failed to save run progress', error);
    }
  }, []);

  const clearSavedProgress = useCallback(() => {
    localStorage.removeItem('flo_savedRun');
    setSavedRunSnapshot(null);
  }, []);

  const resumeSavedRun = useCallback(() => {
    if (!savedRunSnapshot) return;
    setPendingResume(true);
    setScreen('playing');
  }, [savedRunSnapshot]);

  const markResumeConsumed = useCallback(() => {
    setPendingResume(false);
  }, []);

  const savedRunAvailable = Boolean(savedRunSnapshot);

  // ====================== Pause & Safe Navigation ======================
  const pauseGame = useCallback(() => {
    if (engineRef.current) {
      saveProgress();
      engineRef.current.pause();
    }
    setScreen('paused');
  }, [saveProgress]);

  const resumeGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
    }
    setScreen('playing');
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      saveProgress();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveProgress]);

  // Safe way to exit the run and go back to menu
  const returnToMenu = useCallback(() => {
    if (engineRef.current) {
      saveProgress();
      engineRef.current.stop();           // Important: fully stop the engine
    }
    setEducationOverlay({ visible: false, item: '', position: { x: 0, y: 0 } });
    setScreen('menu');
    setGameState(null);                    // Clear current run data
  }, [saveProgress]);

  // ====================== Existing functions (cleaned up) ======================
  const shopItems = DEFAULT_SHOP_ITEMS.map(item => ({
    ...item,
    owned: ownedItems.includes(item.id),
    equipped: equippedItems.includes(item.id),
  }));

  const updateGameState = useCallback((state: GameState) => {
    setGameState(state);
    if (state.score > highScore) {
      setHighScore(state.score);
      localStorage.setItem('flo_highScore', String(state.score));
    }
    setTotalTokens(state.totalLeafTokens);
    localStorage.setItem('flo_totalTokens', String(state.totalLeafTokens));
  }, [highScore]);

  const saveAvatar = useCallback((a: AvatarConfig) => {
    setAvatar(a);
    localStorage.setItem('flo_avatar', JSON.stringify(a));
    if (engineRef.current) engineRef.current.setAvatar(a);
  }, []);

  const buyItem = useCallback((id: string) => {
    const item = DEFAULT_SHOP_ITEMS.find(i => i.id === id);
    if (!item || ownedItems.includes(id)) return false;
    if (totalTokens < item.price) return false;
    const newTokens = totalTokens - item.price;
    setTotalTokens(newTokens);
    localStorage.setItem('flo_totalTokens', String(newTokens));
    const newOwned = [...ownedItems, id];
    setOwnedItems(newOwned);
    localStorage.setItem('flo_owned', JSON.stringify(newOwned));
    return true;
  }, [totalTokens, ownedItems]);

  const equipItem = useCallback((id: string) => {
    if (!ownedItems.includes(id)) return;
    const item = DEFAULT_SHOP_ITEMS.find(i => i.id === id);
    if (!item) return;
    const newEquipped = equippedItems.filter(eid => {
      const eItem = DEFAULT_SHOP_ITEMS.find(i => i.id === eid);
      return eItem?.category !== item.category;
    });
    if (!equippedItems.includes(id)) newEquipped.push(id);
    setEquippedItems(newEquipped);
    localStorage.setItem('flo_equipped', JSON.stringify(newEquipped));
  }, [ownedItems, equippedItems]);

  const toggleMusic = useCallback(() => setMusicEnabled(p => !p), []);
  const toggleSfx = useCallback(() => setSfxEnabled(p => !p), []);
  const toggleEducation = useCallback(() => {
    const newState = !educationEnabled;
    setEducationEnabled(newState);
    localStorage.setItem('flo_educationEnabled', String(newState));
  }, [educationEnabled]);

  const handleSetDifficulty = useCallback((d: DifficultyLevel) => {
    setDifficulty(d);
    localStorage.setItem('flo_difficulty', d);
  }, []);

  const handleSetGameMode = useCallback((m: AppGameMode) => {
    setGameModeState(m);
    localStorage.setItem('flo_gameMode', m);
  }, []);


  return (
    <GameContext.Provider value={{
      gameState,
      engine: engineRef,
      screen,
      setScreen,
      avatar,
      setAvatar: saveAvatar,
      shopItems,
      ownedItems,
      equippedItems,
      buyItem,
      equipItem,
      dailyChallenges,
      updateChallengeProgress,
      claimDailyReward,
      currentStreak,
      totalChallengesCompletedToday,
      totalTokens,
      setTotalTokens,
      highScore,
      musicEnabled,
      sfxEnabled,
      educationEnabled,
      toggleMusic,
      toggleSfx,
      toggleEducation,
      updateGameState,
      pauseGame,
      resumeGame,
      returnToMenu,
      savedRunSnapshot,
      savedRunAvailable,
      saveProgress,
      clearSavedProgress,
      resumeSavedRun,
      pendingResume,
      markResumeConsumed,
      checkpointMessage,
      showCheckpointToast,
      educationOverlay,
      showEducationOverlay,
      hideEducationOverlay,
      difficulty,
      setDifficulty: handleSetDifficulty,
      gameMode,
      setGameMode: handleSetGameMode,
    }}>
      {children}
    </GameContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
