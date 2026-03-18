// ===== GAME TYPES =====

export interface Vector2 {
  x: number;
  y: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'floating' | 'mushroom' | 'vine' | 'log' | 'bridge' | 'ramp';
  color: string;
  bouncy?: boolean;
  moving?: boolean;
  moveRange?: number;
  moveSpeed?: number;
  originalY?: number;
}

export interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wood' | 'stone' | 'flower' | 'leaf' | 'leafToken' | 'mushroom_powerup' | 'star' | 'fireFlower' | 'leafWings' | 'speedBoots' | 'shield';
  collected: boolean;
  bobOffset: number;
  sparkle: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'slime' | 'bird' | 'rollingLog';
  speed: number;
  bounceOffset: number;
  direction: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'sparkle' | 'leaf' | 'collect' | 'trail' | 'firefly' | 'dust';
}

export interface BackgroundLayer {
  offset: number;
  speed: number;
  elements: BackgroundElement[];
}

export interface BackgroundElement {
  x: number;
  y: number;
  type: 'tree' | 'bush' | 'cloud' | 'mountain' | 'flower' | 'mushroom' | 'firefly';
  scale: number;
  color: string;
  variant: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  jumping: boolean;
  doubleJumped: boolean;
  wallKicking: boolean;
  gliding: boolean;
  facing: 1 | -1;
  animFrame: number;
  animTimer: number;
  // Power-ups
  activePowerUp: PowerUpType | null;
  powerUpTimer: number;
  invincible: boolean;
  bigMode: boolean;
  hasLeafWings: boolean;
  speedBoost: boolean;
  hasShield: boolean;
  // Visual
  trailColor: string;
  squash: number;
  stretch: number;
  // Custom properties
  invincibilityGraceDistance?: number;
  id?: string; // for multiplayer
}

export type PowerUpType = 'mushroom' | 'star' | 'fireFlower' | 'leafWings' | 'speedBoots' | 'shield';

export interface GameState {
  score: number;
  distance: number;
  leafTokens: number;
  totalLeafTokens: number;
  resources: Resources;
  combo: number;
  comboTimer: number;
  multiplier: number;
  lives: number;
  checkpointDistance: number;
  speed: number;
  baseSpeed: number;
  biome: BiomeType;
  gameTime: number;
  isPaused: boolean;
  isGameOver: boolean;
  isPlaying: boolean;
  dailyChallenge: DailyChallenge | null;
  achievements: string[];
  streak: number;
  unlockedBiomes?: BiomeType[];
}

export interface Resources {
  wood: number;
  stone: number;
  flower: number;
  leaf: number;
}

export type BiomeType = 'enchanted' | 'crystal' | 'autumn' | 'firefly' | 'candy' | 'frozen' | 'volcanic' | 'cloud';

export interface CraftRecipe {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: Partial<Resources>;
  type: 'bridge' | 'platform' | 'ramp' | 'wall';
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'skin' | 'hat' | 'pet' | 'boost' | 'block';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  owned: boolean;
  equipped: boolean;
  icon: string;
  color: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  type: 'distance' | 'collect' | 'combo' | 'craft';
}

export interface AvatarConfig {
  character: 'fox' | 'bunny' | 'cat' | 'owl';
  color: string;
  hat: string | null;
  accessory: string | null;
  pet: string | null;
  trail: string | null;
}

// ===== CONSTANTS =====

export const GRAVITY = 0.6;
export const JUMP_FORCE = -13;
export const DOUBLE_JUMP_FORCE = -11;
export const GLIDE_GRAVITY = 0.15;
export const PLAYER_SPEED = 0;
export const BASE_SCROLL_SPEED = 4;
export const MAX_SCROLL_SPEED = 8;
export const GROUND_Y = 500;
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 700;
export const CHECKPOINT_INTERVAL = 2000;
export const POWERUP_DURATION = 600;

export interface BiomeConfig {
  sky?: string[];
  ground: string;
  accent?: string;
  trees: string[];
  flowers: string[];
  background?: string;
  particles?: string;
  music?: string;
  platforms?: string[];
  obstacles?: string[];
  collectibles?: string[];
}

export const BIOME_COLORS: Record<BiomeType, BiomeConfig> = {
  enchanted: {
    sky: ['#87CEEB', '#B0E0E6', '#98FB98'],
    ground: '#4A7C3F',
    accent: '#FFD700',
    trees: ['#2D5A1E', '#3A7D2C', '#4CAF50', '#66BB6A'],
    flowers: ['#FF69B4', '#FFD700', '#FF6347', '#DDA0DD', '#87CEEB'],
  },
  crystal: {
    sky: ['#1A0533', '#2D1B69', '#4A148C'],
    ground: '#3E2D6B',
    accent: '#00E5FF',
    trees: ['#4A148C', '#6A1B9A', '#8E24AA', '#AB47BC'],
    flowers: ['#00E5FF', '#E040FB', '#7C4DFF', '#18FFFF', '#EA80FC'],
  },
  autumn: {
    sky: ['#FF8A65', '#FFAB91', '#FFE0B2'],
    ground: '#8D6E63',
    accent: '#FF6F00',
    trees: ['#BF360C', '#D84315', '#E65100', '#FF6F00'],
    flowers: ['#FFD54F', '#FF8A65', '#FF5722', '#FFC107', '#FF7043'],
  },
  firefly: {
    sky: ['#0D1B2A', '#1B2838', '#1A237E'],
    ground: '#1B3A2D',
    accent: '#FFEB3B',
    trees: ['#1B5E20', '#2E7D32', '#1A237E', '#263238'],
    flowers: ['#FFEB3B', '#76FF03', '#00E676', '#69F0AE', '#B2FF59'],
  },
  candy: {
    ground: '#FFC1E3',
    trees: ['#FFB6C1', '#FFD1DC'],
    flowers: ['#FF69B4'],
    background: '#FFF0F5',
    particles: 'sparkle',
    music: 'whimsical',
    platforms: ['pastel', 'gumdrop'],
    obstacles: ['candyMonster'],
    collectibles: ['gumdrop', 'lollipop'],
  },
  frozen: {
    ground: '#B3EFFF',
    trees: ['#E0F7FA', '#B2EBF2'],
    flowers: ['#81D4FA'],
    background: '#EAF6FF',
    particles: 'snowflake',
    music: 'icy',
    platforms: ['ice', 'snow'],
    obstacles: ['snowball'],
    collectibles: ['snowflake', 'iceGem'],
  },
  volcanic: {
    ground: '#FF7043',
    trees: ['#FFAB91', '#D84315'],
    flowers: ['#FF8A65'],
    background: '#2D2D2D',
    particles: 'ember',
    music: 'intense',
    platforms: ['lava', 'crystal'],
    obstacles: ['magmaMonster'],
    collectibles: ['ember', 'crystalShard'],
  },
  cloud: {
    ground: '#E3F6FF',
    trees: ['#B3E5FC', '#81D4FA'],
    flowers: ['#B2EBF2'],
    background: '#F0F8FF',
    particles: 'cloud',
    music: 'airy',
    platforms: ['cloud', 'rainbow'],
    obstacles: ['windGust'],
    collectibles: ['star', 'rainbowGem'],
  },
};

export const BIOME_UNLOCK_MILESTONES = {
  candy: 20000,
  frozen: 30000,
  volcanic: 40000,
  cloud: 50000,
};

export const CRAFT_RECIPES: CraftRecipe[] = [
  { id: 'bridge', name: 'Bridge', icon: '🌉', description: 'Cross gaps safely', cost: { wood: 3 }, type: 'bridge' },
  { id: 'platform', name: 'Bouncy Pad', icon: '🍄', description: 'Super high bounce', cost: { flower: 2, leaf: 1 }, type: 'platform' },
  { id: 'ramp', name: 'Speed Ramp', icon: '⚡', description: 'Launch forward fast', cost: { stone: 2, wood: 1 }, type: 'ramp' },
  { id: 'wall', name: 'Shield Wall', icon: '🛡️', description: 'Block obstacles', cost: { stone: 3 }, type: 'wall' },
];

export const CHARACTER_COLORS: Record<string, { body: string; belly: string; ear: string; nose: string }> = {
  fox: { body: '#FF8C42', belly: '#FFE4C4', ear: '#FF6B1A', nose: '#333' },
  bunny: { body: '#F5F5F5', belly: '#FFF0F5', ear: '#FFB6C1', nose: '#FFB6C1' },
  cat: { body: '#808080', belly: '#D3D3D3', ear: '#696969', nose: '#FFB6C1' },
  owl: { body: '#8B4513', belly: '#DEB887', ear: '#654321', nose: '#FFD700' },
};
