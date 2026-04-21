import {
  Platform, Collectible, Obstacle, Hazard, Particle, BackgroundElement,
  PlayerState, GameState, Resources, BiomeType, PowerUpType, MovementMode,
  GRAVITY, JUMP_FORCE, DOUBLE_JUMP_FORCE, GLIDE_GRAVITY,
  BASE_SCROLL_SPEED, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT,
  CHECKPOINT_INTERVAL, POWERUP_DURATION, BIOME_COLORS, CHARACTER_COLORS,
  AvatarConfig, CraftRecipe, CRAFT_RECIPES, DailyChallenge,
} from './types';
import * as Audio from './audio';

// Polyfill for roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, w: number, h: number, radii?: number | number[]) {
    const r = typeof radii === 'number' ? [radii, radii, radii, radii] : Array.isArray(radii) ? radii : [0, 0, 0, 0];
    const [tl, tr, br, bl] = [r[0] || 0, r[1] || r[0] || 0, r[2] || r[0] || 0, r[3] || r[1] || r[0] || 0];
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}


// ===== GAME ENGINE =====
export interface SavedRun {
  state: GameState;
  player: PlayerState;
  platforms: Platform[];
  collectibles: Collectible[];
  obstacles: Obstacle[];
  craftedItems: Platform[];
  hazards: Hazard[];
  terrainX: number;
  nextPlatformX: number;
  nextCollectibleX: number;
  nextObstacleX: number;
  seed: number;
  currentLevel: number;
  bgLayers: { offset: number; speed: number; elements: BackgroundElement[] }[];
  movementMode: MovementMode;
}

export class GameEngine {
    // ...existing code...
    loadLevel(levelIndex: number) {
      const level = levels[levelIndex];
      if (!level) return;
      this.platforms = [];
      this.obstacles = [];
      this.collectibles = [];
      const biome = BIOME_COLORS[this.state.biome];
      // Load platforms
      for (const p of level.platforms) {
        this.platforms.push({
          x: p.x, y: p.y, width: p.width, height: 20,
          type: (biome.platforms ? biome.platforms[0] : 'ground') as Platform['type'], color: biome.ground,
        });
      }
      // Load enemies
      for (const e of level.enemies) {
        this.obstacles.push({
          x: e.x, y: e.y, width: 36, height: 32,
          type: e.type as Obstacle['type'], speed: 1, bounceOffset: 0, direction: -1,
        });
      }
      // Load coins
      for (const c of level.coins) {
        this.collectibles.push({
          x: c.x, y: c.y, width: 24, height: 24, type: 'leafToken', collected: false,
          bobOffset: this.random() * Math.PI * 2, sparkle: 0,
        });
      }
      // Load power-ups
      for (const pu of level.powerUps) {
        this.collectibles.push({
          x: pu.x, y: pu.y, width: 24, height: 24, type: pu.type as Collectible['type'], collected: false,
          bobOffset: this.random() * Math.PI * 2, sparkle: 0,
        });
      }
    }
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;

  // Game objects
  platforms: Platform[] = [];
  collectibles: Collectible[] = [];
  obstacles: Obstacle[] = [];
  particles: Particle[] = [];
  bgLayers: { offset: number; speed: number; elements: BackgroundElement[] }[] = [];
  preservedBgLayers: { offset: number; speed: number; elements: BackgroundElement[] }[] = [];
  craftedItems: Platform[] = [];

  // State
  player: PlayerState;
  state: GameState;
  currentLevel: number = 0;
  avatar: AvatarConfig;
  savedRun?: SavedRun;

  // Callbacks
  onStateChange: ((state: GameState) => void) | null = null;
  onGameOver: (() => void) | null = null;
  onCheckpoint: (() => void) | null = null;
  onLevelUp: ((level: number) => void) | null = null;

  // Internal
  animationId: number = 0;
  lastTime: number = 0;
  seed: number;
  terrainX: number = 0;
  nextPlatformX: number = 0;
  nextCollectibleX: number = 0;
  nextObstacleX: number = 0;
  frameCount: number = 0;
  cameraShake: number = 0;
  tutorialShown: boolean = false;
  respawnTimer: number = 0;
  movementMode: MovementMode = 'idle';
  cameraX: number = 0; // Camera position for following player
  cameraY: number = 0; // Camera Y position for following
  cameraTargetX: number = 0; // Smooth camera target
  cameraTargetY: number = 0; // Smooth camera target
  lastDistance: number = 0;
  lastScore: number = 0;
  lastCombo: number = 0;
  jumpCount: number = 0;
  gameTime: number = 0; // Track total game time for time-based challenges
  challengeUpdater: ((type: DailyChallenge['type'], amount: number) => void) | null = null;
  hazards: Hazard[] = [];
  jumpHeld: boolean = false;
  jumpHoldTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = CANVAS_WIDTH;
    this.height = CANVAS_HEIGHT;
    this.scale = 1;
    this.seed = Math.random() * 10000;

    this.player = this.createPlayer();
    this.state = this.createGameState();
    this.avatar = { character: 'fox', color: '#FF8C42', hat: null, accessory: null, pet: null, trail: null };

    // Early-game invincibility grace period
    this.player.invincible = false; // Start without invincibility to prevent flashing
    this.player.invincibilityGraceDistance = 500; // Custom property for grace period

    this.initBackground();
    this.resize();
  }

  createPlayer(): PlayerState {
    return {
      x: 200, y: GROUND_Y - 40, vx: 0, vy: 0,
      width: 32, height: 36, grounded: false, jumping: false,
      doubleJumped: false, wallKicking: false, gliding: false,
      facing: 1, animFrame: 0, animTimer: 0,
      activePowerUp: null, powerUpTimer: 0, invincible: false,
      bigMode: false, hasLeafWings: false, speedBoost: false, hasShield: false,
      timeSlowActive: false, magnetActive: false, doubleJumpAvailable: false, ghostPhaseActive: false,
      // Special abilities
      superSpeedTimer: 0,
      superJumpTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      trailColor: '#FFD700', squash: 1, stretch: 1,
      jumpHoldTime: 0,
      coyoteTime: 0,
      jumpBufferTime: 0,
      rampBoostTime: 0,
      lastRampSpeed: 0,
      finalBoost: 0,
    };
  }

  createGameState(): GameState {
    return {
      score: 0, distance: 0, leafTokens: 0,
      totalLeafTokens: parseInt(localStorage.getItem('flo_totalTokens') || '0'),
      resources: { wood: 0, stone: 0, flower: 0, leaf: 0 },
      combo: 0, comboTimer: 0, multiplier: 1, lives: 3, // Balanced lives for better challenge
      checkpointDistance: 0, speed: 0, baseSpeed: 0, // No auto movement
      biome: 'enchanted', transitioningBiome: null, transitionProgress: 0, isTransitioning: false, levelTransitionCooldown: 0, currentLevel: 1, maxDistance: 0, totalDistance: 0, gameTime: 0, isPaused: false, isGameOver: false, isPlaying: false,
      dailyChallenge: null, achievements: JSON.parse(localStorage.getItem('flo_achievements') || '[]'),
      streak: parseInt(localStorage.getItem('flo_streak') || '0'),
      unlockedBiomes: ['enchanted', 'crystal', 'autumn', 'firefly'],
    };
  }

  // Seeded random
  random(seed?: number): number {
    const s = seed ?? this.seed++;
    const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  initBackground() {
    this.bgLayers = [];
    const biome = BIOME_COLORS[this.state.biome];
    
    // Initialize layers in correct order: back to front
    // Layer 0: Near bushes + flowers + mushrooms (frontmost)
    const near: BackgroundElement[] = [];
    for (let i = 0; i < 50; i++) { // More elements for visual variety
      const rand = this.random();
      let type, color;
      if (rand < 0.35) {
        type = 'bush';
        color = biome.trees[2];
      } else if (rand < 0.7) {
        type = 'flower';
        color = biome.flowers[Math.floor(this.random() * biome.flowers.length)];
      } else {
        type = 'mushroom';
        color = '#FF6B6B';
      }
      near.push({
        x: i * 70 + this.random() * 35, y: 0,
        type, scale: 0.3 + this.random() * 0.4,
        color, variant: Math.floor(this.random() * 4),
      });
    }
    this.bgLayers.push({ offset: 0, speed: 0.45, elements: near });

    // Layer 1: Mid trees + fireflies for enchanted biome
    const midTrees: BackgroundElement[] = [];
    for (let i = 0; i < 35; i++) {
      let type = 'tree';
      let color = biome.trees[Math.floor(this.random() * biome.trees.length)];
      
      // Add fireflies for enchanted biome
      if (this.state.biome === 'firefly' && this.random() < 0.2) {
        midTrees.push({
          x: i * 110 + this.random() * 55, y: 0,
          type: 'firefly', scale: 0.6 + this.random() * 0.4,
          color: '#FFEB3B', variant: Math.floor(this.random() * 4),
        });
      } else {
        midTrees.push({
          x: i * 110 + this.random() * 55, y: 0,
          type: 'tree', scale: 0.6 + this.random() * 0.4,
          color: biome.trees[Math.floor(this.random() * biome.trees.length)], variant: Math.floor(this.random() * 4),
        });
      }
    }
    this.bgLayers.push({ offset: 0, speed: 0.25, elements: midTrees });

    // Layer 2: Mountains + distant trees
    const mountains: BackgroundElement[] = [];
    for (let i = 0; i < 25; i++) {
      const rand = this.random();
      let type, color;
      if (rand < 0.7) {
        type = 'mountain';
        color = biome.trees[0];
      } else {
        type = 'tree';
        color = biome.trees[Math.floor(this.random() * biome.trees.length)];
      }
      mountains.push({
        x: i * 180 + this.random() * 90, y: 0,
        type, scale: 0.8 + this.random() * 0.6,
        color, variant: Math.floor(this.random() * 3),
      });
    }
    this.bgLayers.push({ offset: 0, speed: 0.08, elements: mountains });

    // Layer 3: Clouds + atmospheric elements
    const clouds: BackgroundElement[] = [];
    for (let i = 0; i < 15; i++) {
      clouds.push({
        x: i * 220 + this.random() * 110, y: 20 + this.random() * 120,
        type: 'cloud', scale: 0.4 + this.random() * 1.2,
        color: '#ffffff', variant: Math.floor(this.random() * 4),
      });
    }
    this.bgLayers.push({ offset: 0, speed: 0.03, elements: clouds });
  }

  resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const w = rect.width;
    const h = rect.height;
    this.scale = Math.min(w / CANVAS_WIDTH, h / CANVAS_HEIGHT);
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.width = `${CANVAS_WIDTH * this.scale}px`;
    this.canvas.style.height = `${CANVAS_HEIGHT * this.scale}px`;
  }

  setAvatar(config: AvatarConfig) {
    this.avatar = config;
  }

  setChallengeUpdater(updater: (type: DailyChallenge['type'], amount: number) => void) {
    this.challengeUpdater = updater;
  }

  setMovementMode(mode: 'idle' | 'walk' | 'run' | 'reverse' | 'superSpeed' | 'superJump' | 'dash') {
    this.movementMode = mode;
    this.player.facing = mode === 'reverse' ? -1 : 1;
  }

  jumpPress() {
    this.jumpHeld = true;
    this.jumpHoldTime = 0;
    this.jump();
  }

  resume() {
    if (!this.state.isPlaying || !this.state.isPaused) return;
    this.state.isPaused = false;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    this.emitState();
  }

  start(savedRun?: SavedRun) {
    console.log('GameEngine.start() called');
    this.seed = savedRun ? savedRun.seed : Math.random() * 10000;
    this.savedRun = savedRun;
    this.player = savedRun ? { ...savedRun.player } : this.createPlayer();
    this.state = savedRun
      ? this.cloneState(savedRun.state)
      : { ...this.createGameState(), totalLeafTokens: this.state.totalLeafTokens, achievements: this.state.achievements, streak: this.state.streak };
    if (!savedRun) {
      this.state.biome = this.pickRandomBiome();
      // Set grace period invincibility for new games
      this.player.invincible = false; // Start without invincibility to prevent flashing
      this.player.invincibilityGraceDistance = 500;
    }
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.movementMode = 'idle';
    this.respawnTimer = 0;
    this.jumpCount = 0; // Reset jump count for new game
    this.gameTime = 0; // Reset game time for new game
    this.player.x = 200;
    this.player.y = GROUND_Y - 40;
    this.platforms = savedRun ? this.cloneArray(savedRun.platforms) : [];
    this.collectibles = savedRun ? this.cloneArray(savedRun.collectibles) : [];
    this.obstacles = savedRun ? this.cloneArray(savedRun.obstacles) : [];
    this.particles = [];
    this.craftedItems = savedRun ? this.cloneArray(savedRun.craftedItems) : [];
    this.hazards = savedRun ? this.cloneArray(savedRun.hazards) : [];
    this.nextPlatformX = savedRun ? savedRun.nextPlatformX : 0;
    this.nextCollectibleX = savedRun ? savedRun.nextCollectibleX : 300;
    this.nextObstacleX = savedRun ? savedRun.nextObstacleX : 300;
    this.terrainX = savedRun ? savedRun.terrainX : 0;
    if (savedRun) {
      this.currentLevel = savedRun.currentLevel;
      this.bgLayers = this.cloneBgLayers(savedRun.bgLayers);
    } else {
      this.currentLevel = 0;
      this.initBackground();
    }

    if (!savedRun) {
      // Load Level 0 (first level) on new runs
      this.loadLevel(0);
    }

    Audio.startMusic();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    this.emitState();
  }

  serializeProgress(): SavedRun {
    return {
      state: this.cloneState(this.state),
      player: { ...this.player },
      platforms: this.cloneArray(this.platforms),
      collectibles: this.cloneArray(this.collectibles),
      obstacles: this.cloneArray(this.obstacles),
      craftedItems: this.cloneArray(this.craftedItems),
      hazards: this.cloneArray(this.hazards),
      terrainX: this.terrainX,
      nextPlatformX: this.nextPlatformX,
      nextCollectibleX: this.nextCollectibleX,
      nextObstacleX: this.nextObstacleX,
      seed: this.seed,
      currentLevel: this.currentLevel,
      bgLayers: this.cloneBgLayers(this.bgLayers),
      movementMode: this.movementMode,
    };
  }

  saveProgress(): SavedRun {
    const snapshot = this.serializeProgress();
    this.savedRun = snapshot;
    return snapshot;
  }

  clearSavedProgress() {
    this.savedRun = undefined;
  }

  stop() {
    cancelAnimationFrame(this.animationId);
    this.state.isPlaying = false;
    Audio.stopMusic();
    this.emitState();
  }

  pause() {
    this.state.isPaused = !this.state.isPaused;
    if (!this.state.isPaused) {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
    this.emitState();
  }

  generateInitialTerrain() {
    const biome = BIOME_COLORS[this.state.biome];
    // Update terrain/platform generation to use biome-specific assets and mechanics
    // Ground platforms
    for (let x = -100; x < CANVAS_WIDTH + 600; x += 120 + this.random() * 40) {
      const w = 180 + this.random() * 60;
      this.platforms.push({
        x, y: GROUND_Y, width: w, height: 200,
        type: (biome.platforms ? biome.platforms[0] : 'ground') as Platform['type'], color: biome.ground,
      });
      this.nextPlatformX = x + w + 30 + this.random() * 30;
    }
    // Some floating platforms
    for (let i = 0; i < 5; i++) {
      const x = 400 + i * 300 + this.random() * 100;
      this.addFloatingPlatform(x, biome);
    }
    // Initial collectibles
    for (let i = 0; i < 10; i++) {
      this.addCollectible(300 + i * 150 + this.random() * 80, biome);
    }
  }

  addFloatingPlatform(x: number, biome: any) {
    // Increase mushroom spawn rate and add more variety
    const rand = this.random();
    let type;
    if (rand < 0.4) {
      type = 'mushroom'; // 40% chance for mushrooms
    } else if (rand < 0.6) {
      type = 'floating'; // 20% chance for floating
    } else if (rand < 0.8) {
      type = 'vine'; // 20% chance for vine
    } else {
      type = 'log'; // 20% chance for log
    }
    
    const y = GROUND_Y - 100 - this.random() * 200;
    const w = type === 'mushroom' ? 70 : 90 + this.random() * 120; // Slightly larger
    const colors: Record<string, string> = {
      floating: biome.trees[2], mushroom: '#FF6B6B', vine: '#4CAF50', log: '#8D6E63',
      pastel: '#FFC1E3', gumdrop: '#FFB6C1', ice: '#B3EFFF', snow: '#E0F7FA', lava: '#FF7043', crystal: '#FF8A65', cloud: '#E3F6FF', rainbow: '#B3E5FC',
    };
    this.platforms.push({
      x, y, width: w, height: 20,
      type: type as Platform['type'], color: colors[type],
    });
    this.nextPlatformX = x + w + 30 + this.random() * 30;
  }

  addCollectible(x: number, biome: any) {
    // Increase power-up spawn rate and restore missing collectibles
    const rand = this.random();
    let type;
    
    if (rand < 0.15) {
      // 15% chance for power-ups
      const powerTypes = ['mushroom_powerup', 'star', 'fireFlower', 'leafWings', 'speedBoots', 'shield'];
      type = powerTypes[Math.floor(this.random() * powerTypes.length)];
    } else if (rand < 0.4) {
      // 25% chance for leaf tokens
      type = 'leafToken';
    } else {
      // 60% chance for regular resources
      const resourceTypes = ['wood', 'stone', 'flower', 'leaf'];
      type = resourceTypes[Math.floor(this.random() * resourceTypes.length)];
    }
    
    const y = GROUND_Y - 60 - this.random() * 200;
    this.collectibles.push({
      x, y, width: 24, height: 24, type, collected: false,
      bobOffset: this.random() * Math.PI * 2, sparkle: 0,
    });
  }

  addObstacle(x: number) {
    // Enhanced difficulty scaling based on level and distance
    const levelMultiplier = Math.max(1, this.currentLevel);
    let allowedTypes: Obstacle['type'][] = ['slime'];
    
    // Progressive enemy unlocking based on distance and level
    if (this.state.distance > 800 || this.currentLevel >= 2) allowedTypes.push('bird');
    if (this.state.distance > 1800 || this.currentLevel >= 3) allowedTypes.push('spider');
    if (this.state.distance > 3000 || this.currentLevel >= 4) allowedTypes.push('bat');
    if (this.state.distance > 5000 || this.currentLevel >= 5) allowedTypes.push('rollingLog');
    if (this.state.distance > 7000 || this.currentLevel >= 6) allowedTypes.push('rockGolem');
    if (this.state.distance > 10000 || this.currentLevel >= 7) allowedTypes.push('fireSprite');
    
    const type = allowedTypes[Math.floor(this.random() * allowedTypes.length)];
    
    // Enhanced positioning and behavior based on enemy type
    let y, width, height, speed, patrolPattern: Obstacle['patrolPattern'], alertState: Obstacle['alertState'] = 'idle';
    
    switch (type) {
      case 'bird':
        y = GROUND_Y - 120 - this.random() * 100;
        width = 36; height = 32;
        speed = 2 + this.random() * 2 * levelMultiplier;
        patrolPattern = 'horizontal';
        break;
      case 'spider':
        y = GROUND_Y - 80 - this.random() * 40;
        width = 32; height = 28;
        speed = 1.5 + this.random() * 1.5;
        patrolPattern = 'vertical';
        break;
      case 'bat':
        y = GROUND_Y - 150 - this.random() * 80;
        width = 30; height = 26;
        speed = 3 + this.random() * 2;
        patrolPattern = 'circular';
        break;
      case 'rollingLog':
        y = GROUND_Y - 30;
        width = 50; height = 36;
        speed = 2.5 + this.random() * 1.5;
        patrolPattern = 'stationary';
        break;
      case 'rockGolem':
        y = GROUND_Y - 40;
        width = 48; height = 48;
        speed = 0.8 + this.random() * 0.7;
        patrolPattern = 'horizontal';
        alertState = this.random() > 0.7 ? 'aggressive' : 'idle';
        break;
      case 'fireSprite':
        y = GROUND_Y - 100 - this.random() * 60;
        width = 28; height = 28;
        speed = 4 + this.random() * 2;
        patrolPattern = 'circular';
        alertState = 'aggressive';
        break;
      default: // slime
        y = GROUND_Y - 30;
        width = 36; height = 32;
        speed = 1 + this.random() * 0.5;
        patrolPattern = 'horizontal';
    }
    
    this.obstacles.push({
      x, y, width, height, type, speed,
      bounceOffset: this.random() * Math.PI * 2, 
      direction: -1,
      patrolPattern,
      alertState,
    });
  }

  // ===== INPUT =====
  jump() {
    if (this.respawnTimer > 0) return;
    if (!this.state.isPlaying || this.state.isPaused) return;
    Audio.resumeAudio();

    if (this.player.grounded) {
      this.player.vy = JUMP_FORCE * (this.player.bigMode ? 1.3 : 1);
      this.player.grounded = false;
      this.player.jumping = true;
      this.player.squash = 0.6;
      this.player.stretch = 1.4;
      Audio.playJump();
      this.spawnParticles(this.player.x, this.player.y + this.player.height, 5, '#8B7355', 'dust');
    } else if (!this.player.doubleJumped) {
      this.player.vy = DOUBLE_JUMP_FORCE * (this.player.bigMode ? 1.2 : 1);
      this.player.doubleJumped = true;
      this.player.squash = 0.7;
      this.player.stretch = 1.3;
      Audio.playDoubleJump();
      this.spawnParticles(this.player.x, this.player.y + this.player.height, 8, '#FFD700', 'sparkle');
      this.jumpCount++;
      this.challengeUpdater?.('jump', 1);
    } else if (this.player.hasLeafWings && !this.player.gliding) {
      this.player.gliding = true;
    }
  }

  private pickRandomBiome(): BiomeType {
    const unlocked = this.state.unlockedBiomes;
    if (!unlocked || unlocked.length === 0) return 'enchanted';
    // Filter out candy biome
    const availableBiomes = unlocked.filter(biome => biome !== 'candy');
    return availableBiomes[Math.floor(this.random() * availableBiomes.length)];
  }

  private cloneState(state: GameState): GameState {
    return {
      ...state,
      resources: { ...state.resources },
      achievements: [...state.achievements],
      unlockedBiomes: [...state.unlockedBiomes],
    };
  }

  private cloneArray<T>(items: T[]): T[] {
    return items.map(item => ({ ...item }));
  }

  private cloneBgLayers(layers: { offset: number; speed: number; elements: BackgroundElement[] }[]) {
    return layers.map(layer => ({
      offset: layer.offset,
      speed: layer.speed,
      elements: layer.elements.map(el => ({ ...el })),
    }));
  }

  releaseJump() {
    this.player.gliding = false;
    this.jumpHeld = false;
  }

  craft(recipe: CraftRecipe) {
    const res = this.state.resources;
    for (const [key, amount] of Object.entries(recipe.cost)) {
      if ((res[key as keyof Resources] || 0) < (amount || 0)) return false;
    }
    // Deduct resources
    for (const [key, amount] of Object.entries(recipe.cost)) {
      res[key as keyof Resources] -= amount || 0;
    }
    // Place crafted item ahead of player
    const px = this.player.x + 300;
    const py = recipe.type === 'bridge' ? GROUND_Y : GROUND_Y - 80;
    const w = recipe.type === 'bridge' ? 200 : recipe.type === 'ramp' ? 120 : 80;
    const h = recipe.type === 'wall' ? 80 : 20;
    this.craftedItems.push({
      x: px, y: py, width: w, height: h,
      type: recipe.type as Platform['type'], color: recipe.type === 'bridge' ? '#8D6E63' : recipe.type === 'platform' ? '#FF69B4' : recipe.type === 'ramp' ? '#FFD700' : '#90A4AE',
      bouncy: recipe.type === 'platform',
    });
    Audio.playCraft();
    this.spawnParticles(px, py, 15, '#FFD700', 'sparkle');
    this.emitState();
    this.challengeUpdater?.('craft', 1);
    if (recipe.type === 'bridge') {
      this.challengeUpdater?.('bridge', 1);
    }
    return true;
  }

  // ===== UPDATE =====
  loop = (time: number) => {
    if (this.state.isPaused || !this.state.isPlaying) return;
    const dt = Math.min((time - this.lastTime) / 16.67, 3);
    this.lastTime = time;
    this.frameCount++;

    this.update(dt);
    this.render();

    // Level progression disabled - player controls exploration
    // With player-controlled movement, automatic level advancement doesn't make sense
    // Players can explore at their own pace without being forced to new levels

    requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    if (this.state.isGameOver) return;
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawnTimer = 0;
      return;
    }

    const speed = 0; // Disable auto movement - player only moves under control
    this.state.gameTime += dt;
    this.gameTime += dt; // Track total game time
    // Only increase distance when player actually moves forward
    if (this.player.vx > 0) {
      this.state.distance += this.player.vx * dt;
      this.terrainX += this.player.vx * dt;
    }
    this.state.score = Math.floor(this.state.distance) + this.state.leafTokens * 10;

    const distanceDelta = this.state.distance - this.lastDistance;
    if (distanceDelta > 0) {
      this.challengeUpdater?.('distance', distanceDelta);
      this.lastDistance = this.state.distance;
    }
    const scoreDelta = this.state.score - this.lastScore;
    if (scoreDelta > 0) {
      this.challengeUpdater?.('score', scoreDelta);
      this.lastScore = this.state.score;
    }
    
    // Update time-based challenges
    this.challengeUpdater?.('time', Math.floor(this.gameTime));
    
    // Check for perfect run (no deaths)
    if (this.state.lives === 5 && this.gameTime > 60) {
      this.challengeUpdater?.('perfect', 1);
    }

    // Enable invincibility only after grace period (for power-ups only)
    if (!this.player.invincible && this.state.distance > (this.player.invincibilityGraceDistance || 500) && this.player.activePowerUp === 'star') {
      this.player.invincible = true;
    }

    // Speed increases disabled - player controls movement
    this.state.speed = 0; // No auto-scrolling
    // Speed boost now affects player movement instead of game speed

    // Combo timer
    if (this.state.comboTimer > 0) {
      this.state.comboTimer -= dt;
      if (this.state.comboTimer <= 0) {
        this.state.combo = 0;
        this.state.multiplier = 1;
        this.lastCombo = 0;
      }
    }

    // Power-up timer
    if (this.player.powerUpTimer > 0) {
      this.player.powerUpTimer -= dt;
      if (this.player.powerUpTimer <= 0) {
        this.player.activePowerUp = null;
        this.player.invincible = false;
        this.player.bigMode = false;
        this.player.hasLeafWings = false;
        this.player.speedBoost = false;
        this.player.hasShield = false;
        this.player.timeSlowActive = false;
        this.player.magnetActive = false;
        this.player.ghostPhaseActive = false;
      }
    }

    // Special ability timers
    if (this.player.superSpeedTimer > 0) {
      this.player.superSpeedTimer -= dt;
      if (this.player.superSpeedTimer <= 0) {
        this.setMovementMode('idle');
      }
    }

    if (this.player.superJumpTimer > 0) {
      this.player.superJumpTimer -= dt;
    }

    if (this.player.dashTimer > 0) {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) {
        this.setMovementMode('idle');
      }
    }

    // Dash cooldown
    if (this.player.dashCooldown > 0) {
      this.player.dashCooldown -= dt;
    }

    // Smooth biome transitions
    if (!this.state.isTransitioning && this.state.levelTransitionCooldown <= 0) {
      const dist = this.state.distance;
      const targetBiome = this.getNextBiomeForDistance(dist);
      if (targetBiome && targetBiome !== this.state.biome) {
        this.startBiomeTransition(targetBiome);
      }
    }

    // Update transition progress
    if (this.state.isTransitioning) {
      this.updateBiomeTransition(dt);
    }

    // Update transition cooldown
    if (this.state.levelTransitionCooldown > 0) {
      this.state.levelTransitionCooldown -= dt;
    }

    // Level progression system
    this.updateLevelProgression(dt);

    // Checkpoint
    if (this.state.distance - this.state.checkpointDistance > CHECKPOINT_INTERVAL) {
      this.state.checkpointDistance = this.state.distance;
      Audio.playCheckpoint();
      this.spawnParticles(this.player.x, this.player.y, 20, '#FFD700', 'sparkle');
      this.onCheckpoint?.();
    }

    this.updatePlayer(dt);
    this.updatePlatforms(this.player.vx * dt);
    this.updateCollectibles(this.player.vx * dt, dt);
    this.updateObstacles(this.player.vx * dt, dt);
    this.updateParticles(dt);
    this.generateTerrain();
    this.updateHazards(this.player.vx * dt);

    // Ambient particles
    if (this.frameCount % 10 === 0) {
      const biome = this.state.biome;
      if (biome === 'firefly') {
        this.particles.push({
          x: this.random() * CANVAS_WIDTH, y: this.random() * CANVAS_HEIGHT * 0.7,
          vx: (this.random() - 0.5) * 0.5, vy: (this.random() - 0.5) * 0.3,
          life: 120, maxLife: 120, color: '#FFEB3B', size: 3 + this.random() * 3, type: 'firefly',
        });
      }
      if (biome === 'autumn') {
        this.particles.push({
          x: this.random() * CANVAS_WIDTH, y: -10,
          vx: (this.random() - 0.5) * 2, vy: 1 + this.random(),
          life: 200, maxLife: 200,
          color: ['#FF6F00', '#FFD54F', '#FF5722', '#BF360C'][Math.floor(this.random() * 4)],
          size: 6 + this.random() * 6, type: 'leaf',
        });
      }
    }

    // Star trail
    if (this.player.invincible && this.frameCount % 2 === 0) {
      this.particles.push({
        x: this.player.x + this.random() * this.player.width,
        y: this.player.y + this.random() * this.player.height,
        vx: -2 + this.random() * -2, vy: (this.random() - 0.5) * 2,
        life: 20, maxLife: 20,
        color: ['#FFD700', '#FF69B4', '#00E5FF', '#76FF03'][Math.floor(this.random() * 4)],
        size: 4 + this.random() * 4, type: 'trail',
      });
    }

    if (this.frameCount % 5 === 0) this.emitState();
  }

  updatePlayer(dt: number) {
    const p = this.player;

    // Horizontal control
    const targetSpeeds = {
      idle: 0,
      walk: 2.2,
      run: 4.0,
      reverse: -2.5,
      superSpeed: 6.0,
      superJump: 2.2,
      dash: 8.0,
    };
    const accel = 8;
    // Only move player if not idle
    if (this.movementMode === 'idle') {
      p.vx = 0;
    } else {
      let targetVx = targetSpeeds[this.movementMode];
      // Apply speed boost to player movement
      if (p.speedBoost) {
        targetVx *= 1.5;
      }
      // Apply super jump enhanced gravity
      if (this.movementMode === 'superJump' && p.superJumpTimer > 0) {
        targetVx *= 0.5; // Reduce horizontal movement during super jump
      }
      p.vx += Math.sign(targetVx - p.vx) * Math.min(Math.abs(targetVx - p.vx), accel * dt);
    }

    // Gravity + jump hold
    const effectiveGravity = p.gliding ? GLIDE_GRAVITY : GRAVITY;
    if (this.jumpHeld && p.vy < 0 && this.jumpHoldTime < 0.22) {
      this.jumpHoldTime += dt;
      p.vy += effectiveGravity * 0.35 * dt;
    } else {
      p.vy += effectiveGravity * dt;
    }
    if (p.vy > 18) p.vy = 18;
    p.y += p.vy * dt;
    p.x += p.vx * dt;

    // Squash/stretch animation
    p.squash += (1 - p.squash) * 0.15;
    p.stretch += (1 - p.stretch) * 0.15;

    // Animation frame
    p.animTimer += dt;
    if (p.animTimer > 8) {
      p.animTimer = 0;
      p.animFrame = (p.animFrame + 1) % 4;
    }

    // Platform / ramp collision
    const wasGrounded = p.grounded;
    p.grounded = false;
    const allPlatforms = [...this.platforms, ...this.craftedItems];
    for (const plat of allPlatforms) {
      if (this.checkPlatformCollision(p, plat)) {
        if (p.vy >= 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.grounded = true;
          p.doubleJumped = false;
          p.gliding = false;
          if (plat.bouncy) {
            p.vy = JUMP_FORCE * 1.4;
            p.grounded = false;
            p.squash = 0.5;
            p.stretch = 1.5;
            Audio.playBounce();
          }
        }
      }
    }

    if (!wasGrounded && p.grounded) {
      this.challengeUpdater?.('platform', 1);
      // Landing impact effects
      if (Math.abs(p.vy) > 3) { // Reduced threshold for better feel
        this.spawnParticles(p.x + p.width / 2, p.y + p.height, 6, '#8D6E63', 'landing');
        p.squash = 0.8;
        p.stretch = 1.2;
      }
    }

    this.checkHazardCollision(p);

    // Fall off
    if (p.y > CANVAS_HEIGHT + 60) {
      this.handleDeath();
    }

    // Horizontal bounds removed - player can move freely
    // With player-controlled movement, restricting position feels like being sent back
  }

  checkPlatformCollision(p: PlayerState, plat: Platform): boolean {
    const pw = p.bigMode ? p.width * 1.5 : p.width;
    const ph = p.bigMode ? p.height * 1.5 : p.height;
    const tolerance = 2; // Add small tolerance for better collision detection

    if (plat.type === 'ramp') {
      const rampLeft = plat.x;
      const rampRight = plat.x + plat.width;
      const rampTop = plat.y;
      const rampBottom = plat.y + plat.height;
      // Check if player is on ramp
      if (p.x + pw > rampLeft + tolerance && p.x < rampRight - tolerance &&
          p.y + ph > rampTop + tolerance && p.y < rampBottom + tolerance) {
        // Boost upward and forward
        const boost = Math.sqrt(Math.pow(p.vx, 2) + Math.pow(p.vy, 2));
        p.vx = boost * 0.8;
        p.vy = -boost * 0.6;
        p.rampBoostTime = 20;
        p.lastRampSpeed = boost;
        this.spawnRampBoostEffect(p.x + pw * 0.7, p.y + ph * 0.6, boost);
        Audio.playRampBoost?.();
        return true;
      }

      return false;
    }

    return (
      p.x + pw > plat.x && p.x < plat.x + plat.width &&
      p.y + ph > plat.y && p.y + ph < plat.y + plat.height &&
      p.vy >= 0
    );
  }

  updatePlatforms(speed: number) {
    // Platforms are now static in world - no relative movement needed
    for (const p of this.platforms) {
      if (p.moving && p.originalY !== undefined) {
        p.y = p.originalY + Math.sin(this.state.gameTime * (p.moveSpeed || 1) * 0.05) * (p.moveRange || 40);
      }
    }
    // Filter platforms that are too far behind the player
    const cleanupDistance = this.player.x - CANVAS_WIDTH;
    this.platforms = this.platforms.filter(p => p.x + p.width > cleanupDistance);
    this.craftedItems = this.craftedItems.filter(p => p.x + p.width > cleanupDistance);
  }

  updateCollectibles(speed: number, dt: number) {
    const p = this.player;
    const pw = p.bigMode ? p.width * 1.5 : p.width;
    const ph = p.bigMode ? p.height * 1.5 : p.height;

    for (const c of this.collectibles) {
      // Collectibles are now static in world - no relative movement needed
      c.sparkle += dt * 0.1;
      if (c.collected) continue;

      // Collision check
      if (p.x + pw > c.x && p.x < c.x + c.width && p.y + ph > c.y && p.y < c.y + c.height) {
        c.collected = true;
        this.handleCollect(c);
      }
    }
    this.collectibles = this.collectibles.filter(c => c.x > this.player.x - CANVAS_WIDTH);
  }

  handleCollect(c: Collectible) {
    const prevCombo = this.state.combo;
    this.state.combo++;
    this.state.comboTimer = 120;
    this.state.multiplier = Math.min(1 + Math.floor(this.state.combo / 5) * 0.5, 5);

    const points = Math.floor(10 * this.state.multiplier);
    this.state.score += points;

    // Enhanced combo visual feedback
    if (this.state.combo > prevCombo && this.state.combo % 5 === 0) {
      this.spawnParticles(c.x, c.y, 8, '#FFD700', 'combo');
      this.cameraShake = 2;
    }

    switch (c.type) {
      case 'wood': this.state.resources.wood++; Audio.playCollect(); break;
      case 'stone': this.state.resources.stone++; Audio.playCollect(); break;
      case 'flower': this.state.resources.flower++; Audio.playCollect(); break;
      case 'leaf': this.state.resources.leaf++; Audio.playCollect(); break;
      case 'leafToken':
        this.state.leafTokens += Math.floor(this.state.multiplier);
        this.state.totalLeafTokens += Math.floor(this.state.multiplier);
        Audio.playLeafToken();
        break;
      case 'mushroom_powerup': this.activatePowerUp('mushroom'); break;
      case 'star': this.activatePowerUp('star'); break;
      case 'fireFlower': this.activatePowerUp('fireFlower'); break;
      case 'leafWings': this.activatePowerUp('leafWings'); break;
      case 'speedBoots': this.activatePowerUp('speedBoots'); break;
      case 'shield': this.activatePowerUp('shield'); break;
      case 'timeSlow': this.activatePowerUp('timeSlow'); break;
      case 'magnet': this.activatePowerUp('magnet'); break;
      case 'doubleJump': this.activatePowerUp('doubleJump'); break;
      case 'ghostPhase': this.activatePowerUp('ghostPhase'); break;
    }

    if (this.state.combo > 0 && this.state.combo % 5 === 0) Audio.playCombo();

    const comboDelta = this.state.combo - this.lastCombo;
    if (comboDelta > 0) {
      this.challengeUpdater?.('combo', comboDelta);
      this.lastCombo = this.state.combo;
    }

    this.challengeUpdater?.('collect', 1);

    const colors: Record<string, string> = {
      wood: '#8D6E63', stone: '#90A4AE', flower: '#FF69B4', leaf: '#4CAF50',
      leafToken: '#FFD700', mushroom_powerup: '#FF6B6B', star: '#FFD700',
      fireFlower: '#FF5722', leafWings: '#76FF03', speedBoots: '#00BCD4', shield: '#9C27B0',
      timeSlow: '#9C27B0', magnet: '#FF9800', doubleJump: '#00BCD4', ghostPhase: '#E91E63',
    };
    this.spawnParticles(c.x, c.y, 8, colors[c.type] || '#FFD700', 'collect');
  }

  activatePowerUp(type: PowerUpType) {
    this.player.activePowerUp = type;
    this.player.powerUpTimer = POWERUP_DURATION;
    Audio.playPowerUp();

    switch (type) {
      case 'mushroom': this.player.bigMode = true; break;
      case 'star': this.player.invincible = true; break;
      case 'leafWings': this.player.hasLeafWings = true; break;
      case 'speedBoots': this.player.speedBoost = true; break;
      case 'shield': this.player.hasShield = true; break;
      case 'timeSlow': this.player.timeSlowActive = true; break;
      case 'magnet': this.player.magnetActive = true; break;
      case 'doubleJump': this.player.doubleJumpAvailable = true; break;
      case 'ghostPhase': this.player.ghostPhaseActive = true; break;
    }

    // Enhanced visual feedback for power-up activation
    this.spawnParticles(this.player.x, this.player.y, 12, '#FFD700', 'powerUpAura');
    this.cameraShake = 3;
  }

  // Special ability methods
  activateSuperSpeed() {
    if (this.player.superSpeedTimer > 0) return; // Already active
    this.player.superSpeedTimer = 180; // 3 seconds at 60fps
    this.setMovementMode('superSpeed');
    this.spawnParticles(this.player.x, this.player.y, 15, '#00BCD4', 'speedline');
    this.cameraShake = 2;
  }

  activateSuperJump() {
    if (this.player.superJumpTimer > 0) return; // Already active
    this.player.superJumpTimer = 120; // 2 seconds
    this.player.vy = -JUMP_FORCE * 1.5; // 1.5x jump height
    this.player.jumping = true;
    this.player.grounded = false;
    this.spawnParticles(this.player.x, this.player.y, 20, '#76FF03', 'sparkle');
    this.cameraShake = 4;
  }

  activateDash() {
    if (this.player.dashCooldown > 0 || this.player.dashTimer > 0) return; // Cooldown or active
    this.player.dashTimer = 30; // 0.5 seconds dash
    this.player.dashCooldown = 120; // 2 seconds cooldown
    this.setMovementMode('dash');
    this.spawnParticles(this.player.x, this.player.y, 25, '#FF9800', 'trail');
    this.cameraShake = 5;
  }

  updateObstacles(speed: number, dt: number) {
    const p = this.player;
    const pw = p.bigMode ? p.width * 1.5 : p.width;
    const ph = p.bigMode ? p.height * 1.5 : p.height;

    for (const o of this.obstacles) {
      // Obstacles are now static in world - no relative movement needed
      o.bounceOffset += dt * 0.1;

      if (o.type === 'bird') {
        o.y += Math.sin(o.bounceOffset) * 0.5;
      }
      if (o.type === 'slime') {
        o.y = GROUND_Y - 30 + Math.abs(Math.sin(o.bounceOffset * 2)) * -20;
      }

      // Collision
      if (!p.invincible && this.respawnTimer <= 0) {
        if (p.x + pw > o.x + 4 && p.x < o.x + o.width - 4 &&
            p.y + ph > o.y + 4 && p.y < o.y + o.height - 4) {
          if (p.hasShield) {
            p.hasShield = false;
            p.activePowerUp = null;
            p.powerUpTimer = 0;
            this.spawnParticles(o.x, o.y, 10, '#9C27B0', 'sparkle');
            o.x = -200; // Remove
          } else {
            this.handleDeath();
          }
        }
      }
    }
    this.obstacles = this.obstacles.filter(o => o.x > this.player.x - CANVAS_WIDTH);
  }

  handleDeath() {
    this.state.lives--;
    Audio.playHit();
    this.cameraShake = 15;

    if (this.state.lives <= 0) {
      this.state.isGameOver = true;
      Audio.stopMusic();
      Audio.playGameOver();
      this.saveTotalTokens();
      this.onGameOver?.();
      this.emitState();
      return;
    }

    // Forward checkpoint progression - move player forward after death
    const forwardProgress = 200; // Move forward 200 units after death
    this.player.x = Math.max(this.player.x + forwardProgress, 300); // Ensure minimum progress
    this.player.y = GROUND_Y - 40; // Fixed: spawn on ground level, not above it
    this.player.vy = 0;
    this.player.invincible = false; // Don't use invincibility for respawn to prevent flashing
    this.respawnTimer = 60;
    
    // Update checkpoint distance to prevent getting stuck
    this.state.checkpointDistance = Math.max(this.state.checkpointDistance, this.player.x - 100);
    
    this.spawnParticles(this.player.x, this.player.y, 15, '#FFD700', 'sparkle');
    this.emitState();
  }

  updateParticles(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.type === 'leaf') {
        p.vx += Math.sin(p.life * 0.05) * 0.1;
      }
      if (p.type === 'firefly') {
        p.vx += (this.random() - 0.5) * 0.2;
        p.vy += (this.random() - 0.5) * 0.2;
      }
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  
  generateTerrain() {
    const ahead = this.player.x + CANVAS_WIDTH + 600;
    const difficulty = Math.min(1, this.state.distance / 12000); // Faster difficulty for variety
    
    while (this.nextPlatformX < ahead) {
      // Structured gap system: small (easy), medium (normal), large (challenge)
      const gapRoll = this.random();
      let safeGap: number;
      let platformWidth: number;
      
      if (gapRoll < 0.55) {
        // 55% small gaps - easily walkable/jumpable (0-25 units)
        safeGap = 10 + this.random() * 15;
        platformWidth = 180 + this.random() * 100;
      } else if (gapRoll < 0.85) {
        // 30% medium gaps - require a jump (25-45 units)
        safeGap = 25 + this.random() * 20;
        platformWidth = 150 + this.random() * 80;
      } else {
        // 15% large gaps - require run+jump or are near floating platforms (45-55 units)
        safeGap = 45 + this.random() * 10;
        platformWidth = 140 + this.random() * 60;
      }
      
      // Absolute cap - no gap larger than 55 ever
      safeGap = Math.min(safeGap, 55);

      // Always add a floating platform near larger gaps to help the player
      if (safeGap > 35) {
        this.addFloatingPlatform(
          this.nextPlatformX + safeGap * 0.5,
          BIOME_COLORS[this.state.biome]
        );
      }
      
      // Spawn hazard in large gaps (optional challenge)
      if (safeGap > 40 && this.random() < 0.15 && this.state.distance > 600) {
        const hazardWidth = Math.min(safeGap - 15, 80);
        this.spawnHazard(this.nextPlatformX + 15, hazardWidth, 'water');
      }

      this.platforms.push({
        x: this.nextPlatformX + safeGap,
        y: GROUND_Y,
        width: platformWidth,
        height: 200,
        type: (BIOME_COLORS[this.state.biome].platforms ? 
               BIOME_COLORS[this.state.biome].platforms[0] : 'ground') as Platform['type'], 
        color: BIOME_COLORS[this.state.biome].ground,
      });

      // Always add some floating platforms for fun traversal options
      if (this.random() < 0.6) {
        this.addFloatingPlatform(
          this.nextPlatformX + safeGap + 30 + this.random() * (platformWidth - 60),
          BIOME_COLORS[this.state.biome]
        );
      }

      // No extra spacing - gap is the actual gap between platforms
      this.nextPlatformX += safeGap + platformWidth;
    }

    while (this.nextCollectibleX < ahead) {
      // Spawn clusters of collectibles for more fun collection
      const clusterSize = 1 + Math.floor(this.random() * 3); // 1-3 items in a cluster
      for (let i = 0; i < clusterSize; i++) {
        this.addCollectible(this.nextCollectibleX + i * 35, BIOME_COLORS[this.state.biome]);
      }
      this.nextCollectibleX += 60 + this.random() * 80; // Denser spacing
    }

    while (this.nextObstacleX < ahead) {
      this.addObstacle(this.nextObstacleX);
      this.nextObstacleX += 800 + this.random() * 600; // Very spaced out obstacles for relaxed gameplay
    }
  }

  private spawnHazard(x: number, width: number, type?: Hazard['type']) {
    const hazardType = type || this.getHazardTypeForBiome();
    const hazardYOffset = 12;
    const variableHeight = 40 + this.random() * 30;
    const hazardHeight = Math.min(variableHeight, CANVAS_HEIGHT - (GROUND_Y + hazardYOffset));
    
    this.hazards.push({
      x,
      width: Math.max(26, width),
      y: GROUND_Y + hazardYOffset,
      height: hazardHeight,
      type: hazardType,
      warningShown: false,
      warningTimer: 180, // 3 seconds warning at 60fps
      active: false,
      damageAmount: 1,
    });

    // Spawn warning particles
    this.spawnHazardWarning(x, width, hazardType);
  }

  private spawnHazardWarning(x: number, width: number, type: Hazard['type']) {
    const warningColor = type === 'fire' ? '#FF5722' : type === 'lava' ? '#FF6B35' : '#2196F3';
    
    // Create warning particles along the hazard area
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (width * i) / 5,
        y: GROUND_Y - 10,
        vx: 0,
        vy: -0.5,
        life: 120,
        maxLife: 120,
        color: warningColor,
        size: 4,
        type: 'hazardWarning',
      });
    }
  }

  private getHazardTypeForBiome(): Hazard['type'] {
    const roll = this.random();
    switch (this.state.biome) {
      case 'firefly': return roll > 0.35 ? 'fire' : 'water';
      case 'autumn': return roll > 0.25 ? 'fire' : 'water';
      case 'crystal': return roll > 0.6 ? 'water' : 'fire';
      default: return roll > 0.5 ? 'water' : 'fire';
    }
  }

  private updateHazards(speed: number) {
    // Hazards are now static in world - no relative movement needed
    for (const hazard of this.hazards) {
      
      // Update warning timer
      if (hazard.warningTimer && hazard.warningTimer > 0) {
        hazard.warningTimer--;
        if (hazard.warningTimer <= 0) {
          hazard.active = true;
          hazard.warningShown = true;
        }
      }
    }
    this.hazards = this.hazards.filter(h => h.width > 0 && h.x + h.width > this.player.x - CANVAS_WIDTH);
  }

  private checkHazardCollision(p: PlayerState) {
    if (p.invincible || p.ghostPhaseActive) return;
    for (const hazard of this.hazards) {
      if (hazard.width <= 0 || hazard.height <= 0 || !hazard.active) continue;
      if (p.x + p.width > hazard.x && p.x < hazard.x + hazard.width &&
          p.y + p.height > hazard.y && p.y < hazard.y + hazard.height) {
        if (p.hasLeafWings && p.gliding) continue;
        if (p.hasShield) {
          this.consumeShield();
          hazard.width = 0;
          this.spawnParticles(hazard.x + hazard.width / 2, GROUND_Y - 6, 8, '#9C27B0', 'sparkle');
          return;
        }
        // Enhanced damage feedback
        this.spawnParticles(p.x + p.width / 2, p.y + p.height / 2, 15, '#FF0000', 'damage');
        this.cameraShake = 8;
        this.handleDeath();
        return;
      }
    }
  }

  private consumeShield() {
    this.player.hasShield = false;
    this.player.activePowerUp = null;
    this.player.powerUpTimer = 0;
  }

  private renderHazards(ctx: CanvasRenderingContext2D) {
    for (const hazard of this.hazards) {
      if (hazard.width <= 0 || hazard.height <= 0) continue;
      
      // Use camera-relative bounds
      if (hazard.x > this.cameraX + CANVAS_WIDTH + 50 || hazard.x + hazard.width < this.cameraX - 50) continue;
      
      // Warning state rendering
      if (hazard.warningTimer && hazard.warningTimer > 0) {
        const warningAlpha = Math.min(1, hazard.warningTimer / 60);
        ctx.globalAlpha = warningAlpha * 0.5;
        
        // Pulsing warning outline
        const pulse = 0.5 + Math.sin(hazard.warningTimer * 0.3) * 0.5;
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 3 + pulse * 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(hazard.x - 2, hazard.y - 2, hazard.width + 4, hazard.height + 4);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        continue;
      }
      
      if (!hazard.active) continue;
      
      // Active hazard rendering
      let fillColor, strokeColor, highlightColor;
      
      switch (hazard.type) {
        case 'water':
          fillColor = 'rgba(33, 150, 243, 0.6)';
          strokeColor = '#0288D1';
          highlightColor = '#81D4FA';
          break;
        case 'fire':
          fillColor = 'rgba(244, 67, 54, 0.7)';
          strokeColor = '#B71C1C';
          highlightColor = '#FFAB91';
          break;
        case 'lava':
          fillColor = 'rgba(255, 107, 53, 0.8)';
          strokeColor = '#D84315';
          highlightColor = '#FF8A65';
          break;
        case 'spikes':
          fillColor = 'rgba(66, 66, 66, 0.8)';
          strokeColor = '#424242';
          highlightColor = '#757575';
          break;
        case 'poison':
          fillColor = 'rgba(139, 195, 74, 0.6)';
          strokeColor = '#689F38';
          highlightColor = '#AED581';
          break;
        default:
          fillColor = 'rgba(158, 158, 158, 0.6)';
          strokeColor = '#757575';
          highlightColor = '#BDBDBD';
      }
      
      ctx.fillStyle = fillColor;
      ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(hazard.x, hazard.y, hazard.width, hazard.height);
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hazard.x, hazard.y + 4);
      ctx.lineTo(hazard.x + hazard.width, hazard.y + 4);
      ctx.stroke();
    }
  }

  // Smooth transition system
  getNextBiomeForDistance(distance: number): BiomeType | null {
    if (distance > 15000) return 'firefly';
    else if (distance > 10000) return 'autumn';
    else if (distance > 5000) return 'crystal';
    return null;
  }

  startBiomeTransition(targetBiome: BiomeType) {
    if (this.state.isTransitioning) return;
    if (targetBiome === this.state.biome) return;
    
    this.state.transitioningBiome = targetBiome;
    this.state.transitionProgress = 0;
    this.state.isTransitioning = true;
    this.state.levelTransitionCooldown = 300; // 5 second cooldown
    
    // Preserve current background state
    this.preserveBackgroundState();
    
    // Initialize target biome background
    const currentBiome = this.state.biome;
    this.state.biome = targetBiome;
    this.initBackground();
    this.state.biome = currentBiome; // Keep current biome until transition completes
  }

  updateBiomeTransition(dt: number) {
    if (!this.state.isTransitioning || !this.state.transitioningBiome) return;
    
    // 3 second transition
    const transitionDuration = 180; // frames at 60fps
    this.state.transitionProgress += dt / transitionDuration;
    
    if (this.state.transitionProgress >= 1) {
      this.completeBiomeTransition();
    }
  }

  completeBiomeTransition() {
    if (!this.state.transitioningBiome) return;
    
    // Complete the transition
    this.state.biome = this.state.transitioningBiome;
    this.state.transitioningBiome = null;
    this.state.transitionProgress = 0;
    this.state.isTransitioning = false;
    
    // Clean up old background layers
    this.initBackground();
    this.challengeUpdater?.('biome', 1);
    
    // Visual feedback
    this.spawnParticles(this.player.x, this.player.y, 30, '#FFD700', 'sparkle');
    this.cameraShake = 3;
  }

  preserveBackgroundState() {
    // Store current background layer positions for smooth transition
    this.preservedBgLayers = this.cloneBgLayers(this.bgLayers);
  }

  changeBiome(biome: BiomeType) {
    if (this.state.biome === biome) return;
    this.state.biome = biome;
    this.initBackground();
    this.challengeUpdater?.('biome', 1);
  }

  spawnParticles(x: number, y: number, count: number, color: string, type: Particle['type']) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (this.random() - 0.5) * 6,
        vy: (this.random() - 0.5) * 6 - 2,
        life: 30 + this.random() * 30,
        maxLife: 60,
        color, size: 3 + this.random() * 5, type,
      });
    }
  }

  private spawnRampBoostEffect(x: number, y: number, strength: number) {
    const intensity = Math.min(1, Math.max(0, (strength - 4) / 8));
    for (let i = 0; i < 6 + Math.floor(intensity * 6); i++) {
      const life = 18 + this.random() * 12;
      this.particles.push({
        x: x - this.random() * 12,
        y: y + this.random() * 8 - 4,
        vx: -6 - Math.random() * 2,
        vy: (this.random() - 0.5) * 2,
        life,
        maxLife: life,
        color: '#FFFFFF',
        size: 2 + Math.random() * 2,
        type: 'spark',
      });
    }
  }

  saveTotalTokens() {
    localStorage.setItem('flo_totalTokens', String(this.state.totalLeafTokens));
  }

  emitState() {
    this.onStateChange?.({ ...this.state, resources: { ...this.state.resources } });
  }

  // ===== RENDER =====
  render() {
    const ctx = this.ctx;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Update camera to smoothly follow player
    const cameraSpeed = 0.15; // Camera following speed
    this.cameraTargetX += (this.player.x - this.cameraTargetX) * cameraSpeed;
    this.cameraTargetY += (this.player.y - this.cameraTargetY) * cameraSpeed;
    this.cameraX += (this.cameraTargetX - this.cameraX) * cameraSpeed;
    this.cameraY += (this.cameraTargetY - this.cameraY) * cameraSpeed;

    // Render sky and background in screen space (before camera transform)
    this.renderSky(ctx, w, h);
    this.renderBackground(ctx, w, h);

    // Apply camera transform for world objects
    ctx.save();
    if (this.cameraShake > 0) {
      ctx.translate((Math.random() - 0.5) * this.cameraShake, (Math.random() - 0.5) * this.cameraShake);
      this.cameraShake *= 0.9;
      if (this.cameraShake < 0.5) this.cameraShake = 0;
    }
    
    // Center camera on player
    const cameraOffsetX = CANVAS_WIDTH / 2 - this.cameraX;
    const cameraOffsetY = CANVAS_HEIGHT / 2 - this.cameraY;
    ctx.translate(cameraOffsetX, cameraOffsetY);

    // Render world objects with camera transform
    this.renderPlatforms(ctx);
    this.renderCollectibles(ctx);
    this.renderObstacles(ctx);
    this.renderHazards(ctx);
    this.renderPlayer(ctx);
    this.renderParticles(ctx);

    // Vignette (in screen space)
    ctx.restore();
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  renderSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Handle smooth sky transitions
    let colors = BIOME_COLORS[this.state.biome].sky;
    
    if (this.state.isTransitioning && this.state.transitioningBiome) {
      const targetColors = BIOME_COLORS[this.state.transitioningBiome].sky;
      const progress = this.state.transitionProgress;
      
      // Blend colors between current and target biome
      colors = colors.map((color, i) => {
        const targetColor = targetColors[i];
        return this.blendColors(color, targetColor, progress);
      });
    }
    
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[1]);
    grad.addColorStop(1, colors[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  blendColors(color1: string, color2: string, progress: number): string {
    // Simple RGB color blending
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * progress);
    const g = Math.round(c1.g + (c2.g - c1.g) * progress);
    const b = Math.round(c1.b + (c2.b - c1.b) * progress);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Render background in screen space with bidirectional parallax and smooth transitions
    
    // During transition, render both current and target biome backgrounds with opacity
    const renderBiomeLayers = (layers: typeof this.bgLayers, opacity: number) => {
      ctx.globalAlpha = opacity;
      
      // Camera-relative rendering: generate positions around current camera
      const camX = this.cameraX;
      const camY = this.cameraY;
      
      // Clouds layer (index 3) - Backmost layer, slowest parallax
      const cloudLayer = layers[3];
      if (cloudLayer) {
        for (const el of cloudLayer.elements) {
          const parallaxX = camX * 0.03; // Very slow parallax
          const x = el.x - parallaxX;
          // Camera-relative wrapping with extended coverage
          const viewRange = w + 800;
          const startPos = Math.floor(x / viewRange) * viewRange - viewRange/2;
          for (let pos = startPos; pos < startPos + viewRange; pos += 200) {
            if (pos >= x - 400 && pos <= x + 400) {
              this.drawCloud(ctx, pos, el.y, el.scale);
            }
          }
        }
      }

      // Mountains layer (index 2) - Behind trees, slow parallax
      const mtLayer = layers[2];
      if (mtLayer) {
        for (const el of mtLayer.elements) {
          const parallaxX = camX * 0.08; // Slow parallax
          const x = el.x - parallaxX;
          // Camera-relative wrapping
          const viewRange = w + 600;
          const startPos = Math.floor(x / viewRange) * viewRange - viewRange/2;
          for (let pos = startPos; pos < startPos + viewRange; pos += 180) {
            if (pos >= x - 300 && pos <= x + 300) {
              this.drawMountain(ctx, pos, h * 0.5, el.scale, el.color);
            }
          }
        }
      }

      // Mid trees layer (index 1) - In front of mountains, medium parallax
      const treeLayer = layers[1];
      if (treeLayer) {
        for (const el of treeLayer.elements) {
          const parallaxX = camX * 0.25; // Medium parallax
          const x = el.x - parallaxX;
          // Camera-relative wrapping
          const viewRange = w + 400;
          const startPos = Math.floor(x / viewRange) * viewRange - viewRange/2;
          for (let pos = startPos; pos < startPos + viewRange; pos += 110) {
            if (pos >= x - 200 && pos <= x + 200) {
              this.drawTree(ctx, pos, h * 0.55, el.scale * 1.5, el.color, el.variant);
            }
          }
        }
      }

      // Near bushes + flowers layer (index 0) - Frontmost layer, fastest parallax
      const nearLayer = layers[0];
      if (nearLayer) {
        for (const el of nearLayer.elements) {
          const parallaxX = camX * 0.45; // Fast parallax
          const x = el.x - parallaxX;
          // Camera-relative wrapping
          const viewRange = w + 200;
          const startPos = Math.floor(x / viewRange) * viewRange - viewRange/2;
          for (let pos = startPos; pos < startPos + viewRange; pos += 70) {
            if (pos >= x - 100 && pos <= x + 100) {
              if (el.type === 'bush') {
                this.drawBush(ctx, pos, GROUND_Y - 10, el.scale, el.color);
              } else if (el.type === 'mushroom') {
                this.drawMushroomBg(ctx, pos, GROUND_Y - 12, el.scale, el.color);
              } else {
                this.drawFlowerBg(ctx, pos, GROUND_Y - 8, el.scale, el.color);
              }
            }
          }
        }
      }
    };
    
    if (this.state.isTransitioning && this.state.transitioningBiome && this.preservedBgLayers.length > 0) {
      // Render current biome (fading out)
      renderBiomeLayers(this.preservedBgLayers, 1 - this.state.transitionProgress);
      
      // Render target biome (fading in)
      renderBiomeLayers(this.bgLayers, this.state.transitionProgress);
    } else {
      // Normal rendering
      renderBiomeLayers(this.bgLayers, 1);
    }
    
    ctx.globalAlpha = 1; // Reset opacity
  }

// ... (rest of the code remains the same)

  drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const s = scale * 40;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.arc(x + s * 0.8, y - s * 0.3, s * 0.7, 0, Math.PI * 2);
    ctx.arc(x + s * 1.4, y, s * 0.6, 0, Math.PI * 2);
    ctx.arc(x - s * 0.5, y + s * 0.1, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMountain(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, color: string) {
    const h = scale * 150;
    ctx.fillStyle = color + '80';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.8, baseY + 100);
    ctx.lineTo(x, baseY + 100 - h);
    ctx.lineTo(x + h * 0.8, baseY + 100);
    ctx.fill();
    // Snow cap
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.15, baseY + 100 - h * 0.8);
    ctx.lineTo(x, baseY + 100 - h);
    ctx.lineTo(x + h * 0.15, baseY + 100 - h * 0.8);
    ctx.fill();
  }

  drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, color: string, variant: number) {
    const h = scale * 60;
    // Trunk
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x - 4 * scale, baseY - h * 0.3, 8 * scale, h * 0.4);
    // Foliage
    ctx.fillStyle = color;
    if (variant % 2 === 0) {
      // Round tree
      ctx.beginPath();
      ctx.arc(x, baseY - h * 0.5, h * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color + 'CC';
      ctx.beginPath();
      ctx.arc(x + h * 0.15, baseY - h * 0.6, h * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Triangle tree
      ctx.beginPath();
      ctx.moveTo(x, baseY - h);
      ctx.lineTo(x - h * 0.3, baseY - h * 0.2);
      ctx.lineTo(x + h * 0.3, baseY - h * 0.2);
      ctx.fill();
      ctx.fillStyle = color + 'CC';
      ctx.beginPath();
      ctx.moveTo(x, baseY - h * 0.85);
      ctx.lineTo(x - h * 0.25, baseY - h * 0.35);
      ctx.lineTo(x + h * 0.25, baseY - h * 0.35);
      ctx.fill();
    }
  }

  drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
    ctx.fillStyle = color;
    const s = scale * 30;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.arc(x + s * 0.7, y + s * 0.2, s * 0.7, 0, Math.PI * 2);
    ctx.arc(x - s * 0.5, y + s * 0.1, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFlowerBg(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
    const s = scale * 10;
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * s, y + Math.sin(angle) * s, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMushroomBg(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
    const s = scale * 15;
    // Stem
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(x - s * 0.15, y, s * 0.3, s * 0.8);
    // Cap
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.5, s * 0.35, 0, Math.PI, 0);
    ctx.fill();
    // Spots on cap
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x - s * 0.15, y - s * 0.1, s * 0.08, 0, Math.PI * 2);
    ctx.arc(x + s * 0.2, y - s * 0.05, s * 0.06, 0, Math.PI * 2);
    ctx.arc(x, y - s * 0.2, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  renderPlatforms(ctx: CanvasRenderingContext2D) {
    for (const p of [...this.platforms, ...this.craftedItems]) {
      // Use camera-relative bounds instead of fixed canvas bounds
      if (p.x > this.cameraX + CANVAS_WIDTH + 50 || p.x + p.width < this.cameraX - 50) continue;

      if (p.type === 'ground') {
        // Ground with grass
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + 40);
        grad.addColorStop(0, '#5D8A3C');
        grad.addColorStop(0.1, p.color);
        grad.addColorStop(1, '#3E5A2B');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, Math.min(p.height, CANVAS_HEIGHT - p.y + 10), [8, 8, 0, 0]);
        ctx.fill();
        // Grass tufts
        ctx.fillStyle = '#6ABF4B';
        for (let gx = p.x + 5; gx < p.x + p.width - 5; gx += 12) {
          ctx.beginPath();
          ctx.moveTo(gx, p.y);
          ctx.lineTo(gx + 3, p.y - 6);
          ctx.lineTo(gx + 6, p.y);
          ctx.fill();
        }
      } else if (p.type === 'mushroom') {
        // Mushroom platform
        ctx.fillStyle = '#F5F5DC';
        ctx.fillRect(p.x + p.width / 2 - 6, p.y, 12, 20);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2, p.y, p.width / 2, 16, 0, Math.PI, 0);
        ctx.fill();
        // Dots
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2 - 10, p.y - 8, 4, 0, Math.PI * 2);
        ctx.arc(p.x + p.width / 2 + 8, p.y - 6, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'floating') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 6);
        ctx.fill();
        ctx.fillStyle = '#6ABF4B';
        ctx.fillRect(p.x + 2, p.y - 2, p.width - 4, 4);
      } else if (p.type === 'vine') {
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(p.x + p.width / 2, p.y - 100);
        ctx.quadraticCurveTo(p.x + p.width / 2 + 20, p.y - 50, p.x + p.width / 2, p.y);
        ctx.stroke();
        ctx.fillStyle = '#66BB6A';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(p.x + p.width / 2 + (i % 2 ? 10 : -10), p.y - 30 - i * 25, 8, 5, i % 2 ? 0.3 : -0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'log') {
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 8);
        ctx.fill();
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.arc(p.x + 8, p.y + p.height / 2, 6, 0, Math.PI * 2);
        ctx.arc(p.x + p.width - 8, p.y + p.height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bridge') {
        ctx.fillStyle = '#A1887F';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 2;
        for (let bx = p.x; bx < p.x + p.width; bx += 20) {
          ctx.strokeRect(bx, p.y, 20, p.height);
        }
      } else if (p.type === 'ramp') {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + p.height);
        ctx.lineTo(p.x + p.width, p.y);
        ctx.lineTo(p.x + p.width, p.y + p.height);
        ctx.fill();
      } else if (p.type === 'platform' && p.bouncy) {
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 10);
        ctx.fill();
        // Spring lines
        ctx.strokeStyle = '#FF1493';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let sx = p.x + 10; sx < p.x + p.width - 10; sx += 8) {
          ctx.moveTo(sx, p.y + 4);
          ctx.lineTo(sx + 4, p.y + p.height - 4);
        }
        ctx.stroke();
      } else if (p.type === 'wall') {
        ctx.fillStyle = '#78909C';
        ctx.fillRect(p.x, p.y - p.height, p.width, p.height);
        ctx.fillStyle = '#546E7A';
        for (let by = p.y - p.height; by < p.y; by += 15) {
          for (let bx = p.x; bx < p.x + p.width; bx += 20) {
            ctx.strokeStyle = '#455A64';
            ctx.strokeRect(bx + ((by / 15) % 2 ? 10 : 0), by, 20, 15);
          }
        }
      }
    }
  }

  renderCollectibles(ctx: CanvasRenderingContext2D) {
    for (const c of this.collectibles) {
      // Use camera-relative bounds
      if (c.collected || c.x > this.cameraX + CANVAS_WIDTH + 30 || c.x < this.cameraX - 30) continue;
      const bob = Math.sin(c.bobOffset + this.state.gameTime * 0.05) * 5;
      const y = c.y + bob;
      const glow = 0.5 + Math.sin(c.sparkle) * 0.3;

      ctx.save();
      ctx.globalAlpha = 1;

      // Glow
      ctx.shadowColor = this.getCollectibleColor(c.type);
      ctx.shadowBlur = 10 + glow * 5;

      switch (c.type) {
        case 'wood':
          ctx.fillStyle = '#8D6E63';
          ctx.fillRect(c.x + 4, y + 2, 16, 20);
          ctx.fillStyle = '#A1887F';
          ctx.fillRect(c.x + 6, y + 4, 12, 4);
          ctx.fillRect(c.x + 6, y + 12, 12, 4);
          break;
        case 'stone':
          ctx.fillStyle = '#90A4AE';
          ctx.beginPath();
          ctx.moveTo(c.x + 12, y + 2);
          ctx.lineTo(c.x + 22, y + 8);
          ctx.lineTo(c.x + 20, y + 20);
          ctx.lineTo(c.x + 4, y + 18);
          ctx.lineTo(c.x + 2, y + 8);
          ctx.fill();
          ctx.fillStyle = '#B0BEC5';
          ctx.beginPath();
          ctx.moveTo(c.x + 12, y + 2);
          ctx.lineTo(c.x + 22, y + 8);
          ctx.lineTo(c.x + 12, y + 10);
          ctx.fill();
          break;
        case 'flower':
          this.drawFlowerBg(ctx, c.x + 12, y + 12, 0.8, '#FF69B4');
          break;
        case 'leaf':
          ctx.fillStyle = '#4CAF50';
          ctx.beginPath();
          ctx.ellipse(c.x + 12, y + 12, 10, 6, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#388E3C';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c.x + 4, y + 14);
          ctx.lineTo(c.x + 20, y + 10);
          ctx.stroke();
          break;
        case 'leafToken':
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(c.x + 12, y + 12, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFA000';
          ctx.beginPath();
          ctx.arc(c.x + 12, y + 12, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('L', c.x + 12, y + 16);
          break;
        case 'mushroom_powerup':
          ctx.fillStyle = '#FFF';
          ctx.fillRect(c.x + 8, y + 14, 8, 10);
          ctx.fillStyle = '#FF4444';
          ctx.beginPath();
          ctx.arc(c.x + 12, y + 12, 10, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(c.x + 8, y + 8, 3, 0, Math.PI * 2);
          ctx.arc(c.x + 16, y + 10, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'star':
          this.drawStar(ctx, c.x + 12, y + 12, 5, 10, 5, '#FFD700');
          break;
        case 'fireFlower':
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(c.x + 10, y + 14, 4, 10);
          ctx.fillStyle = '#FF5722';
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.arc(c.x + 12 + Math.cos(a) * 6, y + 10 + Math.sin(a) * 6, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#FFC107';
          ctx.beginPath();
          ctx.arc(c.x + 12, y + 10, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'leafWings':
          ctx.fillStyle = '#76FF03';
          ctx.beginPath();
          ctx.ellipse(c.x + 6, y + 12, 8, 12, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(c.x + 18, y + 12, 8, 12, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#64DD17';
          ctx.beginPath();
          ctx.arc(c.x + 12, y + 12, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'speedBoots':
          ctx.fillStyle = '#00BCD4';
          ctx.beginPath();
          ctx.roundRect(c.x + 3, y + 8, 18, 14, 4);
          ctx.fill();
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.moveTo(c.x + 8, y + 12);
          ctx.lineTo(c.x + 18, y + 15);
          ctx.lineTo(c.x + 8, y + 18);
          ctx.fill();
          break;
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  getCollectibleColor(type: string): string {
    const colors: Record<string, string> = {
      wood: '#8D6E63', stone: '#90A4AE', flower: '#FF69B4', leaf: '#4CAF50',
      leafToken: '#FFD700', mushroom_powerup: '#FF4444', star: '#FFD700',
      fireFlower: '#FF5722', leafWings: '#76FF03', speedBoots: '#00BCD4', shield: '#9C27B0',
    };
    return colors[type] || '#FFF';
  }

  drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  renderObstacles(ctx: CanvasRenderingContext2D) {
    for (const o of this.obstacles) {
      // Use camera-relative bounds
      if (o.x > this.cameraX + CANVAS_WIDTH + 30 || o.x < this.cameraX - 30) continue;
      ctx.save();

      if (o.type === 'slime') {
        const squish = 1 + Math.sin(o.bounceOffset * 2) * 0.15;
        ctx.fillStyle = '#7CB342';
        ctx.beginPath();
        ctx.ellipse(o.x + o.width / 2, o.y + o.height, o.width / 2 * squish, o.height / 2 / squish, 0, Math.PI, 0);
        ctx.ellipse(o.x + o.width / 2, o.y + o.height, o.width / 2 * squish, o.height * squish, 0, 0, Math.PI);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(o.x + o.width * 0.35, o.y + o.height * 0.4, 5, 0, Math.PI * 2);
        ctx.arc(o.x + o.width * 0.65, o.y + o.height * 0.4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(o.x + o.width * 0.35, o.y + o.height * 0.4, 2.5, 0, Math.PI * 2);
        ctx.arc(o.x + o.width * 0.65, o.y + o.height * 0.4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Smile
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(o.x + o.width / 2, o.y + o.height * 0.55, 6, 0, Math.PI);
        ctx.stroke();
      } else if (o.type === 'bird') {
        const wingAngle = Math.sin(o.bounceOffset * 3) * 0.5;
        ctx.fillStyle = '#42A5F5';
        ctx.beginPath();
        ctx.ellipse(o.x + o.width / 2, o.y + o.height / 2, o.width / 2, o.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.fillStyle = '#1E88E5';
        ctx.save();
        ctx.translate(o.x + o.width * 0.3, o.y + o.height * 0.3);
        ctx.rotate(wingAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(o.x + o.width * 0.7, o.y + o.height * 0.3);
        ctx.rotate(-wingAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Eye
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(o.x + o.width * 0.7, o.y + o.height * 0.4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(o.x + o.width * 0.7, o.y + o.height * 0.4, 2, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.moveTo(o.x + o.width, o.y + o.height * 0.45);
        ctx.lineTo(o.x + o.width + 8, o.y + o.height * 0.5);
        ctx.lineTo(o.x + o.width, o.y + o.height * 0.55);
        ctx.fill();
      } else if (o.type === 'rollingLog') {
        const rotation = o.bounceOffset * 2;
        ctx.save();
        ctx.translate(o.x + o.width / 2, o.y + o.height / 2);
        ctx.rotate(rotation);
        ctx.fillStyle = '#795548';
        ctx.beginPath();
        ctx.arc(0, 0, o.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.arc(0, 0, o.width / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        // Ring pattern
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, o.width / 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    // Only flash during respawn timer, not during normal invincibility
    if (this.respawnTimer > 0 && Math.floor(this.respawnTimer) % 4 < 2) return;

    const scale = p.bigMode ? 1.5 : 1;
    const w = p.width * scale;
    const h = p.height * scale;
    const x = p.x;
    const y = p.y + (p.bigMode ? -p.height * 0.5 : 0);

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(p.squash, p.stretch);

    const charColors = CHARACTER_COLORS[this.avatar.character] || CHARACTER_COLORS.fox;

    // Shield aura
    if (p.hasShield) {
      ctx.strokeStyle = 'rgba(156, 39, 176, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Star glow
    if (p.invincible) {
      const rainbow = `hsl(${this.frameCount * 5 % 360}, 100%, 60%)`;
      ctx.shadowColor = rainbow;
      ctx.shadowBlur = 20;
    }

    // Body
    ctx.fillStyle = this.avatar.color || charColors.body;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + 6, w, h - 6, 8);
    ctx.fill();

    // Belly
    ctx.fillStyle = charColors.belly;
    ctx.beginPath();
    ctx.ellipse(0, 4, w * 0.3, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    const earH = this.avatar.character === 'bunny' ? 16 : 10;
    ctx.fillStyle = this.avatar.color || charColors.body;
    ctx.beginPath();
    ctx.ellipse(-w * 0.25, -h / 2, 5, earH, -0.2, 0, Math.PI * 2);
    ctx.ellipse(w * 0.25, -h / 2, 5, earH, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = charColors.ear;
    ctx.beginPath();
    ctx.ellipse(-w * 0.25, -h / 2, 3, earH - 3, -0.2, 0, Math.PI * 2);
    ctx.ellipse(w * 0.25, -h / 2, 3, earH - 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const eyeY = -4;
    const blinkFrame = this.frameCount % 200 < 5;
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(-5, eyeY, blinkFrame ? 1 : 5, 0, Math.PI * 2);
    ctx.arc(5, eyeY, blinkFrame ? 1 : 5, 0, Math.PI * 2);
    ctx.fill();
    if (!blinkFrame) {
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(-4, eyeY, 2.5, 0, Math.PI * 2);
      ctx.arc(6, eyeY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Eye shine
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(-3, eyeY - 1.5, 1, 0, Math.PI * 2);
      ctx.arc(7, eyeY - 1.5, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nose
    ctx.fillStyle = charColors.nose;
    ctx.beginPath();
    ctx.arc(0, 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (smile)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 4, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Tail
    if (this.avatar.character === 'fox') {
      ctx.fillStyle = this.avatar.color || charColors.body;
      ctx.beginPath();
      ctx.ellipse(-w / 2 - 8, h / 4, 10, 6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(-w / 2 - 12, h / 4 - 2, 5, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Leaf wings visual
    if (p.gliding) {
      ctx.fillStyle = 'rgba(118, 255, 3, 0.6)';
      ctx.beginPath();
      ctx.ellipse(-w / 2 - 10, 0, 15, 8, -0.3, 0, Math.PI * 2);
      ctx.ellipse(w / 2 + 10, 0, 15, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legs (animated)
    const legAnim = p.grounded ? Math.sin(this.state.gameTime * 0.3) * 4 : 0;
    ctx.fillStyle = this.avatar.color || charColors.body;
    ctx.beginPath();
    ctx.roundRect(-w * 0.3, h / 2 - 4, 8, 8 + legAnim, 3);
    ctx.roundRect(w * 0.1, h / 2 - 4, 8, 8 - legAnim, 3);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.type === 'sparkle' || p.type === 'collect') {
        ctx.fillStyle = p.color;
        this.drawStar(ctx, p.x, p.y, 4, p.size, p.size * 0.4, p.color);
      } else if (p.type === 'leaf') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 0.1);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'firefly') {
        const glow = 0.5 + Math.sin(p.life * 0.3) * 0.5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * glow, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'trail') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'landing') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1 - (1 - alpha), 1 + (1 - alpha) * 0.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 2, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'hazardWarning') {
        const pulse = 0.5 + Math.sin(p.life * 0.5) * 0.5;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * pulse;
        ctx.beginPath();
        ctx.moveTo(p.x - p.size, p.y);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.stroke();
      } else if (p.type === 'combo') {
        const comboScale = 1 + (1 - alpha) * 2;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(comboScale, comboScale);
        this.drawStar(ctx, 0, 0, 6, p.size, p.size * 0.3, p.color);
        ctx.restore();
      } else if (p.type === 'powerUpAura') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'damage') {
        ctx.fillStyle = p.color;
        const damageSize = p.size * (2 - alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, damageSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.stop();
    cancelAnimationFrame(this.animationId);
  }
}

// Mario-style level data
export const levels = [
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 200 },
      { x: 220, y: GROUND_Y - 40, width: 120 },
      { x: 370, y: GROUND_Y - 20, width: 180 },
      { x: 600, y: GROUND_Y - 60, width: 140 },
    ],
    enemies: [
      { x: 250, y: GROUND_Y - 40, type: 'slime' },
    ],
    coins: [
      { x: 230, y: GROUND_Y - 60 },
      { x: 400, y: GROUND_Y - 80 },
    ],
    powerUps: [
      { x: 400, y: GROUND_Y - 20, type: 'shield' },
    ],
  },
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 180 },
      { x: 200, y: GROUND_Y - 60, width: 140 },
      { x: 370, y: GROUND_Y - 100, width: 120 },
      { x: 520, y: GROUND_Y - 40, width: 160 },
      { x: 700, y: GROUND_Y - 80, width: 120 },
    ],
    enemies: [
      { x: 220, y: GROUND_Y - 60, type: 'slime' },
      { x: 400, y: GROUND_Y - 100, type: 'bird' },
    ],
    coins: [
      { x: 250, y: GROUND_Y - 80 },
      { x: 600, y: GROUND_Y - 60 },
    ],
    powerUps: [
      { x: 700, y: GROUND_Y - 80, type: 'leafWings' },
    ],
  },
  {
    platforms: [
      { x: 0, y: GROUND_Y, width: 160 },
      { x: 180, y: GROUND_Y - 120, width: 120 },
      { x: 320, y: GROUND_Y - 60, width: 140 },
      { x: 500, y: GROUND_Y - 140, width: 120 },
      { x: 650, y: GROUND_Y - 100, width: 160 },
      { x: 850, y: GROUND_Y - 80, width: 120 },
    ],
    enemies: [
      { x: 320, y: GROUND_Y - 60, type: 'slime' },
      { x: 500, y: GROUND_Y - 140, type: 'rollingLog' },
      { x: 700, y: GROUND_Y - 100, type: 'bird' },
    ],
    coins: [
      { x: 200, y: GROUND_Y - 120 },
      { x: 650, y: GROUND_Y - 100 },
      { x: 850, y: GROUND_Y - 80 },
    ],
    powerUps: [
      { x: 500, y: GROUND_Y - 140, type: 'star' },
    ],
  },
];

// Multiplayer sync logic (stubbed, implement as needed)
// export function syncMultiplayer(lobbyId: string) {
//   // Implement multiplayer sync logic here
// }

// export function updateMultiplayerState(lobbyId: string) {
//   // Implement multiplayer state update logic here
// }

// export function getPlayerPositions() {
//   // Implement player position retrieval here
// }
