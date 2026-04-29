import {
  Platform, Collectible, Obstacle, Hazard, Particle, BackgroundElement,
  PlayerState, GameState, Resources, BiomeType, PowerUpType, MovementMode,
  GRAVITY, JUMP_FORCE, DOUBLE_JUMP_FORCE, GLIDE_GRAVITY,
  BASE_SCROLL_SPEED, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT,
  CHECKPOINT_INTERVAL, POWERUP_DURATION, BIOME_COLORS, CHARACTER_COLORS,
  AvatarConfig, CraftRecipe, CRAFT_RECIPES, DailyChallenge,
  COYOTE_TIME, JUMP_BUFFER_TIME, CloudPlatform,
  MIN_JUMP_FORCE, MAX_JUMP_FORCE, JUMP_CHARGE_RATE,
  MushroomPlatform, CloudPlatformExtended, DifficultyLevel, DIFFICULTY_CONFIGS,
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
    updateLevelProgression(dt: number): void {
      // Track total distance for progression
      this.state.totalDistance += this.player.vx * dt;
      if (this.state.totalDistance > this.state.maxDistance) {
        this.state.maxDistance = this.state.totalDistance;
      }

      // Level progression based on distance milestones
      const previousLevel = this.state.currentLevel;
      if (this.state.totalDistance >= 5000 && previousLevel === 1) {
        this.state.currentLevel = 2;
        // Auto-pause game for level-up notification
        if (this.state.isPlaying && !this.state.isPaused) {
          this.pause();
        }
        this.onLevelUp?.(2);
        // Level 1→2: Green upward burst + "LEVEL UP!"
        this.spawnLevelUpEffect(2, '#00FF00', 'upward');
        this.cameraShake = 5;
      } else if (this.state.totalDistance >= 13000 && previousLevel === 2) {
        this.state.currentLevel = 3;
        // Auto-pause game for level-up notification
        if (this.state.isPlaying && !this.state.isPaused) {
          this.pause();
        }
        this.onLevelUp?.(3);
        // Level 2→3: Blue swirls + horizontal sweep + "ADVANCED!"
        this.spawnLevelUpEffect(3, '#00BFFF', 'horizontal');
        this.cameraShake = 6;
      } else if (this.state.totalDistance >= 36000 && previousLevel === 3) {
        this.state.currentLevel = 4;
        // Auto-pause game for level-up notification
        if (this.state.isPlaying && !this.state.isPaused) {
          this.pause();
        }
        this.onLevelUp?.(4);
        // Level 3→4: Purple explosion + screen flash + "MASTER!"
        this.spawnLevelUpEffect(4, '#FF00FF', 'explosion');
        this.cameraShake = 7;
      }
      
      // Dynamic difficulty scaling based on level
      const levelDifficulty = Math.min(1.5, 0.5 + (this.state.currentLevel - 1) * 0.25);
      // Apply level-based scaling to terrain generation
      // This will be used in generateTerrain() method
    }

    spawnLevelUpEffect(level: number, color: string, pattern: 'upward' | 'horizontal' | 'explosion' | 'rainbow') {
      const x = this.player.x;
      const y = this.player.y;
      
      switch (pattern) {
        case 'upward':
          // Level 1→2: Green upward burst
          for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40;
            const speed = 3 + Math.random() * 4;
            this.particles.push({
              x, y,
              vx: Math.cos(angle) * speed,
              vy: -Math.abs(Math.sin(angle)) * speed - 2,
              life: 40 + Math.random() * 20,
              maxLife: 60,
              color,
              size: 2 + Math.random() * 4,
              type: 'sparkle',
            });
          }
          break;
          
        case 'horizontal':
          // Level 2→3: Blue horizontal sweep
          for (let i = 0; i < 50; i++) {
            const offset = (i - 25) * 8;
            this.particles.push({
              x: x + offset,
              y: y + Math.sin(offset * 0.1) * 30,
              vx: Math.sign(offset) * 2,
              vy: Math.cos(offset * 0.05) * 2,
              life: 50 + Math.random() * 30,
              maxLife: 80,
              color,
              size: 3 + Math.random() * 3,
              type: 'sparkle',
            });
          }
          break;
          
        case 'explosion':
          // Level 3→4: Purple explosion + screen flash
          for (let i = 0; i < 60; i++) {
            const angle = (Math.PI * 2 * i) / 60;
            const speed = 5 + Math.random() * 6;
            this.particles.push({
              x, y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 30 + Math.random() * 40,
              maxLife: 70,
              color,
              size: 4 + Math.random() * 4,
              type: 'sparkle',
            });
          }
          // Add screen flash effect
          this.cameraShake = 10;
          break;
          
        case 'rainbow':
          // Level 4+: Rainbow cascade
          const rainbowColors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
          for (let i = 0; i < 80; i++) {
            const colorIndex = i % rainbowColors.length;
            const angle = (Math.PI * 2 * i) / 80;
            const speed = 2 + Math.random() * 8;
            this.particles.push({
              x, y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 3,
              life: 60 + Math.random() * 60,
              maxLife: 120,
              color: rainbowColors[colorIndex],
              size: 3 + Math.random() * 5,
              type: 'sparkle',
            });
          }
          this.cameraShake = 12;
          break;
      }
    }
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
  showEducationOverlay: ((item: string, position: { x: number; y: number }) => void) | null = null;
  hideEducationOverlay: (() => void) | null = null;

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
  floatingPlatformChance: number = 0.55;
  hazards: Hazard[] = [];
  jumpHeld: boolean = false;
  jumpHoldTime: number = 0;
  
  // Add new properties for jump charging and trajectory
  jumpCharge: number = 0;
  isChargingJump: boolean = false;
  showJumpTrajectory: boolean = true;
  trajectoryPoints: { x: number; y: number }[] = [];
  
  // Vertical gameplay properties
  mushroomBounceMultiplier: number = 1.5;
  isOnMushroomChain: boolean = false;
  mushroomChainCount: number = 0;
  cloudChainActive: boolean = false;
  cloudChainTimer: number = 0;

  // Difficulty system properties
  difficulty: DifficultyLevel = 'normal';
  difficultyConfig = DIFFICULTY_CONFIGS['normal'];
  currentAirTier: number = 0; // 0=ground, 1=low clouds, 2=high clouds
  verticalSequenceActive: boolean = false;
  nextCloudSequenceX: number = 1800; // X position for next mushroom→cloud sequence

  constructor(canvas: HTMLCanvasElement, difficulty: DifficultyLevel = 'normal') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = CANVAS_WIDTH;
    this.height = CANVAS_HEIGHT;
    this.scale = 1;
    this.seed = Math.random() * 10000;
    this.difficulty = difficulty;
    this.difficultyConfig = DIFFICULTY_CONFIGS[difficulty];

    this.player = this.createPlayer();
    this.state = this.createGameState();
    this.avatar = { character: 'fox', color: '#FF8C42', hat: null, accessory: null, pet: null, trail: null };

    // Apply difficulty-specific UI scaling
    if (this.difficultyConfig.uiScale !== 1.0) {
      this.scale = this.difficultyConfig.uiScale;
    }

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
      jumpBufferTime: 0, coyoteTime: 0, lastGroundedTime: performance.now() / 1000,
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
      difficulty: this.difficulty,
      levelNotificationTriggered: false,
      levelCompleted: false,
      levelCompletionDistance: 0,
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
      const type = 'tree';
      const color = biome.trees[Math.floor(this.random() * biome.trees.length)];
      
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
    
    // Start charging jump if grounded
    if (this.player.grounded) {
      this.isChargingJump = true;
    }
    
    // Jump buffering - allow jump input slightly before landing
    if (this.player.jumpBufferTime <= 0) {
      this.player.jumpBufferTime = JUMP_BUFFER_TIME;
      this.jump();
    }
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
  const viewportWidth = Math.max(CANVAS_WIDTH, this.width);
  
  // Generate initial ground platforms - continuous, no gaps, wider for safe start
  let currentX = 400;
  while (currentX < viewportWidth * 2) {
    const platformWidth = 280 + this.random() * 120;
    this.platforms.push({
      x: currentX,
      y: GROUND_Y,
      width: platformWidth,
      height: 72,
      type: 'ground',
      color: biome.ground,
    });
    currentX += platformWidth;
  }
  
  this.nextPlatformX = currentX;
  
  // More collectibles at start for rewarding early gameplay
  for (let i = 0; i < 16; i++) {
    this.addCollectible(300 + i * 110 + this.random() * 50, biome);
  }
}

  addFloatingPlatform(x: number, biome: Record<string, any>) {
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
      bouncy: type === 'mushroom',
    });
    this.nextPlatformX = x + w + 30 + this.random() * 30;
  }

  addCollectible(x: number, biome: Record<string, any>) {
    // Apply difficulty-based power-up frequency
    const powerUpChance = 0.15 * this.difficultyConfig.powerUpFrequency;
    const rand = this.random();
    let type;
    
    if (rand < powerUpChance) {
      // Power-ups scaled by difficulty
      const powerTypes = ['mushroom_powerup', 'star', 'fireFlower', 'leafWings', 'speedBoots', 'shield'];
      type = powerTypes[Math.floor(this.random() * powerTypes.length)];
    } else if (rand < 0.4) {
      // 25% chance for leaf tokens
      type = 'leafToken';
    } else {
      // Remaining chance for regular resources
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
    const levelMultiplier = Math.min(1, this.currentLevel);
    const allowedTypes: Obstacle['type'][] = ['slime'];
    
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
      let y, width, height, speed, patrolPattern: Obstacle['patrolPattern'], alertState: Obstacle['alertState'] = 'idle';
    
    switch (type) {
      case 'bird':
        y = GROUND_Y - 120 - this.random() * 100;
        width = 36; height = 32;
        speed = (2 + this.random() * 2 * levelMultiplier) * this.difficultyConfig.enemySpeedMultiplier;
        patrolPattern = 'horizontal';
        break;
      case 'spider':
        y = GROUND_Y - 80 - this.random() * 40;
        width = 32; height = 28;
        speed = (1.5 + this.random() * 1.5) * this.difficultyConfig.enemySpeedMultiplier;
        patrolPattern = 'vertical';
        break;
      case 'bat':
        y = GROUND_Y - 150 - this.random() * 80;
        width = 30; height = 26;
        speed = (3 + this.random() * 2) * this.difficultyConfig.enemySpeedMultiplier;
        patrolPattern = 'circular';
        break;
      case 'rollingLog':
        y = GROUND_Y - 30;
        width = 50; height = 36;
        speed = (2.5 + this.random() * 1.5) * this.difficultyConfig.enemySpeedMultiplier;
        patrolPattern = 'stationary';
        break;
      case 'rockGolem':
        y = GROUND_Y - 40;
        width = 48; height = 48;
        speed = (0.8 + this.random() * 0.7) * this.difficultyConfig.enemySpeedMultiplier;
        patrolPattern = 'horizontal';
        alertState = this.random() > 0.7 ? 'aggressive' : 'idle';
        break;
      case 'fireSprite':
        y = GROUND_Y - 100 - this.random() * 60;
        width = 28; height = 28;
        speed = (4 + this.random() * 2) * this.difficultyConfig.enemySpeedMultiplier;
        patrolPattern = 'circular';
        alertState = 'aggressive';
        break;
      default: // slime
        y = GROUND_Y - 30;
        width = 36; height = 32;
        speed = (1 + this.random() * 0.5) * this.difficultyConfig.enemySpeedMultiplier;
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
  if (!this.player.grounded && this.player.coyoteTime >= COYOTE_TIME && this.player.doubleJumped) return;  
  Audio.resumeAudio();

  const levelMultiplier = 1 + (this.state.currentLevel - 1) * 0.1;  
  // Variable jump based on how long button was held
  let jumpPower = MIN_JUMP_FORCE + (this.jumpCharge * (MAX_JUMP_FORCE - MIN_JUMP_FORCE));
    let jumpPower = MIN_JUMP_FORCE + (this.jumpCharge * (MAX_JUMP_FORCE - MIN_JUMP_FORCE));
  jumpPower = Math.min(MAX_JUMP_FORCE, Math.max(MIN_JUMP_FORCE, jumpPower));
  jumpPower *= levelMultiplier;
  
  const timeSinceGrounded = performance.now() / 1000 - this.player.lastGroundedTime;
  const canCoyoteJump = !this.player.grounded && timeSinceGrounded < COYOTE_TIME;

  if (this.player.grounded || canCoyoteJump) {
    this.player.vy = -jumpPower * (this.player.bigMode ? 1.3 : 1);
    this.player.grounded = false;
    this.player.jumping = true;
    this.player.squash = 0.6;
    this.player.stretch = 1.4;
    this.player.lastGroundedTime = performance.now() / 1000;
    Audio.playJump();
    this.spawnParticles(this.player.x, this.player.y + this.player.height, 8, '#8B7355', 'dust');
    this.jumpCount++;
    this.challengeUpdater?.('jump', 1);
    this.isChargingJump = false;
    this.jumpCharge = 0;
  } else if (!this.player.doubleJumped && !this.player.grounded) {
    // Double jump with variable power too
    const doubleJumpPower = MIN_JUMP_FORCE + (this.jumpCharge * (MAX_JUMP_FORCE - MIN_JUMP_FORCE) * 0.8);
    this.player.vy = -doubleJumpPower * (this.player.bigMode ? 1.2 : 1);
    this.player.doubleJumped = true;
    this.player.squash = 0.7;
    this.player.stretch = 1.3;
    Audio.playDoubleJump();
    this.spawnParticles(this.player.x, this.player.y + this.player.height, 12, '#FFD700', 'sparkle');
    this.jumpCount++;
    this.challengeUpdater?.('jump', 1);
    this.isChargingJump = false;
    this.jumpCharge = 0;
  } else if (this.player.hasLeafWings && !this.player.gliding) {
    this.player.gliding = true;
  }
}

  private pickRandomBiome(): BiomeType {
    // Level 1 always starts in the enchanted forest for a welcoming experience
    if (this.state.currentLevel <= 1) return 'enchanted';
    const unlocked = this.state.unlockedBiomes;
    if (!unlocked || unlocked.length === 0) return 'enchanted';
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
    this.isChargingJump = false;
    this.jumpCharge = 0;
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
    const craftedItem: Platform = {
      x: px, y: py, width: w, height: h,
      type: recipe.type as Platform['type'], 
      color: recipe.type === 'bridge' ? '#8D6E63' : recipe.type === 'platform' ? '#FF69B4' : recipe.type === 'ramp' ? '#FFD700' : '#90A4AE',
      bouncy: recipe.type === 'platform',
    };

    // Add movement to bridges
    if (recipe.type === 'bridge') {
      craftedItem.moving = true;
      craftedItem.moveRange = 30 + Math.random() * 20; // 30-50 units movement range
      craftedItem.moveSpeed = 0.5 + Math.random() * 0.5; // 0.5-1.0 speed
      craftedItem.originalY = py;
    }

    this.craftedItems.push(craftedItem);
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

    // Tutorial/safe zone logic
    const tutorialEnabled = this.difficultyConfig.tutorialEnabled;
    const safeZoneDistance = this.difficultyConfig.safeZoneDistance || 0;
    this.state.showTutorial = tutorialEnabled && this.state.distance < safeZoneDistance;
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
    this.updateCraftedItems(dt);
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

  // Add new method for cloud platform generation
  addCloudPlatform(x: number, y: number, width: number) {
    const cloudPlatform: CloudPlatform = {
      x, y, width, height: 24,
      type: 'cloud',
      color: 'rgba(255,255,255,0.9)',
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.5 + Math.random() * 0.5,
      dissolveTimer: 0,
      isDissolving: false,
    };
    
    this.platforms.push(cloudPlatform);
  }

  // Add enhanced mushroom platform method
  addMushroomPlatform(x: number, y: number, isPartOfChain: boolean = false, chainId: string = '') {
    const mushroomPlatform: MushroomPlatform = {
      x, y, width: 70 + this.random() * 30, height: 20,
      type: 'mushroom',
      color: '#FF6B6B',
      bouncy: true,
      bounceForce: JUMP_FORCE * 1.6,
      bounceCount: 0,
      hasBeenUsed: false,
      respawnTimer: 0,
      isPartOfChain,
      chainId: chainId || `mushroom_${Date.now()}_${Math.random()}`
    };
    
    this.platforms.push(mushroomPlatform);
  }

  // Add cloud platform with tier system
  addCloudPlatformTiered(x: number, y: number, width: number, tier: number, isPartOfChain: boolean = false, chainId: string = '') {
    const cloudPlatform: CloudPlatformExtended = {
      x, y, width, height: 24,
      type: 'cloud',
      color: `rgba(255,255,255,${0.7 + tier * 0.15})`,
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.5 + Math.random() * 0.5,
      dissolveTimer: 0,
      isDissolving: false,
      tier: tier,
      isPartOfChain: isPartOfChain,
      chainId: chainId || `cloud_${Date.now()}_${Math.random()}`
    };
    
    this.platforms.push(cloudPlatform);
  }

  // Add method to update jump trajectory visualization
  updateJumpTrajectory() {
    this.trajectoryPoints = [];
    
    const jumpPower = MIN_JUMP_FORCE + (this.jumpCharge * (MAX_JUMP_FORCE - MIN_JUMP_FORCE));
    const startX = this.player.x + this.player.width / 2;
    const startY = this.player.y;
    const vx = this.player.vx || 2.2; // Default walk speed
    const vy = -jumpPower;
    
    // Calculate trajectory points
    for (let t = 0; t <= 1; t += 0.05) {
      const x = startX + vx * t * 10;
      const y = startY + vy * t * 10 + 0.5 * GRAVITY * (t * 10) * (t * 10);
      if (y < this.height) {
        this.trajectoryPoints.push({ x, y });
      }
    }
  }

  // Add jump charge visualization in renderPlayer or add new render method
  renderJumpCharge(ctx: CanvasRenderingContext2D) {
    if (this.isChargingJump && this.player.grounded && this.jumpCharge > 0) {
      const chargePercent = this.jumpCharge;
      const x = this.player.x + this.player.width / 2;
      const y = this.player.y - 30;
      
      // Draw charge ring
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x, y, 20 + chargePercent * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 50, ${0.3 + chargePercent * 0.5})`;
      ctx.lineWidth = 3 + chargePercent * 3;
      ctx.stroke();
      
      // Draw charge fill
      ctx.beginPath();
      ctx.arc(x, y, 10 + chargePercent * 5, 0, Math.PI * 2 * chargePercent);
      ctx.strokeStyle = `rgba(255, 150, 0, ${0.5 + chargePercent * 0.5})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Draw trajectory preview
      if (this.trajectoryPoints.length > 0 && chargePercent > 0.2) {
        ctx.beginPath();
        ctx.moveTo(this.trajectoryPoints[0].x - this.cameraX + this.width / 2, 
                    this.trajectoryPoints[0].y - this.cameraY + this.height / 2);
                    
        for (let i = 1; i < this.trajectoryPoints.length; i++) {
          const screenX = this.trajectoryPoints[i].x - this.cameraX + this.width / 2;
          const screenY = this.trajectoryPoints[i].y - this.cameraY + this.height / 2;
          ctx.lineTo(screenX, screenY);
        }
        
        ctx.strokeStyle = `rgba(255, 200, 100, ${0.3 + chargePercent * 0.4})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw landing indicator
        const lastPoint = this.trajectoryPoints[this.trajectoryPoints.length - 1];
        if (lastPoint) {
          const screenX = lastPoint.x - this.cameraX + this.width / 2;
          const screenY = lastPoint.y - this.cameraY + this.height / 2;
          ctx.beginPath();
          ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 100, 50, ${0.5})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 200, 100, 0.8)`;
          ctx.fill();
        }
      }
      
      ctx.restore();
    }
  }

  // Create a complete vertical gameplay sequence: mushroom launch pad → cloud staircase
  createVerticalSequence(startX: number) {
    const chainId = `seq_${Date.now()}_${Math.random()}`;

    // Launch mushroom — wide so it's easy to land on, extra bouncy
    const mushroomX = startX + 60;
    const mushroomY = GROUND_Y - 20;
    this.addMushroomPlatform(mushroomX, mushroomY, true, chainId);
    const launchMushroom = this.platforms[this.platforms.length - 1];
    launchMushroom.width = 110; // Extra wide for easy targeting

    // Cloud zone: staircase going UP then back DOWN
    // Physics: bounce vy≈-18.2, vx≈2-4, peak ~414 units above mushroom top (y≈30)
    // Each cloud is extra wide so players catch it regardless of speed
    const cloudConfigs: { dx: number; dy: number; w: number; tier: number }[] = [
      { dx: 100, dy: -110, w: 230, tier: 1 }, // Low landing zone — very wide to catch all speeds
      { dx: 310, dy: -180, w: 170, tier: 1 }, // Mid height
      { dx: 470, dy: -255, w: 180, tier: 2 }, // Highest cloud (special reward here)
      { dx: 630, dy: -205, w: 165, tier: 2 }, // Descending
      { dx: 780, dy: -145, w: 160, tier: 1 }, // Final low cloud before return
    ];

    for (const cfg of cloudConfigs) {
      const cx = mushroomX + cfg.dx;
      const cy = GROUND_Y + cfg.dy;
      this.addCloudPlatformTiered(cx, cy, cfg.w, cfg.tier, true, chainId);
      // Leaf token centered above each cloud
      this.collectibles.push({
        x: cx + cfg.w / 2 - 12,
        y: cy - 38,
        width: 24, height: 24,
        type: 'leafToken',
        collected: false,
        bobOffset: this.random() * Math.PI * 2,
        sparkle: 0,
      });
    }

    // Special power-up on the highest cloud (index 2)
    const highCfg = cloudConfigs[2];
    const specialTypes: Collectible['type'][] = ['star', 'leafWings', 'speedBoots', 'shield'];
    this.collectibles.push({
      x: mushroomX + highCfg.dx + highCfg.w * 0.72,
      y: GROUND_Y + highCfg.dy - 38,
      width: 24, height: 24,
      type: specialTypes[Math.floor(this.random() * specialTypes.length)],
      collected: false,
      bobOffset: this.random() * Math.PI * 2,
      sparkle: 0,
    });

    // Exit mushroom on the far side — same design as launch mushroom
    const exitMushroomX = mushroomX + 920;
    this.addMushroomPlatform(exitMushroomX, GROUND_Y - 20, true, chainId);
    const exitMushroom = this.platforms[this.platforms.length - 1];
    exitMushroom.width = 110;

    return chainId;
  }
  spawnBounceRing(x: number, y: number, intensity: number) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 2 * intensity,
        vy: Math.sin(angle) * 2 * intensity - 2,
        life: 20,
        maxLife: 20,
        color: `hsl(${30 + intensity * 30}, 100%, 60%)`,
        size: 3 + intensity * 3,
        type: 'sparkle',
      });
    }
  }

  // Add helper methods for mushroom colors
  lightenColor(color: string, amount: number): string {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
  }

  darkenColor(color: string, amount: number): string {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
  }

  // Update vertical sequence handling in update method
  updateVerticalProgression(dt: number) {
    // Update cloud chain timer
    if (this.cloudChainActive) {
      this.cloudChainTimer -= dt * 60;
      if (this.cloudChainTimer <= 0) {
        this.cloudChainActive = false;
        this.currentAirTier = 0;
        this.spawnParticles(this.player.x, this.player.y, 15, '#FFD700', 'sparkle');
      }
    }
    
    // Reset mushroom chain when touching ground
    const isOnGround = this.player.grounded && 
      this.platforms.some(p => p.type === 'ground' && 
        Math.abs(this.player.y - (this.player.y + this.player.height)) < 10);
    
    if (isOnGround && this.isOnMushroomChain) {
      this.isOnMushroomChain = false;
      this.mushroomChainCount = 0;
    
      // Bonus points for completing chain
      if (this.mushroomChainCount > 2) {
        const chainBonus = this.mushroomChainCount * 100;
        this.state.score += chainBonus;
        this.spawnParticles(this.player.x, this.player.y, 25, '#FFD700', 'combo');
      }
    }
    
    // Respawn used mushrooms after cooldown
    for (const plat of this.platforms) {
      if (plat.type === 'mushroom') {
        const mushroom = plat as MushroomPlatform;
        if (mushroom.hasBeenUsed) {
          mushroom.respawnTimer += dt * 60;
          if (mushroom.respawnTimer >= 120) { // 2 seconds respawn
            mushroom.hasBeenUsed = false;
            mushroom.respawnTimer = 0;
            mushroom.bounceForce = JUMP_FORCE * 1.6;
            this.spawnParticles(plat.x + plat.width / 2, plat.y, 8, '#FFD700', 'sparkle');
          }
        }
      }
    }
  }

  updatePlayer(dt: number) {
    const p = this.player;

    // Update jump charging
    if (this.isChargingJump && p.grounded) {
      this.jumpCharge = Math.min(1, this.jumpCharge + JUMP_CHARGE_RATE * dt);
    }

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

    // Update jump buffer and coyote time
    if (p.jumpBufferTime > 0) {
      p.jumpBufferTime -= dt;
    }
    if (!p.grounded) {
      p.coyoteTime += dt;
    } else {
      p.coyoteTime = 0;
      p.lastGroundedTime = performance.now() / 1000;
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
          
          // Cloud platform effect - slowly dissolves after standing on it
          if (plat.type === 'cloud' && typeof (plat as { isDissolving?: boolean }).isDissolving === 'undefined') {
            (plat as { isDissolving?: boolean }).isDissolving = true;
            (plat as { dissolveTimer?: number }).dissolveTimer = 300;
            this.spawnParticles(p.x + p.width / 2, p.y + p.height, 10, '#AADDFF', 'sparkle');
          }
          
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

    // Update cloud platform dissolving
    for (const plat of this.platforms) {
      if (plat.type === 'cloud' && (plat as { dissolveTimer?: number }).dissolveTimer && (plat as { dissolveTimer?: number }).dissolveTimer! > 0) {
        (plat as { dissolveTimer?: number }).dissolveTimer! -= dt;
        if ((plat as { dissolveTimer?: number }).dissolveTimer! <= 0) {
          // Remove dissolved cloud
          const index = this.platforms.indexOf(plat);
          if (index > -1) this.platforms.splice(index, 1);
        }
      }
    }

    // Update jump trajectory preview
    if (this.showJumpTrajectory && p.grounded && this.isChargingJump) {
      this.updateJumpTrajectory();
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
    // Filter platforms that are too far behind the player (more generous buffer)
    const cleanupDistance = this.player.x - CANVAS_WIDTH * 2; // Increased buffer
    this.platforms = this.platforms.filter(p => p.x + p.width > cleanupDistance);
  }

  updateCraftedItems(dt: number) {
    // Update movement for crafted items (bridges)
    for (const item of this.craftedItems) {
      if (item.moving && item.originalY !== undefined) {
        // Vertical movement with sinusoidal pattern
        item.y = item.originalY + Math.sin(this.state.gameTime * (item.moveSpeed || 1) * 0.05) * (item.moveRange || 40);
        
        // Add slight horizontal movement for bridges
        if (item.type === 'bridge') {
          item.x += Math.sin(this.state.gameTime * (item.moveSpeed || 1) * 0.03) * 0.5;
        }
      }
    }
    // Filter crafted items that are too far behind the player (more generous buffer)
    const cleanupDistance = this.player.x - CANVAS_WIDTH * 2; // Increased buffer
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

    // Show educational overlay if enabled
    this.showEducationOverlay?.(c.type, { x: this.player.x, y: this.player.y });

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
    
    // Show educational overlay for power-up activation
    this.showEducationOverlay?.(type, { x: this.player.x, y: this.player.y });
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
    const levelDifficulty = Math.min(1, this.state.distance / 12000);
    
    while (this.nextPlatformX < ahead) {
      // Level-based gap limits
      let maxGap = 55; // Default max gap
      let floatingPlatformChance = this.difficultyConfig.floatingPlatformChance;
      
      if (this.state.currentLevel === 1) {
        // Level 1: Very forgiving for beginners
        maxGap = 22;
        floatingPlatformChance = Math.max(0.7, floatingPlatformChance);
      } else if (this.state.currentLevel === 2) {
        // Level 2: Moderate difficulty
        maxGap = 45;
        floatingPlatformChance = Math.max(0.5, floatingPlatformChance);
      } else if (this.state.currentLevel >= 3) {
        // Level 3+: Full difficulty
        maxGap = 55;
      }

      // Apply difficulty scaling to gaps
      maxGap *= this.difficultyConfig.platformGapMultiplier;
      
      // Fair gap system: balanced for jump physics
      const gapRoll = this.random();
      let safeGap: number;
      let platformWidth: number;
      
      if (this.state.currentLevel === 1) {
        // Level 1: Extra forgiving gaps and wider platforms
        if (gapRoll < 0.80) {
          safeGap = 3 + this.random() * 10; // 3-13 units (trivial)
          platformWidth = 240 + this.random() * 120; // Very wide
        } else {
          safeGap = 10 + this.random() * 12; // 10-22 units (easy jump)
          platformWidth = 200 + this.random() * 100;
        }
      } else if (gapRoll < 0.70) {
        // 70% small gaps - easily walkable/jumpable
        safeGap = 5 + this.random() * 15; // 5-20 units (much safer)
        platformWidth = 200 + this.random() * 100; // Much wider platforms
      } else if (gapRoll < 0.95) {
        // 25% medium gaps - require proper jump timing
        safeGap = 15 + this.random() * 15; // 15-30 units (manageable)
        platformWidth = 180 + this.random() * 80;
      } else {
        // 5% large gaps - challenging but possible with run+jump
        safeGap = 25 + this.random() * 10; // 25-35 units (much smaller max)
        platformWidth = 160 + this.random() * 60; // Still wide for safety
      }
      
      // Apply level-based cap and difficulty scaling
      safeGap = Math.min(safeGap * this.difficultyConfig.platformGapMultiplier, maxGap);

      // Guaranteed floating platforms for safety
      if (safeGap > 20) {
        // Always add floating platform for gaps > 20 units
        this.addFloatingPlatform(
          this.nextPlatformX + safeGap * 0.5,
          BIOME_COLORS[this.state.biome]
        );
      } else if (this.random() < floatingPlatformChance) {
        // Optional floating platforms for smaller gaps
        this.addFloatingPlatform(
          this.nextPlatformX + safeGap * 0.5,
          BIOME_COLORS[this.state.biome]
        );
      }
      
      // Add extra safety platform for largest gaps
      if (safeGap > 30) {
        this.addFloatingPlatform(
          this.nextPlatformX + safeGap * 0.25,
          BIOME_COLORS[this.state.biome]
        );
      }
      
      // Remove hazards from gaps (too punishing with new system)
      // Focus on fair platform-based challenges

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
      if (this.random() < floatingPlatformChance) {
        this.addFloatingPlatform(
          this.nextPlatformX + safeGap + 30 + this.random() * (platformWidth - 60),
          BIOME_COLORS[this.state.biome]
        );
      }

      // No extra spacing - gap is the actual gap between platforms
      this.nextPlatformX += safeGap + platformWidth;
    }

    // Cloud sequences: mushroom launch pad → cloud staircase (spaced every ~1800-2600 units)
    while (this.nextCloudSequenceX < ahead) {
      this.createVerticalSequence(this.nextCloudSequenceX);
      this.nextCloudSequenceX += 1800 + this.random() * 800;
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
      // Level 1: delay enemies until player has had time to learn controls
      const level1EnemyDelay = this.state.currentLevel === 1 ? 600 : 0;
      const shouldSpawnEnemy = this.state.distance >= (this.difficultyConfig.enemyStartDistance + level1EnemyDelay);
      if (shouldSpawnEnemy) {
        this.addObstacle(this.nextObstacleX);
      }
      // Level 1: much wider spacing between enemies
      const baseSpacing = this.state.currentLevel === 1 ? 1200 + this.random() * 800 : 800 + this.random() * 600;
      const adjustedSpacing = baseSpacing / this.difficultyConfig.enemyFrequency;
      this.nextObstacleX += adjustedSpacing;
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
    this.renderJumpCharge(ctx);
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
    let colors = BIOME_COLORS[this.state.biome].sky;
      let colors = BIOME_COLORS[this.state.biome].sky;
    
    if (this.state.isTransitioning && this.state.transitioningBiome) {
      const targetColors = BIOME_COLORS[this.state.transitioningBiome].sky;
      const progress = this.state.transitionProgress;
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

    // Sun with glow for enchanted/autumn biomes
    if (this.state.biome === 'enchanted' || this.state.biome === 'autumn') {
      const sunX = w * 0.82;
      const sunY = h * 0.13;
      const pulse = 1 + Math.sin(this.state.gameTime * 0.02) * 0.06;

      // Outer glow
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 90 * pulse);
      sunGlow.addColorStop(0, 'rgba(255,245,157,0.55)');
      sunGlow.addColorStop(0.5, 'rgba(255,236,130,0.18)');
      sunGlow.addColorStop(1, 'rgba(255,236,130,0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(sunX - 100, sunY - 100, 200, 200);

      // Sun rays
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(this.state.gameTime * 0.015) * 0.05;
      ctx.strokeStyle = '#FFF59D';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + this.state.gameTime * 0.003;
        const innerR = 28 * pulse;
        const outerR = 55 + Math.sin(angle * 3 + this.state.gameTime * 0.02) * 12;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * innerR, sunY + Math.sin(angle) * innerR);
        ctx.lineTo(sunX + Math.cos(angle) * outerR, sunY + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      ctx.restore();

      // Sun core
      const sunCore = ctx.createRadialGradient(sunX - 4, sunY - 4, 2, sunX, sunY, 22 * pulse);
      sunCore.addColorStop(0, 'rgba(255,255,240,0.98)');
      sunCore.addColorStop(0.6, 'rgba(255,238,88,0.92)');
      sunCore.addColorStop(1, 'rgba(255,202,40,0.7)');
      ctx.fillStyle = sunCore;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 22 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floating sparkles for enchanted/firefly biomes
    if (this.state.biome === 'enchanted' || this.state.biome === 'firefly') {
      ctx.save();
      for (let i = 0; i < 18; i++) {
        const sx = ((i * 137.5 + this.state.gameTime * 0.15) % (w + 40)) - 20;
        const sy = 30 + ((i * 73.1) % (h * 0.55));
        const sparkAlpha = 0.25 + Math.sin(this.state.gameTime * 0.04 + i * 1.7) * 0.25;
        const sparkSize = 1.2 + Math.sin(this.state.gameTime * 0.06 + i * 2.3) * 0.8;
        ctx.globalAlpha = sparkAlpha;
        ctx.fillStyle = i % 3 === 0 ? '#FFF9C4' : i % 3 === 1 ? '#B2FF59' : '#80DEEA';
        ctx.beginPath();
        ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
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
          const viewRange = w + 1200; // Increased from w + 800
          const startPos = Math.floor(x / viewRange) * viewRange - viewRange/2;
          for (let pos = startPos; pos < startPos + viewRange; pos += 200) {
            if (pos >= x - 600 && pos <= x + 600) { // Increased buffer
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
          const viewRange = w + 900; // Increased from w + 600
          const startPos = Math.floor(x / viewRange) * viewRange - viewRange/2;
          for (let pos = startPos; pos < startPos + viewRange; pos += 180) {
            if (pos >= x - 450 && pos <= x + 450) { // Increased buffer
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
          const viewRange = w + 600; // Increased from w + 400
          const startPos = Math.floor(x / viewRange) * viewRange - viewRange/2;
          for (let pos = startPos; pos < startPos + viewRange; pos += 110) {
            if (pos >= x - 300 && pos <= x + 300) { // Increased buffer
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
          const viewRange = w + 400; // Increased from w + 200
          const startPos = Math.floor(x / viewRange) * viewRange - viewRange/2;
          for (let pos = startPos; pos < startPos + viewRange; pos += 70) {
            if (pos >= x - 200 && pos <= x + 200) { // Increased buffer
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
    const s = scale * 40;
    // Soft radial gradient: bright white center → pale blue-grey edge
    const grad = ctx.createRadialGradient(x, y - s * 0.2, s * 0.15, x + s * 0.5, y, s * 1.9);
    grad.addColorStop(0,   'rgba(255,255,255,0.95)');
    grad.addColorStop(0.45,'rgba(238,248,255,0.82)');
    grad.addColorStop(1,   'rgba(200,222,242,0.55)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x,              y,              s,        0, Math.PI * 2);
    ctx.arc(x + s * 0.88,   y - s * 0.38,  s * 0.72, 0, Math.PI * 2);
    ctx.arc(x + s * 1.55,   y,              s * 0.62, 0, Math.PI * 2);
    ctx.arc(x - s * 0.55,   y + s * 0.05,  s * 0.52, 0, Math.PI * 2);
    ctx.arc(x + s * 0.42,   y - s * 0.58,  s * 0.44, 0, Math.PI * 2);
    ctx.arc(x + s * 1.18,   y - s * 0.48,  s * 0.38, 0, Math.PI * 2);
    ctx.arc(x + s * 1.82,   y - s * 0.08,  s * 0.34, 0, Math.PI * 2);
    ctx.fill();
    // Top-left highlight for depth
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.arc(x - s * 0.08, y - s * 0.22, s * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMountain(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, color: string) {
    const h = scale * 150;
    // Mountain body with gradient
    const mtGrad = ctx.createLinearGradient(x, baseY + 100 - h, x, baseY + 100);
    mtGrad.addColorStop(0, color + 'A0');
    mtGrad.addColorStop(0.6, color + '70');
    mtGrad.addColorStop(1, color + '40');
    ctx.fillStyle = mtGrad;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.8, baseY + 100);
    ctx.lineTo(x, baseY + 100 - h);
    ctx.lineTo(x + h * 0.8, baseY + 100);
    ctx.fill();
    // Shaded side
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.moveTo(x, baseY + 100 - h);
    ctx.lineTo(x + h * 0.8, baseY + 100);
    ctx.lineTo(x, baseY + 100);
    ctx.fill();
    // Snow cap
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.15, baseY + 100 - h * 0.8);
    ctx.lineTo(x, baseY + 100 - h);
    ctx.lineTo(x + h * 0.15, baseY + 100 - h * 0.8);
    ctx.fill();
    // Snow edge detail
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.2, baseY + 100 - h * 0.75);
    ctx.lineTo(x - h * 0.05, baseY + 100 - h * 0.82);
    ctx.lineTo(x + h * 0.1, baseY + 100 - h * 0.78);
    ctx.lineTo(x + h * 0.2, baseY + 100 - h * 0.72);
    ctx.fill();
  }

  drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, color: string, variant: number) {
    const h = scale * 60;
    // Trunk with gradient
    const trunkGrad = ctx.createLinearGradient(x - 4 * scale, baseY - h * 0.3, x + 4 * scale, baseY + h * 0.1);
    trunkGrad.addColorStop(0, '#6D4C41');
    trunkGrad.addColorStop(1, '#4E342E');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(x - 4 * scale, baseY - h * 0.3, 8 * scale, h * 0.4);
    // Foliage
    if (variant % 2 === 0) {
      // Round tree with layered canopy
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, baseY - h * 0.5, h * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color + 'DD';
      ctx.beginPath();
      ctx.arc(x + h * 0.15, baseY - h * 0.62, h * 0.27, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - h * 0.12, baseY - h * 0.58, h * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // Light highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(x - h * 0.08, baseY - h * 0.62, h * 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Triangle tree with layered tiers
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, baseY - h);
      ctx.lineTo(x - h * 0.32, baseY - h * 0.2);
      ctx.lineTo(x + h * 0.32, baseY - h * 0.2);
      ctx.fill();
      ctx.fillStyle = color + 'CC';
      ctx.beginPath();
      ctx.moveTo(x, baseY - h * 0.88);
      ctx.lineTo(x - h * 0.27, baseY - h * 0.35);
      ctx.lineTo(x + h * 0.27, baseY - h * 0.35);
      ctx.fill();
      // Snow/light on tip
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.moveTo(x, baseY - h);
      ctx.lineTo(x - h * 0.08, baseY - h * 0.85);
      ctx.lineTo(x + h * 0.08, baseY - h * 0.85);
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
        // Rich layered ground: bright grass cap → forest green → soil → dark roots
        const displayHeight = Math.min(p.height, CANVAS_HEIGHT - p.y + 10);
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + displayHeight);
        grad.addColorStop(0,    '#72D44E');
        grad.addColorStop(0.06, '#4E8E2A');
        grad.addColorStop(0.25, p.color);
        grad.addColorStop(0.6,  '#5A3D1A');
        grad.addColorStop(1,    '#321E0A');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, displayHeight, [8, 8, 0, 0]);
        ctx.fill();

        // Bright top highlight strip
        ctx.fillStyle = 'rgba(140,230,80,0.45)';
        ctx.fillRect(p.x + 10, p.y + 1, p.width - 20, 3);

        // Soil / grass divider line
        ctx.strokeStyle = 'rgba(50,28,8,0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 9);
        ctx.lineTo(p.x + p.width, p.y + 9);
        ctx.stroke();

        // Varied grass tufts
        ctx.fillStyle = '#7ED44E';
        for (let gx = p.x + 4; gx < p.x + p.width - 4; gx += 10) {
          const h = 5 + Math.sin(gx * 0.65 + 1.2) * 3;
          ctx.beginPath();
          ctx.moveTo(gx, p.y);
          ctx.lineTo(gx + 2, p.y - h);
          ctx.lineTo(gx + 4, p.y - h * 0.55);
          ctx.lineTo(gx + 7, p.y - h * 0.85);
          ctx.lineTo(gx + 9, p.y);
          ctx.fill();
        }

        // Embedded pebbles in soil layer
        ctx.fillStyle = 'rgba(175,150,110,0.48)';
        for (let gx = p.x + 18; gx < p.x + p.width - 8; gx += 32 + ((Math.floor(gx) * 7) % 18)) {
          ctx.beginPath();
          ctx.ellipse(gx, p.y + 19, 4, 2.5, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Small decorative flowers on ground surface
        for (let gx = p.x + 25; gx < p.x + p.width - 25; gx += 65 + ((Math.floor(gx) * 13) % 30)) {
          const flowerColors = ['#FF69B4', '#FFD700', '#FF6347', '#DDA0DD', '#87CEEB'];
          const fc = flowerColors[Math.floor(Math.abs(Math.sin(gx * 0.3)) * flowerColors.length)];
          // Stem
          ctx.strokeStyle = '#4CAF50';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(gx, p.y);
          ctx.lineTo(gx, p.y - 8);
          ctx.stroke();
          // Petals
          ctx.fillStyle = fc;
          for (let pi = 0; pi < 4; pi++) {
            const pa = (pi / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(gx + Math.cos(pa) * 3, p.y - 8 + Math.sin(pa) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          // Center
          ctx.fillStyle = '#FFF176';
          ctx.beginPath();
          ctx.arc(gx, p.y - 8, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'mushroom') {
        const cx = p.x + p.width / 2;
        const capW = p.width / 2;
        const capH = 18;

        // Animated upward arrows (bounce indicator)
        const arrowBob = Math.abs(Math.sin(this.state.gameTime * 0.07)) * 7;
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(this.state.gameTime * 0.07) * 0.3;
        ctx.fillStyle = '#FFE840';
        ctx.strokeStyle = '#C88800';
        ctx.lineWidth = 1.5;
        for (let ai = 0; ai < 2; ai++) {
          const ay = p.y - 28 - ai * 14 - arrowBob;
          ctx.beginPath();
          ctx.moveTo(cx, ay - 9);
          ctx.lineTo(cx - 7, ay + 1);
          ctx.lineTo(cx - 2, ay + 1);
          ctx.lineTo(cx - 2, ay + 6);
          ctx.lineTo(cx + 2, ay + 6);
          ctx.lineTo(cx + 2, ay + 1);
          ctx.lineTo(cx + 7, ay + 1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();

        // Stem with gradient
        const stemGrad = ctx.createLinearGradient(cx - 8, p.y, cx + 8, p.y + 24);
        stemGrad.addColorStop(0, '#F8F2D0');
        stemGrad.addColorStop(0.5, '#E0D4A0');
        stemGrad.addColorStop(1, '#BCA860');
        ctx.fillStyle = stemGrad;
        ctx.beginPath();
        ctx.roundRect(cx - 8, p.y, 16, 24, [0, 0, 5, 5]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,90,30,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 8, p.y, 16, 24);

        // Gills under cap (thin radial lines)
        ctx.strokeStyle = 'rgba(160,40,40,0.30)';
        ctx.lineWidth = 1;
        for (let gi = -4; gi <= 4; gi++) {
          const t = gi / 4;
          const gx = cx + t * capW * 0.9;
          const capTopY = p.y - capH * Math.sqrt(Math.max(0, 1 - t * t));
          ctx.beginPath();
          ctx.moveTo(gx, p.y + 1);
          ctx.lineTo(gx, capTopY);
          ctx.stroke();
        }

        // Cap with radial gradient (bright highlight top-left, dark edge)
        const capGrad = ctx.createRadialGradient(cx - capW * 0.25, p.y - capH * 0.6, 3, cx, p.y, capW);
        capGrad.addColorStop(0, '#FF9090');
        capGrad.addColorStop(0.35, p.color);
        capGrad.addColorStop(1, '#8B0A0A');
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.ellipse(cx, p.y, capW, capH, 0, Math.PI, 0);
        ctx.fill();
        // Cap outline
        ctx.strokeStyle = 'rgba(100,0,0,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, p.y, capW, capH, 0, Math.PI, 0);
        ctx.stroke();

        // White spots — shadow then bright
        const spots = [
          { ox: -capW * 0.28, oy: -capH * 0.58, r: 5.5 },
          { ox: capW * 0.32, oy: -capH * 0.48, r: 4.5 },
          { ox: 0,            oy: -capH * 0.82, r: 4.5 },
          { ox: -capW * 0.52, oy: -capH * 0.28, r: 3.5 },
          { ox: capW * 0.55,  oy: -capH * 0.22, r: 3.5 },
        ];
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (const s of spots) {
          ctx.beginPath();
          ctx.arc(cx + s.ox + 1, p.y + s.oy + 1, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#FFFFFF';
        for (const s of spots) {
          ctx.beginPath();
          ctx.arc(cx + s.ox, p.y + s.oy, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        for (const s of spots) {
          ctx.beginPath();
          ctx.arc(cx + s.ox - 1, p.y + s.oy - 1.5, s.r * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'floating') {
        // Soft glow beneath the platform
        ctx.save();
        ctx.globalAlpha = 0.18 + Math.sin(this.state.gameTime * 0.04) * 0.06;
        ctx.fillStyle = '#A5D6A7';
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2, p.y + p.height + 6, p.width * 0.45, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Platform body with gradient
        const floatGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        floatGrad.addColorStop(0, '#81C784');
        floatGrad.addColorStop(0.5, p.color);
        floatGrad.addColorStop(1, '#2E7D32');
        ctx.fillStyle = floatGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 6);
        ctx.fill();

        // Bright grass top
        ctx.fillStyle = '#A5D6A7';
        ctx.fillRect(p.x + 2, p.y, p.width - 4, 3);

        // Tiny grass tufts
        ctx.fillStyle = '#66BB6A';
        for (let gx = p.x + 5; gx < p.x + p.width - 5; gx += 12) {
          const gh = 3 + Math.sin(gx * 0.8) * 2;
          ctx.beginPath();
          ctx.moveTo(gx, p.y);
          ctx.lineTo(gx + 2, p.y - gh);
          ctx.lineTo(gx + 4, p.y);
          ctx.fill();
        }

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(p.x + 4, p.y + 2, p.width * 0.4, 3);
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
      } else if (p.type === 'cloud') {
        // Playable cloud platform — fluffy bumps, flat tinted base, sparkle glints
        const floatOffset = (p as { floatOffset?: number }).floatOffset || 0;
        const floatY = p.y + Math.sin(this.state.gameTime * ((p as { floatSpeed?: number }).floatSpeed || 0.8) + floatOffset) * 4;
        const dissolve = (p as { dissolveTimer?: number }).dissolveTimer || 0;
        // Opacity: stays solid until last 60 frames, then fades out
        const opacity = dissolve > 0 ? Math.min(1, dissolve / 60) : 1;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Soft drop shadow beneath
        ctx.fillStyle = 'rgba(90,130,200,0.20)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2 + 4, floatY + p.height + 7, p.width * 0.44, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flat blue-tinted base (makes the cloud read as a solid platform)
        ctx.fillStyle = 'rgba(185,215,245,0.88)';
        ctx.beginPath();
        ctx.roundRect(p.x + 6, floatY + p.height * 0.55, p.width - 12, p.height * 0.52, [0, 0, 7, 7]);
        ctx.fill();

        // Main cloud body — radial gradient
        const cloudGrad = ctx.createRadialGradient(
          p.x + p.width * 0.34, floatY + p.height * 0.18, 5,
          p.x + p.width * 0.50, floatY + p.height * 0.48, p.width * 0.62
        );
        cloudGrad.addColorStop(0,    'rgba(255,255,255,1.00)');
        cloudGrad.addColorStop(0.42, 'rgba(243,251,255,0.97)');
        cloudGrad.addColorStop(1,    'rgba(210,232,250,0.90)');
        ctx.fillStyle = cloudGrad;

        // Five fluffy bumps across the top + two wider bottom fills
        ctx.beginPath();
        ctx.ellipse(p.x + p.width * 0.11, floatY + p.height * 0.65, p.width * 0.135, p.height * 0.75, 0, 0, Math.PI * 2);
        ctx.ellipse(p.x + p.width * 0.27, floatY + p.height * 0.38, p.width * 0.17,  p.height * 0.92, 0, 0, Math.PI * 2);
        ctx.ellipse(p.x + p.width * 0.50, floatY + p.height * 0.28, p.width * 0.20,  p.height * 1.05, 0, 0, Math.PI * 2);
        ctx.ellipse(p.x + p.width * 0.73, floatY + p.height * 0.36, p.width * 0.17,  p.height * 0.92, 0, 0, Math.PI * 2);
        ctx.ellipse(p.x + p.width * 0.89, floatY + p.height * 0.62, p.width * 0.135, p.height * 0.75, 0, 0, Math.PI * 2);
        ctx.ellipse(p.x + p.width * 0.36, floatY + p.height * 0.72, p.width * 0.27,  p.height * 0.55, 0, 0, Math.PI * 2);
        ctx.ellipse(p.x + p.width * 0.64, floatY + p.height * 0.72, p.width * 0.27,  p.height * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bright top-left highlight
        ctx.fillStyle = 'rgba(255,255,255,0.62)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.width * 0.30, floatY + p.height * 0.20, p.width * 0.115, p.height * 0.30, -0.25, 0, Math.PI * 2);
        ctx.fill();

        // Twinkling glints (pulse with gameTime)
        const glintXs = [0.18, 0.50, 0.82];
        for (const gx of glintXs) {
          const pulse = 0.5 + Math.sin(this.state.gameTime * 0.11 + gx * 6.2) * 0.5;
          if (pulse > 0.65) {
            ctx.fillStyle = `rgba(255,255,255,${0.55 + pulse * 0.35})`;
            ctx.beginPath();
            ctx.arc(p.x + p.width * gx, floatY + p.height * 0.15, 1.5 + pulse * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Fade-out mist particles when dissolving
        if (dissolve > 0 && dissolve < 80) {
          ctx.globalAlpha = opacity * 0.45;
          ctx.fillStyle = 'rgba(200,230,255,0.7)';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(p.x + (i + 0.5) * (p.width / 4), floatY + Math.sin(i * 1.4) * p.height * 0.4, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
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
        case 'leafToken': {
          const coinSpin = Math.cos(this.state.gameTime * 0.06 + c.bobOffset);
          const coinScaleX = 0.5 + Math.abs(coinSpin) * 0.5;
          ctx.save();
          ctx.translate(c.x + 12, y + 12);
          ctx.scale(coinScaleX, 1);
          // Outer ring glow
          const coinGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, 14);
          coinGlow.addColorStop(0, 'rgba(255,215,0,0.45)');
          coinGlow.addColorStop(1, 'rgba(255,215,0,0)');
          ctx.fillStyle = coinGlow;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();
          // Coin body
          const coinGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 10);
          coinGrad.addColorStop(0, '#FFF176');
          coinGrad.addColorStop(0.5, '#FFD700');
          coinGrad.addColorStop(1, '#F9A825');
          ctx.fillStyle = coinGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          // Inner ring
          ctx.strokeStyle = 'rgba(245,180,0,0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.stroke();
          // Leaf symbol
          if (Math.abs(coinSpin) > 0.3) {
            ctx.fillStyle = '#E65100';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍃', 0, 1);
          }
          ctx.restore();
          break;
        }
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

      // Draw enemy warning indicator if enabled and enemy is close
      if (this.difficultyConfig.showEnemyWarnings) {
        const distToEnemy = Math.hypot(o.x - this.player.x, o.y - this.player.y);
        if (distToEnemy < 400) {
          // Draw warning ring
          const warningIntensity = 1 - (distToEnemy / 400);
          ctx.save();
          ctx.strokeStyle = `rgba(255, 100, 100, ${warningIntensity * 0.6})`;
          ctx.lineWidth = 2 + warningIntensity * 2;
          ctx.beginPath();
          ctx.arc(o.x + o.width / 2, o.y + o.height / 2, 50 + warningIntensity * 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
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
      { x: 0, y: GROUND_Y, width: 350 },
      { x: 360, y: GROUND_Y, width: 280 },
      { x: 660, y: GROUND_Y, width: 300 },
      { x: 330, y: GROUND_Y - 80, width: 100 },
      { x: 550, y: GROUND_Y - 120, width: 90 },
    ],
    enemies: [],
    coins: [
      { x: 150, y: GROUND_Y - 40 },
      { x: 250, y: GROUND_Y - 40 },
      { x: 370, y: GROUND_Y - 100 },
      { x: 500, y: GROUND_Y - 40 },
      { x: 600, y: GROUND_Y - 140 },
      { x: 750, y: GROUND_Y - 40 },
    ],
    powerUps: [
      { x: 450, y: GROUND_Y - 40, type: 'shield' },
      { x: 800, y: GROUND_Y - 40, type: 'mushroom_powerup' },
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
