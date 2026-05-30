import {
  Platform, Collectible, Obstacle, Hazard, Particle, BackgroundElement,
  PlayerState, GameState, Resources, BiomeType, BiomeConfig, PowerUpType, MovementMode,
  GRAVITY, JUMP_FORCE, DOUBLE_JUMP_FORCE, GLIDE_GRAVITY,
  BASE_SCROLL_SPEED, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT,
  CHECKPOINT_INTERVAL, POWERUP_DURATION, BIOME_COLORS, CHARACTER_COLORS,
  AvatarConfig, CraftRecipe, CRAFT_RECIPES, DailyChallenge,
  COYOTE_TIME, JUMP_BUFFER_TIME, CloudPlatform,
  MIN_JUMP_FORCE, MAX_JUMP_FORCE, JUMP_CHARGE_RATE,
  MushroomPlatform, CloudPlatformExtended, DifficultyLevel, DIFFICULTY_CONFIGS,
  AdventureEvent, AdventureEventType, BiomeCard, CompanionState, RouteTier, BIOME_NAMES,
  GameMode, HARD_MODE, HARD_PLATFORM_WEIGHTS,
  BossState, BossProjectile,
  Interactive, InteractiveType,
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


// ===== VISUAL FEATURE FLAGS =====
// Set any flag to false to revert that visual element to the previous version.
export const VISUAL_FLAGS = {
  organicGround: true,          // Wavy grass edge + layered cliff faces
  organicBgTrees: true,         // Bezier canopy bg trees replacing old triangle+blob mix
  gapMist: true,                // Mist + stream ribbon + fireflies in ravines
  hangingGapVines: true,        // Dangling roots/vines from cliff edges into gaps
  lightRays: true,              // Diagonal sun-ray overlay (enchanted biome)
  pollenParticles: true,        // Slow-drifting pollen/petal particles
  bioluminescentBgGlow: true,   // Blue/purple flower glows in mid-ground bg trees
  mushroomSteppingBridges: true,// Mushroom stepping-stone gap bridges
};

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

      // Level progression based on distance milestones - Synced with Biome Transitions
      const previousLevel = this.state.currentLevel;

      // Biome intervals are 5000, 10000, 15000
      if (this.state.totalDistance >= 5000 && previousLevel === 1) {
        this.state.currentLevel = 2;
        if (this.state.isPlaying && !this.state.isPaused) this.pause();
        this.onLevelUp?.(2);
        // Level 1→2: Crystal Cave transition
        this.spawnLevelUpEffect(2, '#00E5FF', 'upward');
        this.cameraShake = 5;
      } else if (this.state.totalDistance >= 10000 && previousLevel === 2) {
        this.state.currentLevel = 3;
        if (this.state.isPlaying && !this.state.isPaused) this.pause();
        this.onLevelUp?.(3);
        // Level 2→3: Autumn Forest transition
        this.spawnLevelUpEffect(3, '#FF6F00', 'horizontal');
        this.cameraShake = 6;
      } else if (this.state.totalDistance >= 15000 && previousLevel === 3) {
        this.state.currentLevel = 4;
        if (this.state.isPlaying && !this.state.isPaused) this.pause();
        this.onLevelUp?.(4);
        // Level 3→4: Firefly Night transition
        this.spawnLevelUpEffect(4, '#FFEB3B', 'explosion');
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
          
        case 'rainbow': {
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
  interactives: Interactive[] = [];
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

  // Depth-fall danger system
  pitDepth: number = 0;       // How far below ground the player is
  depthBatTimer: number = 0;  // Bat spawn timer during fall

  // Adventure event system
  nextEventDistance: number = 400;
  activeEvent: AdventureEvent | null = null;
  eventCooldown: number = 0;
  // Biome card display
  pendingBiomeCard: BiomeCard | null = null;
  // Secret path branching
  nextBranchX: number = 1200;
  companion: CompanionState | null = null;

  // Difficulty system properties
  difficulty: DifficultyLevel = 'normal';
  difficultyConfig = DIFFICULTY_CONFIGS['normal'];
  gameMode: GameMode = 'normal';
  currentAirTier: number = 0; // 0=ground, 1=low clouds, 2=high clouds
  verticalSequenceActive: boolean = false;
  nextCloudSequenceX: number = 1800; // X position for next mushroom→cloud sequence
  // Hard Mode scenario tracking
  // Education tip "seen" flags — each trigger fires at most once per run
  shownTips: Set<string> = new Set();
  // Post-Starfall cycle: distance threshold for next random biome swap
  nextCycleBiomeX: number = 27500;
  nextScenarioX: number = 500;
  recentScenarios: string[] = [];
  // Hard Mode boss
  nextBossX: number = 5000;
  bossEncounterCount: number = 0; // tracks how many bosses have been spawned
  // Hard Mode interactives
  nextInteractiveX: number = 400;   // first boss at 1500m
  // Hard Mode route system
  nextRouteChoiceX: number = 2000;    // first route choice at 2000m (after basics are learned)
  routeChoiceActive: boolean = false;  // telegraph showing
  routeChoiceTimer: number = 0;        // frames remaining (3s = 180)
  routeEndX: number = 0;              // where current non-main route rejoins
  // Wider landing areas for touch devices to compensate for imprecise input
  isTouchDevice: boolean = typeof window !== 'undefined' && ('ontouchstart' in window || window.innerWidth < 768);

  constructor(canvas: HTMLCanvasElement, difficulty: DifficultyLevel = 'normal', gameMode: GameMode = 'normal') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = CANVAS_WIDTH;
    this.height = CANVAS_HEIGHT;
    this.scale = 1;
    this.seed = Math.random() * 10000;
    this.difficulty = difficulty;
    this.difficultyConfig = DIFFICULTY_CONFIGS[difficulty];
    this.gameMode = gameMode;

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
      acornShieldActive: false, foxfireDashActive: false, petalFloatActive: false,
      rootSnareActive: false, mushroomBounceCount: 0, starlightCompassActive: false,
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
      unlockedBiomes: ['enchanted', 'crystal', 'moonlit', 'autumn', 'caverns', 'firefly', 'canopy', 'ruins', 'starfall'],
      difficulty: this.difficulty,
      gameMode: this.gameMode,
      levelNotificationTriggered: false,
      levelCompleted: false,
      levelCompletionDistance: 0,
      adventureEvent: null,
      biomeCard: null,
      storedPowerUp: null,
      routeTier: 'main',
      activeRouteDistance: 0,
      companionType: null,
      bossEncounter: null,
      interactives: [],
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
    // Layer 0: Near bushes + flowers + mushrooms (frontmost) - Layered and spaced
    const near: BackgroundElement[] = [];
    for (let i = 0; i < 60; i++) {
      const rand = this.random();
      let type: BackgroundElement['type'], color;
      if (rand < 0.4) {
        type = 'bush';
        color = biome.trees[Math.floor(this.random() * biome.trees.length)];
      } else if (rand < 0.8) {
        type = 'flower';
        color = biome.flowers[Math.floor(this.random() * biome.flowers.length)];
      } else {
        type = 'mushroom';
        color = '#FF6B6B';
      }
      near.push({
        x: i * 80 + this.random() * 40, y: 0,
        type, scale: 0.4 + this.random() * 0.3,
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

    // Layer 2: Mountains + distant trees - Massive scale and depth
    const mountains: BackgroundElement[] = [];
    for (let i = 0; i < 30; i++) {
      const rand = this.random();
      let type: BackgroundElement['type'], color;
      if (rand < 0.85) {
        type = 'mountain';
        color = this.darkenColor(biome.ground, 60);
      } else {
        type = 'tree';
        color = this.darkenColor(biome.trees[0], 40);
      }
      mountains.push({
        x: i * 250 + this.random() * 120, y: 0,
        type, scale: 1.2 + this.random() * 0.8,
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
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    if (!rect || rect.width === 0 || rect.height === 0) {
      this.scale = 1;
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.position = '';
      this.canvas.style.left = '';
      this.canvas.style.top = '';
      return;
    }
    // Scale to fill the full container — use the LARGER scale factor so the canvas
    // covers the whole screen on mobile (letterbox/pillarbox removed).
    this.scale = Math.max(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT);
    const scaledW = CANVAS_WIDTH * this.scale;
    const scaledH = CANVAS_HEIGHT * this.scale;
    this.canvas.style.width = `${scaledW}px`;
    this.canvas.style.height = `${scaledH}px`;
    // Centre the oversized canvas so gameplay area is visible
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${(rect.width - scaledW) / 2}px`;
    this.canvas.style.top = `${(rect.height - scaledH) / 2}px`;
  }

  setAvatar(config: AvatarConfig) {
    this.avatar = config;
  }

  setGameMode(mode: GameMode): void {
    this.gameMode = mode;
    if (this.state) this.state.gameMode = mode;
  }

  setChallengeUpdater(updater: (type: DailyChallenge['type'], amount: number) => void) {
    this.challengeUpdater = updater;
  }

  private showTipOnce(key: string): void {
    if (this.shownTips.has(key)) return;
    this.shownTips.add(key);
    this.showEducationOverlay?.(key, { x: this.player.x, y: this.player.y });
  }

  // Called when player taps a route choice button in the HUD
  selectRoute(tier: 'sky' | 'main' | 'deep') {
    if (!this.routeChoiceActive || this.gameMode !== 'hard') return;
    this.state.routeTier = tier;
    this.routeChoiceActive = false;
    this.routeChoiceTimer = 0;
    // Route lasts 500m for a meaningful commitment before rejoining main path
    this.routeEndX = this.player.x + 500;
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
    this.interactives = [];
    this.particles = [];
    this.craftedItems = savedRun ? this.cloneArray(savedRun.craftedItems) : [];
    this.hazards = savedRun ? this.cloneArray(savedRun.hazards) : [];
    this.nextPlatformX = savedRun ? savedRun.nextPlatformX : 0;
    this.nextCollectibleX = savedRun ? savedRun.nextCollectibleX : 300;
    this.nextObstacleX = savedRun ? savedRun.nextObstacleX : 300;
    this.terrainX = savedRun ? savedRun.terrainX : 0;
    this.nextScenarioX = 1500; // give player ~1500m to learn basics before first scenario
    this.recentScenarios = [];
    this.shownTips = new Set();
    this.nextCycleBiomeX = 27500; // post-Starfall cycle starts 2500m after Starfall
    this.nextBossX = 5000; // first boss at 5000m so players learn mechanics first
    this.nextInteractiveX = 400;
    this.nextRouteChoiceX = 2000;
    this.routeChoiceActive = false;
    this.routeChoiceTimer = 0;
    this.routeEndX = 0;
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
      height: 600,
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

  addFloatingPlatform(x: number, biome: BiomeConfig) {
    // Hard Mode: use weighted type selection from HARD_PLATFORM_WEIGHTS
    if (this.gameMode === 'hard') {
      this._addHardFloatingPlatform(x, biome);
      return;
    }

    const rand = this.random();
    let type;
    // mushroomStepper rare — too many makes the air cluttered
    // mushroom uncommon — they're launch pads, not gap-fillers
    if (VISUAL_FLAGS.mushroomSteppingBridges && rand < 0.08) {
      type = 'mushroomStepper';
    } else if (rand < 0.13) {
      type = 'mushroom';
    } else if (rand < 0.52) {
      type = 'floating';
    } else if (rand < 0.78) {
      type = 'vine';
    } else {
      type = 'log';
    }

    // mushroomStepper sits in gap at reachable mid-height (one big jump above ground)
    // mushroom sits ON the ground (cap just above surface, stem embedded)
    // floating/vine/log float at jump height (120-200px above ground)
    const y = type === 'mushroomStepper'
      ? GROUND_Y - 90 - this.random() * 30    // one jump height above ground — reachable, not too low
      : type === 'mushroom'
      ? GROUND_Y - 20                         // ground-level mushroom: cap just above surface
      : GROUND_Y - 120 - this.random() * 80; // floating platforms at real jump height
    const w = type === 'mushroomStepper' ? 80 + this.random() * 40
            : type === 'mushroom' ? 70 : 90 + this.random() * 120;
    const colors: Record<string, string> = {
      floating: biome.trees[2], mushroom: '#FF6B6B', mushroomStepper: '#E53935', vine: '#4CAF50', log: '#8D6E63',
      pastel: '#FFC1E3', gumdrop: '#FFB6C1', ice: '#B3EFFF', snow: '#E0F7FA', lava: '#FF7043', crystal: '#FF8A65', cloud: '#E3F6FF', rainbow: '#B3E5FC',
    };
    this.platforms.push({
      x, y, width: w, height: 20,
      type: type as Platform['type'], color: colors[type],
      bouncy: type === 'mushroom' || type === 'mushroomStepper',
    });
    // Do NOT modify nextPlatformX here — only generateTerrain() controls ground platform spacing
  }

  _addHardFloatingPlatform(x: number, biome: BiomeConfig) {
    // Weighted random pick from HARD_PLATFORM_WEIGHTS
    const total = Object.values(HARD_PLATFORM_WEIGHTS).reduce((a, b) => a + b, 0);
    let roll = this.random() * total;
    let chosen = 'standard';
    for (const [key, weight] of Object.entries(HARD_PLATFORM_WEIGHTS)) {
      roll -= weight;
      if (roll <= 0) { chosen = key; break; }
    }

    const plankCount = (w: number) => Math.ceil(w / 32);

    switch (chosen) {
      case 'crumbling': {
        const w = 80 + this.random() * 50;
        const timer = 0.8 + this.random() * 0.3;
        this.platforms.push({
          x, y: GROUND_Y - 20, width: w, height: 20,
          type: 'crumbling', color: '#9E9E9E',
          crumblingMax: timer, crackLevel: 0,
        });
        this.showTipOnce('firstCrumbling');
        break;
      }
      case 'flowerLift': {
        const w = 70 + this.random() * 20;
        this.platforms.push({
          x, y: GROUND_Y - 20, width: w, height: 20,
          type: 'flowerLift', color: '#66BB6A',
          liftActive: false, liftTimer: 0, liftPetalAngle: 0,
        });
        break;
      }
      case 'vineSwing': {
        const len = 100 + this.random() * 30;
        const anchorY = GROUND_Y - 120 - this.random() * 60;
        this.platforms.push({
          x, y: anchorY + len, width: 60, height: 16,
          type: 'vineSwing', color: '#5D4037',
          vineAngle: 0, vineAngularVel: 0.25 + this.random() * 0.1,
          vineLength: len, vineGrabbed: false,
          vineAnchorX: x + 30, vineAnchorY: anchorY,
        });
        break;
      }
      case 'breakableBridge': {
        const w = 180 + this.random() * 100;
        const pc = plankCount(w);
        this.platforms.push({
          x, y: GROUND_Y + Math.round(Math.sin(x * 0.006) * 8), width: w, height: 20,
          type: 'breakableBridge', color: '#8D6E63',
          bridgePlanks: new Array(pc).fill(false),
          bridgePlankTimers: new Array(pc).fill(-1),
        });
        break;
      }
      case 'mushroom': {
        this.platforms.push({
          x, y: GROUND_Y - 20, width: 70, height: 20,
          type: 'mushroom', color: '#FF6B6B', bouncy: true,
        });
        this.showTipOnce('firstMushroom');
        break;
      }
      case 'cloud': {
        const w = 100 + this.random() * 60;
        this.addCloudPlatform(x, GROUND_Y - 130 - this.random() * 50, w);
        break;
      }
      default: { // standard / floating / vine / log
        const w = 90 + this.random() * 80;
        const y2 = GROUND_Y - 120 - this.random() * 60;
        this.platforms.push({
          x, y: y2, width: w, height: 20,
          type: 'floating', color: biome.trees[2] || '#4CAF50',
        });
        break;
      }
    }
  }

  addCollectibleAt(x: number, y: number, biome: BiomeConfig) {
    // Sky route: spawn an extra leafToken alongside (2× coins)
    if (this.gameMode === 'hard' && this.state.routeTier === 'sky') {
      this.collectibles.push({ x: x + 16, y: y - 12, width: 24, height: 24, type: 'leafToken', collected: false, bobOffset: this.random() * Math.PI * 2, sparkle: 0 });
    }
    // Spawn mostly leaf tokens on arc paths — rewarding but not cluttered with power-ups
    const rand = this.random();
    // Deep route: 1.5× power-up chance
    const routePowerUpMult = (this.gameMode === 'hard' && this.state.routeTier === 'deep') ? 1.5 : 1;
    const powerUpChance = 0.08 * this.difficultyConfig.powerUpFrequency * routePowerUpMult;
    let type: string;
    if (rand < powerUpChance) {
      const powerTypes = ['star', 'leafWings', 'speedBoots', 'shield', 'acornShield', 'petalFloat', 'mushroomBounce', 'starlightCompass'];
      type = powerTypes[Math.floor(this.random() * powerTypes.length)];
    } else if (rand < 0.45) {
      type = 'leafToken';
    } else {
      const resourceTypes = ['wood', 'stone', 'flower', 'leaf'];
      type = resourceTypes[Math.floor(this.random() * resourceTypes.length)];
    }
    void biome;
    this.collectibles.push({
      x, y, width: 24, height: 24, type: type as Collectible['type'], collected: false,
      bobOffset: this.random() * Math.PI * 2, sparkle: 0,
    });
  }

  addCollectible(x: number, biome: BiomeConfig) {
    // Apply difficulty-based power-up frequency
    const powerUpChance = 0.15 * this.difficultyConfig.powerUpFrequency;
    const rand = this.random();
    let type;
    
    if (rand < powerUpChance) {
      // Power-ups scaled by difficulty — includes new forest power-ups
      const powerTypes = ['mushroom_powerup', 'star', 'fireFlower', 'leafWings', 'speedBoots', 'shield',
        'acornShield', 'foxfireDash', 'petalFloat', 'rootSnare', 'mushroomBounce', 'starlightCompass'];
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

  addHardModeEnemy(x: number) {
    this.showTipOnce('firstEnemy');
    // Biome-based enemy preference
    const biomeEnemyMap: Record<string, Obstacle['type'][]> = {
      enchanted: ['bumbleBear', 'thornling'],
      moonlit:   ['shadowWisp', 'bumbleBear'],
      crystal:   ['fireflySwarm', 'shadowWisp'],
      ruins:     ['thornling', 'bumbleBear'],
      autumn:    ['thornling', 'bumbleBear'],
      firefly:   ['fireflySwarm', 'shadowWisp'],
      caverns:   ['shadowWisp', 'thornling'],
      canopy:    ['bumbleBear', 'fireflySwarm'],
      starfall:  ['shadowWisp', 'fireflySwarm'],
    };
    const biome = this.state.biome;
    const pool = biomeEnemyMap[biome] ?? ['bumbleBear', 'thornling', 'fireflySwarm', 'shadowWisp'];
    const type = pool[Math.floor(this.random() * pool.length)] as Obstacle['type'];

    // Never spawn on first platform after gap or within 100px of a power-up
    const nearPowerUp = this.collectibles.some(c =>
      Math.abs(c.x - x) < 100 && ['star','leafWings','acornShield','foxfireDash','petalFloat','rootSnare','mushroomBounce','starlightCompass'].includes(c.type)
    );
    if (nearPowerUp) return;

    const patrolDist = 80 + this.random() * 60;
    const seed = Math.floor(this.random() * 10000);

    switch (type) {
      case 'bumbleBear': {
        const patrolY = GROUND_Y - 48;
        this.obstacles.push({
          x, y: patrolY, width: 48, height: 48,
          type: 'bumbleBear', speed: 30, bounceOffset: 0, direction: -1,
          patrolPattern: 'horizontal',
          alertState: 'idle',
          patrolStart: x - patrolDist / 2,
          patrolEnd: x + patrolDist / 2,
          chargeActive: false, chargeTimer: 0, dazedTimer: 0,
          seed,
        });
        break;
      }
      case 'thornling': {
        const patrolY = GROUND_Y - 40;
        this.obstacles.push({
          x, y: patrolY, width: 40, height: 40,
          type: 'thornling', speed: 40, bounceOffset: 0, direction: -1,
          patrolPattern: 'horizontal',
          alertState: 'idle',
          patrolStart: x - patrolDist / 2,
          patrolEnd: x + patrolDist / 2,
          spikeTimer: 0, spikesExtended: false, telegraphTimer: 0,
          seed,
        });
        break;
      }
      case 'fireflySwarm': {
        const baseY = GROUND_Y - 140 - this.random() * 60;
        const individuals = Array.from({ length: 6 }, (_, i) => ({
          x: x + (i - 3) * 15,
          y: baseY + Math.sin(i) * 20,
          phase: i * (Math.PI / 3),
        }));
        this.obstacles.push({
          x, y: baseY, width: 90, height: 40,
          type: 'fireflySwarm', speed: 50, bounceOffset: 0, direction: -1,
          patrolPattern: 'horizontal',
          alertState: 'idle',
          patrolStart: x - 80,
          patrolEnd: x + 80,
          swarmIndividuals: individuals,
          scattered: false, scatterTimer: 0,
          reformBridge: false, reformBridgeTimer: 0,
          seed,
        });
        break;
      }
      case 'shadowWisp': {
        const wispY = GROUND_Y - 120 - this.random() * 80;
        this.obstacles.push({
          x, y: wispY, width: 36, height: 36,
          type: 'shadowWisp', speed: 50, bounceOffset: 0, direction: -1,
          patrolPattern: 'horizontal',
          alertState: 'idle',
          patrolStart: x - 100,
          patrolEnd: x + 100,
          driftPhase: this.random() * Math.PI * 2,
          seed,
        });
        break;
      }
    }
  }

  // ===== INPUT =====
  jump() {
  if (this.respawnTimer > 0) return;
  if (!this.state.isPlaying || this.state.isPaused) return;
  Audio.resumeAudio();

  // Hard Mode vine swing release — launch tangent to arc
  if (this.gameMode === 'hard') {
    for (const plat of this.platforms) {
      if (plat.type === 'vineSwing' && plat.vineGrabbed) {
        plat.vineGrabbed = false;
        const angle = plat.vineAngle ?? 0;
        const angVel = plat.vineAngularVel ?? 0;
        const len = plat.vineLength ?? 120;
        // Tangential velocity (perpendicular to vine)
        this.player.vx = angVel * len * Math.cos(angle) * 0.45;
        this.player.vy = -(Math.abs(angVel) * len * 0.30 + 4);
        this.player.grounded = false;
        this.player.jumping = true;
        this.spawnParticles(this.player.x, this.player.y, 8, '#4CAF50', 'sparkle');
        Audio.playJump();
        return;
      }
    }
  }

  if (!this.player.grounded && this.player.coyoteTime >= COYOTE_TIME && this.player.doubleJumped) return;

  const levelMultiplier = 1 + (this.state.currentLevel - 1) * 0.1;  
  // Variable jump based on how long button was held
  let jumpPower = MIN_JUMP_FORCE + (this.jumpCharge * (MAX_JUMP_FORCE - MIN_JUMP_FORCE));
  jumpPower = Math.min(MAX_JUMP_FORCE, Math.max(MIN_JUMP_FORCE, jumpPower));
  jumpPower *= levelMultiplier;
  
  const timeSinceGrounded = performance.now() / 1000 - this.player.lastGroundedTime;
  const canCoyoteJump = !this.player.grounded && timeSinceGrounded < COYOTE_TIME;

  if (this.player.grounded || canCoyoteJump) {
    const mushroomMultiplier = this.player.mushroomBounceCount > 0 ? 2.0 : 1.0;
    this.player.vy = -jumpPower * (this.player.bigMode ? 1.3 : 1) * mushroomMultiplier;
    if (this.player.mushroomBounceCount > 0) {
      this.player.mushroomBounceCount--;
      if (this.player.mushroomBounceCount === 0) {
        this.player.activePowerUp = null;
        this.player.powerUpTimer = 0;
      }
      this.spawnParticles(this.player.x, this.player.y + this.player.height, 12, '#FF6B6B', 'sparkle');
    }
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
    // Always start at Enchanted — the distance-based sequence handles all transitions.
    // Picking a random mid-sequence biome at run start would break the narrative arc
    // (e.g. player spawns in Starfall, then gets thrown back to Crystal at 2500m).
    return 'enchanted';
  }

  private cloneState(state: GameState): GameState {
    return {
      ...state,
      resources: { ...state.resources },
      achievements: [...state.achievements],
      unlockedBiomes: [...state.unlockedBiomes],
      adventureEvent: state.adventureEvent ? { ...state.adventureEvent, data: { ...state.adventureEvent.data } } : null,
      biomeCard: state.biomeCard ? { ...state.biomeCard } : null,
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
    // For bridges, find the next gap ahead of the player to place it in
    let px = this.player.x + 300;
    if (recipe.type === 'bridge') {
      // Find the rightmost ground platform edge before the next gap
      const groundPlatforms = this.platforms
        .filter(p => p.type === 'ground' && p.x >= this.player.x && p.x < this.player.x + 800)
        .sort((a, b) => a.x - b.x);
      if (groundPlatforms.length >= 1) {
        const firstPlatform = groundPlatforms[0];
        px = firstPlatform.x + firstPlatform.width + 10; // Place bridge right at the edge of the gap
      }
    }
    const py = recipe.type === 'bridge' ? GROUND_Y : GROUND_Y - 80;
    const w = recipe.type === 'bridge' ? 200 : recipe.type === 'ramp' ? 120 : 80;
    // Bridge uses collision height 28 (thicker = easier to land on reliably)
    const h = recipe.type === 'wall' ? 80 : recipe.type === 'bridge' ? 28 : 20;
    const craftedItem: Platform = {
      x: px, y: py, width: w, height: h,
      type: recipe.type as Platform['type'], 
      color: recipe.type === 'bridge' ? '#8D6E63' : recipe.type === 'platform' ? '#FF69B4' : recipe.type === 'ramp' ? '#FFD700' : '#90A4AE',
      bouncy: recipe.type === 'platform',
    };

    // Bridges stay at ground level (no vertical oscillation — they span gaps)
    if (recipe.type === 'bridge') {
      craftedItem.moving = false;
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

    this.animationId = requestAnimationFrame(this.loop);
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
    // Hard Mode score = base × 3, tokens × 2
    const scoreBase = Math.floor(this.state.distance) + this.state.leafTokens * 10;
    this.state.score = this.gameMode === 'hard'
      ? scoreBase * HARD_MODE.scoreMultiplier
      : scoreBase;

    // Hard Mode exclusive costume unlock at 1000m
    if (this.gameMode === 'hard' && this.state.distance >= 1000 &&
        !localStorage.getItem('flo_unlockedThornling')) {
      localStorage.setItem('flo_unlockedThornling', '1');
    }

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
    
    // Update time-based challenges — pass dt (seconds per frame) not absolute time
    this.challengeUpdater?.('time', dt / 60);

    // Check for perfect run (no deaths) — fire once when milestone crossed, not every frame
    if (this.state.lives === 3 && Math.floor(this.gameTime) === 60) {
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
        this.player.foxfireDashActive = false;
        this.player.petalFloatActive = false;
        this.player.starlightCompassActive = false;
        this.player.mushroomBounceCount = 0;
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

      if (dist >= 25000) {
        // Post-Starfall cycle: swap biome every 2500m, chosen once at threshold (not every frame)
        if (dist >= this.nextCycleBiomeX) {
          const next = this.pickCycleBiome();
          this.nextCycleBiomeX = dist + 2500;
          if (next !== this.state.biome) this.startBiomeTransition(next);
        }
      } else {
        const targetBiome = this.getNextBiomeForDistance(dist);
        if (targetBiome && targetBiome !== this.state.biome) {
          this.startBiomeTransition(targetBiome);
        }
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
    this.updateHardEnemies(dt);
    this.updateBoss(dt);
    this.updateInteractives(dt);
    this.updateParticles(dt);
    this.generateTerrain();
    this.updateHazards(this.player.vx * dt);

    // Ambient particles - smoother and biome-aware
    if (this.frameCount % 8 === 0) {
      const biome = this.state.biome;
      const isTransitioning = this.state.isTransitioning;
      const transitionProgress = this.state.transitionProgress;

      // Fireflies for Night/Magical biomes
      if (biome === 'firefly' || biome === 'crystal' || (isTransitioning && (this.state.transitioningBiome === 'firefly' || this.state.transitioningBiome === 'crystal'))) {
        const opacity = (biome === 'firefly' || biome === 'crystal') ? 1 : transitionProgress;
        if (this.random() < opacity) {
          this.particles.push({
            x: this.random() * CANVAS_WIDTH, y: this.random() * CANVAS_HEIGHT * 0.7,
            vx: (this.random() - 0.5) * 0.5, vy: (this.random() - 0.5) * 0.3,
            life: 120, maxLife: 120,
            color: biome === 'crystal' ? '#B2EBF2' : '#FFEB3B',
            size: 2 + this.random() * 3, type: 'firefly',
          });
        }
      }

      // Falling leaves for Autumn
      if (biome === 'autumn' || (isTransitioning && this.state.transitioningBiome === 'autumn')) {
        this.particles.push({
          x: this.random() * CANVAS_WIDTH, y: -10,
          vx: (this.random() - 0.5) * 2, vy: 1 + this.random(),
          life: 200, maxLife: 200,
          color: ['#FF6F00', '#FFD54F', '#FF5722', '#BF360C'][Math.floor(this.random() * 4)],
          size: 6 + this.random() * 6, type: 'leaf',
        });
      }
    }

    // FoxfireDash blue flame trail
    if (this.player.foxfireDashActive && this.frameCount % 2 === 0) {
      this.particles.push({
        x: this.player.x + this.random() * this.player.width,
        y: this.player.y + this.random() * this.player.height,
        vx: -3 + this.random() * -2, vy: (this.random() - 0.5) * 3,
        life: 16, maxLife: 16,
        color: ['#0048FF', '#00BFFF', '#4FC3F7', '#29B6F6'][Math.floor(this.random() * 4)],
        size: 4 + this.random() * 4, type: 'trail',
      });
    }

    // Starlightcompass beam — periodic sparkle ahead
    if (this.player.starlightCompassActive && this.frameCount % 12 === 0) {
      this.particles.push({
        x: this.player.x + this.player.width / 2 + 40 + this.random() * 80,
        y: this.player.y - 20 + (this.random() - 0.5) * 30,
        vx: 1, vy: -0.5,
        life: 30, maxLife: 30,
        color: '#FFD700',
        size: 5 + this.random() * 3, type: 'sparkle',
      });
    }

    // Biome card countdown
    if (this.state.biomeCard) {
      this.state.biomeCard.timer -= dt;
      if (this.state.biomeCard.timer <= 0) this.state.biomeCard = null;
    }

    // Adventure event system
    this.updateAdventureEvent(dt);

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

    // Pick one of 4 cloud path layouts for variety
    const layoutRoll = this.random();
    if (layoutRoll < 0.25) {
      this._skyPath_ClassicStaircase(startX, chainId);
    } else if (layoutRoll < 0.50) {
      this._skyPath_HangingGarden(startX, chainId);
    } else if (layoutRoll < 0.75) {
      this._skyPath_ZigzagTerrace(startX, chainId);
    } else {
      this._skyPath_IslandChain(startX, chainId);
    }

    return chainId;
  }

  // ── Cloud path layout A: Classic rising staircase (original, refined) ──────
  _skyPath_ClassicStaircase(startX: number, chainId: string) {
    const mushroomX = startX + 60;
    this.addMushroomPlatform(mushroomX, GROUND_Y - 20, true, chainId);
    this.platforms[this.platforms.length - 1].width = 110;

    const cloudConfigs: { dx: number; dy: number; w: number; tier: number }[] = [
      { dx: 110, dy: -160, w: 230, tier: 1 },
      { dx: 330, dy: -245, w: 190, tier: 1 },
      { dx: 520, dy: -335, w: 200, tier: 2 },
      { dx: 710, dy: -275, w: 185, tier: 2 },
      { dx: 890, dy: -195, w: 175, tier: 1 },
      { dx: 1060, dy: -130, w: 160, tier: 1 },
    ];
    this._placeSkyCloudChain(mushroomX, cloudConfigs, chainId, 2);

    const exitX = mushroomX + 1230;
    this.addMushroomPlatform(exitX, GROUND_Y - 20, true, chainId);
    this.platforms[this.platforms.length - 1].width = 110;
  }

  // ── Cloud path layout B: Hanging Garden ─────────────────────────────────────
  // Long flat high-altitude terrace with garden bridges between clouds,
  // hanging vines, and a gentle arc descent.
  _skyPath_HangingGarden(startX: number, chainId: string) {
    const mushroomX = startX + 60;
    this.addMushroomPlatform(mushroomX, GROUND_Y - 20, true, chainId);
    this.platforms[this.platforms.length - 1].width = 120;

    // Two-step rise to high plateau
    const riseConfigs: { dx: number; dy: number; w: number; tier: number }[] = [
      { dx: 100, dy: -140, w: 200, tier: 1 },
      { dx: 290, dy: -260, w: 210, tier: 1 },
    ];
    this._placeSkyCloudChain(mushroomX, riseConfigs, chainId, -1);

    // Long high-altitude garden plateau — 5 wide clouds at consistent height
    // with garden bridge platforms between them
    const plateauY = GROUND_Y - 310;
    const plateauStartDx = 490;
    const plateauClouds: { dx: number; w: number }[] = [
      { dx: plateauStartDx,        w: 200 },
      { dx: plateauStartDx + 250,  w: 200 },
      { dx: plateauStartDx + 500,  w: 220 },
      { dx: plateauStartDx + 760,  w: 200 },
      { dx: plateauStartDx + 1010, w: 210 },
    ];
    for (let i = 0; i < plateauClouds.length; i++) {
      const cfg = plateauClouds[i];
      const cx = mushroomX + cfg.dx;
      this.addCloudPlatformTiered(cx, plateauY, cfg.w, 2, true, chainId);
      // Rich collectibles on garden plateau
      const tokenCount = 2 + Math.floor(this.random() * 2);
      for (let t = 0; t < tokenCount; t++) {
        this.collectibles.push({
          x: cx + (t + 1) * (cfg.w / (tokenCount + 1)) - 12,
          y: plateauY - 38,
          width: 24, height: 24,
          type: 'leafToken',
          collected: false,
          bobOffset: this.random() * Math.PI * 2,
          sparkle: 0,
        });
      }
      // Garden bridge connecting to next cloud (bridge platform in the gap)
      if (i < plateauClouds.length - 1) {
        const nextCfg = plateauClouds[i + 1];
        const bridgeX = cx + cfg.w + 10;
        const bridgeW = mushroomX + nextCfg.dx - bridgeX - 10;
        if (bridgeW > 30) {
          this.platforms.push({
            x: bridgeX,
            y: plateauY + 4,
            width: bridgeW,
            height: 16,
            type: 'bridge',
            color: '#8D6E63',
          });
        }
      }
    }

    // Special power-up at centre of plateau
    const midCloud = plateauClouds[2];
    const specialTypes: Collectible['type'][] = ['star', 'leafWings', 'acornShield', 'petalFloat'];
    this.collectibles.push({
      x: mushroomX + midCloud.dx + midCloud.w * 0.5 - 12,
      y: plateauY - 42,
      width: 24, height: 24,
      type: specialTypes[Math.floor(this.random() * specialTypes.length)],
      collected: false,
      bobOffset: this.random() * Math.PI * 2,
      sparkle: 0,
    });

    // Gentle curved descent back to ground
    const descentConfigs: { dx: number; dy: number; w: number; tier: number }[] = [
      { dx: plateauStartDx + 1290, dy: -230, w: 180, tier: 1 },
      { dx: plateauStartDx + 1470, dy: -160, w: 170, tier: 1 },
    ];
    this._placeSkyCloudChain(mushroomX, descentConfigs, chainId, -1);

    const exitX = mushroomX + plateauStartDx + 1700;
    this.addMushroomPlatform(exitX, GROUND_Y - 20, true, chainId);
    this.platforms[this.platforms.length - 1].width = 110;
  }

  // ── Cloud path layout C: Zigzag Terrace ─────────────────────────────────────
  // Alternating left-high / right-low pattern — more dynamic, tighter gaps
  _skyPath_ZigzagTerrace(startX: number, chainId: string) {
    const mushroomX = startX + 60;
    this.addMushroomPlatform(mushroomX, GROUND_Y - 20, true, chainId);
    this.platforms[this.platforms.length - 1].width = 110;

    const cloudConfigs: { dx: number; dy: number; w: number; tier: number }[] = [
      { dx: 100,  dy: -150, w: 200, tier: 1 },  // rise
      { dx: 280,  dy: -280, w: 160, tier: 2 },  // high left
      { dx: 430,  dy: -190, w: 175, tier: 1 },  // mid right
      { dx: 590,  dy: -310, w: 155, tier: 2 },  // high left
      { dx: 740,  dy: -220, w: 170, tier: 2 },  // mid right
      { dx: 900,  dy: -330, w: 155, tier: 2 },  // peak
      { dx: 1060, dy: -250, w: 165, tier: 2 },  // descend
      { dx: 1220, dy: -175, w: 175, tier: 1 },  // lower
      { dx: 1380, dy: -120, w: 185, tier: 1 },  // return
    ];
    this._placeSkyCloudChain(mushroomX, cloudConfigs, chainId, 5);

    const exitX = mushroomX + 1560;
    this.addMushroomPlatform(exitX, GROUND_Y - 20, true, chainId);
    this.platforms[this.platforms.length - 1].width = 110;
  }

  // ── Cloud path layout D: Island Chain ───────────────────────────────────────
  // Wide spread-out islands at varied heights with generous arcs between them.
  // More exploratory feel — longer spacing, bigger clouds, more rewards.
  _skyPath_IslandChain(startX: number, chainId: string) {
    const mushroomX = startX + 60;
    this.addMushroomPlatform(mushroomX, GROUND_Y - 20, true, chainId);
    this.platforms[this.platforms.length - 1].width = 120;

    const cloudConfigs: { dx: number; dy: number; w: number; tier: number }[] = [
      { dx: 120,  dy: -170, w: 260, tier: 1 },  // wide first island
      { dx: 390,  dy: -290, w: 240, tier: 2 },  // large mid island
      { dx: 650,  dy: -360, w: 220, tier: 2 },  // apex island
      { dx: 900,  dy: -320, w: 230, tier: 2 },  // second large
      { dx: 1150, dy: -240, w: 240, tier: 1 },  // return island
      { dx: 1410, dy: -150, w: 250, tier: 1 },  // landing approach
    ];
    this._placeSkyCloudChain(mushroomX, cloudConfigs, chainId, 3);

    const exitX = mushroomX + 1670;
    this.addMushroomPlatform(exitX, GROUND_Y - 20, true, chainId);
    this.platforms[this.platforms.length - 1].width = 120;
  }

  // ── Shared helper: place a cloud chain and add tokens ──────────────────────
  // peakIndex: index of the cloud that gets the special power-up (-1 = auto pick highest)
  _placeSkyCloudChain(
    mushroomX: number,
    configs: { dx: number; dy: number; w: number; tier: number }[],
    chainId: string,
    peakIndex: number,
  ) {
    // Auto-find highest (most negative dy) if peakIndex is -1
    let resolvedPeak = peakIndex;
    if (resolvedPeak < 0) {
      let minDy = 0;
      configs.forEach((c, i) => { if (c.dy < minDy) { minDy = c.dy; resolvedPeak = i; } });
    }

    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const cx = mushroomX + cfg.dx;
      const cy = GROUND_Y + cfg.dy;
      this.addCloudPlatformTiered(cx, cy, cfg.w, cfg.tier, true, chainId);

      // Leaf token above every cloud
      this.collectibles.push({
        x: cx + cfg.w / 2 - 12,
        y: cy - 38,
        width: 24, height: 24,
        type: 'leafToken',
        collected: false,
        bobOffset: this.random() * Math.PI * 2,
        sparkle: 0,
      });

      // Arc of 3 coins between consecutive clouds (guides the player's eye)
      if (i < configs.length - 1) {
        const next = configs[i + 1];
        const nx = mushroomX + next.dx;
        const ny = GROUND_Y + next.dy;
        const arcCx = cx + cfg.w * 0.5;
        const arcCy = cy;
        const arcNx = nx + next.w * 0.5;
        const arcNy = ny;
        for (let ci = 1; ci <= 3; ci++) {
          const t = ci / 4;
          const coinX = arcCx + (arcNx - arcCx) * t;
          const peakH = Math.abs(arcNy - arcCy) * 0.5 + 30;
          const coinY = arcCy + (arcNy - arcCy) * t - Math.sin(t * Math.PI) * peakH;
          this.collectibles.push({
            x: coinX - 12, y: coinY,
            width: 24, height: 24,
            type: 'leafToken',
            collected: false,
            bobOffset: this.random() * Math.PI * 2,
            sparkle: 0,
          });
        }
      }
    }

    // Special power-up on the peak cloud
    if (resolvedPeak >= 0 && resolvedPeak < configs.length) {
      const highCfg = configs[resolvedPeak];
      const specialTypes: Collectible['type'][] = ['star', 'leafWings', 'speedBoots', 'acornShield', 'petalFloat'];
      this.collectibles.push({
        x: mushroomX + highCfg.dx + highCfg.w * 0.7 - 12,
        y: GROUND_Y + highCfg.dy - 42,
        width: 24, height: 24,
        type: specialTypes[Math.floor(this.random() * specialTypes.length)],
        collected: false,
        bobOffset: this.random() * Math.PI * 2,
        sparkle: 0,
      });
    }
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
  private parseColorRGB(color: string): [number, number, number] {
    if (color.startsWith('#')) {
      const hex = color.length === 4
        ? color.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3')
        : color;
      return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ];
    }
    const m = color.match(/\d+/g);
    if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
    return [128, 128, 128];
  }

  lightenColor(color: string, amount: number): string {
    const [r, g, b] = this.parseColorRGB(color);
    return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
  }

  darkenColor(color: string, amount: number): string {
    const [r, g, b] = this.parseColorRGB(color);
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

    // Hard mode platform mechanics (before collision so positions are current)
    this.updateHardPlatforms(dt);

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
      // Apply speed boost to player movement
      if (p.speedBoost) {
        targetVx *= 1.5;
      }
      // Foxfire Dash adds extra speed and leaves a blue flame trail
      if (p.foxfireDashActive) {
        targetVx *= 1.3;
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

    // Gravity + jump hold (petalFloat slows descent even without glide input)
    const effectiveGravity = p.gliding ? GLIDE_GRAVITY
      : p.petalFloatActive ? GLIDE_GRAVITY * 1.4
      : GRAVITY;
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
      // Hard Mode: skip falling crumbling platforms
      if (this.gameMode === 'hard' && plat.type === 'crumbling' && plat.falling) continue;

      // Hard Mode: breakableBridge — per-plank collision
      if (this.gameMode === 'hard' && plat.type === 'breakableBridge' && plat.bridgePlanks) {
        const plankCount = plat.bridgePlanks.length;
        const plankW = plat.width / plankCount;
        let landedOnBridge = false;
        for (let bi = 0; bi < plankCount; bi++) {
          if (plat.bridgePlanks[bi]) continue; // broken plank — fall through
          const plankPlat: Platform = {
            ...plat,
            x: plat.x + bi * plankW,
            width: plankW,
          };
          if (this.checkPlatformCollision(p, plankPlat)) {
            if (p.vy >= 0) {
              p.y = plat.y - p.height;
              p.vy = 0;
              p.grounded = true;
              p.doubleJumped = false;
              p.gliding = false;
              landedOnBridge = true;
              // Start this plank timer if not started
              if (plat.bridgePlankTimers && plat.bridgePlankTimers[bi] < 0) {
                plat.bridgePlankTimers[bi] = 30;
              }
            }
          }
        }
        if (landedOnBridge) continue;
        continue; // skip normal collision for breakableBridge
      }

      // Hard Mode: vineSwing — grab when player jumps near vine
      if (this.gameMode === 'hard' && plat.type === 'vineSwing') {
        const cx = plat.x + plat.width / 2;
        const dist = Math.abs(p.x + p.width / 2 - cx);
        const grabRange = this.isTouchDevice ? 50 : 30;
        if (dist < grabRange && this.jumpHeld && !plat.vineGrabbed) {
          plat.vineGrabbed = true;
        }
        // Normal landing on the vine seat
        if (this.checkPlatformCollision(p, plat)) {
          if (p.vy >= 0) {
            p.y = plat.y - p.height;
            p.vy = 0;
            p.grounded = true;
            p.doubleJumped = false;
            p.gliding = false;
            plat.vineGrabbed = true;
          }
        }
        continue;
      }

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

          // Hard Mode landing effects
          if (this.gameMode === 'hard') {
            if (plat.type === 'crumbling' && plat.crumblingTimer === undefined) {
              // Mobile gets 0.3s extra grace time on crumbling platforms
              const mobileBonus2 = this.isTouchDevice ? 0.3 : 0;
              plat.crumblingTimer = (plat.crumblingMax ?? 0.8) + mobileBonus2;
            }
            if (plat.type === 'flowerLift' && !plat.liftActive) {
              plat.liftActive = true;
              plat.liftPetalAngle = 0;
              plat.liftTimer = 0;
              this.spawnParticles(p.x + p.width / 2, plat.y, 6, '#66BB6A', 'sparkle');
            }
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

    // ── Depth-fall danger system ──────────────────────────────────────────────
    this.pitDepth = Math.max(0, p.y - GROUND_Y);
    if (this.pitDepth > 0 && !p.grounded) {
      // Increasing camera shake the deeper you fall
      if (this.pitDepth > 80 && this.frameCount % 30 === 0) {
        this.cameraShake = Math.min(4, this.pitDepth / 60);
      }
      // Spawn shadow bats flying past when deep enough
      this.depthBatTimer--;
      const batSpawnInterval = this.pitDepth > 200 ? 20 : this.pitDepth > 100 ? 40 : 70;
      if (this.depthBatTimer <= 0 && this.pitDepth > 60) {
        this.depthBatTimer = batSpawnInterval;
        const batSide = this.random() > 0.5 ? 1 : -1;
        this.particles.push({
          x: p.x + batSide * (40 + this.random() * 60),
          y: p.y + (this.random() - 0.3) * 60,
          vx: -batSide * (3 + this.random() * 2),
          vy: (this.random() - 0.5) * 2,
          life: 40 + Math.floor(this.random() * 20),
          maxLife: 60,
          color: this.pitDepth > 250 ? '#AA0000' : '#555577',
          size: 5 + this.random() * 4,
          type: 'damage',
        });
      }
    } else {
      this.pitDepth = 0;
      this.depthBatTimer = 0;
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

    // Generous collision window: feet must be within [plat.y - 32, plat.y + plat.height + 8]
    // The extra upward slack (32px) catches fast-falling players who overshoot one frame.
    return (
      p.x + pw > plat.x + 2 && p.x + 2 < plat.x + plat.width &&
      p.y + ph >= plat.y - 32 && p.y + ph <= plat.y + plat.height + 8 &&
      p.vy >= 0
    );
  }

  updatePlatforms(speed: number) {
    // 3 screens of history is enough — reduces memory on long runs
    const cleanupDistance = this.player.x - CANVAS_WIDTH * 3;
    this.platforms = this.platforms.filter(p => p.x + p.width > cleanupDistance);
  }

  updateCraftedItems(dt: number) {
    const cleanupDistance = this.player.x - CANVAS_WIDTH * 3;
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
    this.collectibles = this.collectibles.filter(c => c.x > this.player.x - CANVAS_WIDTH * 3);
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
      case 'leafToken': {
        const tokenMult = this.gameMode === 'hard' ? HARD_MODE.coinValueMultiplier : 1;
        const tokenGain = Math.floor(this.state.multiplier * tokenMult);
        this.state.leafTokens += tokenGain;
        this.state.totalLeafTokens += tokenGain;
        Audio.playLeafToken();
        break;
      }
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
      // New power-ups
      case 'acornShield': this.activatePowerUp('acornShield'); break;
      case 'foxfireDash': this.activatePowerUp('foxfireDash'); break;
      case 'petalFloat': this.activatePowerUp('petalFloat'); break;
      case 'rootSnare': this.activatePowerUp('rootSnare'); break;
      case 'mushroomBounce': this.activatePowerUp('mushroomBounce'); break;
      case 'starlightCompass': this.activatePowerUp('starlightCompass'); break;
      case 'treasureCache':
        // Grant 50 bonus tokens
        this.state.leafTokens += 50;
        this.state.totalLeafTokens += 50;
        this.spawnParticles(c.x, c.y, 25, '#FFD700', 'sparkle');
        Audio.playLeafToken();
        break;
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
      acornShield: '#FFD700', foxfireDash: '#2979FF', petalFloat: '#F48FB1',
      rootSnare: '#66BB6A', mushroomBounce: '#FF6B6B', starlightCompass: '#FFD700',
      treasureCache: '#FFD700',
    };
    this.spawnParticles(c.x, c.y, 8, colors[c.type] || '#FFD700', 'collect');
  }

  activatePowerUp(type: PowerUpType, storeInstead: boolean = false) {
    this.showTipOnce('firstPowerUp');
    // If player already has an active power-up and storeInstead, store it
    if (storeInstead && this.state.storedPowerUp === null) {
      this.state.storedPowerUp = type;
      this.spawnParticles(this.player.x, this.player.y, 8, '#FFD700', 'sparkle');
      return;
    }

    this.player.activePowerUp = type;
    Audio.playPowerUp();

    const newPowerUps = ['acornShield', 'foxfireDash', 'petalFloat', 'rootSnare', 'mushroomBounce', 'starlightCompass'];
    if (newPowerUps.includes(type)) {
      // New power-ups don't use the shared timer — they use their own logic
      switch (type) {
        case 'acornShield':
          this.player.acornShieldActive = true;
          this.player.powerUpTimer = 99999; // Lasts until hit
          break;
        case 'foxfireDash':
          this.player.foxfireDashActive = true;
          this.player.speedBoost = true;
          this.player.powerUpTimer = 300; // 5s
          break;
        case 'petalFloat':
          this.player.petalFloatActive = true;
          this.player.hasLeafWings = true;
          this.player.powerUpTimer = 480; // 8s
          break;
        case 'rootSnare':
          this.player.rootSnareActive = true;
          this.player.powerUpTimer = 99999; // One-use, lasts until triggered
          break;
        case 'mushroomBounce':
          this.player.mushroomBounceCount = 3;
          this.player.powerUpTimer = 600;
          break;
        case 'starlightCompass':
          this.player.starlightCompassActive = true;
          this.player.powerUpTimer = 600; // 10s
          break;
      }
    } else {
      this.player.powerUpTimer = POWERUP_DURATION;
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
    }

    this.spawnParticles(this.player.x, this.player.y, 12, '#FFD700', 'powerUpAura');
    this.showEducationOverlay?.(type, { x: this.player.x, y: this.player.y });
    this.cameraShake = 3;
  }

  // Activate the stored power-up manually
  useStoredPowerUp() {
    if (!this.state.storedPowerUp) return;
    const type = this.state.storedPowerUp;
    this.state.storedPowerUp = null;
    this.activatePowerUp(type);
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

      // Hard Mode: skip collision for dazed bears, safe thornlings, scattered swarms
      const isHardEnemy = o.type === 'bumbleBear' || o.type === 'thornling' ||
                          o.type === 'fireflySwarm' || o.type === 'shadowWisp';

      // BumbleBear head-stomp → enter ALERT state (not instant charge)
      if (this.gameMode === 'hard' && o.type === 'bumbleBear' &&
          o.aiState === 'patrol') {
        const headStompTop = o.y - 8;
        const headStompBottom = o.y + 12;
        if (p.vy > 0 && p.x + pw > o.x + 6 && p.x < o.x + o.width - 6 &&
            p.y + ph >= headStompTop && p.y + ph <= headStompBottom) {
          o.aiState = 'alert';
          o.alertTimer = 18; // 0.3s alert pause
          p.vy = -10;
          p.grounded = false;
          this.spawnParticles(o.x + o.width / 2, o.y, 8, '#FFD740', 'sparkle');
          this.cameraShake = 4;
        }
      }

      // Thornling: safe when retracted → player bounce on head, enter bounce state
      if (this.gameMode === 'hard' && o.type === 'thornling' &&
          !o.spikesExtended && o.aiState !== 'spikes_extended' && o.aiState !== 'telegraph') {
        const headY = o.y - 8;
        if (p.vy > 0 && p.x + pw > o.x + 4 && p.x < o.x + o.width - 4 &&
            p.y + ph >= headY && p.y + ph <= o.y + 12) {
          p.vy = JUMP_FORCE * 1.2;
          p.grounded = false;
          o.aiState = 'bounce';
          o.bounceTimer = 14;
          this.spawnParticles(o.x + o.width / 2, o.y, 8, '#A5D6A7', 'sparkle');
          continue;
        }
      }

      // Collision
      if (!p.invincible && this.respawnTimer <= 0) {
        // Mobile: larger shrink = more forgiving hitbox (easier to dodge on small screens)
        const hitboxBonus = this.isTouchDevice ? 8 : 4;
        if (p.x + pw > o.x + hitboxBonus && p.x < o.x + o.width - hitboxBonus &&
            p.y + ph > o.y + hitboxBonus && p.y < o.y + o.height - hitboxBonus) {

          // BumbleBear: dazed/alert/recover = invulnerable, no damage
          if (o.type === 'bumbleBear') {
            const bs = o.aiState ?? 'patrol';
            if (bs === 'dazed' || bs === 'alert' || bs === 'recover') continue;
          }
          // Thornling: safe when retracted (patrol/bounce/recover states)
          if (o.type === 'thornling') {
            if (!o.spikesExtended && o.aiState !== 'spikes_extended') continue;
          }
          // FireflySwarm: contact drains 1 coin (not death); foxfire scatter → bridge
          if (o.type === 'fireflySwarm') {
            // Bridge state: player can walk on it (handled as collision-free pass)
            if (o.aiState === 'bridge') continue;
            if (this.state.leafTokens > 0) {
              this.state.leafTokens -= 1;
              this.spawnParticles(p.x, p.y, 5, '#FFEB3B', 'sparkle');
              p.invincible = true;
              setTimeout(() => { p.invincible = false; }, 800);
            }
            if (p.foxfireDashActive) {
              // Scatter → reform as bridge
              o.aiState = 'scatter';
              o.scatterTimer = 0;
              o.reformBridge = true;
              if (o.swarmIndividuals) {
                for (const ind of o.swarmIndividuals) {
                  const dx2 = ind.x - o.x, dy2 = ind.y - o.y;
                  ind.phase = Math.atan2(dy2, dx2);
                  ind.vx = Math.cos(ind.phase) * (3 + this.random() * 2);
                  ind.vy = Math.sin(ind.phase) * 2 - 0.5;
                }
              }
              this.spawnParticles(o.x + o.width / 2, o.y, 14, '#FFEB3B', 'sparkle');
            }
            continue;
          }
          // ShadowWisp: flee if player has shield (acorn absorbs), otherwise coin drain
          if (o.type === 'shadowWisp') {
            if (p.acornShieldActive) {
              p.acornShieldActive = false;
              p.activePowerUp = null;
              p.powerUpTimer = 0;
              o.aiState = 'flee';
              o.fleeActive = true;
              this.spawnParticles(o.x + o.width / 2, o.y, 12, '#7B1FA2', 'sparkle');
              this.cameraShake = 3;
              continue;
            }
            if (o.aiState === 'flee') continue; // fleeing = harmless
            // Drain 3 coins
            this.state.leafTokens = Math.max(0, this.state.leafTokens - 3);
            this.spawnParticles(p.x, p.y, 10, '#7B1FA2', 'sparkle');
            this.cameraShake = 6;
            p.invincible = true;
            setTimeout(() => { p.invincible = false; }, 1200);
            continue;
          }

          // Normal hit handling
          if (p.hasShield) {
            p.hasShield = false;
            p.activePowerUp = null;
            p.powerUpTimer = 0;
            this.spawnParticles(o.x, o.y, 10, '#9C27B0', 'sparkle');
            o.x = isHardEnemy ? -9999 : -200;
          } else {
            this.handleDeath();
          }
        }
      }
    }
    this.obstacles = this.obstacles.filter(o => o.x > this.player.x - CANVAS_WIDTH * 3);
  }

  handleDeath() {
    // Root Snare: catches the player once before death
    if (this.player.rootSnareActive) {
      this.player.rootSnareActive = false;
      this.player.activePowerUp = null;
      this.player.powerUpTimer = 0;
      // Teleport player back to safe ground
      this.player.vy = -8;
      this.player.y = GROUND_Y - 80;
      this.spawnParticles(this.player.x, this.player.y, 20, '#4CAF50', 'sparkle');
      this.cameraShake = 5;
      return;
    }
    // Acorn Shield: absorbs one hit (enemy/hazard)
    if (this.player.acornShieldActive) {
      this.player.acornShieldActive = false;
      this.player.activePowerUp = null;
      this.player.powerUpTimer = 0;
      this.spawnParticles(this.player.x, this.player.y, 15, '#FFD700', 'sparkle');
      this.cameraShake = 4;
      return;
    }
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
    // Cap for mid-tier mobile performance — drop oldest when over limit
    const MAX_PARTICLES = this.isTouchDevice ? 200 : 400;
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }

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

  // ── Hard Mode platform mechanics update ────────────────────────────────────
  updateHardPlatforms(dt: number) {
    if (this.gameMode !== 'hard') return;
    const p = this.player;
    const toRemove: Platform[] = [];

    for (const plat of this.platforms) {
      // ── Crumbling ──────────────────────────────────────────────────────────
      if (plat.type === 'crumbling') {
        // Only tick when player is standing on this platform
        const onPlat = p.grounded &&
          p.x + p.width > plat.x + 2 && p.x < plat.x + plat.width - 2 &&
          Math.abs((p.y + p.height) - plat.y) < 6;
        if (onPlat && plat.crumblingTimer !== undefined && plat.crumblingTimer > 0) {
          plat.crumblingTimer -= dt / 60;
          const max = plat.crumblingMax ?? 0.8;
          plat.crackLevel = Math.min(2, Math.floor((1 - plat.crumblingTimer / max) * 3));
          if (plat.crumblingTimer <= 0) {
            plat.falling = true;
            plat.crackLevel = 2;
            this.spawnParticles(plat.x + plat.width / 2, plat.y, 8, '#9E9E9E', 'landing');
          }
        }
        // Once falling, drift down and remove
        if (plat.falling) {
          plat.y += 4 * dt;
          plat.fallTimer = (plat.fallTimer ?? 0) + dt;
          if (plat.fallTimer > 30) toRemove.push(plat);
        }
      }

      // ── FlowerLift ─────────────────────────────────────────────────────────
      if (plat.type === 'flowerLift' && plat.liftActive) {
        // Phase 1: petals open over ~12 frames
        if (plat.liftPetalAngle !== undefined && plat.liftPetalAngle < 1) {
          plat.liftPetalAngle = Math.min(1, plat.liftPetalAngle + dt / 12);
        }
        // Phase 2: lift player for 60 frames (1s)
        if ((plat.liftPetalAngle ?? 0) >= 1) {
          plat.liftTimer = (plat.liftTimer ?? 0) + dt;
          if ((plat.liftTimer ?? 0) < 60) {
            // Only push up if player is still above this platform
            const onPlat = p.x + p.width > plat.x && p.x < plat.x + plat.width &&
              p.y + p.height > plat.y - 40 && p.y + p.height < plat.y + 20;
            if (onPlat) {
              p.vy = -4;
              p.grounded = false;
            }
          } else {
            plat.liftActive = false;
          }
        }
      }

      // ── VineSwing ──────────────────────────────────────────────────────────
      if (plat.type === 'vineSwing') {
        const angle = plat.vineAngle ?? 0;
        const angVel = plat.vineAngularVel ?? 0.25;
        const len = plat.vineLength ?? 120;
        const anchorX = plat.vineAnchorX ?? (plat.x + plat.width / 2);
        const anchorY = plat.vineAnchorY ?? (plat.y - len);

        // Pendulum physics
        const newAngVel = angVel + (-0.003 * Math.sin(angle)) * dt;
        const damped = newAngVel * 0.999; // tiny damping so it doesn't go forever
        const newAngle = Math.max(-0.4, Math.min(0.4, angle + damped * dt));
        plat.vineAngularVel = damped;
        plat.vineAngle = newAngle;

        // Update platform (seat) position to follow pendulum
        plat.x = anchorX + Math.sin(newAngle) * len - plat.width / 2;
        plat.y = anchorY + Math.cos(newAngle) * len;
        // Keep anchor refs stable
        plat.vineAnchorX = anchorX;
        plat.vineAnchorY = anchorY;

        // If player is grabbed, carry them with the pendulum
        if (plat.vineGrabbed) {
          p.x = plat.x + plat.width / 2 - p.width / 2;
          p.y = plat.y - p.height;
          // Let the pendulum drive horizontal motion; kill vertical fall only
          p.vy = 0;
          p.grounded = true;
          // Add player momentum into angular velocity (makes swing feel reactive)
          if (Math.abs(p.vx) > 1) {
            plat.vineAngularVel = (plat.vineAngularVel ?? 0) + p.vx * 0.002;
          }
          p.vx = 0;
        }
      }

      // ── BreakableBridge ────────────────────────────────────────────────────
      if (plat.type === 'breakableBridge' && plat.bridgePlanks && plat.bridgePlankTimers) {
        const plankCount = plat.bridgePlanks.length;
        const plankW = plat.width / plankCount;

        for (let i = 0; i < plankCount; i++) {
          if (plat.bridgePlanks[i]) continue; // already broken
          const plankX = plat.x + i * plankW;

          // Check if player stands on this plank
          const onPlank = p.grounded &&
            p.x + p.width > plankX + 2 && p.x < plankX + plankW - 2 &&
            Math.abs((p.y + p.height) - plat.y) < 6;

          if (onPlank && plat.bridgePlankTimers[i] < 0) {
            // Start breaking this plank (30 frame countdown)
            plat.bridgePlankTimers[i] = 30;
          }

          if (plat.bridgePlankTimers[i] >= 0) {
            plat.bridgePlankTimers[i] -= dt;
            if (plat.bridgePlankTimers[i] <= 0) {
              plat.bridgePlanks[i] = true;
              this.spawnParticles(plankX + plankW / 2, plat.y, 4, '#8D6E63', 'landing');
              // Spread to neighbours with shorter delay
              if (i > 0 && !plat.bridgePlanks[i - 1] && plat.bridgePlankTimers[i - 1] < 0) {
                plat.bridgePlankTimers[i - 1] = 18;
              }
              if (i < plankCount - 1 && !plat.bridgePlanks[i + 1] && plat.bridgePlankTimers[i + 1] < 0) {
                plat.bridgePlankTimers[i + 1] = 18;
              }
            }
          }
        }
      }
    }

    // Remove fallen crumbling platforms
    for (const plat of toRemove) {
      const idx = this.platforms.indexOf(plat);
      if (idx > -1) this.platforms.splice(idx, 1);
    }
  }

  // ── Hard Mode enemy AI update ──────────────────────────────────────────────
  updateHardEnemies(dt: number) {
    if (this.gameMode !== 'hard') return;
    const p = this.player;

    for (const o of this.obstacles) {
      o.bounceOffset += dt * 0.1; // shared animation tick

      switch (o.type) {

        // ── BumbleBear — patrol → alert → charge → dazed → recover ──────
        case 'bumbleBear': {
          if (!o.aiState) o.aiState = 'patrol';
          const state = o.aiState;

          // ── recover ──
          if (state === 'recover') {
            o.recoverTimer = (o.recoverTimer ?? 0) - dt;
            if ((o.recoverTimer ?? 0) <= 0) {
              o.aiState = 'patrol';
              o.patrolStart = o.x - 60;
              o.patrolEnd   = o.x + 60;
            }
            break;
          }

          // ── dazed ──
          if (state === 'dazed') {
            o.dazedTimer = (o.dazedTimer ?? 0) - dt;
            // Wobbly sideways motion
            o.x += Math.sin(o.bounceOffset * 8) * 0.8 * dt;
            if ((o.dazedTimer ?? 0) <= 0) {
              o.aiState = 'recover';
              o.recoverTimer = 30;
            }
            break;
          }

          // ── alert — brief pause before charging (0.3s = 18 frames) ──
          if (state === 'alert') {
            o.alertTimer = (o.alertTimer ?? 0) - dt;
            // Micro anticipation bob
            o.y += Math.sin(o.bounceOffset * 20) * 0.5 * dt;
            if ((o.alertTimer ?? 0) <= 0) {
              o.aiState = 'charge';
              o.chargeTimer = 120;  // 2s at 60fps
              o.chargeActive = true;
              // Face player at moment of charge
              o.direction = Math.sign(p.x - o.x) as 1 | -1;
              this.spawnParticles(o.x + o.width / 2, o.y + o.height, 8, '#BCAAA4', 'dust');
            }
            break;
          }

          // ── charge ──
          if (state === 'charge') {
            o.chargeTimer = (o.chargeTimer ?? 0) - dt;
            o.x += 130 * o.direction * dt / 60;

            // Smash breakable/crumbling platforms in path
            for (const plat of this.platforms) {
              if ((plat.type === 'breakableBridge' || plat.type === 'crumbling') &&
                  o.x + o.width > plat.x && o.x < plat.x + plat.width &&
                  Math.abs(o.y - plat.y) < 40) {
                if (plat.type === 'breakableBridge' && plat.bridgePlanks) {
                  plat.bridgePlanks.fill(true);
                }
                if (plat.type === 'crumbling') {
                  plat.crumblingTimer = 0;
                  plat.falling = true;
                }
              }
            }

            // Collect coins in charge path
            for (const c of this.collectibles) {
              if (!c.collected &&
                  c.x > o.x && c.x < o.x + o.direction * 60 &&
                  Math.abs(c.y - o.y) < 50) {
                c.collected = true;
                this.state.leafTokens += 1;
                this.state.totalLeafTokens += 1;
              }
            }

            // Hit wall / patrol edge → daze
            const hitWall = o.x < 10 || o.x > p.x + 1200;
            if ((o.chargeTimer ?? 0) <= 0 || hitWall) {
              o.aiState = 'dazed';
              o.chargeActive = false;
              o.dazedTimer = 90;  // 1.5s dazed
              this.cameraShake = 6;
              this.spawnParticles(o.x + o.width / 2, o.y + o.height, 15, '#8D6E63', 'dust');
            }
            break;
          }

          // ── patrol (default) ──
          {
            const start = o.patrolStart ?? o.x - 80;
            const end   = o.patrolEnd   ?? o.x + 80;
            o.x += 32 * o.direction * dt / 60;
            if (o.x <= start) { o.x = start; o.direction = 1; }
            if (o.x >= end)   { o.x = end;   o.direction = -1; }
          }
          break;
        }

        // ── Thornling — patrol → telegraph → extended → retract (→ bounce) ─
        case 'thornling': {
          if (!o.aiState) o.aiState = 'patrol';
          const ts = o.aiState;

          // ── bounce — flattened after player stomp ──
          if (ts === 'bounce') {
            o.bounceTimer = (o.bounceTimer ?? 0) - dt;
            if ((o.bounceTimer ?? 0) <= 0) {
              o.aiState = 'patrol';
              o.spikeTimer = 0;
            }
            break;
          }

          // ── spike extension cycle ──
          o.spikeTimer = (o.spikeTimer ?? 0) + dt;

          // Proximity: player within 70px → cycle starts sooner
          const playerNear = Math.abs(p.x - o.x) < 70 && Math.abs(p.y - o.y) < 60;
          const cycleLen = playerNear ? 80 : 120;      // 1.3s or 2s
          const telegraphLen = 18;                       // 0.3s
          const extendLen = 60;                          // 1s

          if (o.spikeTimer >= cycleLen + telegraphLen + extendLen) {
            // Full cycle done → retract
            o.spikeTimer = 0;
            o.spikesExtended = false;
            o.telegraphTimer = 0;
            o.aiState = 'patrol';
          } else if (o.spikeTimer >= cycleLen + telegraphLen) {
            o.spikesExtended = true;
            o.telegraphTimer = 0;
            o.aiState = 'spikes_extended';
          } else if (o.spikeTimer >= cycleLen) {
            o.telegraphTimer = (o.spikeTimer - cycleLen) / telegraphLen; // 0→1
            o.spikesExtended = false;
            o.aiState = 'telegraph';
          }

          // Patrol movement — slower when spiked
          const tSpeed = o.spikesExtended ? 14 : (ts === 'telegraph' ? 18 : 42);
          const tStart = o.patrolStart ?? o.x - 80;
          const tEnd   = o.patrolEnd   ?? o.x + 80;
          o.x += tSpeed * o.direction * dt / 60;
          if (o.x <= tStart) { o.x = tStart; o.direction = 1; }
          if (o.x >= tEnd)   { o.x = tEnd;   o.direction = -1; }
          break;
        }

        // ── FireflySwarm — swarm → scatter → reform → bridge → return ───
        case 'fireflySwarm': {
          if (!o.aiState) { o.aiState = 'swarm'; o.baseY = o.y; }
          const fs = o.aiState;
          const baseY = o.baseY ?? o.y;

          if (fs === 'scatter') {
            o.scatterTimer = (o.scatterTimer ?? 0) + dt;
            if (o.swarmIndividuals) {
              for (const ind of o.swarmIndividuals) {
                ind.x += (ind.vx ?? Math.cos(ind.phase) * 2) * dt;
                ind.y += (ind.vy ?? Math.sin(ind.phase) * 1.5 - 0.3) * dt;
                if (ind.vx) ind.vx *= 0.96;
                if (ind.vy) ind.vy *= 0.96;
              }
            }
            // After ~1.5s (90 frames) → start reforming
            if ((o.scatterTimer ?? 0) > 90) {
              o.aiState = 'reform';
              o.reformTimer = 120; // 2s reform
              o.scatterTimer = 0;
            }
            break;
          }

          if (fs === 'reform') {
            o.reformTimer = (o.reformTimer ?? 0) - dt;
            const progress = 1 - Math.max(0, (o.reformTimer ?? 0) / 120);
            if (o.swarmIndividuals) {
              for (let i = 0; i < o.swarmIndividuals.length; i++) {
                const ind = o.swarmIndividuals[i];
                const spiralAngle = ind.phase + progress * Math.PI * 4;
                const radius = 80 * (1 - progress) + 14;
                const tx = o.x + Math.cos(spiralAngle) * radius;
                const ty = baseY + Math.sin(spiralAngle) * radius * 0.6;
                ind.x += (tx - ind.x) * 0.12 * dt;
                ind.y += (ty - ind.y) * 0.12 * dt;
              }
            }
            if ((o.reformTimer ?? 0) <= 0) {
              // Check for gap ahead → form bridge; otherwise resume swarm
              const gapAhead = this._swarmGapAhead(o);
              if (gapAhead && o.reformBridge) {
                o.aiState = 'bridge';
                o.bridgeTimer = 300; // 5s bridge
                this._swarmFormBridge(o, gapAhead);
              } else {
                o.aiState = 'swarm';
                o.reformBridge = false;
              }
            }
            break;
          }

          if (fs === 'bridge') {
            o.bridgeTimer = (o.bridgeTimer ?? 0) - dt;
            // Pulse brightness tracked via individual phase
            if (o.swarmIndividuals) {
              for (const ind of o.swarmIndividuals) ind.phase += 0.06 * dt;
            }
            // Player crossed bridge or time up → disperse
            const playerCrossed = p.x > o.x + 80;
            if ((o.bridgeTimer ?? 0) <= 0 || playerCrossed) {
              o.aiState = 'swarm';
              o.reformBridge = false;
              o.bridgeTimer = 0;
            }
            break;
          }

          // ── swarm (default) ──
          {
            const fStart = o.patrolStart ?? o.x - 80;
            const fEnd   = o.patrolEnd   ?? o.x + 80;
            o.x += 50 * o.direction * dt / 60;
            if (o.x <= fStart) { o.x = fStart; o.direction = 1; }
            if (o.x >= fEnd)   { o.x = fEnd;   o.direction = -1; }

            // Sine-wave individuals
            if (o.swarmIndividuals) {
              for (let i = 0; i < o.swarmIndividuals.length; i++) {
                const ind = o.swarmIndividuals[i];
                ind.phase += 0.04 * dt;
                ind.x = o.x + (i - 2.5) * 14 + Math.sin(ind.phase * 0.5) * 8;
                ind.y = baseY + Math.sin(o.x * 0.02 + ind.phase) * 30;
              }
            }
          }
          break;
        }

        // ── ShadowWisp — drift → chase → flee ───────────────────────────
        case 'shadowWisp': {
          if (!o.aiState) { o.aiState = 'drift'; o.baseY = o.y; }
          const ws = o.aiState;
          const baseY2 = o.baseY ?? o.y;

          const distToPlayer = Math.hypot(p.x + p.width / 2 - (o.x + o.width / 2),
                                           p.y + p.height / 2 - (o.y + o.height / 2));
          const playerHasShield = p.acornShieldActive || p.hasShield;
          const playerInFront = (o.direction === 1 && p.x > o.x) ||
                                  (o.direction === -1 && p.x < o.x);

          // ── state transitions ──
          if (ws === 'drift' && distToPlayer < 120 && playerInFront) {
            o.aiState = 'chase';
            o.chaseActive = true;
          } else if (ws === 'chase' && playerHasShield) {
            o.aiState = 'flee';
            o.chaseActive = false;
            o.fleeActive = true;
          } else if (ws === 'chase' && distToPlayer > 200) {
            o.aiState = 'drift';
            o.chaseActive = false;
          } else if (ws === 'flee' && distToPlayer > 280) {
            o.aiState = 'drift';
            o.fleeActive = false;
          }

          // ── state behaviours ──
          if (ws === 'chase') {
            // Move toward player horizontally, track vertically
            o.direction = Math.sign(p.x - o.x) as 1 | -1;
            o.x += 70 * o.direction * dt / 60;
            const targetY = p.y - 10;
            o.y += (targetY - o.y) * 0.04 * dt;
          } else if (ws === 'flee') {
            // Move away from player, rise up
            o.direction = -Math.sign(p.x - o.x) as 1 | -1;
            o.x += 100 * o.direction * dt / 60;
            o.y -= 25 * dt / 60; // rise
          } else {
            // drift: patrol + gentle sine vertical
            const wStart = o.patrolStart ?? o.x - 100;
            const wEnd   = o.patrolEnd   ?? o.x + 100;
            o.x += 50 * o.direction * dt / 60;
            if (o.x <= wStart) { o.x = wStart; o.direction = 1; }
            if (o.x >= wEnd)   { o.x = wEnd;   o.direction = -1; }
            o.driftPhase = (o.driftPhase ?? 0) + 0.03 * dt;
            const targetY2 = baseY2 + Math.sin(o.driftPhase) * 35;
            o.y += (targetY2 - o.y) * 0.05 * dt;
          }
          break;
        }
      }
    }
  }

  // Helper: detect gap ahead of firefly swarm
  _swarmGapAhead(o: Obstacle): { startX: number; endX: number } | null {
    const ahead = o.x + 30;
    const checkEnd = ahead + 200;
    let lastEnd = ahead;
    const sorted = this.platforms
      .filter(pl => pl.type === 'ground' && pl.x + pl.width > ahead && pl.x < checkEnd)
      .sort((a, b) => a.x - b.x);
    for (const pl of sorted) {
      if (pl.x > lastEnd + 40) {
        return { startX: lastEnd, endX: pl.x };
      }
      lastEnd = Math.max(lastEnd, pl.x + pl.width);
    }
    return null;
  }

  // Helper: position swarm individuals as a bridge across a gap
  _swarmFormBridge(o: Obstacle, gap: { startX: number; endX: number }) {
    const inds = o.swarmIndividuals;
    if (!inds) return;
    const gapWidth = gap.endX - gap.startX;
    for (let i = 0; i < inds.length; i++) {
      const t = i / Math.max(1, inds.length - 1);
      const arcY = Math.sin(t * Math.PI) * 10; // slight arc
      inds[i].x = gap.startX + gapWidth * t;
      inds[i].y = (o.baseY ?? GROUND_Y - 10) - arcY;
    }
    o.x = (gap.startX + gap.endX) / 2;
  }

  // ── Bramble King Boss ──────────────────────────────────────────────────────
  spawnBoss() {
    const arenaX = this.player.x + CANVAS_WIDTH * 0.6;
    // Build flat arena: 3 platforms
    const arenaY = GROUND_Y;
    this.platforms.push(
      { x: arenaX - 200, y: arenaY, width: 400, height: 600, type: 'ground', color: BIOME_COLORS[this.state.biome].ground },
      { x: arenaX - 80,  y: arenaY - 60, width: 120, height: 20, type: 'floating', color: '#8D6E63' },
      { x: arenaX - 180, y: arenaY - 120, width: 100, height: 20, type: 'floating', color: '#8D6E63' },
      { x: arenaX + 60,  y: arenaY - 120, width: 100, height: 20, type: 'floating', color: '#8D6E63' },
    );

    const isTutorial = this.bossEncounterCount === 0;
    this.bossEncounterCount++;
    this.state.bossEncounter = {
      phase: 1,
      health: isTutorial ? 20 : 30,  // tutorial boss: 2 phases (10 HP each)
      maxHealth: isTutorial ? 20 : 30,
      x: arenaX + 20,
      y: GROUND_Y - 80,
      arenaStartX: arenaX - 400,
      timer: 0,
      attackTimer: isTutorial ? 180 : 90, // tutorial: slower attacks
      projectiles: [],
      seeds: [],
      seedsCollected: 0,
      defeated: false,
      defeatTimer: 0,
      shakeX: 0,
      hurtTimer: 0,
      isTutorialBoss: isTutorial,
    };

    this.cameraShake = 12;
    this.spawnParticles(arenaX, GROUND_Y - 40, 30, '#2E7D32', 'sparkle');
    this.showEducationOverlay?.('bossPhase1', { x: this.player.x, y: this.player.y });
  }

  updateBoss(dt: number) {
    const boss = this.state.bossEncounter;
    if (!boss || boss.defeated) {
      // Defeat animation
      if (boss?.defeated) {
        boss.defeatTimer -= dt;
        this.spawnParticles(boss.x + 40 + (this.random() - 0.5) * 80, boss.y + 20, 3, '#FFD700', 'sparkle');
        if (boss.defeatTimer <= 0) {
          // Award 100 tokens, schedule costume unlock flag
          this.state.leafTokens += 100;
          this.state.totalLeafTokens += 100;
          this.state.bossEncounter = null;
          this.nextBossX = this.state.distance + 5000;
          this.cameraShake = 20;
          this.spawnParticles(boss.x + 40, boss.y, 50, '#FF69B4', 'sparkle');
          localStorage.setItem('flo_unlockedBrambleFox', '1');
          this.showEducationOverlay?.('bossDefeated', { x: this.player.x, y: this.player.y });
        }
      }
      return;
    }

    boss.timer += dt;
    boss.attackTimer -= dt;
    if (boss.hurtTimer > 0) boss.hurtTimer -= dt;
    boss.shakeX = boss.hurtTimer > 0 ? Math.sin(boss.timer * 1.8) * 6 : 0;

    const p = this.player;
    const phaseTime = boss.timer; // frames in current phase

    // ── Phase transitions ────────────────────────────────────────────────────
    if (boss.phase === 1 && phaseTime > 600) { // 10s
      boss.phase = 2;
      boss.timer = 0;
      boss.attackTimer = boss.isTutorialBoss ? 120 : 60; // tutorial: slower phase 2
      this.cameraShake = 10;
      this.spawnParticles(boss.x + 40, boss.y, 20, '#4CAF50', 'landing');
      this.showEducationOverlay?.('bossPhase2', { x: this.player.x, y: this.player.y });
    }
    // Tutorial boss ends at phase 2 — no phase 3 seed mechanic for first encounter
    if (!boss.isTutorialBoss && boss.phase === 2 && phaseTime > 1200) { // 20s
      boss.phase = 3;
      boss.timer = 0;
      boss.attackTimer = 30;
      boss.seedsCollected = 0;
      this.cameraShake = 14;
      this.showEducationOverlay?.('bossPhase3', { x: this.player.x, y: this.player.y });
    }

    // ── Spawn attacks ────────────────────────────────────────────────────────
    if (boss.attackTimer <= 0) {
      if (boss.phase === 1) {
        // Vine whip: horizontal sweeping projectile at ground and mid height
        for (const sweepY of [GROUND_Y - 20, GROUND_Y - 80]) {
          boss.projectiles.push({
            x: boss.x - 300, y: sweepY - 8, vx: 8, vy: 0,
            type: 'thorn', radius: 12, life: 80, maxLife: 80,
          });
        }
        // Thorn spray: 5 arcing projectiles
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI * 0.7 + (i / 4) * Math.PI * 1.4;
          boss.projectiles.push({
            x: boss.x + 40, y: boss.y + 20, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5 - 3,
            type: 'thorn', radius: 8, life: 100, maxLife: 100,
          });
        }
        boss.attackTimer = boss.isTutorialBoss ? 180 : 120; // tutorial: 3s between attacks
      } else if (boss.phase === 2) {
        // Ground slam: shockwave along ground
        boss.projectiles.push({
          x: boss.x - 20, y: GROUND_Y - 16, vx: -7, vy: 0,
          type: 'shockwave', radius: 18, life: 70, maxLife: 70,
        });
        boss.projectiles.push({
          x: boss.x + 60, y: GROUND_Y - 16, vx: 7, vy: 0,
          type: 'shockwave', radius: 18, life: 70, maxLife: 70,
        });
        boss.attackTimer = 90;
        this.cameraShake = 8;
      } else if (boss.phase === 3 && boss.seeds.length === 0 && boss.seedsCollected === 0) {
        // Spawn 3 seeds on the arena platforms
        const seedPositions = [
          { x: boss.arenaStartX + 150, y: GROUND_Y - 30 },
          { x: boss.arenaStartX + 280, y: GROUND_Y - 90 },
          { x: boss.arenaStartX + 500, y: GROUND_Y - 150 },
        ];
        for (const sp of seedPositions) {
          boss.seeds.push({
            x: sp.x, y: sp.y, vx: 0, vy: 0,
            type: 'seed', radius: 14, life: 9999, maxLife: 9999, collected: false, glowing: true,
          });
        }
        boss.attackTimer = 999;
      }
    }

    // ── Update projectiles ───────────────────────────────────────────────────
    boss.projectiles = boss.projectiles.filter(proj => {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.vy += 0.18 * dt; // gravity on thorns
      proj.life -= dt;

      // Player hit
      if (!p.invincible && this.respawnTimer <= 0) {
        const dx = p.x + p.width / 2 - proj.x;
        const dy = p.y + p.height / 2 - proj.y;
        if (Math.sqrt(dx * dx + dy * dy) < proj.radius + 14) {
          this.handleDeath();
          this.spawnParticles(proj.x, proj.y, 8, '#FF5722', 'sparkle');
          return false; // remove projectile on hit
        }
      }
      return proj.life > 0;
    });

    // ── Seed collection ──────────────────────────────────────────────────────
    for (const seed of boss.seeds) {
      if (seed.collected) continue;
      const dx = p.x + p.width / 2 - seed.x;
      const dy = p.y + p.height / 2 - seed.y;
      if (Math.sqrt(dx * dx + dy * dy) < seed.radius + 18) {
        seed.collected = true;
        boss.seedsCollected++;
        this.spawnParticles(seed.x, seed.y, 12, '#66BB6A', 'sparkle');
        // All 3 collected: auto-throw at boss
        if (boss.seedsCollected >= 3) {
          boss.health -= 10; // deal final blow
          boss.seeds = [];
          boss.seedsCollected = 0;
          this.cameraShake = 16;
          this.spawnParticles(boss.x + 40, boss.y, 30, '#FFD700', 'sparkle');
          if (boss.health <= 0) {
            boss.health = 0;
            boss.defeated = true;
            boss.defeatTimer = 180; // 3s defeat animation
          }
        }
      }
    }

    // ── Player head-stomp on boss (phases 1 & 2) ─────────────────────────────
    if (boss.phase < 3 && !boss.defeated) {
      const bossRect = { x: boss.x + 10, y: boss.y, width: 70, height: 80 };
      if (p.vy > 0 &&
          p.x + p.width > bossRect.x + 8 && p.x < bossRect.x + bossRect.width - 8 &&
          p.y + p.height >= bossRect.y - 8 && p.y + p.height <= bossRect.y + 20) {
        boss.health -= 5;
        boss.hurtTimer = 20;
        p.vy = -12; // bounce
        p.grounded = false;
        this.cameraShake = 8;
        this.spawnParticles(boss.x + 40, boss.y, 15, '#8BC34A', 'sparkle');
        if (boss.health <= 0 && boss.phase < 3) {
          boss.health = (boss.phase === 1) ? 20 : 10; // phase transitions happen by timer
        }
      }
    }
  }

  // ── Interactive Elements (Hard Mode Phase 7) ───────────────────────────────
  addInteractive(x: number) {
    const types: InteractiveType[] = ['wateringCan', 'beehive', 'seedPouch', 'compostHeap', 'gardenGnome'];
    const type = types[Math.floor(this.random() * types.length)];
    const isGnome = type === 'gardenGnome';
    this.interactives.push({
      x, y: GROUND_Y - 30,
      width: 32, height: 32,
      type, triggered: false, triggerTimer: 0,
      glowPhase: this.random() * Math.PI * 2,
      hidden: isGnome,
    });
    this.state.interactives = this.interactives;
  }

  updateInteractives(dt: number) {
    if (this.gameMode !== 'hard') return;
    const p = this.player;
    const pw = p.width, ph = p.height;

    for (const iv of this.interactives) {
      iv.glowPhase += 0.04 * dt;
      if (iv.triggerTimer > 0) iv.triggerTimer -= dt;

      // Proximity / jump detection
      const nearX = Math.abs(p.x + pw / 2 - (iv.x + iv.width / 2)) < 60;
      const nearY = Math.abs(p.y + ph - iv.y) < 50;
      const jumping = p.vy < -2;
      const landing = p.vy > 0 && p.grounded && nearY;

      if (!iv.triggered) {
        // Reveal gnome when player runs past
        if (iv.type === 'gardenGnome' && nearX) {
          iv.hidden = false;
        }

        // Trigger conditions
        const trigger =
          (iv.type === 'wateringCan'  && nearX && nearY) ||
          (iv.type === 'beehive'      && nearX && jumping) ||
          (iv.type === 'seedPouch'    && nearX && nearY) ||
          (iv.type === 'compostHeap'  && landing) ||
          (iv.type === 'gardenGnome'  && nearX && jumping && !iv.hidden);

        if (trigger) {
          iv.triggered = true;
          this._triggerInteractive(iv);
        }
      }
    }

    // Cull off-screen
    this.interactives = this.interactives.filter(iv => iv.x > this.player.x - CANVAS_WIDTH * 2);
    this.state.interactives = this.interactives;
  }

  _triggerInteractive(iv: Interactive) {
    const p = this.player;
    switch (iv.type) {
      case 'wateringCan': {
        // Grow nearest mushroom platform to full size
        let nearest: Platform | null = null;
        let minDist = 300;
        for (const plat of this.platforms) {
          if (plat.type === 'mushroom' || plat.type === 'mushroomStepper') {
            const d = Math.abs(plat.x - iv.x);
            if (d < minDist) { minDist = d; nearest = plat; }
          }
        }
        if (nearest) {
          nearest.width = Math.max(nearest.width, 120);
          this.spawnParticles(nearest.x + nearest.width / 2, nearest.y, 10, '#66BB6A', 'sparkle');
        }
        iv.triggerTimer = 60;
        this.spawnParticles(iv.x + 16, iv.y, 8, '#42A5F5', 'sparkle');
        break;
      }
      case 'beehive': {
        // Bees chase for 3s (make player slightly slower via triggerTimer)
        iv.triggerTimer = 180; // 3s at 60fps
        // Reveal 10-coin honey cache above the hive
        for (let i = 0; i < 10; i++) {
          this.collectibles.push({
            x: iv.x - 60 + i * 14, y: iv.y - 40 - Math.abs(Math.sin(i)) * 20,
            width: 24, height: 24, type: 'leafToken',
            collected: false, bobOffset: this.random() * Math.PI * 2, sparkle: 0,
          });
        }
        this.spawnParticles(iv.x + 16, iv.y, 15, '#FFD740', 'sparkle');
        this.cameraShake = 4;
        break;
      }
      case 'seedPouch': {
        // Plant at nearest dirt mound (nearest ground platform) → instant flowerLift
        let nearestGround: Platform | null = null;
        let minDist2 = 400;
        for (const plat of this.platforms) {
          if (plat.type === 'ground') {
            const d = Math.abs(plat.x + plat.width / 2 - iv.x);
            if (d < minDist2) { minDist2 = d; nearestGround = plat; }
          }
        }
        if (nearestGround) {
          this.platforms.push({
            x: nearestGround.x + nearestGround.width / 2 - 35, y: nearestGround.y,
            width: 70, height: 20,
            type: 'flowerLift', color: '#66BB6A',
            liftActive: false, liftPetalAngle: 0, liftTimer: 0,
          });
          this.spawnParticles(nearestGround.x + nearestGround.width / 2, nearestGround.y, 12, '#A5D6A7', 'sparkle');
        }
        iv.triggerTimer = 30;
        break;
      }
      case 'compostHeap': {
        // Bounce player up
        p.vy = -14;
        p.grounded = false;
        this.spawnParticles(iv.x + 16, iv.y, 12, '#8D6E63', 'landing');
        // 10% chance of a power-up
        if (this.random() < 0.10) {
          const types = ['acornShield', 'petalFloat', 'mushroomBounce', 'starlightCompass'];
          this.collectibles.push({
            x: iv.x, y: iv.y - 60,
            width: 24, height: 24,
            type: types[Math.floor(this.random() * types.length)] as unknown as 'leafToken',
            collected: false, bobOffset: 0, sparkle: 0,
          });
        }
        iv.triggerTimer = 30;
        break;
      }
      case 'gardenGnome': {
        // 5 coins pop out
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + (i - 2) * 0.3;
          this.collectibles.push({
            x: iv.x + 16 + Math.cos(angle) * 30, y: iv.y - 30 + Math.sin(angle) * 20,
            width: 24, height: 24, type: 'leafToken',
            collected: false, bobOffset: this.random() * Math.PI * 2, sparkle: 0,
          });
        }
        this.spawnParticles(iv.x + 16, iv.y, 10, '#FFD700', 'sparkle');
        this.cameraShake = 3;
        break;
      }
    }
  }

  renderInteractives(ctx: CanvasRenderingContext2D) {
    if (this.gameMode !== 'hard') return;
    const gt = this.state.gameTime;

    for (const iv of this.interactives) {
      if (iv.triggered && iv.triggerTimer <= 0 && iv.type !== 'beehive') continue;
      const pulse = 0.7 + Math.sin(iv.glowPhase + gt * 0.08) * 0.3;
      const ix = iv.x, iy = iv.y;

      ctx.save();

      // Subtle glow beacon (single firefly) to telegraph hidden elements
      if (!iv.triggered) {
        ctx.globalAlpha = pulse * 0.55;
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(ix + iv.width / 2, iy - 14 - Math.abs(Math.sin(gt * 0.07 + iv.glowPhase)) * 6, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      switch (iv.type) {
        case 'wateringCan': {
          if (iv.hidden) break;
          // Can body
          ctx.fillStyle = '#64B5F6';
          ctx.beginPath();
          ctx.roundRect(ix + 4, iy + 4, 22, 18, 4);
          ctx.fill();
          ctx.strokeStyle = '#1565C0';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Spout
          ctx.strokeStyle = '#42A5F5';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ix + 26, iy + 8);
          ctx.lineTo(ix + 34, iy + 4);
          ctx.stroke();
          // Handle
          ctx.strokeStyle = '#1565C0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ix + 15, iy + 6, 7, Math.PI, 0);
          ctx.stroke();
          // Water drops when active
          if (iv.triggerTimer > 0) {
            ctx.fillStyle = '#42A5F5';
            for (let d = 0; d < 3; d++) {
              ctx.beginPath();
              ctx.arc(ix + 34 + d * 5, iy + 4 + Math.sin(gt * 0.12 + d) * 5, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }
        case 'beehive': {
          // Hive body
          const hiveColor = iv.triggered && iv.triggerTimer > 0 ? '#FFB300' : '#F9A825';
          ctx.fillStyle = hiveColor;
          ctx.beginPath();
          ctx.ellipse(ix + 16, iy + 10, 14, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#E65100';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Stripes
          ctx.strokeStyle = '#E65100';
          ctx.lineWidth = 2;
          for (let si = 0; si < 3; si++) {
            const sy = iy + 4 + si * 8;
            ctx.beginPath();
            ctx.moveTo(ix + 4, sy);
            ctx.lineTo(ix + 28, sy);
            ctx.stroke();
          }
          // Bees chasing if triggered
          if (iv.triggered && iv.triggerTimer > 0) {
            const p2 = this.player;
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#FFD740';
            for (let bi = 0; bi < 4; bi++) {
              const bAngle = gt * 0.15 + bi * (Math.PI / 2);
              const bDist = 12 + bi * 8;
              const bx2 = p2.x + p2.width / 2 + Math.cos(bAngle) * bDist;
              const by2 = p2.y + Math.sin(bAngle) * bDist;
              ctx.beginPath();
              ctx.arc(bx2, by2, 3.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#E65100';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
          break;
        }
        case 'seedPouch': {
          if (iv.triggered) break;
          // Pouch bag
          ctx.fillStyle = '#8D6E63';
          ctx.beginPath();
          ctx.roundRect(ix + 6, iy + 6, 20, 18, [8, 8, 4, 4]);
          ctx.fill();
          ctx.strokeStyle = '#5D4037';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Tie at top
          ctx.strokeStyle = '#4CAF50';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ix + 10, iy + 6);
          ctx.bezierCurveTo(ix + 16, iy + 2, ix + 16, iy + 2, ix + 22, iy + 6);
          ctx.stroke();
          // Seeds peeking
          ctx.fillStyle = '#558B2F';
          ctx.beginPath();
          ctx.arc(ix + 13, iy + 10, 3, 0, Math.PI * 2);
          ctx.arc(ix + 19, iy + 12, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'compostHeap': {
          if (iv.triggered && iv.triggerTimer <= 0) break;
          // Mound
          ctx.fillStyle = '#6D4C41';
          ctx.beginPath();
          ctx.ellipse(ix + 16, iy + 20, 18, 10, 0, Math.PI, 0);
          ctx.fill();
          // Compost bits
          ctx.fillStyle = '#A5D6A7';
          for (let ci = 0; ci < 4; ci++) {
            ctx.beginPath();
            ctx.ellipse(ix + 7 + ci * 6, iy + 14, 3, 2, ci * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          // Bounce arrow
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#DCEDC8';
          ctx.beginPath();
          ctx.moveTo(ix + 16, iy - 2 - Math.abs(Math.sin(gt * 0.1)) * 5);
          ctx.lineTo(ix + 9, iy + 6);
          ctx.lineTo(ix + 23, iy + 6);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'gardenGnome': {
          if (iv.hidden) {
            // Hidden — just a slight bush bulge (no gnome visible)
            ctx.fillStyle = 'rgba(46,125,50,0.4)';
            ctx.beginPath();
            ctx.ellipse(ix + 16, iy + 20, 18, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          // Gnome hat
          ctx.fillStyle = '#F44336';
          ctx.beginPath();
          ctx.moveTo(ix + 16, iy);
          ctx.lineTo(ix + 8, iy + 14);
          ctx.lineTo(ix + 24, iy + 14);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#B71C1C';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Hat brim
          ctx.fillStyle = '#ECEFF1';
          ctx.beginPath();
          ctx.roundRect(ix + 6, iy + 12, 20, 4, 2);
          ctx.fill();
          // Face
          ctx.fillStyle = '#FFCC80';
          ctx.beginPath();
          ctx.arc(ix + 16, iy + 20, 8, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#37474F';
          ctx.beginPath();
          ctx.arc(ix + 13, iy + 19, 1.5, 0, Math.PI * 2);
          ctx.arc(ix + 19, iy + 19, 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Beard
          ctx.fillStyle = '#ECEFF1';
          ctx.beginPath();
          ctx.ellipse(ix + 16, iy + 26, 7, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          // Body
          ctx.fillStyle = '#1565C0';
          ctx.beginPath();
          ctx.roundRect(ix + 9, iy + 28, 14, 12, [0, 0, 3, 3]);
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
  }

  // ── Hard Mode curated scenario generator ──────────────────────────────────
  // Returns the total length (px) of the scenario placed at startX
  generateHardScenario(startX: number): number {
    const biome = BIOME_COLORS[this.state.biome];
    const difficulty = Math.min(10, 1 + this.state.distance / 555);

    // 8 scenario types — filter out recently used (no repeats within last 3)
    const allTypes = [
      'bounceChain', 'crumblingGauntlet', 'swingGap',
      'elevatorGarden', 'mushroomSteps', 'breakingBridge',
      'enemyGauntlet', 'skyHighway',
    ];
    const available = allTypes.filter(t => !this.recentScenarios.includes(t));
    const pool = available.length > 0 ? available : allTypes;
    const type = pool[Math.floor(this.random() * pool.length)];

    // Track last 3 scenarios
    this.recentScenarios.push(type);
    if (this.recentScenarios.length > 3) this.recentScenarios.shift();

    // Gap scale: harder scenarios have wider gaps
    const diffScale = 1 + (difficulty - 1) * 0.05;
    // Width scale: harder = narrower platforms
    const wScale = Math.max(0.65, 1 - (difficulty - 1) * 0.035);

    const gy = GROUND_Y; // reference ground Y

    // Helper to push a ground-level platform
    const addPlat = (type: Platform['type'], ox: number, oy: number, w: number, extra?: Partial<Platform>) => {
      const pw = Math.round(w * wScale);
      this.platforms.push({
        x: startX + Math.round(ox * diffScale),
        y: gy + oy,
        width: pw, height: oy === 0 ? 600 : 20,
        type, color: type === 'crumbling' ? '#9E9E9E' : type === 'flowerLift' ? '#66BB6A' : type === 'breakableBridge' ? '#8D6E63' : biome.ground,
        ...extra,
      });
      return pw;
    };

    // Helper to place an arc of coins between two world points
    const arcCoins = (x1: number, y1: number, x2: number, y2: number, count: number) => {
      for (let ci = 0; ci < count; ci++) {
        const t = (ci + 1) / (count + 1);
        const cx = x1 + (x2 - x1) * t;
        const peakH = 50 + Math.abs(y2 - y1) * 0.4;
        const cy = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * peakH;
        this.collectibles.push({ x: cx - 12, y: cy, width: 24, height: 24, type: 'leafToken', collected: false, bobOffset: this.random() * Math.PI * 2, sparkle: 0 });
      }
    };

    // Helper to add an enemy on a platform
    const addEnemy = (otype: Obstacle['type'], ox: number, oy: number, patrol: number) => {
      const ex = startX + Math.round(ox * diffScale);
      const ey = gy + oy - 44;
      this.obstacles.push({
        x: ex, y: ey, width: 44, height: 44,
        type: otype, speed: 35, bounceOffset: 0, direction: -1,
        patrolPattern: 'horizontal', alertState: 'idle',
        patrolStart: ex - patrol / 2, patrolEnd: ex + patrol / 2,
        spikeTimer: 0, spikesExtended: false, dazedTimer: 0,
        chargeActive: false, chargeTimer: 0,
        seed: Math.floor(this.random() * 10000),
      });
    };

    switch (type) {
      // ── bounceChain: mushroom → cloud → flowerLift ─────────────────────
      case 'bounceChain': {
        addPlat('mushroom', 0,   -20, 80, { bouncy: true, color: '#FF6B6B' });
        addPlat('cloud',    140, -90, 100);
        addPlat('flowerLift', 280, -160, 70, { liftActive: false, liftPetalAngle: 0, liftTimer: 0 });
        arcCoins(startX, gy - 80, startX + Math.round(280 * diffScale), gy - 200, 8);
        return Math.round(380 * diffScale);
      }

      // ── crumblingGauntlet: crumbling → bridge → crumbling ──────────────
      case 'crumblingGauntlet': {
        addPlat('crumbling', 0,   0, 100, { crumblingMax: 0.9, crackLevel: 0 });
        addPlat('bridge',    140, 0, 180);
        addPlat('crumbling', 360, 0, 100, { crumblingMax: 0.7, crackLevel: 0 });
        arcCoins(startX + 20, gy - 50, startX + Math.round(360 * diffScale) + 50, gy - 50, 6);
        // Shadow wisp on bridge
        if (difficulty > 3) addEnemy('shadowWisp', 230, 0, 60);
        return Math.round(500 * diffScale);
      }

      // ── swingGap: ground → vineSwing → ground ──────────────────────────
      case 'swingGap': {
        addPlat('ground', 0, 0, 120);
        const vlen = 110 + this.random() * 20;
        const vAnchorY = gy - 130;
        const vx = startX + Math.round(200 * diffScale);
        this.platforms.push({
          x: vx, y: vAnchorY + vlen, width: 60, height: 16,
          type: 'vineSwing', color: '#5D4037',
          vineAngle: 0, vineAngularVel: 0.28, vineLength: vlen, vineGrabbed: false,
          vineAnchorX: vx + 30, vineAnchorY: vAnchorY,
        });
        addPlat('ground', 340, 0, 120);
        // Scatter coins in the gap at vine height
        for (let ci2 = 0; ci2 < 5; ci2++) {
          this.collectibles.push({ x: startX + Math.round((200 + ci2 * 18) * diffScale), y: vAnchorY + 50, width: 24, height: 24, type: 'leafToken', collected: false, bobOffset: this.random() * Math.PI * 2, sparkle: 0 });
        }
        return Math.round(500 * diffScale);
      }

      // ── elevatorGarden: flowerLift × 3 staircase ───────────────────────
      case 'elevatorGarden': {
        addPlat('flowerLift', 0,    0,   70, { liftActive: false, liftPetalAngle: 0, liftTimer: 0 });
        addPlat('flowerLift', 130, -80,  70, { liftActive: false, liftPetalAngle: 0, liftTimer: 0 });
        addPlat('flowerLift', 260, -160, 70, { liftActive: false, liftPetalAngle: 0, liftTimer: 0 });
        addPlat('ground',     380, -160, 100);
        arcCoins(startX, gy - 20, startX + Math.round(380 * diffScale), gy - 200, 12);
        // Firefly swarm at top
        if (difficulty > 3) addEnemy('fireflySwarm', 320, -160, 0);
        return Math.round(500 * diffScale);
      }

      // ── mushroomSteps: mushroom × 3 bounce chain ───────────────────────
      case 'mushroomSteps': {
        addPlat('mushroom', 0,   -10, 70, { bouncy: true, color: '#FF6B6B' });
        addPlat('mushroom', 110, -10, 70, { bouncy: true, color: '#FF6B6B' });
        addPlat('mushroom', 220, -10, 70, { bouncy: true, color: '#FF6B6B' });
        addPlat('ground',   340, 0,  100);
        arcCoins(startX, gy - 80, startX + Math.round(260 * diffScale), gy - 80, 7);
        if (difficulty > 4) addEnemy('thornling', 370, 0, 80);
        return Math.round(460 * diffScale);
      }

      // ── breakingBridge: long breakable bridge sprint ────────────────────
      case 'breakingBridge': {
        addPlat('ground', 0, 0, 80);
        const bw = Math.round(280 * wScale);
        const pc = Math.ceil(bw / 32);
        this.platforms.push({
          x: startX + Math.round(120 * diffScale), y: gy,
          width: bw, height: 20,
          type: 'breakableBridge', color: '#8D6E63',
          bridgePlanks: new Array(pc).fill(false),
          bridgePlankTimers: new Array(pc).fill(-1),
        });
        addPlat('ground', 120 + bw / wScale + 40, 0, 100);
        // Line of coins above bridge
        for (let ci3 = 0; ci3 < 8; ci3++) {
          this.collectibles.push({ x: startX + Math.round((140 + ci3 * 32) * diffScale), y: gy - 55, width: 24, height: 24, type: 'leafToken', collected: false, bobOffset: this.random() * Math.PI * 2, sparkle: 0 });
        }
        if (difficulty > 5) addEnemy('bumbleBear', 140 + bw / wScale / 2, 0, 100);
        return Math.round(600 * diffScale);
      }

      // ── enemyGauntlet: thornlings + crumbling ──────────────────────────
      case 'enemyGauntlet': {
        addPlat('crumbling', 0,   0, 90, { crumblingMax: 1.0, crackLevel: 0 });
        addPlat('ground',    130, -20, 80);
        addPlat('crumbling', 240, 0, 90, { crumblingMax: 0.7, crackLevel: 0 });
        addPlat('ground',    370, -30, 100);
        addEnemy('thornling', 45,  0,  60);
        addEnemy('thornling', 285, 0,  50);
        if (difficulty > 6) addEnemy('shadowWisp', 420, -30, 80);
        return Math.round(500 * diffScale);
      }

      // ── skyHighway: cloud + vine sequence at height ─────────────────────
      case 'skyHighway': {
        const skyY = -100;
        addPlat('cloud',      0,   skyY,        90);
        const svlen = 100;
        const svAnchorY = gy + skyY - 140;
        const svx = startX + Math.round(140 * diffScale);
        this.platforms.push({
          x: svx, y: svAnchorY + svlen, width: 60, height: 16,
          type: 'vineSwing', color: '#5D4037',
          vineAngle: 0, vineAngularVel: 0.30, vineLength: svlen, vineGrabbed: false,
          vineAnchorX: svx + 30, vineAnchorY: svAnchorY,
        });
        addPlat('cloud',      280, skyY - 80,   100);
        addPlat('flowerLift', 420, skyY - 80,   70, { liftActive: false, liftPetalAngle: 0, liftTimer: 0 });
        arcCoins(startX + 45, gy + skyY - 30, startX + Math.round(280 * diffScale) + 50, gy + skyY - 110, 10);
        if (difficulty > 4) addEnemy('fireflySwarm', 200, skyY - 40, 0);
        return Math.round(540 * diffScale);
      }

      default:
        return 300;
    }
  }

  generateTerrain() {
    const ahead = this.player.x + CANVAS_WIDTH + 600;

    while (this.nextPlatformX < ahead) {
      const biome = BIOME_COLORS[this.state.biome];
      const level = this.state.currentLevel;

      // Gap vocabulary: 4 defined sizes for predictable rhythm and readability.
      // Walk speed ~2.2px/frame, run ~4px/frame; jump arc ~320px horizontal at run.
      // S=small(flow), M=standard(jump), L=large(momentum), XL=challenge(power or precision).
      // Higher levels unlock larger gap tiers; difficulty multiplier scales them.
      let floatingPlatformChance: number;

      // Per-level max allowed gap tier (index into GAP_VOCAB below)
      const maxTier = level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 4;
      floatingPlatformChance = level === 1 ? 0.85 : level === 2 ? 0.70 : level === 3 ? 0.55 : 0.45;
      floatingPlatformChance = Math.min(1, floatingPlatformChance / this.difficultyConfig.platformGapMultiplier);

      // Gap vocabulary [gap_px, landing_width_px] — intentional discrete sizes, no random blur
      const GAP_VOCAB: [number, number][] = [
        [20,  340],  // S  — trivial, flow section
        [80,  280],  // M  — normal jump required
        [145, 240],  // L  — needs momentum or floating step
        [210, 200],  // XL — challenge beat, requires run + jump or power-up
      ];

      // Weighted tier selection: cluster small/medium gaps, use large as tension beats
      const gapRoll = this.random();
      let tierIndex: number;
      if (maxTier <= 1) {
        tierIndex = 0;
      } else if (maxTier === 2) {
        tierIndex = gapRoll < 0.65 ? 0 : 1;
      } else if (maxTier === 3) {
        tierIndex = gapRoll < 0.50 ? 0 : gapRoll < 0.85 ? 1 : 2;
      } else {
        tierIndex = gapRoll < 0.45 ? 0 : gapRoll < 0.75 ? 1 : gapRoll < 0.92 ? 2 : 3;
      }

      const [baseGap, basePlatWidth] = GAP_VOCAB[tierIndex];
      // Apply difficulty multiplier + hard mode gap widening
      const hardGapMult = this.gameMode === 'hard' ? HARD_MODE.gapSizeMultiplier : 1;
      const safeGap = Math.round(baseGap * this.difficultyConfig.platformGapMultiplier * hardGapMult);
      const mobileBonus = this.isTouchDevice ? 40 : 0;
      // Hard mode platforms are narrower (more challenge), touch devices get bonus
      const hardWidthMult = this.gameMode === 'hard' ? HARD_MODE.platformWidthReduction : 1;
      const platformWidth = (basePlatWidth + mobileBonus + this.random() * 60) * hardWidthMult;

      // Floating stepping-stone in the middle of any gap ≥ 60px
      if (safeGap >= 60) {
        this.addFloatingPlatform(
          this.nextPlatformX + safeGap * 0.45,
          biome
        );
        // Second stone for large gaps
        if (safeGap >= 130) {
          this.addFloatingPlatform(
            this.nextPlatformX + safeGap * 0.75,
            biome
          );
        }
      } else if (this.random() < floatingPlatformChance) {
        // Occasional bonus platform on small gaps for fun
        this.addFloatingPlatform(
          this.nextPlatformX + safeGap * 0.5,
          biome
        );
      }

      // Ground height variation — subtle hills and gentle slopes break flat-world feel.
      const landX = this.nextPlatformX + safeGap;
      const hill = Math.sin(landX * 0.006) * 10 + Math.sin(landX * 0.0023) * 14;
      const slope = Math.sin(landX * 0.0009) * 4;
      const heightVariation = Math.round(hill + slope);
      // Hard Mode route tier Y-offset: sky = 120px up, deep = 80px down
      const routeYOffset = this.gameMode === 'hard'
        ? this.state.routeTier === 'sky'  ? -120
        : this.state.routeTier === 'deep' ?  80
        : 0
        : 0;
      const platformY = GROUND_Y + heightVariation + routeYOffset;

      // Ground platform
      this.platforms.push({
        x: landX,
        y: platformY,
        width: platformWidth,
        height: 600, // tall enough to always extend below camera view
        type: (biome.platforms ? biome.platforms[0] : 'ground') as Platform['type'],
        color: biome.ground,
      });

      // Bonus floating platform ON the ground platform for vertical interest
      if (this.random() < 0.45) {
        this.addFloatingPlatform(
          landX + platformWidth * 0.3 + this.random() * platformWidth * 0.4,
          biome
        );
      }

      this.nextPlatformX += safeGap + platformWidth;
    }

    // Hard Mode scenario sequences — flow zone (400-500m) then challenge, giving breathing room
    if (this.gameMode === 'hard') {
      while (this.nextScenarioX < ahead) {
        this.showTipOnce('firstScenario');
        const scenarioLen = this.generateHardScenario(this.nextScenarioX);
        // 400-600m gap between scenarios for flow state / breathing room
        this.nextScenarioX += scenarioLen + 400 + this.random() * 200;
      }

      // Bramble King boss — every 1500m, only if no active boss
      if (this.state.distance >= this.nextBossX && !this.state.bossEncounter) {
        this.spawnBoss();
      }

      // Interactive elements — 1 per 300-600px, hidden behind bushes
      while (this.nextInteractiveX < this.player.x + CANVAS_WIDTH + 400) {
        this.addInteractive(this.nextInteractiveX);
        this.nextInteractiveX += 300 + this.random() * 300;
      }

      // Route choice: every 800m, show a 3-second telegraph then lock in the choice
      if (this.player.x >= this.nextRouteChoiceX && !this.routeChoiceActive && this.state.routeTier === 'main') {
        this.routeChoiceActive = true;
        this.routeChoiceTimer = 180; // 3s at 60fps
        this.showTipOnce('firstRouteChoice');
      }
      if (this.routeChoiceActive) {
        this.routeChoiceTimer--;
        if (this.routeChoiceTimer <= 0) {
          // Timer expired → stay on ground (player didn't choose)
          this.routeChoiceActive = false;
          this.nextRouteChoiceX = this.player.x + 2000 + this.random() * 500;
        }
      }

      // Rejoin: after 500m on sky/deep route, return to main
      if (this.state.routeTier !== 'main' && this.routeEndX > 0 && this.player.x >= this.routeEndX) {
        this.state.routeTier = 'main';
        this.routeEndX = 0;
        this.nextRouteChoiceX = this.player.x + 2000 + this.random() * 500;
        this.routeChoiceActive = false;
      }
    }

    // Cloud sequences: mushroom launch pad → cloud staircase (spaced every ~1200-1800 units)
    while (this.nextCloudSequenceX < ahead) {
      this.createVerticalSequence(this.nextCloudSequenceX);
      this.nextCloudSequenceX += 1200 + this.random() * 600;
    }

    while (this.nextCollectibleX < ahead) {
      const biome = BIOME_COLORS[this.state.biome];
      // Alternate between arc clusters (over jumps) and platform-line clusters (on platforms)
      const arcMode = this.random() < 0.55;
      if (arcMode) {
        // Arc cluster: 4-5 coins following a parabolic trajectory a player would fly through
        const arcCount = 4 + Math.floor(this.random() * 2);
        const arcSpan  = 80 + this.random() * 60;   // horizontal spread
        const arcPeak  = 80 + this.random() * 70;   // peak height above ground
        for (let i = 0; i < arcCount; i++) {
          const t = i / (arcCount - 1);             // 0..1
          const ax = this.nextCollectibleX + t * arcSpan;
          // Parabola: y = groundBase - arcPeak * 4t(1-t)
          const ay = GROUND_Y - 50 - arcPeak * 4 * t * (1 - t);
          this.addCollectibleAt(ax, ay, biome);
        }
        this.nextCollectibleX += arcSpan + 80 + this.random() * 60;
      } else {
        // Platform line: 2-3 coins at a consistent height just above ground/platform
        const lineCount = 2 + Math.floor(this.random() * 2);
        const lineY = GROUND_Y - 55 - this.random() * 30;
        for (let i = 0; i < lineCount; i++) {
          this.addCollectibleAt(this.nextCollectibleX + i * 40, lineY, biome);
        }
        this.nextCollectibleX += lineCount * 40 + 60 + this.random() * 60;
      }
    }

    while (this.nextObstacleX < ahead) {
      // Hard Mode: use dedicated enemy spawner after 300m safe zone
      if (this.gameMode === 'hard') {
        if (this.state.distance >= 300) {
          this.addHardModeEnemy(this.nextObstacleX);
        }
        // Hard mode enemy spacing: every 200m early, every 150m after 2000m
        const hardSpacing = this.state.distance > 2000 ? 150 : 200;
        this.nextObstacleX += hardSpacing + this.random() * 60;
      } else {
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

    // Adventure event spawning — one every 300-500 units of player progress
    if (!this.activeEvent && this.eventCooldown <= 0 && this.player.x > this.nextEventDistance && this.state.distance > 200) {
      this.spawnAdventureEvent();
      this.nextEventDistance = this.player.x + 300 + this.random() * 200;
    }
    if (this.eventCooldown > 0) this.eventCooldown--;
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

  // ===== ADVENTURE EVENTS =====
  private spawnAdventureEvent() {
    const types: AdventureEventType[] = ['goldenDeer', 'fairyRing', 'fallenStar', 'wishingWell'];
    // Weight events by biome
    const roll = this.random();
    let type: AdventureEventType;
    if (roll < 0.28) type = 'goldenDeer';
    else if (roll < 0.52) type = 'fairyRing';
    else if (roll < 0.74) type = 'fallenStar';
    else type = 'wishingWell';
    void types;

    const spawnX = this.player.x + CANVAS_WIDTH * 0.85;
    const spawnY = GROUND_Y - 48;

    this.activeEvent = {
      type,
      x: spawnX,
      y: spawnY,
      state: 'idle',
      timer: 0,
      phase: 0,
      data: {},
    };
    this.state.adventureEvent = { ...this.activeEvent };
  }

  updateAdventureEvent(dt: number) {
    if (!this.activeEvent) return;
    const ev = this.activeEvent;

    // Sync to state for HUD
    this.state.adventureEvent = { ...ev, data: { ...ev.data } };

    ev.timer += dt;

    switch (ev.type) {
      case 'goldenDeer': this.updateGoldenDeer(ev, dt); break;
      case 'fairyRing': this.updateFairyRing(ev, dt); break;
      case 'fallenStar': this.updateFallenStar(ev, dt); break;
      case 'wishingWell': this.updateWishingWell(ev, dt); break;
    }

    if (ev.state === 'done') {
      this.activeEvent = null;
      this.state.adventureEvent = null;
      this.eventCooldown = 600; // 10s cooldown before next event
    }
  }

  private updateGoldenDeer(ev: AdventureEvent, _dt: number) {
    // Phase 0: deer runs ahead for 10 seconds
    if (ev.phase === 0) {
      ev.x += 2.5; // Deer runs just ahead
      const dist = Math.abs(ev.x - (this.player.x + this.player.width / 2));
      if (dist < 80) ev.data.followTime = (ev.data.followTime as number || 0) + _dt;
      if (ev.timer > 600) { // 10s timeout
        ev.state = 'done'; // Deer leaps away
        return;
      }
      // Player kept up for 10s
      if ((ev.data.followTime as number || 0) >= 600) {
        ev.phase = 1;
        ev.state = 'resolving';
        // Grant treasure cache + spawn dense coins
        this.state.leafTokens += 50;
        this.state.totalLeafTokens += 50;
        for (let i = 0; i < 12; i++) {
          this.collectibles.push({
            x: this.player.x + 100 + i * 30,
            y: GROUND_Y - 80 - this.random() * 60,
            width: 24, height: 24, type: 'leafToken', collected: false,
            bobOffset: this.random() * Math.PI * 2, sparkle: 1,
          });
        }
        this.spawnParticles(ev.x, ev.y, 30, '#FFD700', 'sparkle');
        this.cameraShake = 5;
        setTimeout(() => { ev.state = 'done'; }, 2000);
      }
    }
  }

  private updateFairyRing(ev: AdventureEvent, _dt: number) {
    // Phase 0: show mushroom ring — player has 5s to jump on it
    if (ev.phase === 0) {
      const dist = Math.abs((this.player.x + this.player.width / 2) - ev.x);
      if (dist < 60 && this.player.jumping) {
        ev.phase = 1;
        ev.state = 'resolving';
        // Success: magnetize all on-screen coins for 10s
        this.activatePowerUp('magnet');
        this.spawnParticles(ev.x, ev.y, 25, '#76FF03', 'sparkle');
        ev.timer = 0;
      } else if (ev.timer > 300) { // 5s timeout
        ev.state = 'done';
      }
    } else if (ev.phase === 1 && ev.timer > 60) {
      ev.state = 'done';
    }
  }

  private updateFallenStar(ev: AdventureEvent, _dt: number) {
    // Phase 0: star crashes — crater visible for 3s then fades
    if (ev.phase === 0) {
      if (ev.timer > 15 && ev.state === 'idle') {
        ev.state = 'active'; // crater ready
        // Spawn bonus tunnel entrance collectibles
        for (let i = 0; i < 8; i++) {
          this.collectibles.push({
            x: ev.x + 50 + i * 40,
            y: GROUND_Y - 60 - this.random() * 100,
            width: 24, height: 24, type: 'leafToken', collected: false,
            bobOffset: this.random() * Math.PI * 2, sparkle: 1,
          });
        }
      }
      const dist = Math.abs((this.player.x + this.player.width / 2) - ev.x);
      if (dist < 80 && ev.state === 'active') {
        // Player investigates — activate glide + coin rush
        this.activatePowerUp('petalFloat');
        this.spawnParticles(ev.x, ev.y, 20, '#FFFF00', 'sparkle');
        ev.state = 'done';
      } else if (ev.timer > 180) { // 3s fade
        ev.state = 'done';
      }
    }
  }

  private updateWishingWell(ev: AdventureEvent, _dt: number) {
    // Auto-trigger when player is close and moving — costs 5 tokens
    if (ev.state === 'idle') {
      const dist = Math.abs((this.player.x + this.player.width / 2) - ev.x);
      if (dist < 70 && this.state.leafTokens >= 5) {
        this.state.leafTokens -= 5;
        ev.state = 'resolving';
        ev.timer = 0;
        const roll = this.random();
        if (roll < 0.70) {
          // 70%: 15 tokens back
          this.state.leafTokens += 15;
          this.state.totalLeafTokens += 10;
          this.spawnParticles(ev.x, ev.y, 20, '#FFD700', 'sparkle');
          ev.data.result = 'tokens';
        } else if (roll < 0.90) {
          // 20%: random power-up
          const pups: PowerUpType[] = ['acornShield', 'foxfireDash', 'petalFloat', 'mushroomBounce'];
          this.activatePowerUp(pups[Math.floor(this.random() * pups.length)]);
          this.spawnParticles(ev.x, ev.y, 20, '#76FF03', 'sparkle');
          ev.data.result = 'powerup';
        } else {
          // 10%: bubble lift — spawn a platform sequence ahead
          for (let i = 0; i < 6; i++) {
            this.platforms.push({
              x: this.player.x + 200 + i * 140, y: GROUND_Y - 100,
              width: 120, height: 20, type: 'cloud', color: 'rgba(200,220,255,0.9)',
            });
          }
          this.spawnParticles(ev.x, ev.y, 30, '#B3E5FC', 'sparkle');
          ev.data.result = 'lift';
        }
      } else if (ev.timer > 400) {
        ev.state = 'done'; // Player passed it
      }
    } else if (ev.state === 'resolving' && ev.timer > 90) {
      ev.state = 'done';
    }
  }

  // Called by player jumping on event object (from HUD button or key press)
  resolveEventChoice(choice: string) {
    if (!this.activeEvent) return;
    const ev = this.activeEvent;
    if (ev.type === 'fairyRing' && ev.phase === 0) {
      ev.phase = 1;
      ev.state = 'resolving';
      this.activatePowerUp('magnet');
      this.spawnParticles(ev.x, ev.y, 25, '#76FF03', 'sparkle');
    }
    void choice;
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
    this.hazards = this.hazards.filter(h => h.width > 0 && h.x + h.width > this.player.x - CANVAS_WIDTH * 8);
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
      if (hazard.x > this.cameraX + CANVAS_WIDTH * 1.2 || hazard.x + hazard.width < this.cameraX - CANVAS_WIDTH * 0.7) continue;
      
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
  // 9 base biomes in narrative order — crystal/autumn/firefly slotted between the existing
  // milestones so every biome is reachable through normal play without moving the originals.
  static readonly BIOME_SEQUENCE: { distance: number; biome: BiomeType }[] = [
    { distance: 0,     biome: 'enchanted' }, // original
    { distance: 2500,  biome: 'crystal'   }, // was orphaned — now between 0m and Moonlit
    { distance: 5000,  biome: 'moonlit'   }, // original (was 5k)
    { distance: 7500,  biome: 'autumn'    }, // was orphaned — now between Moonlit and Caverns
    { distance: 10000, biome: 'caverns'   }, // original (was 10k)
    { distance: 12500, biome: 'firefly'   }, // was orphaned — now between Caverns and Canopy
    { distance: 15000, biome: 'canopy'    }, // original (was 15k)
    { distance: 20000, biome: 'ruins'     }, // original (was 20k)
    { distance: 25000, biome: 'starfall'  }, // original (was 25k)
  ];

  getNextBiomeForDistance(distance: number): BiomeType | null {
    // Returns the biome that should be active at the given distance.
    // Only called for the fixed sequence (0–25000m); post-Starfall cycling is
    // handled separately to avoid calling random() every frame.
    if (distance >= 25000) return null; // cycle mode handled separately

    let current: BiomeType = 'enchanted';
    for (const entry of GameEngine.BIOME_SEQUENCE) {
      if (distance >= entry.distance) current = entry.biome;
      else break;
    }
    return current;
  }

  // Called once when the player passes the cycle-start threshold or after each cycle transition.
  pickCycleBiome(): BiomeType {
    const pool = GameEngine.BIOME_SEQUENCE
      .map(e => e.biome)
      .filter(b => b !== this.state.biome);
    return pool[Math.floor(this.random() * pool.length)] ?? 'enchanted';
  }

  startBiomeTransition(targetBiome: BiomeType) {
    if (this.state.isTransitioning) return;
    if (targetBiome === this.state.biome) return;

    this.state.transitioningBiome = targetBiome;
    this.state.transitionProgress = 0;
    this.state.isTransitioning = true;
    this.state.levelTransitionCooldown = 300;

    // Show biome entry card
    this.state.biomeCard = { biome: targetBiome, timer: 240, maxTimer: 240 };

    // Preserve current background state
    this.preserveBackgroundState();

    // Initialize target biome background
    const currentBiome = this.state.biome;
    this.state.biome = targetBiome;
    this.initBackground();
    this.state.biome = currentBiome;
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

    // Camera X follows player horizontally with smooth lag
    // Boss fight: lock camera to arena center ±400px
    const boss = this.state.bossEncounter;
    if (boss && !boss.defeated) {
      const arenaCenter = boss.arenaStartX + 400;
      const clampedX = Math.max(boss.arenaStartX, Math.min(boss.arenaStartX + 800, this.player.x));
      this.cameraX += (clampedX - this.cameraX) * 0.12;
    } else {
      const movingLeft = this.player.vx < 0;
      const cameraSpeedX = movingLeft ? 0.25 : 0.18;
      this.cameraTargetX = this.player.x;
      this.cameraX += (this.cameraTargetX - this.cameraX) * cameraSpeedX;
    }

    // Camera Y: player is kept in the vertical third between 25% and 75% of screen height.
    // Dead-zone approach suppresses bobbing on small hops; but the camera ALWAYS hard-clamps
    // to keep the player on-screen so they can never fall out of view.
    const groundScreenFraction = 0.65;
    const cameraYAnchor = GROUND_Y - CANVAS_HEIGHT * (1 - groundScreenFraction);

    // Dead-zone thresholds — below these vy values the camera stays put
    const vyDeadZoneUp   = 5.5;
    const vyDeadZoneDown = 4.0;

    const leadScale = 38;
    let leadOffset = 0;
    if (!this.player.grounded) {
      if (this.player.vy < -vyDeadZoneUp) {
        leadOffset = (this.player.vy + vyDeadZoneUp) * leadScale / 10;
      } else if (this.player.vy > vyDeadZoneDown) {
        leadOffset = (this.player.vy - vyDeadZoneDown) * leadScale / 10;
      }
    }
    const playerTarget = this.player.y + leadOffset - CANVAS_HEIGHT * (1 - groundScreenFraction);

    // Desired: grounded → anchor, airborne → track player (both up AND down now)
    const desiredTarget = this.player.grounded ? cameraYAnchor : playerTarget;

    let cameraSpeedY: number;
    if (this.player.grounded) {
      cameraSpeedY = 0.10;
    } else if (this.player.vy > vyDeadZoneDown) {
      cameraSpeedY = 0.18; // falling into pit — chase faster than before
    } else if (this.player.vy < -vyDeadZoneUp) {
      cameraSpeedY = 0.09;
    } else {
      cameraSpeedY = 0.06;
    }

    this.cameraTargetY = desiredTarget;
    this.cameraY += (this.cameraTargetY - this.cameraY) * cameraSpeedY;

    // Hard safety clamp: player must always be between top 15% and bottom 15% of screen.
    // This fires when smooth tracking isn't fast enough (e.g. sudden deep fall).
    const playerScreenY = this.player.y - this.cameraY + CANVAS_HEIGHT / 2;
    const margin = CANVAS_HEIGHT * 0.15;
    if (playerScreenY < margin) {
      // Player near top — snap camera up
      this.cameraY = this.player.y - (margin - CANVAS_HEIGHT / 2);
    } else if (playerScreenY > CANVAS_HEIGHT - margin) {
      // Player near bottom — snap camera down immediately
      this.cameraY = this.player.y - (CANVAS_HEIGHT - margin - CANVAS_HEIGHT / 2);
    }

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
    this.renderAtmosphere(ctx);
    this.renderSkyBirds(ctx);
    this.renderCollectibles(ctx);
    this.renderObstacles(ctx);
    this.renderHazards(ctx);
    this.renderAdventureEvent(ctx);
    this.renderInteractives(ctx);
    this.renderRouteTelegraph(ctx);
    this.renderBoss(ctx);
    this.renderPlayer(ctx);
    this.renderJumpCharge(ctx);
    this.renderParticles(ctx);

    // Global Lighting Tint based on Biome
    this.renderLightingOverlay(ctx, w, h);

    // Vignette (in screen space)
    ctx.restore();
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // ── Depth-fall danger overlay (screen space, after restore) ───────────────
    if (this.pitDepth > 40) {
      // Red vignette intensifies with depth
      const redIntensity = Math.min(0.45, (this.pitDepth - 40) / 400);
      const redPulse = redIntensity * (0.8 + Math.sin(this.state.gameTime * 0.15) * 0.2);
      const rv = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.65);
      rv.addColorStop(0, 'rgba(180,0,0,0)');
      rv.addColorStop(0.7, `rgba(180,0,0,${redPulse * 0.3})`);
      rv.addColorStop(1, `rgba(180,0,0,${redPulse})`);
      ctx.fillStyle = rv;
      ctx.fillRect(0, 0, w, h);

      // Darkness overlay — screen edges go black as you sink
      if (this.pitDepth > 150) {
        const darkIntensity = Math.min(0.5, (this.pitDepth - 150) / 300);
        const darkPulse = 1 + Math.sin(this.state.gameTime * 0.1) * 0.05;
        const dv = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.65 * darkPulse);
        dv.addColorStop(0, 'rgba(0,0,0,0)');
        dv.addColorStop(1, `rgba(0,0,0,${darkIntensity})`);
        ctx.fillStyle = dv;
        ctx.fillRect(0, 0, w, h);
      }

      // "Giant eye opens in the dark" at extreme depth before death
      if (this.pitDepth > 320) {
        const eyeAlpha = Math.min(0.65, (this.pitDepth - 320) / 120);
        const eyeX = w / 2, eyeY = h * 0.82;
        const eyePulse = 0.8 + Math.sin(this.state.gameTime * 0.2) * 0.2;
        // Eye glow
        const eGlow = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, 50 * eyePulse);
        eGlow.addColorStop(0, `rgba(200,0,0,${eyeAlpha * 0.7})`);
        eGlow.addColorStop(1, 'rgba(100,0,0,0)');
        ctx.fillStyle = eGlow;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 50 * eyePulse, 0, Math.PI * 2);
        ctx.fill();
        // Iris
        ctx.fillStyle = `rgba(220,20,20,${eyeAlpha})`;
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, 22 * eyePulse, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = `rgba(0,0,0,${eyeAlpha})`;
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, 10 * eyePulse, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyelid highlight
        ctx.strokeStyle = `rgba(255,50,50,${eyeAlpha * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, 22 * eyePulse, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  renderBoss(ctx: CanvasRenderingContext2D) {
    const boss = this.state.bossEncounter;
    if (!boss) return;

    const gt = this.state.gameTime;
    const bx = boss.x + boss.shakeX;
    const by = boss.y;

    ctx.save();

    // ── Arena floor markings ─────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(139,35,35,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(boss.arenaStartX, GROUND_Y - 2);
    ctx.lineTo(boss.arenaStartX + 800, GROUND_Y - 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Phase indicator roots spreading on ground
    const rootAlpha = boss.phase >= 2 ? 0.5 : 0.25;
    ctx.strokeStyle = `rgba(46,125,50,${rootAlpha})`;
    ctx.lineWidth = 3;
    for (let ri = 0; ri < 5; ri++) {
      const rx = boss.arenaStartX + ri * 160;
      ctx.beginPath();
      ctx.moveTo(rx, GROUND_Y);
      ctx.bezierCurveTo(rx + 20, GROUND_Y - 30, rx + 40, GROUND_Y - 20, rx + 60, GROUND_Y - 5);
      ctx.stroke();
    }

    // ── Projectiles ──────────────────────────────────────────────────────────
    for (const proj of boss.projectiles) {
      ctx.save();
      if (proj.type === 'thorn') {
        const lifeRatio = proj.life / proj.maxLife;
        ctx.globalAlpha = lifeRatio;
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        // Thorn spikes
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 2;
        for (let si = 0; si < 6; si++) {
          const sa = (si / 6) * Math.PI * 2 + gt * 0.04;
          ctx.beginPath();
          ctx.moveTo(proj.x + Math.cos(sa) * proj.radius * 0.6, proj.y + Math.sin(sa) * proj.radius * 0.6);
          ctx.lineTo(proj.x + Math.cos(sa) * (proj.radius + 6), proj.y + Math.sin(sa) * (proj.radius + 6));
          ctx.stroke();
        }
      } else if (proj.type === 'shockwave') {
        const lifeRatio = proj.life / proj.maxLife;
        ctx.globalAlpha = lifeRatio * 0.85;
        // Glowing ground crack
        const swGrad = ctx.createRadialGradient(proj.x, proj.y, 4, proj.x, proj.y, proj.radius * 1.5);
        swGrad.addColorStop(0, '#8BC34A');
        swGrad.addColorStop(0.5, '#558B2F');
        swGrad.addColorStop(1, 'rgba(27,94,32,0)');
        ctx.fillStyle = swGrad;
        ctx.beginPath();
        ctx.ellipse(proj.x, proj.y, proj.radius * 1.8, proj.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        // Crack lines
        ctx.strokeStyle = '#CCFF90';
        ctx.lineWidth = 2;
        for (let ci2 = 0; ci2 < 3; ci2++) {
          ctx.beginPath();
          ctx.moveTo(proj.x, proj.y);
          const cAngle = (ci2 / 3) * Math.PI - Math.PI / 2;
          ctx.lineTo(proj.x + Math.cos(cAngle) * proj.radius * 2.5, proj.y + Math.sin(cAngle) * proj.radius * 1.2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ── Seeds ────────────────────────────────────────────────────────────────
    for (const seed of boss.seeds) {
      if (seed.collected) continue;
      ctx.save();
      const seedPulse = 0.7 + Math.sin(gt * 0.15 + seed.x * 0.01) * 0.3;
      // Glow
      ctx.globalAlpha = 0.4 * seedPulse;
      const sGrad = ctx.createRadialGradient(seed.x, seed.y, 4, seed.x, seed.y, seed.radius * 2.5);
      sGrad.addColorStop(0, '#76FF03');
      sGrad.addColorStop(1, 'rgba(76,255,3,0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(seed.x, seed.y, seed.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Seed body
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#33691E';
      ctx.beginPath();
      ctx.ellipse(seed.x, seed.y, seed.radius, seed.radius * 1.3, Math.sin(gt * 0.02) * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Glowing top
      ctx.fillStyle = '#B2FF59';
      ctx.beginPath();
      ctx.arc(seed.x - 3, seed.y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      // Collect arrow indicator
      ctx.globalAlpha = seedPulse * 0.9;
      ctx.fillStyle = '#CCFF90';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼', seed.x, seed.y - seed.radius - 8 - Math.abs(Math.sin(gt * 0.12)) * 6);
      ctx.restore();
    }

    // ── Boss body — Bramble King ─────────────────────────────────────────────
    if (!boss.defeated) {
      ctx.save();
      const isHurt = boss.hurtTimer > 0;
      const bodyW = 80;
      const bodyH = 100;
      const cx2 = bx + bodyW / 2;
      const cy2 = by + bodyH / 2;

      // Root legs
      ctx.strokeStyle = isHurt ? '#FFEB3B' : '#2E7D32';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      for (let li2 = 0; li2 < 3; li2++) {
        const lx2 = bx + 15 + li2 * 28;
        const legSwing = Math.sin(gt * 0.04 + li2 * 1.5) * 8;
        ctx.beginPath();
        ctx.moveTo(lx2, by + bodyH);
        ctx.bezierCurveTo(lx2 + legSwing, by + bodyH + 20, lx2 + legSwing * 0.5, by + bodyH + 35, lx2 + legSwing * 0.3, by + bodyH + 45);
        ctx.stroke();
      }

      // Body — thorny tangle of vines
      const bodyGrad = ctx.createRadialGradient(cx2 - 10, cy2 - 20, 8, cx2, cy2, bodyW * 0.65);
      if (isHurt) {
        bodyGrad.addColorStop(0, '#FFFF8D');
        bodyGrad.addColorStop(0.5, '#FFD54F');
        bodyGrad.addColorStop(1, '#E65100');
      } else {
        bodyGrad.addColorStop(0, '#558B2F');
        bodyGrad.addColorStop(0.4, '#2E7D32');
        bodyGrad.addColorStop(1, '#1B5E20');
      }
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      // Bumpy body outline
      for (let bi5 = 0; bi5 < 10; bi5++) {
        const ba5 = (bi5 / 10) * Math.PI * 2;
        const r5 = bodyW * 0.45 + Math.sin(ba5 * 3 + (boss.seed ?? 0)) * 8;
        if (bi5 === 0) ctx.moveTo(cx2 + Math.cos(ba5) * r5, cy2 + Math.sin(ba5) * r5 * 0.85);
        else ctx.lineTo(cx2 + Math.cos(ba5) * r5, cy2 + Math.sin(ba5) * r5 * 0.85);
      }
      ctx.closePath();
      ctx.fill();

      // Thorn crown — more thorns in phase 2+
      const thornCount = boss.phase === 1 ? 8 : boss.phase === 2 ? 12 : 6;
      ctx.strokeStyle = isHurt ? '#FF8F00' : '#1B5E20';
      ctx.lineWidth = 3;
      for (let ti2 = 0; ti2 < thornCount; ti2++) {
        const ta2 = (ti2 / thornCount) * Math.PI * 2 - Math.PI / 2;
        const tr2 = bodyW * 0.44;
        ctx.beginPath();
        ctx.moveTo(cx2 + Math.cos(ta2) * tr2, cy2 + Math.sin(ta2) * tr2 * 0.85);
        ctx.lineTo(cx2 + Math.cos(ta2) * (tr2 + 14), cy2 + Math.sin(ta2) * (tr2 + 14) * 0.85);
        ctx.stroke();
        ctx.fillStyle = '#33691E';
        ctx.beginPath();
        ctx.arc(cx2 + Math.cos(ta2) * (tr2 + 15), cy2 + Math.sin(ta2) * (tr2 + 15) * 0.85, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Phase 3: glowing seed aura around boss
      if (boss.phase === 3) {
        ctx.globalAlpha = 0.3 + Math.sin(gt * 0.12) * 0.15;
        const aGrad2 = ctx.createRadialGradient(cx2, cy2, 20, cx2, cy2, bodyW * 0.9);
        aGrad2.addColorStop(0, 'rgba(76,255,3,0.8)');
        aGrad2.addColorStop(1, 'rgba(76,255,3,0)');
        ctx.fillStyle = aGrad2;
        ctx.beginPath();
        ctx.arc(cx2, cy2, bodyW * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Eyes
      const eyeColor = isHurt ? '#FFEB3B' : (boss.phase === 3 ? '#76FF03' : '#CCFF90');
      for (const ex9 of [cx2 - 14, cx2 + 14]) {
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(ex9, cy2 - 12, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0D1B00';
        ctx.beginPath();
        ctx.arc(ex9 + 2, cy2 - 12, 4, 0, Math.PI * 2);
        ctx.fill();
        // Eye glow
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(ex9, cy2 - 12, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Mouth — angry frown
      ctx.strokeStyle = '#0D1B00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx2, cy2 + 5, 14, 0.2, Math.PI - 0.2);
      ctx.stroke();

      ctx.restore();
    } else {
      // Defeat — fragments flying
      ctx.save();
      ctx.globalAlpha = Math.max(0, boss.defeatTimer / 180);
      for (let fi2 = 0; fi2 < 8; fi2++) {
        const fa2 = (fi2 / 8) * Math.PI * 2;
        const fd = (1 - boss.defeatTimer / 180) * 80;
        ctx.fillStyle = ['#2E7D32','#558B2F','#1B5E20','#8BC34A'][fi2 % 4];
        ctx.beginPath();
        ctx.arc(boss.x + 40 + Math.cos(fa2) * fd, boss.y + 40 + Math.sin(fa2) * fd, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  renderRouteTelegraph(ctx: CanvasRenderingContext2D) {
    if (!this.routeChoiceActive || this.gameMode !== 'hard') return;

    const px = this.player.x + 180; // telegraphs appear 180px ahead in world space
    const gt = this.state.gameTime;
    const alpha = Math.min(1, (180 - this.routeChoiceTimer) / 30); // fade in
    const pulse = 0.7 + Math.sin(gt * 0.2) * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha * pulse;

    // ── Sky Route telegraph: golden flowers pointing UP ────────────────────
    const skyY = GROUND_Y - 80;
    for (let i = 0; i < 3; i++) {
      const fx = px + i * 28 - 28;
      // Stem
      ctx.strokeStyle = '#66BB6A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx, skyY + 30);
      ctx.lineTo(fx, skyY);
      ctx.stroke();
      // Upward arrow petal burst (golden)
      ctx.fillStyle = '#FFD740';
      for (let p2 = 0; p2 < 6; p2++) {
        const pa = (p2 / 6) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(pa) * 6, skyY + Math.sin(pa) * 6, 3, 2, pa, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFF176';
      ctx.beginPath();
      ctx.arc(fx, skyY, 3, 0, Math.PI * 2);
      ctx.fill();
      // Upward arrow above flower
      ctx.fillStyle = '#FFFDE7';
      ctx.beginPath();
      ctx.moveTo(fx, skyY - 18 - Math.abs(Math.sin(gt * 0.1 + i)) * 5);
      ctx.lineTo(fx - 6, skyY - 10);
      ctx.lineTo(fx + 6, skyY - 10);
      ctx.closePath();
      ctx.fill();
    }
    // Label
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = '#FFD740';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('☁ SKY (+2× coins)', px, skyY - 28);

    // ── Deep Route telegraph: blue mushrooms with crystal glint DOWN ───────
    const deepY = GROUND_Y + 30;
    for (let i = 0; i < 3; i++) {
      const mx = px - 40 + i * 28;
      // Blue/crystal mushroom cap
      ctx.fillStyle = '#1565C0';
      ctx.beginPath();
      ctx.ellipse(mx, deepY - 12, 12, 8, 0, Math.PI, 0);
      ctx.fill();
      // Stem
      ctx.fillStyle = '#90CAF9';
      ctx.fillRect(mx - 3, deepY - 12, 6, 14);
      // Crystal glint
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(mx - 4, deepY - 16, 2, 0, Math.PI * 2);
      ctx.fill();
      // Downward arrow
      ctx.fillStyle = '#B3E5FC';
      ctx.beginPath();
      ctx.moveTo(mx, deepY + 6 + Math.abs(Math.sin(gt * 0.1 + i + 1)) * 5);
      ctx.lineTo(mx - 6, deepY + 1);
      ctx.lineTo(mx + 6, deepY + 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#42A5F5';
    ctx.fillText('⬇ DEEP (+1.5× power-ups)', px - 40, deepY + 24);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderAdventureEvent(ctx: CanvasRenderingContext2D) {
    const ev = this.activeEvent;
    if (!ev || ev.state === 'done') return;
    const t = this.state.gameTime;
    const pulse = 0.8 + Math.sin(t * 0.15) * 0.2;
    ctx.save();

    switch (ev.type) {
      case 'goldenDeer': {
        // Draw a glowing golden deer silhouette
        const x = ev.x, y = ev.y;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = `rgba(255,210,0,${pulse})`;
        // Body
        ctx.beginPath();
        ctx.ellipse(x, y - 14, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.ellipse(x + 20, y - 22, 9, 7, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x - 10 + i * 10, y - 4);
          ctx.lineTo(x - 10 + i * 10, y + 14);
          ctx.strokeStyle = `rgba(255,210,0,${pulse})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        // Antlers
        ctx.beginPath();
        ctx.moveTo(x + 18, y - 28);
        ctx.lineTo(x + 22, y - 40);
        ctx.lineTo(x + 28, y - 35);
        ctx.moveTo(x + 26, y - 29);
        ctx.lineTo(x + 30, y - 40);
        ctx.lineTo(x + 36, y - 35);
        ctx.strokeStyle = `rgba(255,210,0,${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Sparkles around it
        for (let i = 0; i < 5; i++) {
          const angle = t * 0.08 + i * (Math.PI * 2 / 5);
          const sx = x + Math.cos(angle) * 28, sy = y - 14 + Math.sin(angle) * 20;
          ctx.beginPath();
          ctx.arc(sx, sy, 2 + Math.sin(t * 0.2 + i) * 1, 0, Math.PI * 2);
          ctx.fillStyle = '#FFF176';
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#FFD700';
          ctx.fill();
        }
        break;
      }
      case 'fairyRing': {
        // Draw a ring of glowing mushrooms
        const rx = ev.x, ry = ev.y;
        const count = 8;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const mx = rx + Math.cos(angle) * 40;
          const my = ry + Math.sin(angle) * 20;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#76FF03';
          // Stem
          ctx.fillStyle = '#F5F5DC';
          ctx.fillRect(mx - 3, my - 6, 6, 10);
          // Cap
          ctx.fillStyle = `rgba(${100 + i * 20},255,${80},${0.7 + Math.sin(t * 0.1 + i) * 0.3})`;
          ctx.beginPath();
          ctx.ellipse(mx, my - 6, 9, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Inner glow
        const grd = ctx.createRadialGradient(rx, ry - 10, 0, rx, ry - 10, 35);
        grd.addColorStop(0, `rgba(118,255,3,${0.15 * pulse})`);
        grd.addColorStop(1, 'rgba(118,255,3,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(rx, ry - 10, 38, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'fallenStar': {
        // Draw a glowing crater with star core
        const sx = ev.x, sy = ev.y;
        // Crater
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFEE58';
        const cGrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40);
        cGrd.addColorStop(0, `rgba(255,235,80,${0.6 * pulse})`);
        cGrd.addColorStop(0.5, `rgba(255,200,0,0.3)`);
        cGrd.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.fillStyle = cGrd;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 38, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Star shape at center
        ctx.fillStyle = `rgba(255,255,150,${pulse})`;
        const starPoints = 5;
        ctx.beginPath();
        for (let i = 0; i < starPoints * 2; i++) {
          const ang = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? 14 : 6;
          const px2 = sx + Math.cos(ang) * r;
          const py2 = sy - 8 + Math.sin(ang) * r;
          if (i === 0) { ctx.moveTo(px2, py2); } else { ctx.lineTo(px2, py2); }
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'wishingWell': {
        // Draw a mossy stone well
        const wx = ev.x, wy = ev.y;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#80CBC4';
        // Well base
        ctx.fillStyle = '#78909C';
        ctx.beginPath();
        ctx.roundRect(wx - 20, wy - 28, 40, 30, 4);
        ctx.fill();
        // Stone texture
        ctx.strokeStyle = '#546E7A';
        ctx.lineWidth = 1.5;
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            ctx.strokeRect(wx - 18 + col * 13, wy - 26 + row * 10, 12, 9);
          }
        }
        // Roof posts
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(wx - 22, wy - 44, 6, 20);
        ctx.fillRect(wx + 16, wy - 44, 6, 20);
        // Roof
        ctx.fillStyle = '#A1887F';
        ctx.beginPath();
        ctx.moveTo(wx - 28, wy - 44);
        ctx.lineTo(wx, wy - 60);
        ctx.lineTo(wx + 28, wy - 44);
        ctx.closePath();
        ctx.fill();
        // Water shimmer
        ctx.fillStyle = `rgba(100,200,255,${0.5 * pulse})`;
        ctx.beginPath();
        ctx.ellipse(wx, wy - 4, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Moss accent
        ctx.fillStyle = '#66BB6A';
        ctx.beginPath();
        ctx.ellipse(wx - 12, wy - 2, 8, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        const wGrd = ctx.createRadialGradient(wx, wy - 16, 0, wx, wy - 16, 30);
        wGrd.addColorStop(0, `rgba(128,203,196,${0.2 * pulse})`);
        wGrd.addColorStop(1, 'rgba(128,203,196,0)');
        ctx.fillStyle = wGrd;
        ctx.beginPath();
        ctx.arc(wx, wy - 16, 30, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  renderAtmosphere(ctx: CanvasRenderingContext2D) {
    const biome = this.state.biome;
    const t = this.state.gameTime;
    const camX = this.cameraX;
    const renderLeft  = camX - CANVAS_WIDTH * 0.6;
    const renderRight = camX + CANVAS_WIDTH * 1.1;

    // Per-biome atmosphere config
    const ATMO: Record<string, {
      mist: boolean; mistColor: string;
      petals: boolean; petalHue: number;
      pollen: boolean; pollenColor: string;
      fireflies: number; fireflyColors: string[];
      rays: boolean; starDust: boolean;
    }> = {
      enchanted: { mist: true,  mistColor: 'rgba(200,230,240,0.10)', petals: true,  petalHue: 340, pollen: true,  pollenColor: '#FFE082', fireflies: 14, fireflyColors: ['#E8FFB3','#B8FFD8','#FFF9C4'], rays: true,  starDust: false },
      moonlit:   { mist: true,  mistColor: 'rgba(180,200,240,0.14)', petals: false, petalHue: 200, pollen: false, pollenColor: '#C0E8FF', fireflies: 18, fireflyColors: ['#76CFFF','#A0E8FF','#B2EBF2'],  rays: false, starDust: false },
      firefly:   { mist: false, mistColor: '',                        petals: false, petalHue: 120, pollen: true,  pollenColor: '#B2FF59', fireflies: 22, fireflyColors: ['#FFEB3B','#76FF03','#80FF80'],  rays: false, starDust: false },
      starfall:  { mist: false, mistColor: '',                        petals: false, petalHue: 60,  pollen: false, pollenColor: '#FFD700', fireflies: 0,  fireflyColors: [],                                rays: false, starDust: true  },
      crystal:   { mist: true,  mistColor: 'rgba(120,80,200,0.10)',   petals: false, petalHue: 280, pollen: false, pollenColor: '#B388FF', fireflies: 0,  fireflyColors: [],                                rays: true,  starDust: true  },
      canopy:    { mist: false, mistColor: '',                        petals: true,  petalHue: 35,  pollen: true,  pollenColor: '#FFF176', fireflies: 6,  fireflyColors: ['#FFF9C4','#FFE082','#FFCC02'],  rays: true,  starDust: false },
      ruins:     { mist: true,  mistColor: 'rgba(180,160,100,0.08)', petals: false, petalHue: 30,  pollen: true,  pollenColor: '#FFCCBC', fireflies: 0,  fireflyColors: [],                                rays: false, starDust: false },
      caverns:   { mist: true,  mistColor: 'rgba(60,30,120,0.14)',   petals: false, petalHue: 270, pollen: false, pollenColor: '#B388FF', fireflies: 8,  fireflyColors: ['#B388FF','#00E5FF','#7C4DFF'],   rays: false, starDust: true  },
      autumn:    { mist: false, mistColor: '',                        petals: true,  petalHue: 25,  pollen: true,  pollenColor: '#FFAB40', fireflies: 0,  fireflyColors: [],                                rays: true,  starDust: false },
      cloud:     { mist: false, mistColor: '',                        petals: false, petalHue: 200, pollen: false, pollenColor: '#B2EBF2', fireflies: 0,  fireflyColors: [],                                rays: true,  starDust: false },
      candy:     { mist: false, mistColor: '',                        petals: true,  petalHue: 320, pollen: true,  pollenColor: '#FF80AB', fireflies: 0,  fireflyColors: [],                                rays: false, starDust: false },
      frozen:    { mist: true,  mistColor: 'rgba(180,230,255,0.12)', petals: false, petalHue: 200, pollen: false, pollenColor: '#B2EBF2', fireflies: 0,  fireflyColors: [],                                rays: false, starDust: false },
      volcanic:  { mist: false, mistColor: '',                        petals: false, petalHue: 20,  pollen: false, pollenColor: '#FF7043', fireflies: 0,  fireflyColors: [],                                rays: false, starDust: false },
    };
    const cfg = ATMO[biome] || ATMO.enchanted;

    ctx.save();

    // ── Ground mist strip ─────────────────────────────────────────────────────
    if (cfg.mist) {
      const mistGrad = ctx.createLinearGradient(0, GROUND_Y - 80, 0, GROUND_Y + 40);
      mistGrad.addColorStop(0, 'rgba(0,0,0,0)');
      mistGrad.addColorStop(0.55, cfg.mistColor);
      mistGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(camX - 100, GROUND_Y - 80, CANVAS_WIDTH + 200, 120);
    }

    // ── Diagonal light rays ───────────────────────────────────────────────────
    if (cfg.rays && VISUAL_FLAGS.lightRays) {
      const rayBaseX = camX + CANVAS_WIDTH * 0.05;
      const rayBaseY = -200;
      for (let ri = 0; ri < 5; ri++) {
        const pulse = 0.04 + Math.sin(t * 0.012 + ri * 1.4) * 0.025;
        const spread = 40 + ri * 55;
        const rayLen = CANVAS_HEIGHT * 1.8;
        const angle = 0.42 + ri * 0.06;
        const rx2 = rayBaseX + spread + Math.cos(angle + Math.PI / 2) * rayLen;
        const ry2 = rayBaseY + Math.sin(angle + Math.PI / 2) * rayLen;
        const rayWidth = 22 + ri * 14;
        const rayGrad = ctx.createLinearGradient(rayBaseX + spread, rayBaseY, rx2, ry2);
        rayGrad.addColorStop(0, `rgba(255,255,200,${pulse * 1.5})`);
        rayGrad.addColorStop(0.4, `rgba(255,255,180,${pulse})`);
        rayGrad.addColorStop(1, 'rgba(255,255,180,0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(rayBaseX + spread - rayWidth * 0.5, rayBaseY);
        ctx.lineTo(rayBaseX + spread + rayWidth * 0.5, rayBaseY);
        ctx.lineTo(rx2 + rayWidth * 1.2, ry2);
        ctx.lineTo(rx2 - rayWidth * 1.2, ry2);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── Pollen / dust motes ───────────────────────────────────────────────────
    if (cfg.pollen && VISUAL_FLAGS.pollenParticles) {
      for (let pi = 0; pi < 5; pi++) {
        const pt = t * 0.008 + pi * 2.1;
        const wx = camX - CANVAS_WIDTH * 0.3 + ((pi * 137.5 + t * 3.5) % (CANVAS_WIDTH * 1.6));
        const wy = GROUND_Y - 80 - 120 * ((pi * 0.37) % 1) + Math.sin(pt * 0.9 + pi * 1.3) * 18;
        const drift = Math.sin(pt * 0.4 + pi * 0.7) * 12;
        const alpha = 0.18 + Math.sin(pt * 0.6 + pi * 1.1) * 0.14;
        if (alpha < 0.05) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = cfg.pollenColor;
        for (let ppi = 0; ppi < 4; ppi++) {
          const pa = (ppi / 4) * Math.PI * 2 + pt * 0.3;
          ctx.beginPath();
          ctx.ellipse(wx + drift + Math.cos(pa) * 3, wy + Math.sin(pa) * 3, 2.5, 1.5, pa, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.arc(wx + drift, wy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Falling petals ────────────────────────────────────────────────────────
    if (cfg.petals) {
      const petalCount = (biome === 'enchanted' || biome === 'canopy') ? 7 : 5;
      for (let i = 0; i < petalCount; i++) {
        const seed = i * 73;
        const wx = camX - 50 + ((seed * 100 + t * 0.18 + Math.sin(t * 0.0003 + seed) * 50) % (CANVAS_WIDTH + 100));
        const wy = GROUND_Y - 20 - ((t * 0.12 + seed * 50) % (CANVAS_HEIGHT * 0.65));
        const rotation = t * 0.001 + seed;
        const ps = 3 + (seed % 3);
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(rotation);
        ctx.globalAlpha = 0.4 + Math.sin(t * 0.001 + seed) * 0.3;
        ctx.fillStyle = `hsl(${cfg.petalHue + (seed % 40)}, 70%, ${72 + (seed % 14)}%)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, ps, ps * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // ── Stardust / crystal motes ──────────────────────────────────────────────
    if (cfg.starDust) {
      for (let i = 0; i < 12; i++) {
        const seed = i * 97.3;
        const sx = camX - 50 + ((seed * 80 + t * 0.12) % (CANVAS_WIDTH + 100));
        const sy = GROUND_Y - 50 - ((seed * 45 + t * 0.06) % (CANVAS_HEIGHT * 0.55));
        const sparkle = 0.3 + Math.sin(t * 0.004 + seed) * 0.3;
        ctx.globalAlpha = sparkle * 0.65;
        ctx.fillStyle = biome === 'starfall' ? '#FFD700' : '#B388FF';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5 + sparkle, 0, Math.PI * 2);
        ctx.fill();
        if (sparkle > 0.45) {
          ctx.globalAlpha = sparkle * 0.3;
          ctx.strokeStyle = biome === 'starfall' ? '#FFD700' : '#E1BEE7';
          ctx.lineWidth = 0.8;
          const fl = 3 + sparkle * 3;
          ctx.beginPath();
          ctx.moveTo(sx - fl, sy); ctx.lineTo(sx + fl, sy);
          ctx.moveTo(sx, sy - fl); ctx.lineTo(sx, sy + fl);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Fireflies ─────────────────────────────────────────────────────────────
    if (cfg.fireflies > 0) {
      for (let i = 0; i < cfg.fireflies; i++) {
        const wrapZone = CANVAS_WIDTH * 2;
        const rawX = renderLeft + ((i * 137.5 + t * 18 + i * 50) % wrapZone);
        if (rawX < renderLeft || rawX > renderRight) continue;
        const fy = GROUND_Y - 40 - ((i * 73.1 + i * 30) % 200);
        const drift = Math.sin(t * 0.04 + i * 1.3) * 12;
        const fx = rawX + drift;
        const pulse = 0.4 + Math.sin(t * 0.07 + i * 2.1) * 0.4;
        if (pulse < 0.1) continue;
        const fColor = cfg.fireflyColors[i % cfg.fireflyColors.length] || '#FFEB3B';
        ctx.globalAlpha = pulse * 0.18;
        const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 10);
        glow.addColorStop(0, fColor);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(fx, fy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = pulse * 0.75;
        ctx.fillStyle = fColor;
        ctx.beginPath();
        ctx.arc(fx, fy, 2 + pulse * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Collectible sparkle glints ────────────────────────────────────────────
    for (const c of this.collectibles) {
      if (c.collected || c.x < renderLeft || c.x > renderRight) continue;
      const sparkle = 0.3 + Math.sin(t * 0.09 + c.bobOffset) * 0.3;
      if (sparkle < 0.35) continue;
      ctx.globalAlpha = sparkle * 0.6;
      ctx.strokeStyle = '#FFF9C4';
      ctx.lineWidth = 1;
      const ss = 5 + sparkle * 4;
      ctx.beginPath();
      ctx.moveTo(c.x - ss, c.y); ctx.lineTo(c.x + ss, c.y);
      ctx.moveTo(c.x, c.y - ss); ctx.lineTo(c.x, c.y + ss);
      ctx.moveTo(c.x - ss * 0.6, c.y - ss * 0.6); ctx.lineTo(c.x + ss * 0.6, c.y + ss * 0.6);
      ctx.moveTo(c.x + ss * 0.6, c.y - ss * 0.6); ctx.lineTo(c.x - ss * 0.6, c.y + ss * 0.6);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderLightingOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const biome = this.state.biome;
    let tint = 'rgba(0,0,0,0)';

    switch (biome) {
      case 'autumn':
        tint = 'rgba(255, 100, 0, 0.05)'; // Warm golden hour
        break;
      case 'crystal':
        tint = 'rgba(100, 0, 255, 0.08)'; // Magical purple/blue glow
        break;
      case 'firefly':
        tint = 'rgba(0, 20, 50, 0.2)'; // Deep magical night
        break;
      case 'enchanted':
        tint = 'rgba(200, 255, 200, 0.03)'; // Fresh morning green
        break;
    }

    if (this.state.isTransitioning && this.state.transitioningBiome) {
      // Interpolate tint if needed, but for now just a simple overlay is fine
    }

    ctx.fillStyle = tint;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Per-biome sky palette used by renderSky for clouds, god rays and gradient.
  private readonly BIOME_SKY_PALETTES: Record<string, {
    skyTop: string; skyMid: string; skyHorizon: string;
    horizonGlow: string; nearHorizon: string; groundBlend: string;
    cloudAlphaFar: number; cloudAlphaMid: number; cloudAlphaNear: number;
    cloudTint: string; godRays: boolean; godRayColor: string;
  }> = {
    enchanted: {
      skyTop: '#4A8FD9', skyMid: '#87CEEB', skyHorizon: '#B8E6F0',
      horizonGlow: '#FFE4B5', nearHorizon: '#FFF0DB', groundBlend: '#E8F5E9',
      cloudAlphaFar: 0.35, cloudAlphaMid: 0.55, cloudAlphaNear: 0.75,
      cloudTint: '255,255,255', godRays: true, godRayColor: 'rgba(255,250,200,',
    },
    moonlit: {
      skyTop: '#1a1a3e', skyMid: '#2d3561', skyHorizon: '#3a4568',
      horizonGlow: '#9f7aea', nearHorizon: '#c4b5fd', groundBlend: '#1a2e1a',
      cloudAlphaFar: 0.12, cloudAlphaMid: 0.22, cloudAlphaNear: 0.32,
      cloudTint: '160,170,210', godRays: true, godRayColor: 'rgba(180,200,255,',
    },
    crystal: {
      skyTop: '#0f172a', skyMid: '#1e293b', skyHorizon: '#334155',
      horizonGlow: '#a78bfa', nearHorizon: '#c4b5fd', groundBlend: '#1e1b4b',
      cloudAlphaFar: 0.10, cloudAlphaMid: 0.18, cloudAlphaNear: 0.28,
      cloudTint: '130,100,200', godRays: true, godRayColor: 'rgba(200,180,255,',
    },
    firefly: {
      skyTop: '#0D1B2A', skyMid: '#1B2838', skyHorizon: '#1A237E',
      horizonGlow: '#4CAF50', nearHorizon: '#1B3A2D', groundBlend: '#1B5E20',
      cloudAlphaFar: 0.08, cloudAlphaMid: 0.14, cloudAlphaNear: 0.22,
      cloudTint: '80,120,80', godRays: false, godRayColor: 'rgba(100,255,100,',
    },
    canopy: {
      skyTop: '#1B4A1B', skyMid: '#2E7D32', skyHorizon: '#1565C0',
      horizonGlow: '#FFEE58', nearHorizon: '#F9A825', groundBlend: '#2E5A1E',
      cloudAlphaFar: 0.28, cloudAlphaMid: 0.45, cloudAlphaNear: 0.62,
      cloudTint: '220,240,200', godRays: true, godRayColor: 'rgba(255,255,160,',
    },
    ruins: {
      skyTop: '#2E1A0E', skyMid: '#4A2C14', skyHorizon: '#6B3D1E',
      horizonGlow: '#80CBC4', nearHorizon: '#FFCC80', groundBlend: '#5D4037',
      cloudAlphaFar: 0.20, cloudAlphaMid: 0.35, cloudAlphaNear: 0.50,
      cloudTint: '200,180,140', godRays: false, godRayColor: 'rgba(255,200,100,',
    },
    starfall: {
      skyTop: '#0D0D2B', skyMid: '#1A1A4A', skyHorizon: '#2D1B69',
      horizonGlow: '#FFD700', nearHorizon: '#FF80AB', groundBlend: '#1A1A3A',
      cloudAlphaFar: 0.08, cloudAlphaMid: 0.14, cloudAlphaNear: 0.22,
      cloudTint: '120,100,180', godRays: true, godRayColor: 'rgba(255,220,100,',
    },
    autumn: {
      skyTop: '#FF8A65', skyMid: '#FFAB91', skyHorizon: '#FFE0B2',
      horizonGlow: '#FF6F00', nearHorizon: '#FFD54F', groundBlend: '#8D6E63',
      cloudAlphaFar: 0.30, cloudAlphaMid: 0.50, cloudAlphaNear: 0.70,
      cloudTint: '255,240,220', godRays: true, godRayColor: 'rgba(255,200,80,',
    },
    caverns: {
      skyTop: '#0A0A18', skyMid: '#12122A', skyHorizon: '#1A1A3A',
      horizonGlow: '#00E5FF', nearHorizon: '#7C4DFF', groundBlend: '#2A1A4A',
      cloudAlphaFar: 0.06, cloudAlphaMid: 0.12, cloudAlphaNear: 0.20,
      cloudTint: '80,60,140', godRays: false, godRayColor: 'rgba(100,200,255,',
    },
    cloud: {
      skyTop: '#87CEEB', skyMid: '#B0E0E6', skyHorizon: '#E0F6FF',
      horizonGlow: '#FFF8DC', nearHorizon: '#FFFDE7', groundBlend: '#E3F6FF',
      cloudAlphaFar: 0.55, cloudAlphaMid: 0.75, cloudAlphaNear: 0.90,
      cloudTint: '255,255,255', godRays: true, godRayColor: 'rgba(255,255,240,',
    },
    candy: {
      skyTop: '#F8BBD9', skyMid: '#FFC1E3', skyHorizon: '#FFD1DC',
      horizonGlow: '#FF80AB', nearHorizon: '#FF4081', groundBlend: '#FFF0F5',
      cloudAlphaFar: 0.45, cloudAlphaMid: 0.65, cloudAlphaNear: 0.80,
      cloudTint: '255,200,220', godRays: false, godRayColor: 'rgba(255,100,180,',
    },
    frozen: {
      skyTop: '#B3EFFF', skyMid: '#E0F7FA', skyHorizon: '#EAF6FF',
      horizonGlow: '#81D4FA', nearHorizon: '#B2EBF2', groundBlend: '#B3EFFF',
      cloudAlphaFar: 0.50, cloudAlphaMid: 0.70, cloudAlphaNear: 0.85,
      cloudTint: '220,245,255', godRays: false, godRayColor: 'rgba(200,240,255,',
    },
    volcanic: {
      skyTop: '#2D2D2D', skyMid: '#3E1F0A', skyHorizon: '#6B2A00',
      horizonGlow: '#FF7043', nearHorizon: '#FF5722', groundBlend: '#FF7043',
      cloudAlphaFar: 0.18, cloudAlphaMid: 0.30, cloudAlphaNear: 0.42,
      cloudTint: '140,80,60', godRays: false, godRayColor: 'rgba(255,100,30,',
    },
  };

  renderSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const biome = this.state.biome;
    const pal = this.BIOME_SKY_PALETTES[biome] || this.BIOME_SKY_PALETTES.enchanted;
    const gt = this.state.gameTime;

    // ── 6-stop gradient for richer atmospheric depth ───────────────────────────
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (this.state.isTransitioning && this.state.transitioningBiome) {
      const tp = this.state.transitionProgress;
      const tp2 = this.BIOME_SKY_PALETTES[this.state.transitioningBiome] || pal;
      grad.addColorStop(0,    this.blendColors(pal.skyTop,      tp2.skyTop,      tp));
      grad.addColorStop(0.25, this.blendColors(pal.skyMid,      tp2.skyMid,      tp));
      grad.addColorStop(0.55, this.blendColors(pal.skyHorizon,  tp2.skyHorizon,  tp));
      grad.addColorStop(0.72, this.blendColors(pal.horizonGlow, tp2.horizonGlow, tp));
      grad.addColorStop(0.88, this.blendColors(pal.nearHorizon, tp2.nearHorizon, tp));
      grad.addColorStop(1,    this.blendColors(pal.groundBlend, tp2.groundBlend, tp));
    } else {
      grad.addColorStop(0,    pal.skyTop);
      grad.addColorStop(0.25, pal.skyMid);
      grad.addColorStop(0.55, pal.skyHorizon);
      grad.addColorStop(0.72, pal.horizonGlow);
      grad.addColorStop(0.88, pal.nearHorizon);
      grad.addColorStop(1,    pal.groundBlend);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // ── Volumetric cloud layers: far → mid → near ─────────────────────────────
    ctx.save();
    this.drawBgCloudLayer(ctx, w, h, gt, 0.04,  0.12, pal.cloudAlphaFar,  pal.cloudTint, 4, 110);
    this.drawBgCloudLayer(ctx, w, h, gt, 0.10,  0.24, pal.cloudAlphaMid,  pal.cloudTint, 6,  80);
    this.drawBgCloudLayer(ctx, w, h, gt, 0.22,  0.35, pal.cloudAlphaNear, pal.cloudTint, 5,  60);
    ctx.restore();

    // ── Angled god rays for day/enchanted biomes ──────────────────────────────
    if (pal.godRays) {
      ctx.save();
      const srcX = w * 0.78;
      for (let i = 0; i < 5; i++) {
        const pulse = 0.025 + Math.sin(gt * 0.0004 + i * 1.4) * 0.018;
        const spread = w * (0.08 + i * 0.055);
        const len = h * 0.65;
        const angle = 0.38 + i * 0.07;
        const rx2 = srcX + spread + Math.cos(angle + Math.PI * 0.5) * len;
        const ry2 = Math.sin(angle + Math.PI * 0.5) * len;
        const rw = 18 + i * 10;
        const rg = ctx.createLinearGradient(srcX + spread, 0, rx2, ry2);
        rg.addColorStop(0,    pal.godRayColor + `${pulse * 2.2})`);
        rg.addColorStop(0.45, pal.godRayColor + `${pulse})`);
        rg.addColorStop(1,    pal.godRayColor + '0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(srcX + spread - rw * 0.5, 0);
        ctx.lineTo(srcX + spread + rw * 0.5, 0);
        ctx.lineTo(rx2 + rw * 1.3, ry2);
        ctx.lineTo(rx2 - rw * 1.3, ry2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // ── Below-ground soil fill ─────────────────────────────────────────────────
    const groundScreenY = CANVAS_HEIGHT / 2 + (GROUND_Y - this.cameraY);
    if (groundScreenY < h) {
      const soilThemes: Record<string, { soil: string; root: string }> = {
        enchanted: { soil: '#6B4423', root: '#2E1A0A' },
        crystal:   { soil: '#3B2266', root: '#150B30' },
        autumn:    { soil: '#6B4A2D', root: '#2E1C0A' },
        firefly:   { soil: '#1A3020', root: '#070F09' },
        moonlit:   { soil: '#1A3020', root: '#070F09' },
        caverns:   { soil: '#2B1460', root: '#0E0628' },
        canopy:    { soil: '#3A4A1E', root: '#131808' },
        ruins:     { soil: '#5D4037', root: '#2A1A10' },
        starfall:  { soil: '#1A1A40', root: '#08081A' },
      };
      const st = soilThemes[biome] || soilThemes.enchanted;
      const soilGrad = ctx.createLinearGradient(0, groundScreenY, 0, h);
      soilGrad.addColorStop(0, st.soil);
      soilGrad.addColorStop(0.4, this.darkenColor(st.soil, 15));
      soilGrad.addColorStop(1, st.root);
      ctx.fillStyle = soilGrad;
      ctx.fillRect(0, groundScreenY, w, h - groundScreenY);
    }

    // ── Horizon warm glow band ────────────────────────────────────────────────
    const horizonY = CANVAS_HEIGHT / 2 + (GROUND_Y - this.cameraY);
    const clampedHorizon = Math.max(h * 0.45, Math.min(h * 0.85, horizonY));
    const isNight = biome === 'firefly' || biome === 'crystal' || biome === 'moonlit'
                 || biome === 'starfall' || biome === 'caverns';
    const horizonColor = isNight ? 'rgba(100,80,160,0.22)' : 'rgba(255,200,100,0.18)';
    const hGlow = ctx.createLinearGradient(0, clampedHorizon - 60, 0, clampedHorizon + 20);
    hGlow.addColorStop(0, 'rgba(255,255,255,0)');
    hGlow.addColorStop(0.5, horizonColor);
    hGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hGlow;
    ctx.fillRect(0, clampedHorizon - 60, w, 80);

    // ── Celestial body (sun / moon) ───────────────────────────────────────────
    const bodyColor = isNight ? '#E0F7FA' : '#FFF59D';
    const coreColor = isNight ? 'rgba(224,247,250,0.95)' : 'rgba(255,255,240,0.98)';
    {
      const sunX = w * 0.82;
      const sunY = h * 0.13;
      const pulse = 1 + Math.sin(gt * 0.02) * 0.06;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 90 * pulse);
      sunGlow.addColorStop(0, 'rgba(255,245,157,0.55)');
      sunGlow.addColorStop(0.5, 'rgba(255,236,130,0.18)');
      sunGlow.addColorStop(1, 'rgba(255,236,130,0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
      ctx.save();
      ctx.globalAlpha = (isNight ? 0.08 : 0.12) + Math.sin(gt * 0.015) * 0.05;
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2;
      const rCount = isNight ? 8 : 12;
      for (let i = 0; i < rCount; i++) {
        const angle = (i / rCount) * Math.PI * 2 + gt * 0.003;
        const innerR = 28 * pulse;
        const outerR = (isNight ? 45 : 55) + Math.sin(angle * 3 + gt * 0.02) * 12;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(angle) * innerR, sunY + Math.sin(angle) * innerR);
        ctx.lineTo(sunX + Math.cos(angle) * outerR, sunY + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      ctx.restore();
      const sunCore = ctx.createRadialGradient(sunX - 4, sunY - 4, 2, sunX, sunY, 22 * pulse);
      sunCore.addColorStop(0, coreColor);
      if (isNight) {
        sunCore.addColorStop(0.6, 'rgba(178,235,242,0.8)');
        sunCore.addColorStop(1, 'rgba(128,222,234,0.6)');
      } else {
        sunCore.addColorStop(0.6, 'rgba(255,238,88,0.92)');
        sunCore.addColorStop(1, 'rgba(255,202,40,0.7)');
      }
      ctx.fillStyle = sunCore;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 22 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Floating sky sparkles (enchanted / firefly) ───────────────────────────
    if (biome === 'enchanted' || biome === 'firefly') {
      ctx.save();
      for (let i = 0; i < 18; i++) {
        const sx = ((i * 137.5 + gt * 0.15) % (w + 40)) - 20;
        const sy = 30 + ((i * 73.1) % (h * 0.55));
        ctx.globalAlpha = 0.25 + Math.sin(gt * 0.04 + i * 1.7) * 0.25;
        ctx.fillStyle = i % 3 === 0 ? '#FFF9C4' : i % 3 === 1 ? '#B2FF59' : '#80DEEA';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2 + Math.sin(gt * 0.06 + i * 2.3) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Draws one parallax cloud layer of count puffy multi-radial clouds.
  private drawBgCloudLayer(
    ctx: CanvasRenderingContext2D, w: number, h: number, gt: number,
    speed: number, yFrac: number, alpha: number, tint: string, count: number, baseSize: number
  ) {
    for (let i = 0; i < count; i++) {
      const seed = i * 137.5;
      const baseX = ((seed * 120 + gt * speed * 60) % (w + baseSize * 3)) - baseSize * 1.5;
      const baseY = h * yFrac + Math.sin(seed * 0.7 + gt * 0.0002) * 18;
      const cw = baseSize + (seed % (baseSize * 0.9));
      const puffs = 3 + Math.floor(seed % 3);
      ctx.globalAlpha = alpha * (0.75 + Math.sin(gt * 0.0005 + seed) * 0.12);
      for (let p = 0; p < puffs; p++) {
        const pr = cw * (0.22 + (((seed * 7 + p * 31) % 100) / 100) * 0.14);
        const px = baseX + (p - puffs * 0.5) * cw * 0.32;
        const py = baseY + Math.sin(seed + p * 2.1) * cw * 0.14;
        const cg = ctx.createRadialGradient(px - pr * 0.2, py - pr * 0.3, pr * 0.1, px, py, pr);
        cg.addColorStop(0,   `rgba(${tint},${Math.min(1, alpha + 0.15)})`);
        cg.addColorStop(0.6, `rgba(${tint},${alpha * 0.7})`);
        cg.addColorStop(1,   `rgba(${tint},0)`);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
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
    const renderBiomeLayers = (layers: typeof this.bgLayers, opacity: number) => {
      ctx.globalAlpha = opacity;
      const camX = this.cameraX;

      // Horizon line derived from camera/world relationship
      const rawGround = CANVAS_HEIGHT / 2 + (GROUND_Y - this.cameraY);
      const groundScreen = Math.max(h * 0.52, Math.min(h * 0.82, rawGround));

      // Helper: draw elements from a layer with parallax, seamless tiling every `step` px
      const drawLayer = (
        layer: typeof layers[0] | undefined,
        parallaxFactor: number,
        step: number,
        drawFn: (x: number, el: BackgroundElement) => void
      ) => {
        if (!layer) return;
        for (const el of layer.elements) {
          // World-space X of this element after parallax
          const worldX = el.x - camX * parallaxFactor;
          // Find the tile offset so we always cover [-margin, w + margin]
          const margin = step * 2;
          const tileOrigin = worldX - Math.floor((worldX + margin) / step) * step;
          for (let tx = tileOrigin - step; tx < w + margin; tx += step) {
            drawFn(tx, el);
          }
        }
      };

      // ── Layer 3: Background clouds ──────────────────────────────────────────
      drawLayer(layers[3], 0.03, 280, (x, el) => {
        this.drawCloud(ctx, x, el.y, el.scale);
      });

      // ── Horizon atmospheric haze ────────────────────────────────────────────
      const hazeGrad = ctx.createLinearGradient(0, groundScreen - h * 0.18, 0, groundScreen);
      hazeGrad.addColorStop(0, 'rgba(255,255,255,0)');
      hazeGrad.addColorStop(1, 'rgba(255,255,255,0.12)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, groundScreen - h * 0.18, w, h * 0.18);

      // ── Layer 2: Distant mountains ──────────────────────────────────────────
      drawLayer(layers[2], 0.08, 230, (x, el) => {
        if (el.type === 'mountain') {
          this.drawMountain(ctx, x, groundScreen, el.scale, el.color);
        } else {
          // Distant trees behind mountains
          ctx.globalAlpha = opacity * 0.55;
          this.drawTree(ctx, x, groundScreen, el.scale * 1.1, el.color, el.variant);
          ctx.globalAlpha = opacity;
        }
      });

      // ── Horizon ground strip — thick layered connection between bg and foreground platforms ──
      const biome = BIOME_COLORS[this.state.biome];
      const horizonTheme: Record<string, { cap: string; soil: string; deep: string }> = {
        enchanted: { cap: '#5DBB3F', soil: '#6B4423', deep: '#2E1A0A' },
        crystal:   { cap: '#6A3FA0', soil: '#3B2266', deep: '#150B30' },
        autumn:    { cap: '#A0714A', soil: '#6B4A2D', deep: '#2E1C0A' },
        firefly:   { cap: '#2A5E3F', soil: '#1A3020', deep: '#070F09' },
        moonlit:   { cap: '#1E3D2A', soil: '#1A3020', deep: '#070F09' },
        caverns:   { cap: '#3A1A6A', soil: '#2B1460', deep: '#0E0628' },
        canopy:    { cap: '#2E6A1E', soil: '#3A4A1E', deep: '#131808' },
        ruins:     { cap: '#6A5038', soil: '#5D4037', deep: '#2A1A10' },
        starfall:  { cap: '#1A1A4A', soil: '#1A1A40', deep: '#08081A' },
      };
      const ht = horizonTheme[this.state.biome] || horizonTheme.enchanted;
      void biome;
      // Grass cap strip
      ctx.fillStyle = ht.cap;
      ctx.fillRect(0, groundScreen - 4, w, 7);
      // Soil body below — fills rest of screen
      const stripGrad = ctx.createLinearGradient(0, groundScreen + 3, 0, groundScreen + 180);
      stripGrad.addColorStop(0, ht.soil);
      stripGrad.addColorStop(0.45, this.darkenColor(ht.soil, 20));
      stripGrad.addColorStop(1, ht.deep);
      ctx.fillStyle = stripGrad;
      ctx.fillRect(0, groundScreen + 3, w, Math.max(180, h - groundScreen));
      // Wavy grass fringe on the strip
      ctx.fillStyle = this.lightenColor(ht.cap, 12);
      ctx.beginPath();
      ctx.moveTo(0, groundScreen - 3);
      for (let gx = 0; gx <= w; gx += 4) {
        const wave = Math.sin(gx * 0.05 + this.state.gameTime * 0.015) * 2.5
                   + Math.sin(gx * 0.11 + this.state.gameTime * 0.009) * 1.5;
        ctx.lineTo(gx, groundScreen - 3 - wave);
      }
      ctx.lineTo(w, groundScreen + 4);
      ctx.lineTo(0, groundScreen + 4);
      ctx.closePath();
      ctx.fill();

      // ── Layer 1: Mid-ground trees (darkened for depth separation) ─────────────
      drawLayer(layers[1], 0.22, 140, (x, el) => {
        if (el.type === 'firefly') {
          // Animated firefly glow
          const glow = 0.4 + Math.sin(this.state.gameTime * 0.06 + el.x * 0.1) * 0.3;
          ctx.globalAlpha = opacity * glow;
          ctx.fillStyle = '#FFEB3B';
          ctx.beginPath();
          const fy = groundScreen - 80 - ((el.x * 37) % 120);
          ctx.arc(x, fy, 3 + el.scale * 2, 0, Math.PI * 2);
          ctx.fill();
          // Outer glow ring
          ctx.globalAlpha = opacity * glow * 0.3;
          ctx.beginPath();
          ctx.arc(x, fy, 8 + el.scale * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = opacity;
        } else if (VISUAL_FLAGS.organicBgTrees) {
          // Organic bezier-canopy trees with optional bioluminescent glow
          ctx.save();
          const biomeGlowMap: Record<string, string> = {
            enchanted: '#7FFFD4',
            crystal: '#B388FF',
            autumn: '#FFAB40',
            firefly: '#FFEE58',
          };
          const glowColor = biomeGlowMap[this.state.biome] || undefined;
          // Pick glow only for some trees (every 3rd, deterministic)
          const showGlow = (Math.floor(el.x * 0.07 + el.variant) % 3 === 0) ? glowColor : undefined;
          this.drawOrganicBgTree(ctx, x, groundScreen, el.scale * 1.3, el.color, el.variant, showGlow);
          // Subtle dark depth tint
          ctx.globalAlpha = opacity * 0.22;
          ctx.fillStyle = 'rgba(10,20,10,1)';
          ctx.beginPath();
          ctx.ellipse(x, groundScreen - el.scale * 60, el.scale * 26, el.scale * 55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Original tree rendering
          ctx.save();
          this.drawTree(ctx, x, groundScreen, el.scale * 1.4, el.color, el.variant);
          ctx.globalAlpha = opacity * 0.28;
          ctx.fillStyle = 'rgba(10,20,10,1)';
          ctx.beginPath();
          ctx.ellipse(x, groundScreen - el.scale * 55, el.scale * 28, el.scale * 60, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // ── Layer 0: Foreground bushes / flowers / mushrooms ───────────────────
      drawLayer(layers[0], 0.42, 90, (x, el) => {
        if (el.type === 'bush') {
          this.drawBush(ctx, x, groundScreen, el.scale, el.color);
        } else if (el.type === 'mushroom') {
          this.drawMushroomBg(ctx, x, groundScreen, el.scale, el.color);
        } else {
          this.drawFlowerBg(ctx, x, groundScreen - 2, el.scale, el.color);
        }
      });

      // ── Foreground grass edge (top of ground strip, slightly in front) ──────
      ctx.fillStyle = 'rgba(80,200,60,0.18)';
      ctx.fillRect(0, groundScreen - 3, w, 6);
    };

    if (this.state.isTransitioning && this.state.transitioningBiome && this.preservedBgLayers.length > 0) {
      renderBiomeLayers(this.preservedBgLayers, 1 - this.state.transitionProgress);
      renderBiomeLayers(this.bgLayers, this.state.transitionProgress);
    } else {
      renderBiomeLayers(this.bgLayers, 1);
    }

    ctx.globalAlpha = 1;
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
    ctx.save();
    ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.52;

    const mh = scale * 155;
    const mw = mh * 1.35;
    // seed from x so each mountain gets consistent variation
    const seed = Math.abs(Math.round(x * 0.01 + scale * 10)) % 100;

    // ── Back range: lighter, slightly shorter ──────────────────────────────────
    const backColor = this.lightenColor(this.lightenColor(color, 18), 12);
    const backGrad = ctx.createLinearGradient(x, baseY - mh * 0.85, x, baseY);
    backGrad.addColorStop(0, this.lightenColor(backColor, 10));
    backGrad.addColorStop(1, this.darkenColor(backColor, 15));
    ctx.fillStyle = backGrad;
    ctx.beginPath();
    ctx.moveTo(x - mw * 0.65, baseY);
    // organic left slope with quadratic bumps
    const bPoints = 6;
    for (let i = 0; i <= bPoints; i++) {
      const t = i / bPoints;
      const bx = x - mw * 0.65 + mw * 1.3 * t;
      const noise = Math.sin(seed + i * 1.7) * mh * 0.04
                  + Math.sin(seed * 2 + i * 3.1) * mh * 0.02;
      const peak = mh * 0.82 * Math.sin(Math.PI * t);
      const by = baseY - peak + noise;
      if (i === 0) ctx.lineTo(bx, by);
      else {
        const px = x - mw * 0.65 + mw * 1.3 * ((i - 0.5) / bPoints);
        const py = by - mh * 0.05;
        ctx.quadraticCurveTo(px, py, bx, by);
      }
    }
    ctx.lineTo(x + mw * 0.65, baseY);
    ctx.closePath();
    ctx.fill();

    // ── Main mountain silhouette with multi-freq sine noise ────────────────────
    const mtGrad = ctx.createLinearGradient(x, baseY - mh, x, baseY);
    mtGrad.addColorStop(0,    this.lightenColor(color, 18));
    mtGrad.addColorStop(0.3,  color);
    mtGrad.addColorStop(0.75, this.darkenColor(color, 20));
    mtGrad.addColorStop(1,    this.darkenColor(color, 38));
    ctx.fillStyle = mtGrad;

    const pts = 14;
    ctx.beginPath();
    ctx.moveTo(x - mw * 0.5, baseY);
    for (let i = 0; i <= pts; i++) {
      const t = i / pts;
      const sx = x - mw * 0.5 + mw * t;
      const n1 = Math.sin(seed * 0.3 + t * Math.PI * 2.1) * mh * 0.055;
      const n2 = Math.sin(seed * 0.7 + t * Math.PI * 4.3) * mh * 0.028;
      const n3 = Math.sin(seed * 1.1 + t * Math.PI * 7.8) * mh * 0.012;
      const peak = mh * Math.sin(Math.PI * t);
      const sy = baseY - Math.max(0, peak + n1 + n2 + n3);
      if (i === 0) ctx.lineTo(sx, sy);
      else {
        const px = x - mw * 0.5 + mw * ((i - 0.5) / pts);
        const py = sy - mh * 0.04 * Math.sin(Math.PI * t);
        ctx.quadraticCurveTo(px, py, sx, sy);
      }
    }
    ctx.lineTo(x + mw * 0.5, baseY);
    ctx.closePath();
    ctx.fill();

    // ── Right-face shadow ─────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(x, baseY - mh);
    ctx.quadraticCurveTo(x + mw * 0.15, baseY - mh * 0.55, x + mw * 0.5, baseY);
    ctx.lineTo(x, baseY);
    ctx.closePath();
    ctx.fill();

    // ── Snow cap (biome-aware, shown for lighter day biomes) ──────────────────
    const showSnow = color.startsWith('#') && this.hexToRgb(color).r + this.hexToRgb(color).g > 280;
    if (showSnow) {
      const snowH = mh * 0.30;
      ctx.fillStyle = 'rgba(240,248,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(x, baseY - mh);
      ctx.quadraticCurveTo(x - mh * 0.08, baseY - mh + snowH * 0.5, x - mh * 0.13, baseY - mh + snowH);
      ctx.quadraticCurveTo(x - mh * 0.04, baseY - mh + snowH * 0.75, x, baseY - mh + snowH * 0.9);
      ctx.quadraticCurveTo(x + mh * 0.04, baseY - mh + snowH * 0.75, x + mh * 0.13, baseY - mh + snowH);
      ctx.quadraticCurveTo(x + mh * 0.08, baseY - mh + snowH * 0.5, x, baseY - mh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.beginPath();
      ctx.moveTo(x, baseY - mh);
      ctx.quadraticCurveTo(x - mh * 0.03, baseY - mh + snowH * 0.4, x, baseY - mh + snowH * 0.38);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // Organic background tree: bezier trunk + 5-blob layered canopy + bioluminescent glow.
  drawOrganicBgTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, color: string, variant: number, biomeGlow?: string) {
    const h = scale * 95;
    const trunkH = h * 0.32;
    const trunkW = Math.max(4, 7 * scale);
    const darkColor  = this.darkenColor(color, 28);
    const midColor   = this.darkenColor(color, 12);
    const lightColor = this.lightenColor(color, 22);

    // Curved organic trunk
    const lean = Math.sin(variant * 2.3 + x * 0.005) * trunkW * 1.1;
    const trunkGrad = ctx.createLinearGradient(x - trunkW, 0, x + trunkW, 0);
    trunkGrad.addColorStop(0,    '#1E0F05');
    trunkGrad.addColorStop(0.25, '#4A2810');
    trunkGrad.addColorStop(0.55, '#7A5030');
    trunkGrad.addColorStop(0.8,  '#5D3A1A');
    trunkGrad.addColorStop(1,    '#1E0F05');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(x - trunkW * 0.65, baseY);
    ctx.bezierCurveTo(
      x - trunkW * 0.5 + lean * 0.2, baseY - trunkH * 0.35,
      x - trunkW * 0.2 + lean * 0.65, baseY - trunkH * 0.72,
      x + lean, baseY - trunkH
    );
    ctx.bezierCurveTo(
      x + trunkW * 0.2 + lean * 0.65, baseY - trunkH * 0.72,
      x + trunkW * 0.5 + lean * 0.2, baseY - trunkH * 0.35,
      x + trunkW * 0.65, baseY
    );
    ctx.closePath();
    ctx.fill();

    // 5-blob layered canopy (back-to-front)
    const cx = x + lean * 0.45;
    const cy = baseY - trunkH - h * 0.22;
    const blobs: { ox: number; oy: number; r: number; col: string }[] = [
      { ox: lean * 0.2 + h * 0.18, oy:  h * 0.13, r: h * 0.26, col: darkColor },
      { ox: lean * 0.1 - h * 0.20, oy:  h * 0.10, r: h * 0.28, col: darkColor },
      { ox: lean * 0.3 + h * 0.10, oy:  h * 0.04, r: h * 0.32, col: midColor  },
      { ox: lean * 0.4 - h * 0.10, oy: -h * 0.03, r: h * 0.35, col: color     },
      { ox: lean * 0.3,            oy: -h * 0.14,  r: h * 0.25, col: color     },
    ];
    for (const b of blobs) {
      ctx.fillStyle = b.col;
      ctx.beginPath();
      ctx.arc(cx + b.ox, cy + b.oy, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Specular rim highlight
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(cx - h * 0.13 + lean * 0.2, cy - h * 0.14, h * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(cx - h * 0.08 + lean * 0.15, cy - h * 0.18, h * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Bioluminescent glow halo + animated canopy dots
    if (biomeGlow && VISUAL_FLAGS.bioluminescentBgGlow) {
      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.20;
      const glowRad = ctx.createRadialGradient(cx, cy, 4, cx, cy, h * 0.60);
      glowRad.addColorStop(0, biomeGlow);
      glowRad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowRad;
      ctx.beginPath();
      ctx.arc(cx, cy, h * 0.60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const gt = this.state.gameTime;
      const dotCount = 2 + (variant % 3);
      for (let di = 0; di < dotCount; di++) {
        const da = (di / dotCount) * Math.PI * 1.9 + variant * 0.8;
        const dr = h * 0.24;
        const dx = cx + Math.cos(da) * dr;
        const dy = cy + Math.sin(da) * dr * 0.58;
        const pulse = 0.4 + Math.sin(gt * 0.05 + di * 1.6 + variant) * 0.4;
        ctx.save();
        ctx.globalAlpha = (ctx.globalAlpha || 1) * pulse * 0.65;
        ctx.fillStyle = biomeGlow;
        ctx.beginPath();
        ctx.arc(dx, dy, 2.2 + pulse * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number, color: string, variant: number) {
    const h = scale * 80;
    const trunkH = h * 0.32;
    const trunkW = Math.max(5, 6 * scale);
    const darkColor = this.darkenColor(color, 30);
    const lightColor = this.lightenColor(color, 25);

    // Trunk with bark gradient
    const trunkGrad = ctx.createLinearGradient(x - trunkW / 2, 0, x + trunkW / 2, 0);
    trunkGrad.addColorStop(0, '#3E2723');
    trunkGrad.addColorStop(0.4, '#6D4C41');
    trunkGrad.addColorStop(1, '#3E2723');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.roundRect(x - trunkW / 2, baseY - trunkH, trunkW, trunkH, [3, 3, 0, 0]);
    ctx.fill();

    // Canopy shadow on ground (oval)
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(x, baseY, h * 0.38, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    if (variant % 3 !== 2) {
      // Round deciduous tree — 3 overlapping blobs
      const radii = [h * 0.38, h * 0.30, h * 0.24];
      const offsets = [
        { ox: 0,          oy: -(trunkH + h * 0.38) },
        { ox: -h * 0.18,  oy: -(trunkH + h * 0.22) },
        { ox:  h * 0.18,  oy: -(trunkH + h * 0.18) },
      ];
      // Back shadow blobs
      ctx.fillStyle = darkColor;
      for (const { ox, oy } of offsets) {
        ctx.beginPath();
        ctx.arc(x + ox + 3, baseY + oy + 3, radii[offsets.indexOf({ ox, oy })] * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      // Main blobs
      ctx.fillStyle = color;
      for (const { ox, oy } of offsets) {
        ctx.beginPath();
        ctx.arc(x + ox, baseY + oy, radii[offsets.indexOf({ ox, oy })], 0, Math.PI * 2);
        ctx.fill();
      }
      // Highlight on primary blob
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(x - h * 0.10, baseY - (trunkH + h * 0.45), h * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Pine/Conifer — 3 stacked tiers, each slightly darker
      const tierColors = [color, darkColor, this.darkenColor(color, 50)];
      for (let i = 0; i < 3; i++) {
        const tw = h * (0.52 - i * 0.10);
        const th = h * 0.42;
        const oy = -(trunkH + h * (0.08 + i * 0.30));
        ctx.fillStyle = tierColors[i];
        ctx.beginPath();
        ctx.moveTo(x, baseY + oy - th);
        ctx.lineTo(x - tw / 2, baseY + oy);
        ctx.lineTo(x + tw / 2, baseY + oy);
        ctx.closePath();
        ctx.fill();
        // Right-side shadow
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.moveTo(x, baseY + oy - th);
        ctx.lineTo(x + tw / 2, baseY + oy);
        ctx.lineTo(x, baseY + oy);
        ctx.closePath();
        ctx.fill();
        // Left highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(x, baseY + oy - th);
        ctx.lineTo(x - tw / 2, baseY + oy);
        ctx.lineTo(x - tw * 0.2, baseY + oy);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
    const s = scale * 32;
    const cy = y - s * 0.52;
    const dark  = this.darkenColor(color, 22);
    const mid   = this.darkenColor(color, 10);
    const light = this.lightenColor(color, 18);

    // 4 overlapping ellipses for organic silhouette
    const clusters = [
      { ox: -s * 0.38, oy: s * 0.08, rx: s * 0.62, ry: s * 0.48, col: dark  },
      { ox:  s * 0.40, oy: s * 0.05, rx: s * 0.58, ry: s * 0.44, col: dark  },
      { ox: -s * 0.10, oy: s * 0.0,  rx: s * 0.72, ry: s * 0.52, col: mid   },
      { ox:  s * 0.08, oy: -s * 0.12, rx: s * 0.60, ry: s * 0.42, col: color },
    ];
    for (const c of clusters) {
      ctx.fillStyle = c.col;
      ctx.beginPath();
      ctx.ellipse(x + c.ox, cy + c.oy, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Soft specular sheen on top-left
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(x - s * 0.22, cy - s * 0.20, s * 0.28, s * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFlowerBg(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
    const s = scale * 11;
    const gt = this.state.gameTime;
    // Gentle sway driven by x position so each flower is offset
    const sway = Math.sin(gt * 0.002 + x * 0.03) * 2.5;
    const fx = x + sway;

    // 5 oval petals radiating from centre
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI * 0.5;
      const px = fx + Math.cos(angle) * s;
      const py = y  + Math.sin(angle) * s * 0.85;
      ctx.beginPath();
      ctx.ellipse(px, py, s * 0.48, s * 0.32, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    // Golden centre
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(fx, y, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // Tiny centre highlight
    ctx.fillStyle = 'rgba(255,255,220,0.6)';
    ctx.beginPath();
    ctx.arc(fx - s * 0.07, y - s * 0.07, s * 0.10, 0, Math.PI * 2);
    ctx.fill();
  }
  drawMushroomBg(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
    const s = scale * 15;
    // y is the ground line; stem grows upward from it
    const stemTop = y - s * 0.8;
    // Stem
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(x - s * 0.15, stemTop, s * 0.3, s * 0.8);
    // Cap sits at top of stem
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, stemTop, s * 0.5, s * 0.35, 0, Math.PI, 0);
    ctx.fill();
    // Spots on cap
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(x - s * 0.15, stemTop - s * 0.1, s * 0.08, 0, Math.PI * 2);
    ctx.arc(x + s * 0.2, stemTop - s * 0.05, s * 0.06, 0, Math.PI * 2);
    ctx.arc(x, stemTop - s * 0.2, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  renderPlatformSupports(ctx: CanvasRenderingContext2D) {
    const renderLeft = this.cameraX - CANVAS_WIDTH * 0.7;
    const renderRight = this.cameraX + CANVAS_WIDTH * 1.2;

    for (const p of [...this.platforms, ...this.craftedItems]) {
      if (p.x > renderRight || p.x + p.width < renderLeft) continue;
      if (p.type !== 'floating' && p.type !== 'log' && p.type !== 'vine' && p.type !== 'bridge' && p.type !== 'cloud') continue;

      // Only draw supports for elevated platforms (not ones sitting on ground)
      const groundY = GROUND_Y;
      const distToGround = groundY - (p.y + p.height);
      if (distToGround < 10) continue;

      const bob = p.type === 'floating'
        ? Math.sin(this.state.gameTime * 0.045 + p.x * 0.005) * 3
        : 0;
      const py = p.y + bob;
      const cx = p.x + p.width / 2;

      // Choose support style by platform type and a deterministic seed
      const seed = (p.x * 7 + p.y * 13) & 0xFFFF;
      const supportStyle = seed % 3; // 0=stilts, 1=roots, 2=vine-ropes

      if (p.type === 'cloud') {
        // Cloud platforms are "enchanted" — justify their float with:
        // 1. Magical shimmer aura beneath
        // 2. A thin beanstalk/vine tether growing from below ground
        const floatOffset = (p as { floatOffset?: number }).floatOffset || 0;
        const floatY = p.y + Math.sin(this.state.gameTime * ((p as { floatSpeed?: number }).floatSpeed || 0.8) + floatOffset) * 4;
        const cloudCx = p.x + p.width / 2;

        // Magical aura glow underneath
        ctx.save();
        const auraAlpha = 0.12 + Math.sin(this.state.gameTime * 0.05 + p.x * 0.01) * 0.06;
        const auraGrad = ctx.createRadialGradient(cloudCx, floatY + p.height, 5, cloudCx, floatY + p.height, p.width * 0.6);
        auraGrad.addColorStop(0,   `rgba(160,210,255,${auraAlpha * 3})`);
        auraGrad.addColorStop(0.4, `rgba(130,180,255,${auraAlpha})`);
        auraGrad.addColorStop(1,   'rgba(100,150,255,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.ellipse(cloudCx, floatY + p.height + 10, p.width * 0.55, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Beanstalk tether — thin spiraling vine from ground up to cloud base
        if (distToGround > 20) {
          ctx.save();
          const stalkX = cloudCx + Math.sin(p.x * 0.03) * 15; // offset for variety
          // Main stalk
          const stalkGrad = ctx.createLinearGradient(stalkX, GROUND_Y, stalkX, floatY + p.height);
          stalkGrad.addColorStop(0, '#2E7D32');
          stalkGrad.addColorStop(1, '#66BB6A');
          ctx.strokeStyle = stalkGrad;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(stalkX, GROUND_Y);
          // Gentle S-curve up to cloud
          ctx.bezierCurveTo(
            stalkX + 12, GROUND_Y - distToGround * 0.3,
            stalkX - 12, GROUND_Y - distToGround * 0.65,
            stalkX, floatY + p.height
          );
          ctx.stroke();
          // Spiral leaf pairs along the stalk
          ctx.fillStyle = '#4CAF50';
          const leafCount = Math.min(4, Math.floor(distToGround / 40));
          for (let li = 1; li <= leafCount; li++) {
            const t = li / (leafCount + 1);
            const ly = GROUND_Y - distToGround * t;
            const lx = stalkX + Math.sin(li * 2.1) * 8;
            const side = li % 2 ? 1 : -1;
            ctx.beginPath();
            ctx.ellipse(lx + side * 9, ly, 7, 4, side * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else if (p.type === 'vine') {
        // Vine platforms already draw their own rope above — draw root tendrils below instead
        ctx.save();
        ctx.strokeStyle = 'rgba(76,175,80,0.55)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const rx = p.x + p.width * (0.25 + i * 0.25);
          ctx.beginPath();
          ctx.moveTo(rx, py + p.height);
          const cp1x = rx + (i % 2 ? 8 : -8);
          ctx.quadraticCurveTo(cp1x, py + p.height + distToGround * 0.5, rx + (i % 2 ? -4 : 4), groundY);
          ctx.stroke();
        }
        ctx.restore();
      } else if (p.type === 'bridge') {
        // Bridge: thick rope/chain down to anchor posts on each side
        const anchorOffsets = [p.width * 0.18, p.width * 0.82];
        for (const ao of anchorOffsets) {
          const ax = p.x + ao;
          // Vertical rope
          ctx.save();
          ctx.strokeStyle = '#5D4037';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ax, py);
          ctx.lineTo(ax, groundY);
          ctx.stroke();
          // Rope strand overlay
          ctx.strokeStyle = '#8D6E63';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(ax + 1, py);
          ctx.lineTo(ax + 1, groundY);
          ctx.stroke();
          ctx.setLineDash([]);
          // Anchor post base
          ctx.fillStyle = '#4E342E';
          ctx.beginPath();
          ctx.roundRect(ax - 5, groundY - 10, 10, 14, 2);
          ctx.fill();
          ctx.restore();
        }
        // Catenary sag rope connecting the two anchor tops
        ctx.save();
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + p.width * 0.18, py);
        ctx.quadraticCurveTo(cx, py + 10, p.x + p.width * 0.82, py);
        ctx.stroke();
        ctx.restore();
      } else if (supportStyle === 0) {
        // Chunky wooden stilts — tapered posts wider at base, thinner at top
        const stiltCount = p.width > 140 ? 3 : 2;
        const stiltPositions: number[] = [];
        for (let i = 0; i < stiltCount; i++) {
          stiltPositions.push(p.x + p.width * ((i + 1) / (stiltCount + 1)));
        }
        // X-shaped cross braces between pairs first (behind posts)
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < stiltPositions.length - 1; i++) {
          const sx = stiltPositions[i], nx = stiltPositions[i + 1];
          ctx.beginPath();
          ctx.moveTo(sx, py + p.height + distToGround * 0.2);
          ctx.lineTo(nx, py + p.height + distToGround * 0.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(nx, py + p.height + distToGround * 0.2);
          ctx.lineTo(sx, py + p.height + distToGround * 0.8);
          ctx.stroke();
        }
        // Tapered posts (wider at base)
        for (const sx of stiltPositions) {
          const topW = 5, botW = 9;
          const stiltGrad = ctx.createLinearGradient(sx, py + p.height, sx, groundY);
          stiltGrad.addColorStop(0, '#A1887F');
          stiltGrad.addColorStop(0.5, '#8D6E63');
          stiltGrad.addColorStop(1, '#4E342E');
          ctx.fillStyle = stiltGrad;
          ctx.beginPath();
          ctx.moveTo(sx - topW / 2, py + p.height);
          ctx.lineTo(sx + topW / 2, py + p.height);
          ctx.lineTo(sx + botW / 2, groundY);
          ctx.lineTo(sx - botW / 2, groundY);
          ctx.closePath();
          ctx.fill();
          // Wood grain highlight line
          ctx.strokeStyle = 'rgba(200,170,140,0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx - 1, py + p.height + 4);
          ctx.lineTo(sx - 2, groundY - 4);
          ctx.stroke();
          // Base foot block
          ctx.fillStyle = '#3E2723';
          ctx.beginPath();
          ctx.roundRect(sx - botW / 2 - 2, groundY - 5, botW + 4, 8, 2);
          ctx.fill();
        }
      } else if (supportStyle === 1) {
        // Gnarled roots curving from platform down into ground
        ctx.save();
        const rootColor = this.state.biome === 'enchanted' ? '#5D4037'
          : this.state.biome === 'crystal' ? '#4A235A'
          : this.state.biome === 'autumn' ? '#6D3B0A'
          : '#2E4A2E';
        ctx.strokeStyle = rootColor;
        ctx.lineWidth = 3;
        const rootPositions = [0.2, 0.5, 0.8];
        for (const rp of rootPositions) {
          const rx = p.x + p.width * rp;
          const curveX = rx + (rp > 0.5 ? 1 : -1) * distToGround * 0.18;
          ctx.beginPath();
          ctx.moveTo(rx, py + p.height);
          ctx.quadraticCurveTo(curveX, py + p.height + distToGround * 0.55, rx + (rp - 0.5) * 20, groundY);
          ctx.stroke();
          // Thin root branch
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rx + (rp - 0.5) * 10, py + p.height + distToGround * 0.6);
          ctx.lineTo(rx + (rp - 0.5) * 30, groundY);
          ctx.stroke();
          ctx.lineWidth = 3;
        }
        ctx.restore();
      } else {
        // Hanging vine ropes from platform edges
        ctx.save();
        ctx.lineWidth = 2;
        const vinePositions = [0.15, 0.85];
        for (const vp of vinePositions) {
          const vx = p.x + p.width * vp;
          const sway = Math.sin(this.state.gameTime * 0.025 + p.x * 0.008) * 5;
          // Brown rope
          ctx.strokeStyle = '#5D4037';
          ctx.beginPath();
          ctx.moveTo(vx, py + p.height);
          ctx.quadraticCurveTo(vx + sway, py + p.height + distToGround * 0.5, vx + sway * 0.5, groundY);
          ctx.stroke();
          // Green vine overlay
          ctx.strokeStyle = '#4CAF50';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(vx, py + p.height);
          ctx.quadraticCurveTo(vx + sway, py + p.height + distToGround * 0.5, vx + sway * 0.5, groundY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    }
  }

  renderPlatforms(ctx: CanvasRenderingContext2D) {
    // ── Underground fill — covers the full area below ground all the way to screen bottom ──
    // World-space screen bottom: cameraY is the world Y at screen centre, so screen bottom = cameraY + CANVAS_HEIGHT/2
    {
      const underLeft  = this.cameraX - CANVAS_WIDTH * 0.7;
      const underRight = this.cameraX + CANVAS_WIDTH * 1.2;
      const underTop   = GROUND_Y - 30; // overlap platform top slightly so no seam
      // Screen bottom in world space — always fill past visible area
      const screenBottomWorld = this.cameraY + CANVAS_HEIGHT * 0.55;
      const underBot   = Math.max(GROUND_Y + 500, screenBottomWorld + 80);
      const biome = this.state.biome;

      // Match the ground platform soil palette exactly
      type GroundTheme = { cap: string; soil: string; soilDark: string; root: string };
      const themes: Record<string, GroundTheme> = {
        enchanted: { cap: '#5DBB3F', soil: '#6B4423', soilDark: '#4A2D15', root: '#2E1A0A' },
        crystal:   { cap: '#7A4AB0', soil: '#3B2266', soilDark: '#251447', root: '#150B30' },
        autumn:    { cap: '#A0714A', soil: '#6B4A2D', soilDark: '#4A311A', root: '#2E1C0A' },
        firefly:   { cap: '#2A5E3F', soil: '#1A3020', soilDark: '#0F1E13', root: '#070F09' },
        moonlit:   { cap: '#1E3D2A', soil: '#1A3020', soilDark: '#0F1E13', root: '#070F09' },
        caverns:   { cap: '#3A1A6A', soil: '#2B1460', soilDark: '#1A0A40', root: '#0E0628' },
        canopy:    { cap: '#2E6A1E', soil: '#3A4A1E', soilDark: '#252E10', root: '#131808' },
        ruins:     { cap: '#6A5038', soil: '#5D4037', soilDark: '#3E2A20', root: '#2A1A10' },
        starfall:  { cap: '#1A1A4A', soil: '#1A1A40', soilDark: '#10102C', root: '#08081A' },
      };
      const t = themes[biome] || themes.enchanted;

      // Find ground platforms in view and paint soil only in the gaps between them
      const groundPlatforms = [...this.platforms, ...this.craftedItems]
        .filter(p => p.type === 'ground' && p.x + p.width > underLeft - 60 && p.x < underRight + 60)
        .sort((a, b) => a.x - b.x);

      // Also fill from left edge to first platform, and last platform to right edge
      const segments: Array<{ x: number; w: number }> = [];
      if (groundPlatforms.length === 0) {
        segments.push({ x: underLeft, w: underRight - underLeft });
      } else {
        // Before first platform
        if (groundPlatforms[0].x > underLeft) {
          segments.push({ x: underLeft, w: groundPlatforms[0].x - underLeft });
        }
        // Between platforms
        for (let gi = 0; gi < groundPlatforms.length - 1; gi++) {
          const gapX = groundPlatforms[gi].x + groundPlatforms[gi].width;
          const gapEnd = groundPlatforms[gi + 1].x;
          if (gapEnd > gapX) segments.push({ x: gapX, w: gapEnd - gapX });
        }
        // After last platform
        const last = groundPlatforms[groundPlatforms.length - 1];
        if (last.x + last.width < underRight) {
          segments.push({ x: last.x + last.width, w: underRight - (last.x + last.width) });
        }
      }

      for (const seg of segments) {
        if (seg.w <= 0) continue;
        const ravineDepth = underBot - underTop;
        const gt = this.state.gameTime;

        // ── Layer 0: Soil gradient — 6 natural strata top to bedrock ─────────
        const abyssGrad = ctx.createLinearGradient(0, underTop, 0, underBot);
        abyssGrad.addColorStop(0,    t.cap);      // topsoil (matches cap colour from theme)
        abyssGrad.addColorStop(0.08, t.soil);     // organic soil
        abyssGrad.addColorStop(0.25, t.soilDark); // clay subsoil
        abyssGrad.addColorStop(0.55, t.root);     // deep rock
        abyssGrad.addColorStop(0.80, this.darkenColor(t.root, 25)); // bedrock
        abyssGrad.addColorStop(1,    this.darkenColor(t.root, 50)); // deep void
        ctx.fillStyle = abyssGrad;
        ctx.fillRect(seg.x, underTop, seg.w, ravineDepth);

        // ── Layer 1: Soil strata bands (horizontal geological layers) ─────────
        ctx.save();
        const strataColors = biome === 'crystal'
          ? ['rgba(80,40,140,0.25)', 'rgba(60,20,100,0.30)', 'rgba(100,60,180,0.18)', 'rgba(40,10,80,0.35)']
          : biome === 'autumn'
          ? ['rgba(120,70,30,0.28)', 'rgba(90,50,20,0.33)', 'rgba(140,90,40,0.20)', 'rgba(60,30,10,0.35)']
          : biome === 'firefly'
          ? ['rgba(20,60,30,0.28)', 'rgba(10,30,15,0.35)', 'rgba(30,80,40,0.20)', 'rgba(5,15,8,0.38)']
          : ['rgba(100,60,20,0.28)', 'rgba(70,38,12,0.33)', 'rgba(130,80,30,0.20)', 'rgba(40,20,5,0.38)'];
        const strataCount = 4;
        for (let si = 0; si < strataCount; si++) {
          const strataSeed = Math.floor(seg.x * 0.01 + si * 7);
          const strataY = underTop + ravineDepth * (0.12 + si * 0.20) + ((strataSeed * 23) % 16);
          const strataH = 8 + ((strataSeed * 17) % 12);
          // Wavy strata line
          ctx.fillStyle = strataColors[si];
          ctx.beginPath();
          ctx.moveTo(seg.x, strataY);
          for (let sx2 = seg.x; sx2 <= seg.x + seg.w; sx2 += 6) {
            const wave = Math.sin(sx2 * 0.04 + strataSeed * 2.1) * 3 + Math.sin(sx2 * 0.09 + si * 1.3) * 2;
            ctx.lineTo(sx2, strataY + wave);
          }
          ctx.lineTo(seg.x + seg.w, strataY + strataH);
          for (let sx2 = seg.x + seg.w; sx2 >= seg.x; sx2 -= 6) {
            const wave = Math.sin(sx2 * 0.04 + strataSeed * 2.1) * 3 + Math.sin(sx2 * 0.09 + si * 1.3) * 2;
            ctx.lineTo(sx2, strataY + strataH + wave);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // ── Layer 2: Embedded pebbles + mineral vein lines ────────────────────
        ctx.save();
        const rockColor = biome === 'crystal' ? 'rgba(150,100,220,0.35)'
          : biome === 'autumn'  ? 'rgba(180,130,80,0.35)'
          : biome === 'firefly' ? 'rgba(60,140,80,0.30)'
          : biome === 'caverns' ? 'rgba(100,60,200,0.35)'
          : biome === 'ruins'   ? 'rgba(140,110,70,0.35)'
          : 'rgba(140,100,60,0.35)';
        ctx.fillStyle = rockColor;
        const rockSeed = Math.floor(seg.x * 0.05);
        const rockCount = Math.min(10, Math.floor(seg.w / 18));
        for (let ri = 0; ri < rockCount; ri++) {
          const rx = seg.x + ((rockSeed * 31 + ri * 137) % Math.max(1, seg.w));
          const ry = underTop + 22 + ((ri * 73 + rockSeed * 17) % Math.max(1, ravineDepth - 40));
          const rw = 5 + (ri % 4) * 5;
          ctx.beginPath();
          ctx.ellipse(rx, ry, rw, rw * 0.55, (ri % 4) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Horizontal mineral vein lines (quartz / gold seams)
        const veinColor = biome === 'crystal' ? 'rgba(200,160,255,0.18)'
          : biome === 'starfall' ? 'rgba(150,150,255,0.15)'
          : 'rgba(210,190,140,0.15)';
        const veinCount = Math.min(3, Math.floor(ravineDepth / 80));
        for (let vi = 0; vi < veinCount; vi++) {
          const vs = Math.floor(seg.x * 0.02 + vi * 41);
          const vy = underTop + 60 + vi * (ravineDepth / (veinCount + 1)) + ((vs * 13) % 24);
          const vThick = 1.5 + (vi % 2);
          ctx.strokeStyle = veinColor;
          ctx.lineWidth = vThick;
          ctx.beginPath();
          ctx.moveTo(seg.x, vy);
          for (let vx = seg.x; vx <= seg.x + seg.w; vx += 8) {
            const vWave = Math.sin(vx * 0.04 + vs * 1.7) * 3;
            ctx.lineTo(vx, vy + vWave);
          }
          ctx.stroke();
        }
        ctx.restore();

        // ── Layer 3: Biome-specific depth formations ──────────────────────────
        ctx.save();
        if (biome === 'crystal' || biome === 'caverns') {
          // Glowing crystal shards growing from the abyss floor
          const shardCount = Math.min(6, Math.floor(seg.w / 40));
          for (let ci = 0; ci < shardCount; ci++) {
            const cs = Math.floor(seg.x * 0.03 + ci * 37);
            const cx2 = seg.x + ((cs * 71 + ci * 113) % Math.max(1, seg.w - 20)) + 10;
            const cy2 = underBot - 6;
            const shardH = 18 + (cs % 22);
            const shardW = 4 + (ci % 3) * 3;
            const glowPulse = 0.5 + Math.sin(gt * 0.05 + ci * 1.7) * 0.35;
            const shardColor = ci % 2 === 0 ? `rgba(80,200,255,${0.55 * glowPulse})` : `rgba(180,100,255,${0.50 * glowPulse})`;
            ctx.fillStyle = shardColor;
            ctx.shadowBlur = 8 + glowPulse * 6;
            ctx.shadowColor = ci % 2 === 0 ? '#40C0FF' : '#CC80FF';
            ctx.beginPath();
            ctx.moveTo(cx2 - shardW, cy2);
            ctx.lineTo(cx2, cy2 - shardH);
            ctx.lineTo(cx2 + shardW, cy2);
            ctx.closePath();
            ctx.fill();
            // Crystal tip glint
            ctx.fillStyle = `rgba(220,240,255,${glowPulse * 0.6})`;
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx2, cy2 - shardH + 3, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          // Faint bioluminescent pools on the floor
          const poolCount = Math.min(3, Math.floor(seg.w / 80));
          for (let pi = 0; pi < poolCount; pi++) {
            const ps = Math.floor(seg.x * 0.02 + pi * 53);
            const px2 = seg.x + ((ps * 89) % Math.max(1, seg.w - 40)) + 20;
            const poolPulse = 0.3 + Math.sin(gt * 0.04 + pi * 2.3) * 0.25;
            const pGrad = ctx.createRadialGradient(px2, underBot - 4, 0, px2, underBot - 4, 22 + pi * 8);
            pGrad.addColorStop(0, `rgba(60,180,255,${poolPulse * 0.7})`);
            pGrad.addColorStop(1, 'rgba(60,180,255,0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.ellipse(px2, underBot - 4, 22 + pi * 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (biome === 'volcanic' || biome === 'starfall') {
          // Lava/ember glow at the bottom
          const lavaGrad = ctx.createLinearGradient(seg.x, underBot - 40, seg.x, underBot);
          lavaGrad.addColorStop(0, 'rgba(255,60,0,0)');
          lavaGrad.addColorStop(0.5, 'rgba(255,80,0,0.12)');
          lavaGrad.addColorStop(1, 'rgba(255,100,0,0.28)');
          ctx.fillStyle = lavaGrad;
          ctx.fillRect(seg.x, underBot - 40, seg.w, 40);
          // Lava cracks
          const crackCount = Math.min(4, Math.floor(seg.w / 50));
          for (let ci = 0; ci < crackCount; ci++) {
            const lavaPulse = 0.4 + Math.sin(gt * 0.06 + ci * 2.1) * 0.35;
            const cs = Math.floor(seg.x * 0.04 + ci * 29);
            const cx2 = seg.x + ((cs * 67) % Math.max(1, seg.w - 20)) + 10;
            ctx.strokeStyle = `rgba(255,${100 + Math.floor(lavaPulse * 80)},0,${lavaPulse * 0.8})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#FF4000';
            ctx.beginPath();
            ctx.moveTo(cx2, underBot);
            ctx.lineTo(cx2 + 8, underBot - 14);
            ctx.lineTo(cx2 - 5, underBot - 22);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        } else if (biome === 'ruins' || biome === 'canopy') {
          // Ancient carved stone fragments
          const fragCount = Math.min(4, Math.floor(seg.w / 60));
          for (let fi = 0; fi < fragCount; fi++) {
            const fs = Math.floor(seg.x * 0.03 + fi * 41);
            const fx2 = seg.x + ((fs * 83) % Math.max(1, seg.w - 30)) + 15;
            const fy2 = underBot - 12 - ((fi * 19) % 30);
            ctx.fillStyle = 'rgba(90,75,55,0.55)';
            ctx.beginPath();
            ctx.roundRect(fx2 - 8, fy2, 16 + (fi % 3) * 6, 10, 2);
            ctx.fill();
            // Carved rune mark
            ctx.strokeStyle = 'rgba(160,130,90,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(fx2 - 3, fy2 + 3);
            ctx.lineTo(fx2 + 3, fy2 + 7);
            ctx.stroke();
          }
        } else if (biome === 'moonlit') {
          // Shadow wisp silhouettes drifting through the ravine
          const wispCount = Math.min(3, Math.floor(seg.w / 70));
          for (let wi = 0; wi < wispCount; wi++) {
            const wt = gt * 0.02 + wi * 2.1;
            const wx2 = seg.x + ((wi * 137 + Math.floor(gt * 1.2 + wi * 30)) % Math.max(1, seg.w));
            const wy2 = underTop + 40 + Math.sin(wt * 0.8) * 30 + wi * 40;
            const wAlpha = 0.08 + Math.sin(wt * 1.1) * 0.06;
            const wGrad = ctx.createRadialGradient(wx2, wy2, 0, wx2, wy2, 18);
            wGrad.addColorStop(0, `rgba(150,180,255,${wAlpha})`);
            wGrad.addColorStop(1, 'rgba(100,130,220,0)');
            ctx.fillStyle = wGrad;
            ctx.beginPath();
            ctx.ellipse(wx2, wy2, 18, 10, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Default: enchanted/firefly — glowing root tips
        if (biome === 'enchanted' || biome === 'firefly' || biome === 'autumn') {
          const glowCount = Math.min(4, Math.floor(seg.w / 55));
          for (let gi2 = 0; gi2 < glowCount; gi2++) {
            const gs = Math.floor(seg.x * 0.04 + gi2 * 23);
            const gx2 = seg.x + ((gs * 61) % Math.max(1, seg.w - 10)) + 5;
            const gy2 = underTop + 45 + ((gi2 * 31 + gs * 11) % (ravineDepth - 60));
            const gPulse = 0.25 + Math.sin(gt * 0.04 + gi2 * 1.9) * 0.18;
            const gColor = biome === 'firefly' ? `rgba(100,255,120,${gPulse})` : `rgba(80,200,80,${gPulse})`;
            const gGrad = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, 8);
            gGrad.addColorStop(0, gColor);
            gGrad.addColorStop(1, 'rgba(80,200,80,0)');
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.arc(gx2, gy2, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // ── Layer 4: Bottom fog / mist pool (always present) ──────────────────
        ctx.save();
        const fogGrad = ctx.createLinearGradient(seg.x, underBot - 80, seg.x, underBot);
        const fogColor = biome === 'volcanic' || biome === 'starfall' ? 'rgba(255,80,20,'
          : biome === 'crystal' || biome === 'caverns' ? 'rgba(80,120,255,'
          : biome === 'moonlit' ? 'rgba(100,140,220,'
          : 'rgba(160,200,180,';
        fogGrad.addColorStop(0, `${fogColor}0)`);
        fogGrad.addColorStop(0.6, `${fogColor}0.07)`);
        fogGrad.addColorStop(1, `${fogColor}0.18)`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(seg.x, underBot - 80, seg.w, 80);
        ctx.restore();

        // ── Layer 5: Deep-red danger tint at the very bottom ─────────────────
        ctx.save();
        const dangerPulse = 0.02 + Math.sin(gt * 0.03) * 0.015;
        const dangerGrad = ctx.createLinearGradient(0, underBot - 35, 0, underBot);
        dangerGrad.addColorStop(0, 'rgba(200,0,0,0)');
        dangerGrad.addColorStop(1, `rgba(200,0,0,${dangerPulse})`);
        ctx.fillStyle = dangerGrad;
        ctx.fillRect(seg.x, underBot - 35, seg.w, 35);
        ctx.restore();
      }

      // ── Gap ravine decoration ──────────────────────────────────────────────
      // Find visible gaps between ground platforms and decorate them
      if (VISUAL_FLAGS.gapMist || VISUAL_FLAGS.hangingGapVines) {
        const groundPlatforms = [...this.platforms, ...this.craftedItems]
          .filter(p => p.type === 'ground' && p.x + p.width > underLeft && p.x < underRight)
          .sort((a, b) => a.x - b.x);

        for (let gi = 0; gi < groundPlatforms.length - 1; gi++) {
          const left = groundPlatforms[gi];
          const right = groundPlatforms[gi + 1];
          const gapLeft = left.x + left.width;
          const gapRight = right.x;
          const gapW = gapRight - gapLeft;
          if (gapW < 20) continue; // no decoration for tiny gaps
          const gapMidX = gapLeft + gapW / 2;
          const gt2 = this.state.gameTime;

          // ── Cliff face detail — left wall ────────────────────────────────────
          ctx.save();
          {
            const cfW = Math.min(18, gapW * 0.18); // cliff face detail width
            const cfTop = underTop;
            const cfBot = underTop + 260;
            // Soil strata — left cliff right face
            const cfColors = biome === 'crystal'
              ? ['#3D1A6B','#2A1050','#1E0A3C','#14082A']
              : biome === 'autumn'
              ? ['#7A4A28','#5A3318','#3E2210','#2A1508']
              : biome === 'firefly'
              ? ['#1A3A24','#0F2018','#09130F','#040A07']
              : ['#5A3818','#3E2510','#2A1808','#1A0E04'];
            for (let li = 0; li < 4; li++) {
              const lh = (cfBot - cfTop) / 4;
              const lyOff = Math.sin(li * 3.1 + gapLeft * 0.02) * 3;
              ctx.fillStyle = cfColors[li];
              ctx.fillRect(gapLeft, cfTop + li * lh + lyOff, cfW, lh + 2);
              // Thin lighter vein line between strata
              if (li < 3) {
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(gapLeft, cfTop + (li + 1) * lh + lyOff);
                ctx.lineTo(gapLeft + cfW, cfTop + (li + 1) * lh + lyOff + Math.sin(gapLeft * 0.05 + li) * 2);
                ctx.stroke();
              }
            }
            // Exposed rock protrusion — small bump on left wall
            ctx.fillStyle = biome === 'crystal' ? 'rgba(120,60,200,0.5)' : 'rgba(160,110,60,0.45)';
            const bumpY = cfTop + 60 + ((Math.floor(gapLeft * 0.07)) % 80);
            ctx.beginPath();
            ctx.ellipse(gapLeft + cfW * 0.5, bumpY, cfW * 0.7, 10, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
          // ── Cliff face detail — right wall ────────────────────────────────────
          {
            const cfW = Math.min(18, gapW * 0.18);
            const cfTop = underTop;
            const cfBot = underTop + 260;
            const cfColors = biome === 'crystal'
              ? ['#3D1A6B','#2A1050','#1E0A3C','#14082A']
              : biome === 'autumn'
              ? ['#7A4A28','#5A3318','#3E2210','#2A1508']
              : biome === 'firefly'
              ? ['#1A3A24','#0F2018','#09130F','#040A07']
              : ['#5A3818','#3E2510','#2A1808','#1A0E04'];
            for (let li = 0; li < 4; li++) {
              const lh = (cfBot - cfTop) / 4;
              const lyOff = Math.sin(li * 2.7 + gapRight * 0.02) * 3;
              ctx.fillStyle = cfColors[li];
              ctx.fillRect(gapRight - cfW, cfTop + li * lh + lyOff, cfW, lh + 2);
              if (li < 3) {
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(gapRight - cfW, cfTop + (li + 1) * lh + lyOff);
                ctx.lineTo(gapRight, cfTop + (li + 1) * lh + lyOff + Math.sin(gapRight * 0.05 + li) * 2);
                ctx.stroke();
              }
            }
            ctx.fillStyle = biome === 'crystal' ? 'rgba(120,60,200,0.5)' : 'rgba(160,110,60,0.45)';
            const bumpY2 = cfTop + 40 + ((Math.floor(gapRight * 0.08)) % 80);
            ctx.beginPath();
            ctx.ellipse(gapRight - Math.min(18, gapW * 0.18) * 0.5, bumpY2, Math.min(18, gapW * 0.18) * 0.7, 10, -0.2, 0, Math.PI * 2);
            ctx.fill();
          }
          // Darkness vignette on both cliff faces (inner shadow)
          {
            const vW = Math.min(30, gapW * 0.25);
            const vGradL = ctx.createLinearGradient(gapLeft, 0, gapLeft + vW, 0);
            vGradL.addColorStop(0, 'rgba(0,0,0,0.35)');
            vGradL.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vGradL;
            ctx.fillRect(gapLeft, underTop, vW, 320);
            const vGradR = ctx.createLinearGradient(gapRight - vW, 0, gapRight, 0);
            vGradR.addColorStop(0, 'rgba(0,0,0,0)');
            vGradR.addColorStop(1, 'rgba(0,0,0,0.35)');
            ctx.fillStyle = vGradR;
            ctx.fillRect(gapRight - vW, underTop, vW, 320);
          }
          ctx.restore();
          void gt2;
          void gapMidX;

          if (VISUAL_FLAGS.gapMist) {
            ctx.save();
            // Stream ribbon at the bottom of the gap
            const streamY = underTop + 80;
            const streamH = 6;
            const streamAlpha = 0.35 + Math.sin(this.state.gameTime * 0.04 + gapMidX * 0.01) * 0.1;
            const streamColor = biome === 'firefly' ? 'rgba(100,255,180,' :
                                biome === 'crystal' ? 'rgba(120,180,255,' : 'rgba(80,180,255,';
            const streamGrad = ctx.createLinearGradient(gapLeft, streamY, gapRight, streamY);
            streamGrad.addColorStop(0,   `${streamColor}0)`);
            streamGrad.addColorStop(0.15, `${streamColor}${streamAlpha})`);
            streamGrad.addColorStop(0.85, `${streamColor}${streamAlpha})`);
            streamGrad.addColorStop(1,   `${streamColor}0)`);
            ctx.fillStyle = streamGrad;
            ctx.fillRect(gapLeft, streamY, gapW, streamH);
            // Stream sparkle highlights
            for (let si = 0; si < 4; si++) {
              const sx = gapLeft + gapW * (0.1 + si * 0.25 + Math.sin(this.state.gameTime * 0.03 + si) * 0.04);
              const sparkAlpha = 0.3 + Math.sin(this.state.gameTime * 0.08 + si * 2.1) * 0.3;
              if (sparkAlpha > 0.2) {
                ctx.fillStyle = `rgba(200,240,255,${sparkAlpha})`;
                ctx.beginPath();
                ctx.ellipse(sx, streamY + 2, 4, 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // Low-lying mist that pools in the ravine — subtle, doesn't wash out soil
            const mistY = underTop + 8;
            const mistH = 45;
            const mistPulse = 0.04 + Math.sin(this.state.gameTime * 0.02 + gapMidX * 0.003) * 0.015;
            const mistGrad = ctx.createLinearGradient(gapLeft, 0, gapRight, 0);
            mistGrad.addColorStop(0,   'rgba(180,210,200,0)');
            mistGrad.addColorStop(0.15, `rgba(180,210,200,${mistPulse})`);
            mistGrad.addColorStop(0.85, `rgba(180,210,200,${mistPulse})`);
            mistGrad.addColorStop(1,   'rgba(180,210,200,0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = mistGrad;
            ctx.fillRect(gapLeft, mistY, gapW, mistH);

            // Drifting fireflies / glowing embers in the gap
            const fireflyCount = Math.min(4, Math.floor(gapW / 60));
            for (let fi = 0; fi < fireflyCount; fi++) {
              const ft = this.state.gameTime * 0.025 + fi * 2.7 + gapMidX * 0.005;
              const fx = gapLeft + ((gapW * 0.1 + fi * gapW * 0.22 + Math.sin(ft * 1.3 + fi) * gapW * 0.08) % (gapW * 0.9));
              const fy = underTop + 25 + Math.sin(ft * 0.8 + fi * 1.4) * 20 + fi * 10;
              const pulse = 0.4 + Math.sin(ft * 1.6) * 0.4;
              if (pulse < 0.15) continue;
              const fcolor = biome === 'enchanted' ? '#B3FFD8'
                           : biome === 'crystal' ? '#C0B0FF'
                           : biome === 'firefly' ? '#FFEB3B' : '#FFD080';
              ctx.globalAlpha = pulse * 0.55;
              const fglow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 7);
              fglow.addColorStop(0, fcolor);
              fglow.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = fglow;
              ctx.beginPath();
              ctx.arc(fx, fy, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = pulse;
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
            ctx.restore();
          }

          if (VISUAL_FLAGS.hangingGapVines) {
            ctx.save();
            ctx.strokeStyle = 'rgba(60,120,40,0.45)';
            ctx.lineWidth = 1.5;
            // Hanging roots from left platform right edge
            const rootCountL = Math.min(3, Math.floor(gapW / 50));
            for (let ri = 0; ri < rootCountL; ri++) {
              const rx = left.x + left.width - 5 - ri * 6;
              const rootLen = 18 + ((Math.floor(rx) * 17 + ri * 11) % 22);
              const sway = Math.sin(this.state.gameTime * 0.018 + rx * 0.02 + ri) * 2.5;
              ctx.beginPath();
              ctx.moveTo(rx, underTop);
              ctx.quadraticCurveTo(rx + sway - 2, underTop + rootLen * 0.55, rx + sway - 1, underTop + rootLen);
              ctx.stroke();
              // Tiny root tip droplet
              ctx.fillStyle = 'rgba(100,200,80,0.35)';
              ctx.beginPath();
              ctx.arc(rx + sway - 1, underTop + rootLen, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
            // Hanging roots from right platform left edge
            for (let ri = 0; ri < rootCountL; ri++) {
              const rx = right.x + 5 + ri * 6;
              const rootLen = 18 + ((Math.floor(rx) * 13 + ri * 17) % 22);
              const sway = Math.sin(this.state.gameTime * 0.018 + rx * 0.02 + ri + 1.5) * 2.5;
              ctx.beginPath();
              ctx.moveTo(rx, underTop);
              ctx.quadraticCurveTo(rx + sway + 2, underTop + rootLen * 0.55, rx + sway + 1, underTop + rootLen);
              ctx.stroke();
              ctx.fillStyle = 'rgba(100,200,80,0.35)';
              ctx.beginPath();
              ctx.arc(rx + sway + 1, underTop + rootLen, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }
    }

    // Draw supports behind platform bodies first
    this.renderPlatformSupports(ctx);

    // Use a generous render window that accounts for camera lag during backward movement
    const renderLeft = this.cameraX - CANVAS_WIDTH * 0.7;
    const renderRight = this.cameraX + CANVAS_WIDTH * 1.2;
    for (const p of [...this.platforms, ...this.craftedItems]) {
      if (p.x > renderRight || p.x + p.width < renderLeft) continue;

      if (p.type === 'ground') {
        const biome = BIOME_COLORS[this.state.biome];
        // displayHeight: render platform body far enough down to cover screen bottom in world space
        const screenBottomInWorld = this.cameraY + CANVAS_HEIGHT * 0.55;
        const displayHeight = Math.max(p.height, screenBottomInWorld - p.y + 40);

        // Biome-specific surface colours
        type GroundTheme = { cap: string; capDark: string; soil: string; soilDark: string; root: string; grassTuft: string; highlight: string; flowerColors: string[] };
        const themes: Record<string, GroundTheme> = {
          enchanted: { cap: '#5DBB3F', capDark: '#3A8C25', soil: '#6B4423', soilDark: '#4A2D15', root: '#2E1A0A',
                       grassTuft: '#72D44E', highlight: 'rgba(150,245,90,0.5)', flowerColors: ['#FF69B4','#FFD700','#FF6347','#DDA0DD'] },
          crystal:   { cap: '#6A3FA0', capDark: '#4A2075', soil: '#3B2266', soilDark: '#251447', root: '#150B30',
                       grassTuft: '#9C5FE0', highlight: 'rgba(160,100,255,0.45)', flowerColors: ['#00E5FF','#E040FB','#18FFFF','#EA80FC'] },
          autumn:    { cap: '#A0714A', capDark: '#7A5030', soil: '#6B4A2D', soilDark: '#4A311A', root: '#2E1C0A',
                       grassTuft: '#D4882A', highlight: 'rgba(255,170,60,0.45)', flowerColors: ['#FFD54F','#FF8A65','#FF5722','#FFC107'] },
          firefly:   { cap: '#2A5E3F', capDark: '#1B3D28', soil: '#1A3020', soilDark: '#0F1E13', root: '#070F09',
                       grassTuft: '#3A8A55', highlight: 'rgba(100,255,120,0.35)', flowerColors: ['#FFEB3B','#76FF03','#00E676','#B2FF59'] },
          moonlit:   { cap: '#1E3D2A', capDark: '#162C1E', soil: '#1A3020', soilDark: '#0F1E13', root: '#070F09',
                       grassTuft: '#2E6B46', highlight: 'rgba(80,160,200,0.35)', flowerColors: ['#76CFFF','#A0E8FF','#69F0AE','#00BCD4'] },
          caverns:   { cap: '#3A1A6A', capDark: '#2A1050', soil: '#2B1460', soilDark: '#1A0A40', root: '#0E0628',
                       grassTuft: '#6A30C0', highlight: 'rgba(100,60,220,0.45)', flowerColors: ['#00E5FF','#7C4DFF','#18FFFF','#EA80FC'] },
          canopy:    { cap: '#2E6A1E', capDark: '#1E4A10', soil: '#3A4A1E', soilDark: '#252E10', root: '#131808',
                       grassTuft: '#42A030', highlight: 'rgba(100,220,60,0.45)', flowerColors: ['#FFEE58','#FFF176','#F9A825','#A5D6A7'] },
          ruins:     { cap: '#6A5038', capDark: '#4E3A28', soil: '#5D4037', soilDark: '#3E2A20', root: '#2A1A10',
                       grassTuft: '#8A7060', highlight: 'rgba(180,150,90,0.35)', flowerColors: ['#80CBC4','#4DB6AC','#A5D6A7','#FFCC80'] },
          starfall:  { cap: '#1A1A4A', capDark: '#12123A', soil: '#1A1A40', soilDark: '#10102C', root: '#08081A',
                       grassTuft: '#2A2A80', highlight: 'rgba(100,100,255,0.45)', flowerColors: ['#FFD700','#FFF176','#FFEE58','#FF80AB'] },
        };
        const t = themes[this.state.biome] || themes.enchanted;

        // Ground body: layered gradient cap → soil → dark roots
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + displayHeight);
        grad.addColorStop(0,    t.cap);
        grad.addColorStop(0.07, t.capDark);
        grad.addColorStop(0.22, t.soil);
        grad.addColorStop(0.60, t.soilDark);
        grad.addColorStop(1,    t.root);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, displayHeight, [10, 10, 0, 0]);
        ctx.fill();

        // Side edge shadow for depth
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(p.x, p.y + 6, 4, displayHeight - 6);
        ctx.fillRect(p.x + p.width - 4, p.y + 6, 4, displayHeight - 6);

        // Top highlight sheen
        const sheen = ctx.createLinearGradient(p.x, p.y, p.x + p.width, p.y);
        sheen.addColorStop(0,    t.highlight);
        sheen.addColorStop(0.12, 'rgba(255,255,255,0)');
        sheen.addColorStop(0.88, 'rgba(255,255,255,0)');
        sheen.addColorStop(1,    t.highlight);
        ctx.fillStyle = sheen;
        ctx.fillRect(p.x + 4, p.y, p.width - 8, 4);

        // Grass tufts — biome colour, natural wave
        if (VISUAL_FLAGS.organicGround) {
          // Continuous wavy grass fringe across the whole top edge
          ctx.fillStyle = t.grassTuft;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          for (let gx = p.x; gx <= p.x + p.width; gx += 3) {
            const wave = Math.sin(gx * 0.18 + p.x * 0.04) * 2.5 + Math.sin(gx * 0.37 + p.x * 0.02) * 1.5;
            ctx.lineTo(gx, p.y - 3 - wave);
          }
          ctx.lineTo(p.x + p.width, p.y);
          ctx.closePath();
          ctx.fill();
          // Sparse tall blade tufts for variety
          ctx.fillStyle = this.lightenColor(t.grassTuft, 15);
          for (let gx = p.x + 5; gx < p.x + p.width - 5; gx += 14 + ((Math.floor(gx * 7)) % 8)) {
            const bh = 6 + Math.sin(gx * 0.55 + 0.8) * 3;
            ctx.beginPath();
            ctx.moveTo(gx, p.y - 2);
            ctx.bezierCurveTo(gx - 1, p.y - bh * 0.5, gx + 1, p.y - bh, gx + 2, p.y - bh - 1);
            ctx.bezierCurveTo(gx + 3, p.y - bh, gx + 5, p.y - bh * 0.5, gx + 6, p.y - 2);
            ctx.fill();
          }
          // Grass overhang on left cliff edge
          ctx.fillStyle = t.grassTuft;
          ctx.beginPath();
          ctx.moveTo(p.x - 6, p.y + 2);
          ctx.bezierCurveTo(p.x - 8, p.y - 3, p.x - 2, p.y - 5, p.x + 4, p.y - 2);
          ctx.lineTo(p.x, p.y);
          ctx.closePath();
          ctx.fill();
          // Grass overhang on right cliff edge
          ctx.beginPath();
          ctx.moveTo(p.x + p.width + 6, p.y + 2);
          ctx.bezierCurveTo(p.x + p.width + 8, p.y - 3, p.x + p.width + 2, p.y - 5, p.x + p.width - 4, p.y - 2);
          ctx.lineTo(p.x + p.width, p.y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = t.grassTuft;
          for (let gx = p.x + 3; gx < p.x + p.width - 3; gx += 9) {
            const h = 5 + Math.sin(gx * 0.55 + 0.8) * 2.5;
            ctx.beginPath();
            ctx.moveTo(gx, p.y);
            ctx.bezierCurveTo(gx + 1, p.y - h * 0.5, gx + 3, p.y - h, gx + 4, p.y - h);
            ctx.bezierCurveTo(gx + 5, p.y - h, gx + 7, p.y - h * 0.5, gx + 8, p.y);
            ctx.fill();
          }
        }

        // Decorative small plants / flowers — biome themed
        for (let gx = p.x + 20; gx < p.x + p.width - 20; gx += 55 + ((Math.floor(gx) * 11) % 28)) {
          const fc = t.flowerColors[Math.floor(Math.abs(Math.sin(gx * 0.41)) * t.flowerColors.length)];
          const stemColor = this.state.biome === 'crystal' ? '#9C5FE0' : this.state.biome === 'firefly' ? '#3A8A55' : '#4CAF50';
          const stemH = 7 + Math.sin(gx * 0.3) * 2;
          ctx.strokeStyle = stemColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gx, p.y - 1);
          ctx.lineTo(gx, p.y - stemH);
          ctx.stroke();
          // Petals
          ctx.fillStyle = fc;
          for (let pi = 0; pi < 5; pi++) {
            const pa = (pi / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(gx + Math.cos(pa) * 3.5, p.y - stemH + Math.sin(pa) * 3.5, 2.5, 1.8, pa, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = this.state.biome === 'crystal' ? '#E040FB' : '#FFF176';
          ctx.beginPath();
          ctx.arc(gx, p.y - stemH, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Small pebbles / crystals embedded in soil
        const pebbleColor = this.state.biome === 'crystal' ? 'rgba(150,100,220,0.5)'
                          : this.state.biome === 'autumn'  ? 'rgba(200,160,100,0.45)'
                          : 'rgba(170,140,100,0.4)';
        ctx.fillStyle = pebbleColor;
        for (let gx = p.x + 15; gx < p.x + p.width - 10; gx += 30 + ((Math.floor(gx) * 7) % 15)) {
          ctx.beginPath();
          ctx.ellipse(gx, p.y + 18, 3.5, 2, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Cliff faces on left and right edges ─────────────────────────────
        const edgeSeed = Math.floor(p.x * 0.1);

        if (VISUAL_FLAGS.organicGround) {
          // Layered soil strata on both cliff faces (wider bands, more realistic)
          const cliffW = 12;
          const cliffH = Math.min(displayHeight, 100);
          // 5 stratification layers: topsoil → clay → subsoil → bedrock → deep
          const strataColors = [t.cap, t.capDark, t.soil, t.soilDark, t.root];
          const strataHeights = [0.06, 0.14, 0.28, 0.52, 1.0];
          for (let li = 0; li < strataColors.length; li++) {
            const ly = p.y + (li === 0 ? 0 : strataHeights[li - 1]) * cliffH;
            const lh = (strataHeights[li] - (li === 0 ? 0 : strataHeights[li - 1])) * cliffH + 1;
            ctx.fillStyle = strataColors[li];
            ctx.fillRect(p.x, ly, cliffW, lh);
            ctx.fillRect(p.x + p.width - cliffW, ly, cliffW, lh);
          }
          // Embedded small stones in strata
          ctx.fillStyle = 'rgba(200,180,140,0.4)';
          for (let ri = 0; ri < 3; ri++) {
            const ry = p.y + 8 + ((edgeSeed + ri * 23) % (cliffH - 12));
            ctx.beginPath();
            ctx.ellipse(p.x + 5, ry, 3, 2, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(p.x + p.width - 5, ry + ((ri * 7) % 12), 3, 2, -0.4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Loose soil crumble chunks outside cliff edge
          ctx.fillStyle = t.soilDark;
          for (let ri = 0; ri < 5; ri++) {
            const rOff = ((edgeSeed + ri * 17) % 35) + 3;
            const rY = p.y + rOff;
            const rSize = 1.5 + (ri % 3);
            ctx.beginPath();
            ctx.ellipse(p.x - 2 - (ri % 3) * 3, rY, rSize, rSize * 0.65, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(p.x + p.width + 2 + (ri % 3) * 3, rY, rSize, rSize * 0.65, -0.3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Protruding roots from cliff faces — animated sway
          ctx.strokeStyle = this.darkenColor(t.root, 10);
          ctx.lineWidth = 1.5;
          for (let ri = 0; ri < 4; ri++) {
            const rootLen = 14 + ((edgeSeed + ri * 11) % 20);
            const baseY = p.y + 10 + ri * 14;
            if (baseY > p.y + cliffH) continue;
            const sway = Math.sin(this.state.gameTime * 0.018 + p.x * 0.01 + ri) * 2.5;
            // Left face root
            ctx.beginPath();
            ctx.moveTo(p.x, baseY);
            ctx.quadraticCurveTo(p.x - rootLen * 0.5 + sway, baseY + rootLen * 0.4, p.x - rootLen + sway * 1.5, baseY + rootLen * 0.8);
            ctx.stroke();
            // Right face root
            ctx.beginPath();
            ctx.moveTo(p.x + p.width, baseY);
            ctx.quadraticCurveTo(p.x + p.width + rootLen * 0.5 - sway, baseY + rootLen * 0.4, p.x + p.width + rootLen - sway * 1.5, baseY + rootLen * 0.8);
            ctx.stroke();
          }
        } else {
          // Original cliff rendering
          ctx.fillStyle = t.grassTuft;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - 2, 8, 5, 0, Math.PI * 0.5, Math.PI * 1.5);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(p.x + p.width, p.y - 2, 8, 5, 0, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.fill();

          const cliffW = 10;
          const cliffColors = [t.capDark, t.soil, t.soilDark, t.root];
          const cliffH = Math.min(displayHeight, 80);
          for (let li = 0; li < cliffColors.length; li++) {
            const ly = p.y + (li / cliffColors.length) * cliffH;
            const lh = cliffH / cliffColors.length + 2;
            ctx.fillStyle = cliffColors[li];
            ctx.fillRect(p.x, ly, cliffW, lh);
            ctx.fillRect(p.x + p.width - cliffW, ly, cliffW, lh);
          }

          ctx.fillStyle = t.soilDark;
          for (let ri = 0; ri < 4; ri++) {
            const rOff = ((edgeSeed + ri * 17) % 28) + 4;
            const rY = p.y + rOff;
            const rSize = 2 + (ri % 3);
            ctx.beginPath();
            ctx.ellipse(p.x - 3 - (ri % 2) * 4, rY, rSize, rSize * 0.7, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(p.x + p.width + 3 + (ri % 2) * 4, rY, rSize, rSize * 0.7, -0.3, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = t.root;
          ctx.lineWidth = 1.5;
          for (let ri = 0; ri < 3; ri++) {
            const rootLen = 12 + ((edgeSeed + ri * 11) % 16);
            const rxL = p.x + 3 + ri * 3;
            const rxR = p.x + p.width - 3 - ri * 3;
            const sway = Math.sin(this.state.gameTime * 0.02 + p.x * 0.01 + ri) * 2;
            ctx.beginPath();
            ctx.moveTo(rxL, p.y + displayHeight * 0.3 + ri * 8);
            ctx.quadraticCurveTo(rxL + sway - 3, p.y + displayHeight * 0.3 + ri * 8 + rootLen * 0.6,
              rxL + sway - 2, p.y + displayHeight * 0.3 + ri * 8 + rootLen);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rxR, p.y + displayHeight * 0.3 + ri * 8);
            ctx.quadraticCurveTo(rxR + sway + 3, p.y + displayHeight * 0.3 + ri * 8 + rootLen * 0.6,
              rxR + sway + 2, p.y + displayHeight * 0.3 + ri * 8 + rootLen);
            ctx.stroke();
          }
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
        // Biome-aware floating platform
        type FloatTheme = { top: string; mid: string; bot: string; glow: string; tuft: string };
        const ft: Record<string, FloatTheme> = {
          enchanted: { top: '#81C784', mid: '#4CAF50', bot: '#1B5E20', glow: 'rgba(100,220,100,0.22)', tuft: '#A5D6A7' },
          crystal:   { top: '#CE93D8', mid: '#8E24AA', bot: '#38006B', glow: 'rgba(200,100,255,0.25)', tuft: '#E1BEE7' },
          autumn:    { top: '#FFCC80', mid: '#E65100', bot: '#6D2D00', glow: 'rgba(255,120,40,0.22)',  tuft: '#FFE0B2' },
          firefly:   { top: '#69F0AE', mid: '#1B5E20', bot: '#0A1F0E', glow: 'rgba(80,255,120,0.20)', tuft: '#B9F6CA' },
        };
        const fth = ft[this.state.biome] || ft.enchanted;

        // Floating animation — gentle bob
        const bob = Math.sin(this.state.gameTime * 0.045 + p.x * 0.005) * 3;
        const py = p.y + bob;

        // Soft under-glow
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(this.state.gameTime * 0.04 + p.x * 0.01) * 0.08;
        ctx.fillStyle = fth.glow;
        ctx.beginPath();
        ctx.ellipse(p.x + p.width / 2, py + p.height + 8, p.width * 0.42, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Platform body
        const floatGrad = ctx.createLinearGradient(p.x, py, p.x, py + p.height);
        floatGrad.addColorStop(0,   fth.top);
        floatGrad.addColorStop(0.4, fth.mid);
        floatGrad.addColorStop(1,   fth.bot);
        ctx.fillStyle = floatGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, py, p.width, p.height, 7);
        ctx.fill();

        // Top grass / crystal edge — bright saturated strip for readability
        ctx.fillStyle = fth.tuft;
        ctx.fillRect(p.x + 3, py, p.width - 6, 4);

        // Bright top-edge outline so platform stands out against background
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x + 3, py + 0.75);
        ctx.lineTo(p.x + p.width - 3, py + 0.75);
        ctx.stroke();

        // Tiny decorative tufts
        ctx.fillStyle = fth.top;
        for (let gx = p.x + 5; gx < p.x + p.width - 5; gx += 11) {
          const gh = 4 + Math.sin(gx * 0.9 + p.x * 0.02) * 2;
          ctx.beginPath();
          ctx.moveTo(gx, py);
          ctx.bezierCurveTo(gx + 1, py - gh * 0.6, gx + 3, py - gh, gx + 4, py - gh);
          ctx.bezierCurveTo(gx + 5, py - gh, gx + 7, py - gh * 0.6, gx + 8, py);
          ctx.fill();
        }

        // Highlight sheen — wider and more visible
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(p.x + 5, py + 4, p.width * 0.5, 2);

        // Environmental dressing — small flowers on wider platforms
        if (p.width > 80) {
          const flowerColors: Record<string, string[]> = {
            enchanted: ['#FF69B4', '#FFD700', '#FF6347'],
            crystal:   ['#00E5FF', '#E040FB', '#B388FF'],
            autumn:    ['#FFD54F', '#FF8A65', '#FFCCBC'],
            firefly:   ['#FFEB3B', '#76FF03', '#B2FF59'],
          };
          const fc = (flowerColors[this.state.biome] || flowerColors.enchanted);
          const stemC = this.state.biome === 'crystal' ? '#9C5FE0' : '#4CAF50';
          for (let fx = p.x + 18; fx < p.x + p.width - 12; fx += 28 + ((Math.floor(fx) * 7) % 14)) {
            const fColor = fc[Math.floor(Math.abs(Math.sin(fx * 0.5)) * fc.length)];
            const stemH = 5 + Math.sin(fx * 0.4) * 1.5;
            ctx.strokeStyle = stemC;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(fx, py - 1);
            ctx.lineTo(fx, py - stemH);
            ctx.stroke();
            ctx.fillStyle = fColor;
            for (let pi = 0; pi < 5; pi++) {
              const pa = (pi / 5) * Math.PI * 2;
              ctx.beginPath();
              ctx.ellipse(fx + Math.cos(pa) * 2.8, py - stemH + Math.sin(pa) * 2.8, 2, 1.4, pa, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#FFF9C4';
            ctx.beginPath();
            ctx.arc(fx, py - stemH, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (p.type === 'vine') {
        // Vine rope hanging from above, platform at bottom
        const vx = p.x + p.width / 2;
        const vineTop = p.y - 90;
        // Rope with sway
        const sway = Math.sin(this.state.gameTime * 0.03 + p.x * 0.01) * 8;
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(vx, vineTop);
        ctx.quadraticCurveTo(vx + sway, p.y - 45, vx, p.y);
        ctx.stroke();
        // Vine over rope
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(vx, vineTop);
        ctx.quadraticCurveTo(vx + sway, p.y - 45, vx, p.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Leaves
        const leafColor = BIOME_COLORS[this.state.biome].trees[0];
        ctx.fillStyle = leafColor;
        for (let i = 0; i < 4; i++) {
          const ly = p.y - 18 - i * 20;
          const lx = vx + Math.sin(i * 1.3 + sway * 0.1) * 12;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 10, 6, i % 2 ? 0.4 : -0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        // Platform plank
        const platGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        platGrad.addColorStop(0, '#8D6E63');
        platGrad.addColorStop(1, '#5D4037');
        ctx.fillStyle = platGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(p.x + 4, p.y + 2, p.width - 8, 2);
      } else if (p.type === 'log') {
        // Mossy log platform
        const logGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        logGrad.addColorStop(0, '#A1887F');
        logGrad.addColorStop(0.5, '#8D6E63');
        logGrad.addColorStop(1, '#6D4C41');
        ctx.fillStyle = logGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 8);
        ctx.fill();
        // Wood grain lines
        ctx.strokeStyle = 'rgba(80,50,30,0.3)';
        ctx.lineWidth = 1;
        for (let lx = p.x + 20; lx < p.x + p.width - 10; lx += 18) {
          ctx.beginPath();
          ctx.moveTo(lx, p.y + 2);
          ctx.lineTo(lx, p.y + p.height - 2);
          ctx.stroke();
        }
        // End grain circles
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.arc(p.x + 10, p.y + p.height / 2, 7, 0, Math.PI * 2);
        ctx.arc(p.x + p.width - 10, p.y + p.height / 2, 7, 0, Math.PI * 2);
        ctx.fill();
        // Moss strip — brighter for readability
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(p.x + 4, p.y, p.width - 8, 4);
        // Moss tufts — vary height for organic look
        ctx.fillStyle = '#66BB6A';
        for (let mx = p.x + 8; mx < p.x + p.width - 8; mx += 11) {
          const mh = 2.5 + Math.sin(mx * 0.7) * 1.5;
          ctx.beginPath();
          ctx.arc(mx, p.y, mh, Math.PI, 0);
          ctx.fill();
        }
        // Top-edge white outline for contrast against background
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x + 4, p.y + 0.5);
        ctx.lineTo(p.x + p.width - 4, p.y + 0.5);
        ctx.stroke();
        // Small pebbles on log surface
        ctx.fillStyle = 'rgba(160,130,90,0.55)';
        for (let px2 = p.x + 22; px2 < p.x + p.width - 15; px2 += 35 + ((Math.floor(px2) * 9) % 18)) {
          ctx.beginPath();
          ctx.ellipse(px2, p.y + 7, 3, 2, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Tiny mushroom sprouts on log (every ~60px, deterministic)
        for (let mx2 = p.x + 30; mx2 < p.x + p.width - 20; mx2 += 60 + ((Math.floor(mx2) * 13) % 25)) {
          const msx = mx2, msy = p.y;
          // Stem
          ctx.fillStyle = '#F5F5DC';
          ctx.fillRect(msx - 1, msy - 6, 3, 6);
          // Cap
          ctx.fillStyle = '#E53935';
          ctx.beginPath();
          ctx.ellipse(msx, msy - 7, 5, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          // Spot
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.arc(msx + 1, msy - 8, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.type === 'crumbling') {
        // ── Crumbling Platform ─────────────────────────────────────────────────
        const crackLvl = p.crackLevel ?? 0;
        const fallAlpha = p.falling ? Math.max(0, 1 - (p.fallTimer ?? 0) / 30) : 1;
        ctx.save();
        ctx.globalAlpha = fallAlpha;
        // Base: weathered gray wood
        const cGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        cGrad.addColorStop(0, '#BDBDBD');
        cGrad.addColorStop(0.5, '#9E9E9E');
        cGrad.addColorStop(1, '#757575');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 4);
        ctx.fill();
        // Grain lines
        ctx.strokeStyle = 'rgba(80,80,80,0.25)';
        ctx.lineWidth = 1;
        for (let gx2 = p.x + 16; gx2 < p.x + p.width - 8; gx2 += 16) {
          ctx.beginPath();
          ctx.moveTo(gx2, p.y + 2);
          ctx.lineTo(gx2, p.y + p.height - 2);
          ctx.stroke();
        }
        // Top edge highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x + 4, p.y + 1);
        ctx.lineTo(p.x + p.width - 4, p.y + 1);
        ctx.stroke();
        // Moss patches
        ctx.fillStyle = 'rgba(100,140,80,0.28)';
        for (let mx3 = p.x + 20; mx3 < p.x + p.width - 12; mx3 += 38 + ((Math.floor(mx3 * 5)) % 14)) {
          ctx.beginPath();
          ctx.ellipse(mx3, p.y + 5, 7, 3, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Crack overlay based on crackLevel
        if (crackLvl >= 1) {
          ctx.strokeStyle = crackLvl >= 2 ? 'rgba(30,20,10,0.75)' : 'rgba(60,40,20,0.50)';
          ctx.lineWidth = crackLvl >= 2 ? 2 : 1;
          const cx3 = p.x + p.width / 2;
          // Main centre crack
          ctx.beginPath();
          ctx.moveTo(cx3 - 6, p.y);
          ctx.lineTo(cx3, p.y + p.height * 0.6);
          ctx.lineTo(cx3 + 5, p.y + p.height);
          ctx.stroke();
          // Side hairlines
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x + p.width * 0.28, p.y + 2);
          ctx.lineTo(p.x + p.width * 0.22, p.y + p.height * 0.7);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x + p.width * 0.72, p.y + 2);
          ctx.lineTo(p.x + p.width * 0.78, p.y + p.height * 0.65);
          ctx.stroke();
        }
        if (crackLvl >= 2) {
          // Shattered — dark fill in crack gaps + extra branching
          ctx.fillStyle = 'rgba(20,10,5,0.35)';
          ctx.beginPath();
          ctx.moveTo(p.x + p.width * 0.44, p.y);
          ctx.lineTo(p.x + p.width * 0.50, p.y + p.height * 0.5);
          ctx.lineTo(p.x + p.width * 0.46, p.y + p.height);
          ctx.lineTo(p.x + p.width * 0.42, p.y + p.height);
          ctx.lineTo(p.x + p.width * 0.40, p.y + p.height * 0.5);
          ctx.closePath();
          ctx.fill();
          // Dust puffs at edges
          ctx.fillStyle = 'rgba(180,160,130,0.30)';
          for (let di = 0; di < 4; di++) {
            ctx.beginPath();
            ctx.arc(p.x + (di + 0.5) * (p.width / 4), p.y + p.height + 4 + di * 2, 4 + di, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

      } else if (p.type === 'flowerLift') {
        // ── Flower Lift Platform ───────────────────────────────────────────────
        const petal = p.liftPetalAngle ?? 0;
        const isOpen = petal >= 0.98;
        const cx4 = p.x + p.width / 2;
        const stemBaseY = p.y + p.height + 30;

        ctx.save();
        // Thick green stem
        const stemGrad2 = ctx.createLinearGradient(cx4, p.y, cx4, stemBaseY);
        stemGrad2.addColorStop(0, '#81C784');
        stemGrad2.addColorStop(1, '#2E7D32');
        ctx.strokeStyle = stemGrad2;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx4, p.y + p.height);
        ctx.bezierCurveTo(cx4 + 6, p.y + p.height + 10, cx4 - 4, stemBaseY - 10, cx4, stemBaseY);
        ctx.stroke();
        // Small leaf on stem
        ctx.fillStyle = '#66BB6A';
        ctx.beginPath();
        ctx.ellipse(cx4 + 10, p.y + p.height + 16, 10, 5, 0.5, 0, Math.PI * 2);
        ctx.fill();

        if (!p.liftActive || petal < 0.01) {
          // Closed bud — teardrop shape
          const budH = 22;
          ctx.fillStyle = '#A5D6A7';
          ctx.beginPath();
          ctx.moveTo(cx4, p.y - budH);
          ctx.bezierCurveTo(cx4 + 10, p.y - budH * 0.6, cx4 + 8, p.y, cx4, p.y + 2);
          ctx.bezierCurveTo(cx4 - 8, p.y, cx4 - 10, p.y - budH * 0.6, cx4, p.y - budH);
          ctx.fill();
          ctx.strokeStyle = '#4CAF50';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Sepal lines
          ctx.strokeStyle = '#388E3C';
          ctx.lineWidth = 1;
          for (let si = 0; si < 3; si++) {
            const sa = -Math.PI / 2 + (si - 1) * 0.3;
            ctx.beginPath();
            ctx.moveTo(cx4, p.y);
            ctx.lineTo(cx4 + Math.cos(sa) * 10, p.y + Math.sin(sa) * 10 - budH * 0.15);
            ctx.stroke();
          }
        } else {
          // Opening petals — 6 bezier petals unfurling
          const petalColors = ['#F48FB1','#F06292','#CE93D8','#FFD54F','#AED581','#81D4FA'];
          const petalCount = 6;
          for (let pi5 = 0; pi5 < petalCount; pi5++) {
            const baseAngle = (pi5 / petalCount) * Math.PI * 2 - Math.PI / 2;
            const openAngle = baseAngle + (petal * 0.3 - 0.15); // petals splay outward as they open
            const petalLen = 18 * petal;
            const petalW = 7 * petal;
            const tipX = cx4 + Math.cos(openAngle) * petalLen;
            const tipY = p.y - p.height * 0.5 + Math.sin(openAngle) * petalLen;
            ctx.fillStyle = petalColors[pi5];
            ctx.beginPath();
            ctx.moveTo(cx4, p.y);
            ctx.bezierCurveTo(
              cx4 + Math.cos(openAngle - 0.3) * petalLen * 0.6,
              p.y + Math.sin(openAngle - 0.3) * petalLen * 0.6,
              tipX - Math.cos(openAngle) * petalW,
              tipY - Math.sin(openAngle) * petalW,
              tipX, tipY,
            );
            ctx.bezierCurveTo(
              tipX + Math.cos(openAngle) * petalW,
              tipY + Math.sin(openAngle) * petalW,
              cx4 + Math.cos(openAngle + 0.3) * petalLen * 0.6,
              p.y + Math.sin(openAngle + 0.3) * petalLen * 0.6,
              cx4, p.y,
            );
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
          // Yellow pollen centre
          ctx.fillStyle = '#FFF176';
          ctx.beginPath();
          ctx.arc(cx4, p.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#F9A825';
          ctx.beginPath();
          ctx.arc(cx4, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          // Pollen sparkle ring when fully open
          if (isOpen) {
            ctx.globalAlpha = 0.6 + Math.sin(this.state.gameTime * 0.15) * 0.3;
            ctx.fillStyle = '#FFD740';
            for (let pi6 = 0; pi6 < 8; pi6++) {
              const pa6 = (pi6 / 8) * Math.PI * 2 + this.state.gameTime * 0.05;
              ctx.beginPath();
              ctx.arc(cx4 + Math.cos(pa6) * 22, p.y + Math.sin(pa6) * 14, 2, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
            // Upward arrow
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            const arrowBob2 = Math.abs(Math.sin(this.state.gameTime * 0.07)) * 5;
            ctx.beginPath();
            ctx.moveTo(cx4, p.y - 38 - arrowBob2);
            ctx.lineTo(cx4 - 7, p.y - 28 - arrowBob2);
            ctx.lineTo(cx4 + 7, p.y - 28 - arrowBob2);
            ctx.closePath();
            ctx.fill();
          }
        }
        // Platform deck (landing surface)
        const deckGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        deckGrad.addColorStop(0, '#C8E6C9');
        deckGrad.addColorStop(1, '#81C784');
        ctx.fillStyle = deckGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 6);
        ctx.fill();
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 6);
        ctx.stroke();
        ctx.restore();

      } else if (p.type === 'vineSwing') {
        // ── Vine Swing ─────────────────────────────────────────────────────────
        const anchorX2 = p.vineAnchorX ?? (p.x + p.width / 2);
        const anchorY2 = p.vineAnchorY ?? (p.y - (p.vineLength ?? 120));
        const seatX = p.x + p.width / 2;
        const seatY = p.y;
        const gt4 = this.state.gameTime;

        ctx.save();
        // Anchor stone knob at top
        ctx.fillStyle = '#78909C';
        ctx.beginPath();
        ctx.arc(anchorX2, anchorY2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#546E7A';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Metal hook detail
        ctx.strokeStyle = '#455A64';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(anchorX2, anchorY2 + 4, 4, 0, Math.PI);
        ctx.stroke();

        // Vine rope from anchor to seat (bezier with slight natural curve)
        const midX = (anchorX2 + seatX) / 2 + Math.sin(gt4 * 0.015 + p.x * 0.005) * 4;
        const midY = (anchorY2 + seatY) / 2;
        // Grabbed highlight
        if (p.vineGrabbed) {
          ctx.strokeStyle = 'rgba(200,255,150,0.6)';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(anchorX2, anchorY2);
          ctx.quadraticCurveTo(midX, midY, seatX, seatY);
          ctx.stroke();
        }
        // Main vine (3px dark rope)
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(anchorX2, anchorY2);
        ctx.quadraticCurveTo(midX, midY, seatX, seatY);
        ctx.stroke();
        // Green vine wrap
        ctx.strokeStyle = '#388E3C';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(anchorX2, anchorY2);
        ctx.quadraticCurveTo(midX, midY, seatX, seatY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Leaf pairs along vine
        const steps = 4;
        for (let si2 = 1; si2 < steps; si2++) {
          const t2 = si2 / steps;
          const lx2 = anchorX2 + (seatX - anchorX2) * t2 + (midX - (anchorX2 + seatX) / 2) * 2 * t2 * (1 - t2);
          const ly2 = anchorY2 + (seatY - anchorY2) * t2 + (midY - (anchorY2 + seatY) / 2) * 2 * t2 * (1 - t2);
          const leafSway = Math.sin(gt4 * 0.02 + si2 * 1.4 + p.x * 0.01) * 3;
          ctx.fillStyle = `rgba(76,175,80,${0.7 + Math.sin(si2 * 0.8) * 0.2})`;
          ctx.beginPath();
          ctx.ellipse(lx2 + 8 + leafSway, ly2, 8, 4, 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(lx2 - 8 - leafSway, ly2, 8, 4, -0.5, 0, Math.PI * 2);
          ctx.fill();
          // Dew drop at extremes
          if (si2 === 1 || si2 === steps - 1) {
            ctx.fillStyle = 'rgba(180,230,255,0.55)';
            ctx.beginPath();
            ctx.arc(lx2, ly2 + 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Seat platform (brown plank)
        const seatGrad2 = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        seatGrad2.addColorStop(0, '#8D6E63');
        seatGrad2.addColorStop(1, '#5D4037');
        ctx.fillStyle = seatGrad2;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, 5);
        ctx.fill();
        // Rope loops on seat ends
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 2;
        for (const ex of [p.x + 5, p.x + p.width - 5]) {
          ctx.beginPath();
          ctx.arc(ex, p.y + 5, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

      } else if (p.type === 'breakableBridge') {
        // ── Breakable Bridge ───────────────────────────────────────────────────
        const planks = p.bridgePlanks ?? [];
        const timers = p.bridgePlankTimers ?? [];
        const plankCount = planks.length || Math.ceil(p.width / 32);
        const plankW2 = p.width / plankCount;

        ctx.save();
        // Rope railing — catenary across intact posts
        const ropeSag2 = Math.min(8, p.width * 0.03);
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 16);
        ctx.quadraticCurveTo(p.x + p.width / 2, p.y - 16 + ropeSag2, p.x + p.width, p.y - 16);
        ctx.stroke();
        ctx.strokeStyle = '#388E3C';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 16);
        ctx.quadraticCurveTo(p.x + p.width / 2, p.y - 16 + ropeSag2, p.x + p.width, p.y - 16);
        ctx.stroke();
        ctx.setLineDash([]);

        // Individual planks
        for (let pi7 = 0; pi7 < plankCount; pi7++) {
          const px3 = p.x + pi7 * plankW2;
          const isBroken = planks[pi7] ?? false;
          const timer7 = timers[pi7] ?? -1;
          const nearBreak = !isBroken && timer7 >= 0 && timer7 < 20;

          if (isBroken) {
            // Broken gap — show dark splinter shadow
            ctx.fillStyle = 'rgba(30,15,5,0.35)';
            ctx.fillRect(px3 + 2, p.y + 2, plankW2 - 4, p.height - 4);
            // Tilted broken plank fragments
            ctx.save();
            ctx.translate(px3 + plankW2 / 2, p.y + p.height + 6);
            ctx.rotate(0.4);
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(-plankW2 * 0.4, 0, plankW2 * 0.4, 5);
            ctx.restore();
          } else {
            // Intact plank
            const plankGrad2 = ctx.createLinearGradient(px3, p.y, px3, p.y + p.height);
            if (nearBreak) {
              // Flicker red tint when about to break
              const flicker = Math.sin(this.state.gameTime * 0.4) > 0;
              plankGrad2.addColorStop(0, flicker ? '#EF9A9A' : '#D7CCC8');
              plankGrad2.addColorStop(1, flicker ? '#E57373' : '#8D6E63');
            } else {
              plankGrad2.addColorStop(0, '#D7CCC8');
              plankGrad2.addColorStop(0.4, '#A1887F');
              plankGrad2.addColorStop(1, '#6D4C41');
            }
            ctx.fillStyle = plankGrad2;
            ctx.fillRect(px3 + 1, p.y, plankW2 - 2, p.height);
            // Wood grain
            ctx.strokeStyle = 'rgba(60,30,10,0.25)';
            ctx.lineWidth = 1;
            for (let gx3 = px3 + 6; gx3 < px3 + plankW2 - 4; gx3 += 8) {
              ctx.beginPath();
              ctx.moveTo(gx3, p.y + 2);
              ctx.lineTo(gx3, p.y + p.height - 2);
              ctx.stroke();
            }
            // Top highlight
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(px3 + 2, p.y + 1, plankW2 - 4, 2);
            // Plank gap seam
            ctx.fillStyle = 'rgba(30,15,5,0.5)';
            ctx.fillRect(px3, p.y, 1, p.height);
          }

          // Rope hanger from railing down to plank edge
          if (!isBroken) {
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 1;
            const hangerX = px3 + plankW2 / 2;
            const ropeAtHanger = (p.y - 16) + ropeSag2 * 4 * ((hangerX - p.x) / p.width) * (1 - (hangerX - p.x) / p.width);
            ctx.beginPath();
            ctx.moveTo(hangerX, ropeAtHanger);
            ctx.lineTo(hangerX, p.y);
            ctx.stroke();
          }
        }

        // End posts
        ctx.fillStyle = '#4E342E';
        for (const ex2 of [p.x - 2, p.x + p.width - 3]) {
          ctx.fillRect(ex2, p.y - 18, 5, p.height + 18);
        }
        ctx.restore();

      } else if (p.type === 'bridge') {
        // ── Hanging Garden Bridge ──────────────────────────────────────────────
        const bx1 = p.x, bx2 = p.x + p.width;
        const gt3 = this.state.gameTime;
        const sag = Math.min(14, p.width * 0.055);
        const archH = 36; // taller arch = more room for hanging gardens
        const postSpacing = 42;
        const postCount = Math.max(2, Math.floor(p.width / postSpacing));

        ctx.save();

        // 0. Long hanging vine cascades BELOW the bridge deck
        // These create the lush "underside garden" feel
        const cascadeCount = Math.min(8, Math.floor(p.width / 28));
        for (let ci = 0; ci < cascadeCount; ci++) {
          const t = (ci + 0.5) / cascadeCount;
          const cx2 = p.x + t * p.width;
          const cascadeLen = 22 + Math.sin(ci * 1.9 + p.x * 0.01) * 12;
          const sway2 = Math.sin(gt3 * 0.022 + ci * 1.1 + p.x * 0.005) * 4;
          // Main hanging vine strand
          ctx.strokeStyle = `rgba(56,142,60,${0.55 + Math.sin(ci * 0.7) * 0.15})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx2, p.y + p.height);
          ctx.bezierCurveTo(
            cx2 + sway2 * 0.4, p.y + p.height + cascadeLen * 0.4,
            cx2 + sway2 * 0.8, p.y + p.height + cascadeLen * 0.7,
            cx2 + sway2, p.y + p.height + cascadeLen,
          );
          ctx.stroke();
          // Small leaf cluster at end of cascade
          const leafY = p.y + p.height + cascadeLen;
          const leafX = cx2 + sway2;
          ctx.fillStyle = `rgba(76,175,80,${0.7 + Math.sin(ci * 0.9) * 0.2})`;
          for (let li = 0; li < 3; li++) {
            const la = (li / 3) * Math.PI * 2 + ci * 0.8;
            ctx.beginPath();
            ctx.ellipse(leafX + Math.cos(la) * 4, leafY + Math.sin(la) * 3, 4.5, 2.5, la, 0, Math.PI * 2);
            ctx.fill();
          }
          // Occasional tiny flower at cascade tip
          if (ci % 3 === 0) {
            const fc0 = ['#FF69B4','#FFD700','#E040FB','#FF6347'][ci % 4];
            ctx.fillStyle = fc0;
            for (let pi3 = 0; pi3 < 5; pi3++) {
              const pa3 = (pi3 / 5) * Math.PI * 2;
              ctx.beginPath();
              ctx.ellipse(leafX + Math.cos(pa3) * 3, leafY - 4 + Math.sin(pa3) * 3, 1.8, 1.2, pa3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#FFFDE7';
            ctx.beginPath();
            ctx.arc(leafX, leafY - 4, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 1. Deck planks — warm mossy wood
        const bGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        bGrad.addColorStop(0, '#C9B99A');
        bGrad.addColorStop(0.4, '#9C8060');
        bGrad.addColorStop(1, '#6B4E32');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.width, p.height, [4, 4, 2, 2]);
        ctx.fill();

        // Plank seams
        ctx.strokeStyle = 'rgba(50,30,10,0.40)';
        ctx.lineWidth = 1.2;
        for (let bxl = p.x + 14; bxl < p.x + p.width; bxl += 14) {
          ctx.beginPath();
          ctx.moveTo(bxl, p.y + 2);
          ctx.lineTo(bxl, p.y + p.height - 2);
          ctx.stroke();
        }
        // Moss patches
        ctx.fillStyle = 'rgba(60,140,60,0.22)';
        for (let mx = p.x + 18; mx < p.x + p.width - 12; mx += 42 + ((Math.floor(mx * 7)) % 18)) {
          ctx.beginPath();
          ctx.ellipse(mx, p.y + 6, 8, 3, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(p.x + 4, p.y + 1, p.width - 8, 3);

        // 2. Trellis posts (stone-base + wooden post)
        for (let pi = 0; pi <= postCount; pi++) {
          const px2 = p.x + (pi / postCount) * p.width;
          ctx.fillStyle = '#8D8070';
          ctx.beginPath();
          ctx.roundRect(px2 - 4, p.y - 6, 8, 10, 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(50,40,30,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px2 - 4, p.y - 6, 8, 10);
          const postGrad = ctx.createLinearGradient(px2 - 3, p.y - archH, px2 + 3, p.y);
          postGrad.addColorStop(0, '#A07850');
          postGrad.addColorStop(1, '#6B4E32');
          ctx.fillStyle = postGrad;
          ctx.fillRect(px2 - 2.5, p.y - archH, 5, archH - 4);
          // Ivy tendrils climbing each post
          ctx.strokeStyle = 'rgba(67,160,71,0.55)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(px2, p.y - 4);
          ctx.bezierCurveTo(px2 + 3, p.y - archH * 0.4, px2 - 3, p.y - archH * 0.7, px2, p.y - archH + 4);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 3. Main trellis rope + vine wrapping
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx1, p.y - archH);
        ctx.quadraticCurveTo(bx1 + p.width * 0.5, p.y - archH + sag, bx2, p.y - archH);
        ctx.stroke();
        ctx.strokeStyle = '#388E3C';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(bx1, p.y - archH);
        ctx.quadraticCurveTo(bx1 + p.width * 0.5, p.y - archH + sag, bx2, p.y - archH);
        ctx.stroke();
        ctx.setLineDash([]);
        // Second lower rope
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx1, p.y - archH * 0.55);
        ctx.quadraticCurveTo(bx1 + p.width * 0.5, p.y - archH * 0.55 + sag * 0.55, bx2, p.y - archH * 0.55);
        ctx.stroke();
        // Third thin decorative rope (new — extra lush)
        ctx.strokeStyle = 'rgba(56,142,60,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(bx1, p.y - archH * 0.28);
        ctx.quadraticCurveTo(bx1 + p.width * 0.5, p.y - archH * 0.28 + sag * 0.28, bx2, p.y - archH * 0.28);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4. Hanging flower clusters — denser, longer strings, varied heights
        const flowerColors = this.state.biome === 'crystal'
          ? ['#E040FB','#CE93D8','#00E5FF','#B388FF']
          : this.state.biome === 'autumn'
          ? ['#FFD54F','#FF8A65','#FF5722','#FFAB40']
          : this.state.biome === 'firefly'
          ? ['#FFEB3B','#76FF03','#00E676','#B2FF59']
          : ['#FF69B4','#FFD700','#FF6347','#DDA0DD','#87CEEB'];

        const hangCount = Math.min(9, Math.floor(p.width / 26));
        for (let hi = 0; hi < hangCount; hi++) {
          const t = (hi + 0.5) / hangCount;
          const ropeY = (p.y - archH) + sag * 4 * t * (1 - t);
          const hx = p.x + t * p.width;
          // Longer string (was 14-19, now 18-32)
          const stringLen = 18 + Math.sin(hi * 1.7) * 7 + Math.cos(hi * 0.9) * 5;
          const sway = Math.sin(gt3 * 0.025 + hi * 1.3) * 3.5;
          // Dual-strand string for richness
          ctx.strokeStyle = '#5D4037';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hx, ropeY);
          ctx.lineTo(hx + sway, ropeY + stringLen);
          ctx.stroke();
          // Wicker planter box — slightly taller
          ctx.fillStyle = '#8D6E63';
          ctx.beginPath();
          ctx.roundRect(hx + sway - 10, ropeY + stringLen, 20, 10, 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(50,30,10,0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(hx + sway - 10, ropeY + stringLen, 20, 10);
          // Wicker weave lines
          ctx.strokeStyle = 'rgba(100,60,30,0.3)';
          for (let wi = 0; wi < 3; wi++) {
            ctx.beginPath();
            ctx.moveTo(hx + sway - 10 + wi * 7, ropeY + stringLen);
            ctx.lineTo(hx + sway - 10 + wi * 7, ropeY + stringLen + 10);
            ctx.stroke();
          }
          // Soil
          ctx.fillStyle = '#5D4037';
          ctx.fillRect(hx + sway - 8, ropeY + stringLen + 3, 16, 5);
          // Bloom cluster — 4 flowers per box (was 3)
          for (let bi = 0; bi < 4; bi++) {
            const bx3 = hx + sway - 7 + bi * 5;
            const by2 = ropeY + stringLen + 1;
            const fc2 = flowerColors[(hi * 4 + bi) % flowerColors.length];
            const stemH = 6 + Math.sin(bi * 1.4 + hi) * 3;
            const windSway = Math.sin(gt3 * 0.02 + bi + hi) * 1.8;
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx3, ropeY + stringLen + 3);
            ctx.lineTo(bx3 + windSway, by2 - stemH);
            ctx.stroke();
            // 6-petal burst (was 5)
            ctx.fillStyle = fc2;
            for (let pi2 = 0; pi2 < 6; pi2++) {
              const pa = (pi2 / 6) * Math.PI * 2 + gt3 * 0.004;
              ctx.beginPath();
              ctx.ellipse(bx3 + windSway + Math.cos(pa) * 3, by2 - stemH + Math.sin(pa) * 3, 2.2, 1.4, pa, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#FFF9C4';
            ctx.beginPath();
            ctx.arc(bx3 + windSway, by2 - stemH, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          // Occasional hanging moss tendril below planter
          if (hi % 2 === 0) {
            const mossLen = 8 + Math.sin(hi * 2.1) * 4;
            ctx.strokeStyle = 'rgba(100,180,80,0.45)';
            ctx.lineWidth = 1;
            for (let mi = 0; mi < 2; mi++) {
              const mx3 = hx + sway - 4 + mi * 8;
              ctx.beginPath();
              ctx.moveTo(mx3, ropeY + stringLen + 10);
              ctx.bezierCurveTo(mx3 + 1, ropeY + stringLen + 10 + mossLen * 0.5, mx3 - 1, ropeY + stringLen + 10 + mossLen * 0.8, mx3, ropeY + stringLen + 10 + mossLen);
              ctx.stroke();
            }
          }
        }

        // 5. Anchor knots at both ends
        ctx.fillStyle = '#3E2723';
        for (const ax of [bx1, bx2]) {
          ctx.beginPath();
          ctx.arc(ax, p.y - archH, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#6D4C41';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ax, p.y - archH, 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 6. Butterflies / dragonflies near flower boxes — more of them
        const bugCount = Math.min(4, Math.floor(p.width / 70));
        for (let bi2 = 0; bi2 < bugCount; bi2++) {
          const bugT = (gt3 * 0.012 + bi2 * 1.7) % 1;
          const bugX = bx1 + bugT * p.width;
          const ropeAtBug = (p.y - archH) + sag * 4 * bugT * (1 - bugT);
          const bugY = ropeAtBug - 10 + Math.sin(gt3 * 0.09 + bi2 * 1.7) * 7;
          const wingFlap = Math.sin(gt3 * 0.20 + bi2) * 0.45;
          ctx.save();
          ctx.globalAlpha = 0.72;
          const wingColor = ['#E040FB','#FFD700','#00E5FF','#FF8A65'][bi2 % 4];
          ctx.fillStyle = wingColor;
          ctx.beginPath();
          ctx.ellipse(bugX - 5, bugY, 4.5 + Math.abs(wingFlap) * 2, 3, -wingFlap, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(bugX + 5, bugY, 4.5 + Math.abs(wingFlap) * 2, 3, wingFlap, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#2D3B1E';
          ctx.beginPath();
          ctx.ellipse(bugX, bugY, 1.8, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      } else if (p.type === 'mushroomStepper') {
        // Giant mushroom stepping stone — dome cap you land on top of, thick stem below
        // p.y = top of collision box = the flat landing surface
        // Cap dome rises ABOVE p.y; stem goes DOWN from p.y
        const cx = p.x + p.width / 2;
        const capW = p.width / 2 + 12; // cap slightly wider than collision box
        const capH = 20;               // dome height above landing surface
        const bob = Math.sin(this.state.gameTime * 0.05 + p.x * 0.007) * 2;
        const landY = p.y + bob;       // the landing surface y (top of platform)

        // Thick curved stem — goes downward from landing surface
        const stemH = Math.min(55, GROUND_Y - landY - 5); // stop above ground
        const stemW = capW * 0.28;
        // Glow beneath cap rim (at landing surface level)
        ctx.save();
        const glowAlpha = 0.14 + Math.sin(this.state.gameTime * 0.04 + p.x * 0.01) * 0.06;
        const glowGrad = ctx.createRadialGradient(cx, landY + 4, 2, cx, landY + 4, capW * 1.1);
        const capColors: Record<string, [string, string, string]> = {
          enchanted: ['#FF8888', '#E53935', '#8B0000'],
          crystal:   ['#CC88FF', '#9C27B0', '#4A0080'],
          autumn:    ['#FFAA44', '#E65100', '#6D2D00'],
          firefly:   ['#88FF88', '#2E7D32', '#0A2D0A'],
        };
        const [capLight, capMid, capDark2] = capColors[this.state.biome] || capColors.enchanted;
        glowGrad.addColorStop(0, capMid.replace(')', ',0.35)').replace('rgb', 'rgba'));
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(cx, landY + 4, capW * 1.05, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (stemH > 4) {
          const stemGrad = ctx.createLinearGradient(cx - stemW, landY, cx + stemW, landY);
          stemGrad.addColorStop(0, '#B8A870');
          stemGrad.addColorStop(0.35, '#EEE0A8');
          stemGrad.addColorStop(0.65, '#E0D090');
          stemGrad.addColorStop(1, '#A89858');
          ctx.fillStyle = stemGrad;
          ctx.beginPath();
          // Stem flares slightly at base
          ctx.moveTo(cx - stemW * 0.65, landY);
          ctx.bezierCurveTo(cx - stemW * 0.8,  landY + stemH * 0.55,
                            cx - stemW * 1.15, landY + stemH * 0.88,
                            cx - stemW * 1.35, landY + stemH);
          ctx.lineTo(cx + stemW * 1.35, landY + stemH);
          ctx.bezierCurveTo(cx + stemW * 1.15, landY + stemH * 0.88,
                            cx + stemW * 0.8,  landY + stemH * 0.55,
                            cx + stemW * 0.65, landY);
          ctx.closePath();
          ctx.fill();
          // Right shadow on stem
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.beginPath();
          ctx.moveTo(cx + stemW * 0.35, landY);
          ctx.bezierCurveTo(cx + stemW * 0.5,  landY + stemH * 0.55,
                            cx + stemW * 0.85, landY + stemH * 0.88,
                            cx + stemW * 1.05, landY + stemH);
          ctx.lineTo(cx + stemW * 1.35, landY + stemH);
          ctx.bezierCurveTo(cx + stemW * 1.15, landY + stemH * 0.88,
                            cx + stemW * 0.8,  landY + stemH * 0.55,
                            cx + stemW * 0.65, landY);
          ctx.fill();
          // Stem ring (skirt) at base
          ctx.fillStyle = '#D4C488';
          ctx.beginPath();
          ctx.ellipse(cx, landY + stemH, stemW * 1.35, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Gills under cap edge — radial lines from stem top to cap rim
        ctx.save();
        ctx.strokeStyle = 'rgba(120,20,20,0.22)';
        ctx.lineWidth = 0.8;
        for (let gi = -6; gi <= 6; gi++) {
          const t2 = gi / 6;
          const gx2 = cx + t2 * capW * 0.92;
          // Bottom of dome at this x position
          const capBottomY = landY + capH * Math.sqrt(Math.max(0, 1 - t2 * t2)) * 0.5;
          ctx.beginPath();
          ctx.moveTo(gx2, landY + 1);
          ctx.lineTo(gx2, capBottomY);
          ctx.stroke();
        }
        ctx.restore();

        // Main cap dome — rises above landY
        const capGrad = ctx.createRadialGradient(cx - capW * 0.28, landY - capH * 0.55, 3, cx, landY, capW * 0.85);
        capGrad.addColorStop(0, capLight);
        capGrad.addColorStop(0.42, capMid);
        capGrad.addColorStop(1, capDark2);
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        // Dome = top half of ellipse (from π to 0)
        ctx.ellipse(cx, landY, capW, capH, 0, Math.PI, 0);
        ctx.fill();
        // Cap outline
        ctx.strokeStyle = 'rgba(60,0,0,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, landY, capW, capH, 0, Math.PI, 0);
        ctx.stroke();
        // Flat underside line to close cap visually
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - capW, landY);
        ctx.lineTo(cx + capW, landY);
        ctx.stroke();

        // White spots on dome
        const spots2 = [
          { ox: -capW * 0.32, oy: -capH * 0.52, r: 6.5 },
          { ox:  capW * 0.34, oy: -capH * 0.44, r: 5.5 },
          { ox:  0,           oy: -capH * 0.82, r: 5.5 },
          { ox: -capW * 0.60, oy: -capH * 0.22, r: 4 },
          { ox:  capW * 0.60, oy: -capH * 0.18, r: 4 },
        ];
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (const s of spots2) {
          ctx.beginPath();
          ctx.arc(cx + s.ox + 1, landY + s.oy + 1, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#FFFFFF';
        for (const s of spots2) {
          ctx.beginPath();
          ctx.arc(cx + s.ox, landY + s.oy, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (const s of spots2) {
          ctx.beginPath();
          ctx.arc(cx + s.ox - 1, landY + s.oy - 1.5, s.r * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bounce arrows above cap
        const arrowBob2 = Math.abs(Math.sin(this.state.gameTime * 0.06)) * 6;
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(this.state.gameTime * 0.06) * 0.28;
        ctx.fillStyle = '#FFE840';
        ctx.strokeStyle = '#C88800';
        ctx.lineWidth = 1;
        for (let ai = 0; ai < 2; ai++) {
          const ay = landY - capH - 14 - ai * 13 - arrowBob2;
          ctx.beginPath();
          ctx.moveTo(cx, ay - 8);
          ctx.lineTo(cx - 6, ay + 1); ctx.lineTo(cx - 2, ay + 1);
          ctx.lineTo(cx - 2, ay + 5); ctx.lineTo(cx + 2, ay + 5);
          ctx.lineTo(cx + 2, ay + 1); ctx.lineTo(cx + 6, ay + 1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();

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

        // Trailing vines + flowers hanging below the cloud (sky garden feel)
        // Only on wider clouds (part of sky chain) so the sky path feels lush
        if (p.width > 120) {
          ctx.globalAlpha = opacity * 0.82;
          const vineCount = Math.min(6, Math.floor(p.width / 36));
          const cloudFlowers = this.state.biome === 'crystal'
            ? ['#E040FB','#B388FF','#00E5FF']
            : this.state.biome === 'autumn'
            ? ['#FFD54F','#FF8A65','#FFAB40']
            : ['#FF69B4','#FFD700','#A5D6A7','#CE93D8'];
          for (let vi = 0; vi < vineCount; vi++) {
            const vt = (vi + 0.5) / vineCount;
            const vx2 = p.x + vt * p.width;
            const vineLen = 16 + Math.sin(vi * 1.9 + p.x * 0.008) * 9;
            const vsway = Math.sin(this.state.gameTime * 0.020 + vi * 1.2 + p.x * 0.004) * 3.5;
            // Vine strand
            ctx.strokeStyle = 'rgba(76,175,80,0.55)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(vx2, floatY + p.height);
            ctx.bezierCurveTo(
              vx2 + vsway * 0.5, floatY + p.height + vineLen * 0.5,
              vx2 + vsway,       floatY + p.height + vineLen * 0.8,
              vx2 + vsway,       floatY + p.height + vineLen,
            );
            ctx.stroke();
            // Tiny leaf pair mid-vine
            ctx.fillStyle = 'rgba(100,200,80,0.65)';
            const midVx = vx2 + vsway * 0.5;
            const midVy = floatY + p.height + vineLen * 0.45;
            ctx.beginPath();
            ctx.ellipse(midVx - 4, midVy, 4, 2.2, -0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(midVx + 4, midVy, 4, 2.2, 0.4, 0, Math.PI * 2);
            ctx.fill();
            // Small flower at tip (every other vine)
            if (vi % 2 === 0) {
              const tipX = vx2 + vsway;
              const tipY = floatY + p.height + vineLen;
              const fc3 = cloudFlowers[vi % cloudFlowers.length];
              ctx.fillStyle = fc3;
              for (let pi4 = 0; pi4 < 5; pi4++) {
                const pa4 = (pi4 / 5) * Math.PI * 2 + this.state.gameTime * 0.005;
                ctx.beginPath();
                ctx.ellipse(tipX + Math.cos(pa4) * 2.8, tipY + Math.sin(pa4) * 2.8, 2, 1.3, pa4, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.fillStyle = '#FFFDE7';
              ctx.beginPath();
              ctx.arc(tipX, tipY, 1.3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalAlpha = opacity; // restore after vine section
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

  // ── Sky Birds — ambient birds patrolling the cloud layer ──────────────────
  renderSkyBirds(ctx: CanvasRenderingContext2D) {
    const gt = this.state.gameTime;
    const camX = this.cameraX;
    // Birds live at cloud height: GROUND_Y - 160 to GROUND_Y - 340
    // 6 independent birds with different speeds, phases, altitudes
    const birdDefs = [
      { speed: 18, phase: 0.0,  yBase: GROUND_Y - 200, size: 1.00, color: '#ECEFF1' },
      { speed: 22, phase: 2.1,  yBase: GROUND_Y - 260, size: 0.85, color: '#B0BEC5' },
      { speed: 14, phase: 4.5,  yBase: GROUND_Y - 320, size: 1.10, color: '#FFFFFF' },
      { speed: 26, phase: 1.3,  yBase: GROUND_Y - 175, size: 0.75, color: '#CFD8DC' },
      { speed: 19, phase: 3.7,  yBase: GROUND_Y - 290, size: 0.90, color: '#E3F2FD' },
      { speed: 12, phase: 5.8,  yBase: GROUND_Y - 240, size: 1.15, color: '#ECEFF1' },
    ];

    for (const b of birdDefs) {
      // World-space X that wraps across a 2400px zone, offset by camera parallax (0.5x)
      const wrapZone = 2400;
      const rawX = (camX * 0.5 + b.phase * 400 + gt * b.speed) % wrapZone;
      const birdX = camX - 200 + ((rawX + wrapZone) % wrapZone);
      if (birdX < camX - 160 || birdX > camX + CANVAS_WIDTH + 100) continue;

      const wingCycle = gt * 0.12 + b.phase;
      const wingAngle = Math.sin(wingCycle) * 0.45; // ±0.45 rad flap
      const glide = Math.abs(Math.sin(wingCycle)) < 0.12; // brief glide at extremes
      const birdY = b.yBase + Math.sin(gt * 0.018 + b.phase) * 14;
      const s = b.size;

      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.translate(birdX, birdY);

      // Body — small elongated oval
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(7 * s, -1 * s, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();

      // Tail fan
      ctx.beginPath();
      ctx.moveTo(-7 * s, 0);
      ctx.lineTo(-12 * s, -3 * s);
      ctx.lineTo(-10 * s, 0);
      ctx.lineTo(-12 * s, 3 * s);
      ctx.closePath();
      ctx.fill();

      if (glide) {
        // Glide: wings flat outstretched
        ctx.beginPath();
        ctx.moveTo(-2 * s, 0);
        ctx.bezierCurveTo(-2 * s, -3 * s, 8 * s, -10 * s, 16 * s, -8 * s);
        ctx.bezierCurveTo(8 * s, -7 * s, 0, -1 * s, -2 * s, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-2 * s, 0);
        ctx.bezierCurveTo(-2 * s, 3 * s, 8 * s, 10 * s, 16 * s, 8 * s);
        ctx.bezierCurveTo(8 * s, 7 * s, 0, 1 * s, -2 * s, 0);
        ctx.fill();
      } else {
        // Flapping: two bezier wings angled by wingAngle
        const wUp = -wingAngle;  // top wing angle (positive = swept up)
        const wDown = wingAngle; // bottom wing mirrors

        // Upper wing
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          4 * s, -4 * s * Math.cos(wUp),
          10 * s, -9 * s * Math.cos(wUp),
          16 * s, -8 * s * Math.cos(wUp)
        );
        ctx.bezierCurveTo(10 * s, -6 * s * Math.cos(wUp), 4 * s, -2 * s, 0, 0);
        ctx.fill();

        // Lower wing
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          4 * s, 4 * s * Math.cos(wDown),
          10 * s, 9 * s * Math.cos(wDown),
          16 * s, 8 * s * Math.cos(wDown)
        );
        ctx.bezierCurveTo(10 * s, 6 * s * Math.cos(wDown), 4 * s, 2 * s, 0, 0);
        ctx.fill();
      }

      // Tiny beak
      ctx.fillStyle = '#FFA726';
      ctx.beginPath();
      ctx.moveTo(9.5 * s, -1 * s);
      ctx.lineTo(13 * s, -0.5 * s);
      ctx.lineTo(9.5 * s, 1 * s);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  renderCollectibles(ctx: CanvasRenderingContext2D) {
    for (const c of this.collectibles) {
      if (c.collected || c.x > this.cameraX + CANVAS_WIDTH * 1.2 || c.x < this.cameraX - CANVAS_WIDTH * 0.7) continue;
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
      if (o.x > this.cameraX + CANVAS_WIDTH * 1.2 || o.x < this.cameraX - CANVAS_WIDTH * 0.7) continue;
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
        ctx.strokeStyle = '#6D4C41';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, o.width / 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

      } else if (o.type === 'bumbleBear') {
        // ── Bumble Bear ────────────────────────────────────────────────────
        const isDazed = o.aiState === 'dazed' || o.aiState === 'recover';
        const isAlert = o.aiState === 'alert';
        const isCharge = o.aiState === 'charge';
        const cx5 = o.x + o.width / 2;
        const cy5 = o.y + o.height / 2;
        const bob5 = Math.sin(o.bounceOffset * 2) * 2;

        ctx.save();
        // Body glow (orange when charging)
        if (isCharge) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#FF6F00';
          ctx.beginPath();
          ctx.ellipse(cx5, cy5 + bob5, o.width * 0.7, o.height * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Body — fuzzy brown ellipse
        const bearBodyGrad = ctx.createRadialGradient(cx5 - 6, cy5 - 8 + bob5, 4, cx5, cy5 + bob5, o.width * 0.55);
        bearBodyGrad.addColorStop(0, '#A1887F');
        bearBodyGrad.addColorStop(0.5, '#795548');
        bearBodyGrad.addColorStop(1, '#4E342E');
        ctx.fillStyle = bearBodyGrad;
        ctx.beginPath();
        ctx.ellipse(cx5, cy5 + bob5, o.width * 0.5, o.height * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        // Fur texture (short strokes)
        ctx.strokeStyle = 'rgba(80,50,30,0.3)';
        ctx.lineWidth = 1;
        for (let fi = 0; fi < 8; fi++) {
          const fa = (fi / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx5 + Math.cos(fa) * o.width * 0.3, cy5 + bob5 + Math.sin(fa) * o.height * 0.28);
          ctx.lineTo(cx5 + Math.cos(fa) * o.width * 0.48, cy5 + bob5 + Math.sin(fa) * o.height * 0.44);
          ctx.stroke();
        }
        // Ears
        ctx.fillStyle = '#6D4C41';
        for (const ex5 of [cx5 - 14, cx5 + 14]) {
          ctx.beginPath();
          ctx.arc(ex5, o.y + 6 + bob5, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FF8A80';
          ctx.beginPath();
          ctx.arc(ex5, o.y + 6 + bob5, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#6D4C41';
        }
        // Eyes
        if (isDazed) {
          // Dizzy X eyes + orbiting stars
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          for (const ex6 of [cx5 - 8, cx5 + 8]) {
            ctx.beginPath();
            ctx.moveTo(ex6 - 3, cy5 - 8 + bob5 - 3); ctx.lineTo(ex6 + 3, cy5 - 8 + bob5 + 3); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ex6 + 3, cy5 - 8 + bob5 - 3); ctx.lineTo(ex6 - 3, cy5 - 8 + bob5 + 3); ctx.stroke();
          }
          const starCount = 3;
          for (let si3 = 0; si3 < starCount; si3++) {
            const sa3 = (si3 / starCount) * Math.PI * 2 + this.state.gameTime * 0.08;
            ctx.fillStyle = '#FFD740';
            ctx.beginPath();
            ctx.arc(cx5 + Math.cos(sa3) * 18, o.y - 8 + bob5 + Math.sin(sa3) * 8, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (isAlert) {
          // Wide-open shocked eyes + exclamation mark
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx5 - 9, cy5 - 8 + bob5, 5.5, 0, Math.PI * 2);
          ctx.arc(cx5 + 9, cy5 - 8 + bob5, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#212121';
          ctx.beginPath();
          ctx.arc(cx5 - 9, cy5 - 8 + bob5, 3, 0, Math.PI * 2);
          ctx.arc(cx5 + 9, cy5 - 8 + bob5, 3, 0, Math.PI * 2);
          ctx.fill();
          // ! above head
          ctx.fillStyle = '#FF5722';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', cx5, o.y - 10 + bob5 - Math.abs(Math.sin(this.state.gameTime * 0.2)) * 4);
        } else {
          ctx.fillStyle = isCharge ? '#FF1744' : '#212121';
          ctx.beginPath();
          ctx.arc(cx5 - 8, cy5 - 8 + bob5, 4, 0, Math.PI * 2);
          ctx.arc(cx5 + 8, cy5 - 8 + bob5, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(cx5 - 6, cy5 - 10 + bob5, 1.5, 0, Math.PI * 2);
          ctx.arc(cx5 + 10, cy5 - 10 + bob5, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Red nose
        ctx.fillStyle = '#E53935';
        ctx.beginPath();
        ctx.ellipse(cx5, cy5 - 2 + bob5, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dust trail when charging
        if (isCharge) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#BCAAA4';
          for (let di2 = 1; di2 <= 3; di2++) {
            ctx.beginPath();
            ctx.ellipse(o.x - di2 * 12 * o.direction, cy5 + o.height * 0.4, 6 + di2 * 2, 4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();

      } else if (o.type === 'thornling') {
        // ── Thornling ─────────────────────────────────────────────────────
        const cx6 = o.x + o.width / 2;
        const cy6 = o.y + o.height / 2;
        const isTelegraph = o.aiState === 'telegraph';
        const isSpiked = o.aiState === 'spikes_extended';
        const isBounce = o.aiState === 'bounce';
        const puffScale = isTelegraph ? 1 + (o.telegraphTimer ?? 0) * 0.2
                        : isBounce ? 0.6   // flatten on bounce
                        : 1;

        ctx.save();
        // Legs (stick legs, walk animation)
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 2;
        const legWalk = Math.sin(o.bounceOffset * 3) * 8;
        for (const lx6 of [cx6 - 8, cx6 + 8]) {
          ctx.beginPath();
          ctx.moveTo(lx6, o.y + o.height);
          ctx.lineTo(lx6 + legWalk * (lx6 < cx6 ? 1 : -1), o.y + o.height + 10);
          ctx.stroke();
        }
        // Body — puffed walking bush
        const bushColor = isTelegraph ? '#558B2F' : '#4CAF50';
        ctx.fillStyle = isSpiked ? '#2E7D32' : bushColor;
        ctx.save();
        ctx.scale(puffScale, puffScale);
        ctx.translate(cx6 * (1 - puffScale), cy6 * (1 - puffScale));
        ctx.beginPath();
        // Bumpy bush shape
        for (let bi3 = 0; bi3 < 8; bi3++) {
          const ba = (bi3 / 8) * Math.PI * 2;
          const r6 = o.width * 0.42 + Math.sin(ba * 3 + (o.seed ?? 0) * 0.01) * 5;
          if (bi3 === 0) ctx.moveTo(cx6 + Math.cos(ba) * r6, cy6 + Math.sin(ba) * r6 * 0.75);
          else ctx.lineTo(cx6 + Math.cos(ba) * r6, cy6 + Math.sin(ba) * r6 * 0.75);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Thorns when extended
        if (isSpiked) {
          ctx.strokeStyle = '#33691E';
          ctx.lineWidth = 2;
          for (let ti = 0; ti < 8; ti++) {
            const ta = (ti / 8) * Math.PI * 2;
            const tr = o.width * 0.42;
            ctx.beginPath();
            ctx.moveTo(cx6 + Math.cos(ta) * tr, cy6 + Math.sin(ta) * tr * 0.75);
            ctx.lineTo(cx6 + Math.cos(ta) * (tr + 10), cy6 + Math.sin(ta) * (tr + 10) * 0.75);
            ctx.stroke();
            // Thorn tip
            ctx.fillStyle = '#558B2F';
            ctx.beginPath();
            ctx.arc(cx6 + Math.cos(ta) * (tr + 11), cy6 + Math.sin(ta) * (tr + 11) * 0.75, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Eyes (soft/safe when not spiked, alert when spiked)
        ctx.fillStyle = isSpiked ? '#F44336' : '#FFFFFF';
        for (const ex7 of [cx6 - 7, cx6 + 7]) {
          ctx.beginPath();
          ctx.arc(ex7, cy6 - 3, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#212121';
          ctx.beginPath();
          ctx.arc(ex7 + (isSpiked ? 1 : 0), cy6 - 3, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = isSpiked ? '#F44336' : '#FFFFFF';
        }
        ctx.restore();

      } else if (o.type === 'fireflySwarm') {
        // ── Firefly Swarm ──────────────────────────────────────────────────
        ctx.save();

        // Reform bridge: glowing platform drawn from swarm
        if (o.reformBridge && (o.reformBridgeTimer ?? 0) > 0) {
          const bridgeAlpha = Math.min(1, (o.reformBridgeTimer ?? 0) / 60);
          ctx.globalAlpha = bridgeAlpha * 0.8;
          const bGrad2 = ctx.createLinearGradient(o.x - 50, 0, o.x + 50, 0);
          bGrad2.addColorStop(0, 'rgba(255,235,59,0)');
          bGrad2.addColorStop(0.2, 'rgba(255,235,59,0.9)');
          bGrad2.addColorStop(0.8, 'rgba(255,235,59,0.9)');
          bGrad2.addColorStop(1, 'rgba(255,235,59,0)');
          ctx.fillStyle = bGrad2;
          ctx.fillRect(o.x - 60, o.y + 30, 120, 12);
          ctx.globalAlpha = 1;
        }

        // Individual firefly dots with glow trails
        const inds = o.swarmIndividuals;
        if (inds) {
          for (const ind of inds) {
            const pulse2 = 0.6 + Math.sin(ind.phase * 2 + this.state.gameTime * 0.1) * 0.4;
            // Glow
            ctx.globalAlpha = pulse2 * 0.35;
            ctx.fillStyle = '#FFD740';
            ctx.beginPath();
            ctx.arc(ind.x, ind.y, 7, 0, Math.PI * 2);
            ctx.fill();
            // Core dot
            ctx.globalAlpha = pulse2;
            ctx.fillStyle = o.scattered ? '#FFEE58' : '#FFEB3B';
            ctx.beginPath();
            ctx.arc(ind.x, ind.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            // Trail
            ctx.globalAlpha = pulse2 * 0.25;
            ctx.fillStyle = '#FFF9C4';
            ctx.beginPath();
            ctx.arc(ind.x - Math.cos(ind.phase) * 5, ind.y - Math.sin(ind.phase) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        ctx.restore();

      } else if (o.type === 'shadowWisp') {
        // ── Shadow Wisp ────────────────────────────────────────────────────
        const isChasing = o.aiState === 'chase';
        const isFleeing = o.aiState === 'flee';
        const cx7 = o.x + o.width / 2;
        const cy7 = o.y + o.height / 2;
        const drift2 = Math.sin(this.state.gameTime * 0.04 + (o.driftPhase ?? 0)) * 5;
        const ry = cy7 + drift2;

        ctx.save();
        // Fleeing: fade out and rise
        if (isFleeing) ctx.globalAlpha = 0.55;
        // Chase: brighter, larger glow
        ctx.globalAlpha = isFleeing ? 0.55 : (isChasing ? 0.5 + Math.sin(this.state.gameTime * 0.12) * 0.25 : 0.25 + Math.sin(this.state.gameTime * 0.06) * 0.1);
        const wispColor1 = isChasing ? '#AB47BC' : '#7B1FA2';
        const wispColor2 = isChasing ? '#6A1B9A' : '#4A148C';
        const wispGrad = ctx.createRadialGradient(cx7, ry, 4, cx7, ry, o.width * (isChasing ? 0.9 : 0.7));
        wispGrad.addColorStop(0, wispColor1);
        wispGrad.addColorStop(0.5, wispColor2);
        wispGrad.addColorStop(1, 'rgba(74,20,140,0)');
        ctx.fillStyle = wispGrad;
        ctx.beginPath();
        ctx.ellipse(cx7, ry, o.width * 0.65, o.height * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Dark purple smoke body — irregular blob
        ctx.fillStyle = '#4A148C';
        ctx.beginPath();
        for (let bi4 = 0; bi4 < 8; bi4++) {
          const ba4 = (bi4 / 8) * Math.PI * 2;
          const r8 = o.width * 0.38 + Math.sin(ba4 * 2 + this.state.gameTime * 0.03) * 5;
          if (bi4 === 0) ctx.moveTo(cx7 + Math.cos(ba4) * r8, ry + Math.sin(ba4) * r8 * 0.85);
          else ctx.lineTo(cx7 + Math.cos(ba4) * r8, ry + Math.sin(ba4) * r8 * 0.85);
        }
        ctx.closePath();
        ctx.fill();

        // Faint trail
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#6A1B9A';
        ctx.beginPath();
        ctx.ellipse(cx7 - o.direction * 18, ry + 5, o.width * 0.3, o.height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // White glowing eyes
        const eyeY8 = ry - 4;
        ctx.fillStyle = '#FFFFFF';
        for (const ex8 of [cx7 - 8, cx7 + 8]) {
          ctx.beginPath();
          ctx.ellipse(ex8, eyeY8, 4, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          // Glow around eyes
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#E1BEE7';
          ctx.beginPath();
          ctx.ellipse(ex8, eyeY8, 6, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#9C27B0';
          ctx.beginPath();
          ctx.arc(ex8, eyeY8, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
        }
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

    // Ground shadow — scales with jump height and fades as player gets higher
    {
      const shadowGroundY = GROUND_Y; // shadow always at ground level
      const heightAboveGround = Math.max(0, shadowGroundY - (p.y + p.height));
      const maxShadowHeight = 200;
      const shadowFactor = Math.max(0, 1 - heightAboveGround / maxShadowHeight);
      const shadowW = (w * 0.85) * (0.4 + shadowFactor * 0.6);
      const shadowAlpha = 0.28 * shadowFactor;
      if (shadowAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = shadowAlpha;
        const shadowGrad = ctx.createRadialGradient(x + w / 2, shadowGroundY, 0, x + w / 2, shadowGroundY, shadowW * 0.6);
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, shadowGroundY + 2, shadowW * 0.55, 5 * shadowFactor, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

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
