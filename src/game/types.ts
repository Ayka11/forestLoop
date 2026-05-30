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
  type: 'ground' | 'bridge' | 'floating' | 'mushroom' | 'vine' | 'log' | 'ramp' | 'platform' | 'wall' | 'moving' | 'falling' | 'bouncy' | 'conveyor' | 'switchable' | 'cloud' | 'mushroomStepper' | 'crumbling' | 'flowerLift' | 'vineSwing' | 'breakableBridge';
  color: string;
  bouncy?: boolean;
  moving?: boolean;
  moveRange?: number;
  moveSpeed?: number;
  originalY?: number;
  rampAngle?: 'gentle' | 'steep';
  falling?: boolean;
  fallTimer?: number;
  conveyorDirection?: 'left' | 'right';
  switchState?: 'on' | 'off';
  activated?: boolean;
  // Hard mode platform state
  crumblingTimer?: number;
  crumblingMax?: number;
  crackLevel?: number;
  liftActive?: boolean;
  liftTimer?: number;
  liftPetalAngle?: number;
  vineAngle?: number;
  vineAngularVel?: number;
  vineLength?: number;
  vineGrabbed?: boolean;
  vineAnchorX?: number;
  vineAnchorY?: number;
  bridgePlanks?: boolean[];
  bridgePlankTimers?: number[];
}

export interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wood' | 'stone' | 'flower' | 'leaf' | 'leafToken' | 'mushroom_powerup' | 'star' | 'fireFlower' | 'leafWings' | 'speedBoots' | 'shield' | 'timeSlow' | 'magnet' | 'doubleJump' | 'ghostPhase' | 'acornShield' | 'foxfireDash' | 'petalFloat' | 'rootSnare' | 'mushroomBounce' | 'starlightCompass' | 'treasureCache';
  collected: boolean;
  bobOffset: number;
  sparkle: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'slime' | 'bird' | 'rollingLog' | 'spider' | 'bat' | 'rockGolem' | 'fireSprite'
      | 'bumbleBear' | 'thornling' | 'fireflySwarm' | 'shadowWisp';
  speed: number;
  bounceOffset: number;
  direction: 1 | -1;
  patrolPattern?: 'horizontal' | 'vertical' | 'circular' | 'stationary';
  alertState?: 'idle' | 'alert' | 'aggressive';
  // Hard Mode enemy state
  patrolStart?: number;
  patrolEnd?: number;
  // BumbleBear
  chargeActive?: boolean;
  chargeTimer?: number;
  dazedTimer?: number;
  recoverTimer?: number;
  alertTimer?: number;
  aiState?: string;          // current state machine state
  riderActive?: boolean;
  // Thornling
  spikeTimer?: number;
  spikesExtended?: boolean;
  telegraphTimer?: number;
  bounceTimer?: number;
  // FireflySwarm
  swarmIndividuals?: { x: number; y: number; phase: number; vx?: number; vy?: number }[];
  reformBridge?: boolean;
  reformBridgeTimer?: number;
  scattered?: boolean;
  scatterTimer?: number;
  reformTimer?: number;
  bridgeTimer?: number;
  // ShadowWisp
  driftPhase?: number;
  chaseActive?: boolean;
  fleeActive?: boolean;
  // shared
  seed?: number;
  baseY?: number;            // original spawn Y for vertical anchoring
}

export interface Hazard {
  x: number;
  width: number;
  y: number;
  height: number;
  type: 'water' | 'fire' | 'spikes' | 'poison' | 'lava';
  warningShown?: boolean;
  warningTimer?: number;
  active?: boolean;
  damageAmount?: number;
}

export type InteractiveType =
  | 'wateringCan'   // tip → grows nearby mushroom
  | 'beehive'       // jump near → bees chase 3s, reveal honey cache
  | 'seedPouch'     // collect → plant at dirt → instant flowerLift
  | 'compostHeap'   // jump on → bounce up + 10% power-up
  | 'gardenGnome';  // hidden → reveal → 5 coins

export interface Interactive {
  x: number;
  y: number;
  width: number;
  height: number;
  type: InteractiveType;
  triggered: boolean;       // true after first interaction
  triggerTimer: number;     // countdown frames for timed effects
  glowPhase: number;        // bob/glow animation offset
  hidden: boolean;          // gnomes start hidden behind bushes
  seedPlanted?: boolean;    // seedPouch: has been planted
}

export interface LevelGoal {
  x: number;
  y: number;
  width: number;
  height: number;
  reached: boolean;
  pulseTimer: number;
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
  type: 'sparkle' | 'leaf' | 'collect' | 'trail' | 'firefly' | 'dust' | 'spark' | 'speedline' | 'landing' | 'hazardWarning' | 'combo' | 'powerUpAura' | 'damage';
}

export interface BackgroundLayer {
  offset: number;
  speed: number;
  elements: BackgroundElement[];
}

export interface BackgroundElement {
  x: number;
  y: number;
  type: 'tree' | 'bush' | 'cloud' | 'mountain' | 'flower' | 'mushroom' | 'firefly' | 'statue' | 'mushroom_house' | 'sign';
  scale: number;
  color: string;
  variant: number;
}

export interface BackgroundCreature {
  x: number;
  y: number;
  type: 'bunny' | 'butterfly' | 'bird';
  vx: number;
  vy: number;
  direction: 1 | -1;
  animTimer: number;
  animFrame: number;
  scale: number;
  color: string;
  baseY?: number; // For fluttering/hovering creatures
}

export type MovementMode = 'idle' | 'walk' | 'run' | 'reverse' | 'superSpeed' | 'superJump' | 'dash';

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
  jumpBufferTime: number; // Time to buffer jump input
  coyoteTime: number; // Time after leaving platform for jump buffering
  lastGroundedTime: number; // Track when player was last grounded
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
  timeSlowActive: boolean;
  magnetActive: boolean;
  doubleJumpAvailable: boolean;
  ghostPhaseActive: boolean;
  // New power-up states
  acornShieldActive: boolean;
  foxfireDashActive: boolean;
  petalFloatActive: boolean;
  rootSnareActive: boolean;
  mushroomBounceCount: number; // remaining super-bouncy jumps
  starlightCompassActive: boolean;
  // Special abilities
  superSpeedTimer: number;
  superJumpTimer: number;
  dashTimer: number;
  dashCooldown: number;
  // Visual
  trailColor: string;
  finalBoost?: number;
  squash: number;
  stretch: number;
  // Custom properties
  invincibilityGraceDistance?: number;
  id?: string; // for multiplayer
  jumpHoldTime: number;
  rampBoostTime: number;
  lastRampSpeed: number;
}

export type PowerUpType = 'mushroom' | 'star' | 'fireFlower' | 'leafWings' | 'speedBoots' | 'shield' | 'timeSlow' | 'magnet' | 'doubleJump' | 'ghostPhase' | 'acornShield' | 'foxfireDash' | 'petalFloat' | 'rootSnare' | 'mushroomBounce' | 'starlightCompass';

export interface BossProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'thorn' | 'shockwave' | 'seed';
  radius: number;
  life: number;         // frames remaining
  maxLife: number;
  collected?: boolean;  // seed: has player collected it?
  glowing?: boolean;    // seed: glowing when all must be collected
}

export interface BossState {
  phase: 1 | 2 | 3;
  health: number;       // 0-30 (10 hp per phase)
  maxHealth: number;
  x: number;
  y: number;
  arenaStartX: number;  // camera lock bounds
  timer: number;        // frames into current phase
  attackTimer: number;  // countdown to next attack
  projectiles: BossProjectile[];
  seeds: BossProjectile[];  // 3 seeds spawned in phase 3
  seedsCollected: number;
  defeated: boolean;
  defeatTimer: number;  // countdown for defeat animation
  shakeX: number;       // boss hurt shake
  hurtTimer: number;
  isTutorialBoss?: boolean; // first encounter: 2 phases only, slower attacks
}

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
  transitioningBiome: BiomeType | null;
  transitionProgress: number;
  isTransitioning: boolean;
  levelTransitionCooldown: number;
  currentLevel: number;
  maxDistance: number;
  totalDistance: number;
  gameTime: number;
  levelNotificationTriggered: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isPlaying: boolean;
  dailyChallenge: DailyChallenge | null;
  achievements: string[];
  streak: number;
  unlockedBiomes: BiomeType[];
  levelCompleted: boolean;
  levelCompletionDistance: number;
  difficulty: DifficultyLevel;
  gameMode: GameMode;
  showTutorial?: boolean;
  adventureEvent: AdventureEvent | null;
  biomeCard: BiomeCard | null;
  storedPowerUp: PowerUpType | null;
  routeTier: RouteTier;
  activeRouteDistance: number;
  companionType: CompanionState['type'] | null;
  bossEncounter: BossState | null;
  interactives: Interactive[];
}

export interface Resources {
  wood: number;
  stone: number;
  flower: number;
  leaf: number;
}

export type BiomeType = 'enchanted' | 'crystal' | 'autumn' | 'firefly' | 'candy' | 'frozen' | 'volcanic' | 'cloud' | 'moonlit' | 'caverns' | 'canopy' | 'ruins' | 'starfall';

// Adventure event types
export type AdventureEventType = 'goldenDeer' | 'fairyRing' | 'fallenStar' | 'wishingWell' | 'bridgeTroll';

export interface AdventureEvent {
  type: AdventureEventType;
  x: number;
  y: number;
  state: 'idle' | 'active' | 'resolving' | 'done';
  timer: number;
  phase: number; // sub-state within the event
  data: Record<string, number | boolean | string>;
}

// Route tier for secret path system
export type RouteTier = 'sky' | 'main' | 'deep';

export interface BiomeCard {
  biome: BiomeType;
  timer: number;
  maxTimer: number;
}

export interface CompanionState {
  type: 'firefly' | 'squirrel' | 'owl' | 'frog' | 'butterfly';
  animTimer: number;
  animFrame: number;
  active: boolean;
}

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

export interface ChallengeProgress {
  date: string;
  challenges: DailyChallenge[];
  streak: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  type: 'distance' | 'collect' | 'combo' | 'craft' | 'bridge' | 'platform' | 'biome' | 'score' | 'jump' | 'time' | 'perfect' | 'weekend' | 'monthly';
  completed: boolean;
  claimed: boolean;
}

export interface AvatarConfig {
  character: 'fox' | 'bunny' | 'cat' | 'owl';
  color: string;
  hat: string | null;
  accessory: string | null;
  pet: string | null;
  trail: string | null;
}

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

// Engine-internal game mode (kept as-is for all engine logic)
// 'normal' = friendly run with no extra modifiers
// 'hard'   = Hard Mode: route choices, boss, score ×3, faster scroll, narrower platforms
export type GameMode = 'normal' | 'hard';

// UI-facing game mode shown on the main menu
// 'endless'   = relaxed run, no enemies, no boss, no scenarios (maps to engine 'normal')
// 'adventure' = full experience with enemies, boss, scenarios, routes (maps to engine 'hard')
export type AppGameMode = 'endless' | 'adventure';

export interface DifficultyConfig {
  name: string;
  ageRange: string;
  description: string;
  // Platform layout
  platformGapMultiplier: number;    // 1.0 = baseline gap sizes
  floatingPlatformChance: number;   // chance a gap gets a stepping-stone
  // Enemies
  enemySpeedMultiplier: number;
  enemyFrequency: number;           // 1.0 = baseline spawn rate
  enemyStartDistance: number;       // px from start before first enemy
  // Power-ups & resources
  powerUpFrequency: number;         // 1.0 = baseline drop rate
  resourceGain: number;             // multiplier on all resource pickups
  // UI / accessibility
  uiScale: number;
  showJumpTrajectory: boolean;
  showEnemyWarnings: boolean;
  tutorialEnabled: boolean;
  safeZoneDistance: number;         // px of hazard-free opening
  hazardStartDistance: number;      // px before environmental hazards appear
}

// ===== CONSTANTS ====

export const GRAVITY = 0.38;
export const JUMP_FORCE = -14;
export const DOUBLE_JUMP_FORCE = -12;
export const GLIDE_GRAVITY = 0.13;
export const COYOTE_TIME = 0.18; // 180ms window after leaving platform (more forgiving)
export const JUMP_BUFFER_TIME = 0.18; // 180ms input buffer (more forgiving)
export const PLAYER_SPEED = 0;
export const BASE_SCROLL_SPEED = 4;
export const MAX_SCROLL_SPEED = 8;
export const GROUND_Y = 500;
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 700;
export const CHECKPOINT_INTERVAL = 2000;
export const POWERUP_DURATION = 600;

// ─────────────────────────────────────────────────────────────────────────────
// DIFFICULTY — controls base gameplay feel per age group.
// These values apply in BOTH normal and hard GameMode.
// Hard GameMode then applies its own additional multipliers on top.
// ─────────────────────────────────────────────────────────────────────────────
export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    // Ages 6-8: wide platforms, slow obstacles, full assistive UI, long ramp-up.
    name: 'Easy',
    ageRange: 'Ages 6-8',
    description: 'Big platforms, slow enemies, jump guide & hints. Great for beginners!',
    platformGapMultiplier: 0.55,    // gaps are 45% narrower than baseline
    floatingPlatformChance: 0.85,   // almost every gap gets a stepping stone
    enemySpeedMultiplier: 0.60,     // enemies move at 60% speed
    enemyFrequency: 0.40,           // 40% of normal spawn rate
    enemyStartDistance: 600,        // first enemy appears at 600 px
    powerUpFrequency: 1.8,          // 80% more power-ups
    resourceGain: 1.3,              // 30% bonus on all resource pickups
    uiScale: 1.15,                  // slightly larger UI elements
    showJumpTrajectory: true,       // arc preview always on
    showEnemyWarnings: true,        // red exclamation before enemy enters screen
    tutorialEnabled: true,
    safeZoneDistance: 1800,         // first 1800 px: no hazards, gentle terrain
    hazardStartDistance: 2500,      // environmental hazards (spikes, lava) after 2500 px
  },

  normal: {
    // Ages 9-11: standard gaps, moderate enemies, trajectory hint still on, short warm-up.
    name: 'Normal',
    ageRange: 'Ages 9-11',
    description: 'Balanced jumps, steady enemies, jump guide on. The intended experience.',
    platformGapMultiplier: 1.0,     // baseline gap sizes
    floatingPlatformChance: 0.60,   // stepping stones on most medium gaps
    enemySpeedMultiplier: 1.0,      // baseline enemy speed
    enemyFrequency: 1.0,            // baseline spawn rate
    enemyStartDistance: 200,        // first enemy after short opening run
    powerUpFrequency: 1.0,          // baseline drop rate
    resourceGain: 1.0,
    uiScale: 1.0,
    showJumpTrajectory: true,       // trajectory hint on (teaches timing)
    showEnemyWarnings: true,        // warnings still helpful at this age
    tutorialEnabled: false,
    safeZoneDistance: 400,          // brief 400 px opening with wide ground
    hazardStartDistance: 800,       // hazards start fairly early
  },

  hard: {
    // Ages 12-15: tighter gaps, faster enemies, no visual assists, immediate challenge.
    name: 'Hard',
    ageRange: 'Ages 12-15',
    description: 'Tight jumps, fast enemies, no hints. Pure skill required.',
    platformGapMultiplier: 1.30,    // gaps are 30% wider than baseline
    floatingPlatformChance: 0.35,   // stepping stones are rare — most gaps are clean
    enemySpeedMultiplier: 1.40,     // enemies move 40% faster
    enemyFrequency: 1.60,           // 60% more enemy spawns
    enemyStartDistance: 0,          // enemies from the very start
    powerUpFrequency: 0.65,         // 35% fewer power-ups
    resourceGain: 0.85,             // slight resource penalty
    uiScale: 1.0,                   // normal UI size (no penalty to readability)
    showJumpTrajectory: false,       // no trajectory arc — feel the jump
    showEnemyWarnings: false,        // no warnings — react in real time
    tutorialEnabled: false,
    safeZoneDistance: 0,
    hazardStartDistance: 0,          // hazards from the start
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HARD MODE — additional layer applied on top of any difficulty setting.
// Activates: route choices, boss encounter, score bonus, faster scroll.
// These multipliers stack with difficulty's platformGapMultiplier etc.
// Design intent: Hard Mode is the "prestige" experience — not harder terrain
// per se (difficulty handles that), but a richer, higher-stakes game loop.
// ─────────────────────────────────────────────────────────────────────────────
export const HARD_MODE = {
  // Scroll speed multiplier — world moves faster, reaction window shorter
  scrollSpeed: 1.25,
  // Gap width bonus on top of difficulty's platformGapMultiplier
  // Kept modest so Easy+HardMode isn't punishing for younger players
  gapSizeMultiplier: 1.10,
  // Platform width reduction — landing zones are narrower
  platformWidthReduction: 0.80,
  // Enemy spawn interval (frames) — lower = more frequent
  enemySpawnRate: 220,
  // Power-up drop multiplier on top of difficulty's powerUpFrequency
  powerUpBudRate: 0.50,
  // Token value when collected
  coinValueMultiplier: 2,
  // Score multiplier — the main reward for hard mode risk
  scoreMultiplier: 3,
} as const;

export const HARD_PLATFORM_WEIGHTS: Record<string, number> = {
  standard:        0.25,
  mushroom:        0.15,
  crumbling:       0.15,
  flowerLift:      0.10,
  cloud:           0.10,
  vineSwing:       0.15,
  breakableBridge: 0.10,
};

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
    sky: ['#5BC0F8', '#A8E6CF', '#FFEAA7'],
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
  moonlit: {
    sky: ['#0D1B2A', '#162032', '#1A237E'],
    ground: '#1A2E1A',
    accent: '#C0E8FF',
    trees: ['#1B3A2D', '#224433', '#1A2E20', '#0D1F15'],
    flowers: ['#76CFFF', '#A0E8FF', '#69F0AE', '#00BCD4', '#B2EBF2'],
  },
  caverns: {
    sky: ['#0A0A18', '#12122A', '#1A1A3A'],
    ground: '#2A1A4A',
    accent: '#00E5FF',
    trees: ['#3D1A6B', '#4A2080', '#2D1050', '#5C2EA0'],
    flowers: ['#00E5FF', '#7C4DFF', '#18FFFF', '#EA80FC', '#B388FF'],
  },
  canopy: {
    sky: ['#1B4A1B', '#2E7D32', '#1565C0'],
    ground: '#2E5A1E',
    accent: '#FFEE58',
    trees: ['#1B5E20', '#2E7D32', '#388E3C', '#43A047'],
    flowers: ['#FFEE58', '#FFF176', '#F9A825', '#FFD54F', '#A5D6A7'],
  },
  ruins: {
    sky: ['#2E1A0E', '#4A2C14', '#6B3D1E'],
    ground: '#5D4037',
    accent: '#80CBC4',
    trees: ['#4E342E', '#6D4C41', '#795548', '#8D6E63'],
    flowers: ['#80CBC4', '#4DB6AC', '#A5D6A7', '#FFCC80', '#CFD8DC'],
  },
  starfall: {
    sky: ['#0D0D2B', '#1A1A4A', '#2D1B69'],
    ground: '#1A1A3A',
    accent: '#FFD700',
    trees: ['#1A1A4A', '#2D1B69', '#3A1F7A', '#12123A'],
    flowers: ['#FFD700', '#FFF176', '#FFEE58', '#FF80AB', '#EA80FC'],
  },
};

export const BIOME_UNLOCK_MILESTONES = {
  // Core 9-biome sequence — original milestones kept, orphans slotted between them
  crystal:  2500,   // between Enchanted (0) and Moonlit (5k)
  moonlit:  5000,
  autumn:   7500,   // between Moonlit (5k) and Caverns (10k)
  caverns:  10000,
  firefly:  12500,  // between Caverns (10k) and Canopy (15k)
  canopy:   15000,
  ruins:    20000,
  starfall: 25000,
  // Shop-unlock premium biomes
  candy:    20000,
  frozen:   30000,
  volcanic: 40000,
  cloud:    50000,
};

export const BIOME_NAMES: Partial<Record<BiomeType, string>> = {
  enchanted: 'Enchanted Forest',
  moonlit: 'Moonlit Grove',
  caverns: 'Crystal Caverns',
  canopy: 'Whispering Canopy',
  ruins: 'Ancient Ruins',
  starfall: 'Starfall Meadow',
  crystal: 'Crystal Cave',
  autumn: 'Autumn Forest',
  firefly: 'Firefly Night',
  frozen: 'Frozen Tundra',
  volcanic: 'Volcanic Peak',
  cloud: 'Cloud Kingdom',
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

// Add cloud platform type
export interface CloudPlatform extends Platform {
  type: 'cloud';
  floatOffset?: number;
  floatSpeed?: number;
  dissolveTimer?: number;
  isDissolving?: boolean;
}

// Add jump power variables
export const MIN_JUMP_FORCE = 10;
export const MAX_JUMP_FORCE = 19;
export const JUMP_CHARGE_RATE = 0.35; // per frame

// Add new platform types for better tracking
export interface MushroomPlatform extends Platform {
  type: 'mushroom';
  bounceForce: number;
  bounceCount: number;
  hasBeenUsed: boolean;
  respawnTimer: number;
  isPartOfChain: boolean;
  chainId: string;
}

export interface CloudPlatformExtended extends Platform {
  type: 'cloud';
  tier: number; // 1=low, 2=high
  isPartOfChain: boolean;
  chainId: string;
  floatOffset?: number;
  floatSpeed?: number;
  dissolveTimer?: number;
  isDissolving?: boolean;
}
