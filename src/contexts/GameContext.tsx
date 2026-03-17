import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { GameState, Resources, AvatarConfig, ShopItem, DailyChallenge } from '@/game/types';
import { GameEngine } from '@/game/engine';

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
  totalTokens: number;
  setTotalTokens: (n: number) => void;
  highScore: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  updateGameState: (state: GameState) => void;
}

const GameContext = createContext<GameContextType | null>(null);

const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  { id: 'skin_golden', name: 'Golden Fox', description: 'Shimmering golden fur', price: 500, category: 'skin', rarity: 'rare', owned: false, equipped: false, icon: 'fox', color: '#FFD700' },
  { id: 'skin_crystal', name: 'Crystal Bunny', description: 'Sparkly crystal coat', price: 800, category: 'skin', rarity: 'epic', owned: false, equipped: false, icon: 'bunny', color: '#00E5FF' },
  { id: 'skin_shadow', name: 'Shadow Cat', description: 'Mysterious dark fur', price: 600, category: 'skin', rarity: 'rare', owned: false, equipped: false, icon: 'cat', color: '#37474F' },
  { id: 'skin_sunset', name: 'Sunset Owl', description: 'Warm sunset feathers', price: 700, category: 'skin', rarity: 'rare', owned: false, equipped: false, icon: 'owl', color: '#FF7043' },
  { id: 'skin_rainbow', name: 'Rainbow Fox', description: 'All the colors!', price: 1500, category: 'skin', rarity: 'legendary', owned: false, equipped: false, icon: 'fox', color: '#E040FB' },
  { id: 'hat_crown', name: 'Royal Crown', description: 'Feel like royalty', price: 300, category: 'hat', rarity: 'rare', owned: false, equipped: false, icon: 'crown', color: '#FFD700' },
  { id: 'hat_flower', name: 'Flower Wreath', description: 'Nature\'s crown', price: 150, category: 'hat', rarity: 'common', owned: false, equipped: false, icon: 'flower', color: '#FF69B4' },
  { id: 'hat_wizard', name: 'Wizard Hat', description: 'Magical headwear', price: 400, category: 'hat', rarity: 'rare', owned: false, equipped: false, icon: 'wizard', color: '#7C4DFF' },
  { id: 'hat_leaf', name: 'Leaf Cap', description: 'Forest camouflage', price: 100, category: 'hat', rarity: 'common', owned: false, equipped: false, icon: 'leaf', color: '#4CAF50' },
  { id: 'pet_butterfly', name: 'Sparkle Butterfly', description: 'Follows you around', price: 600, category: 'pet', rarity: 'rare', owned: false, equipped: false, icon: 'butterfly', color: '#E040FB' },
  { id: 'pet_firefly', name: 'Glow Firefly', description: 'Lights your path', price: 400, category: 'pet', rarity: 'common', owned: false, equipped: false, icon: 'firefly', color: '#FFEB3B' },
  { id: 'pet_bird', name: 'Songbird', description: 'Sings as you run', price: 500, category: 'pet', rarity: 'rare', owned: false, equipped: false, icon: 'bird', color: '#42A5F5' },
  { id: 'pet_dragon', name: 'Baby Dragon', description: 'Tiny but mighty!', price: 2000, category: 'pet', rarity: 'legendary', owned: false, equipped: false, icon: 'dragon', color: '#FF5722' },
  { id: 'boost_magnet', name: 'Coin Magnet', description: 'Attract nearby tokens', price: 200, category: 'boost', rarity: 'common', owned: false, equipped: false, icon: 'magnet', color: '#F44336' },
  { id: 'boost_double', name: 'Double Tokens', description: '2x tokens for one run', price: 300, category: 'boost', rarity: 'rare', owned: false, equipped: false, icon: 'x2', color: '#FFD700' },
  { id: 'boost_shield', name: 'Extra Shield', description: 'Start with a shield', price: 250, category: 'boost', rarity: 'common', owned: false, equipped: false, icon: 'shield', color: '#9C27B0' },
  { id: 'block_crystal', name: 'Crystal Blocks', description: 'Sparkly building blocks', price: 350, category: 'block', rarity: 'rare', owned: false, equipped: false, icon: 'crystal', color: '#00E5FF' },
  { id: 'block_gold', name: 'Gold Blocks', description: 'Luxurious building', price: 500, category: 'block', rarity: 'epic', owned: false, equipped: false, icon: 'gold', color: '#FFD700' },
];

const DEFAULT_CHALLENGES: DailyChallenge[] = [
  { id: 'dist_500', title: 'Distance Runner', description: 'Travel 500m in one run', target: 500, progress: 0, reward: 50, type: 'distance' },
  { id: 'collect_20', title: 'Resource Hoarder', description: 'Collect 20 resources', target: 20, progress: 0, reward: 30, type: 'collect' },
  { id: 'combo_10', title: 'Combo Master', description: 'Reach a 10x combo', target: 10, progress: 0, reward: 75, type: 'combo' },
  { id: 'craft_3', title: 'Builder', description: 'Craft 3 items in one run', target: 3, progress: 0, reward: 40, type: 'craft' },
  { id: 'dist_1000', title: 'Marathon', description: 'Travel 1000m in one run', target: 1000, progress: 0, reward: 100, type: 'distance' },
];

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<ScreenType>('menu');
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
  const [dailyChallenges] = useState(DEFAULT_CHALLENGES);
  const engineRef = useRef<GameEngine | null>(null);

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

  return (
    <GameContext.Provider value={{
      gameState, engine: engineRef, screen, setScreen,
      avatar, setAvatar: saveAvatar, shopItems, ownedItems, equippedItems,
      buyItem, equipItem, dailyChallenges, totalTokens, setTotalTokens,
      highScore, musicEnabled, sfxEnabled, toggleMusic, toggleSfx, updateGameState,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
