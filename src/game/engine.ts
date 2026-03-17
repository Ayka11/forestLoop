import {
  Platform, Collectible, Obstacle, Particle, BackgroundElement,
  PlayerState, GameState, Resources, BiomeType, PowerUpType,
  GRAVITY, JUMP_FORCE, DOUBLE_JUMP_FORCE, GLIDE_GRAVITY,
  BASE_SCROLL_SPEED, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT,
  CHECKPOINT_INTERVAL, POWERUP_DURATION, BIOME_COLORS, CHARACTER_COLORS,
  AvatarConfig, CraftRecipe, CRAFT_RECIPES,
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
export class GameEngine {
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
  craftedItems: Platform[] = [];

  // State
  player: PlayerState;
  state: GameState;
  avatar: AvatarConfig;

  // Callbacks
  onStateChange: ((state: GameState) => void) | null = null;
  onGameOver: (() => void) | null = null;
  onCheckpoint: (() => void) | null = null;

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
      trailColor: '#FFD700', squash: 1, stretch: 1,
    };
  }

  createGameState(): GameState {
    return {
      score: 0, distance: 0, leafTokens: 0,
      totalLeafTokens: parseInt(localStorage.getItem('flo_totalTokens') || '0'),
      resources: { wood: 0, stone: 0, flower: 0, leaf: 0 },
      combo: 0, comboTimer: 0, multiplier: 1, lives: 3,
      checkpointDistance: 0, speed: BASE_SCROLL_SPEED, baseSpeed: BASE_SCROLL_SPEED,
      biome: 'enchanted', gameTime: 0, isPaused: false, isGameOver: false, isPlaying: false,
      dailyChallenge: null, achievements: JSON.parse(localStorage.getItem('flo_achievements') || '[]'),
      streak: parseInt(localStorage.getItem('flo_streak') || '0'),
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
    // Far mountains
    const mountains: BackgroundElement[] = [];
    for (let i = 0; i < 20; i++) {
      mountains.push({
        x: i * 200 + this.random() * 100, y: 0,
        type: 'mountain', scale: 0.8 + this.random() * 0.6,
        color: biome.trees[0], variant: Math.floor(this.random() * 3),
      });
    }
    this.bgLayers.push({ offset: 0, speed: 0.1, elements: mountains });

    // Mid trees
    const midTrees: BackgroundElement[] = [];
    for (let i = 0; i < 30; i++) {
      midTrees.push({
        x: i * 120 + this.random() * 60, y: 0,
        type: 'tree', scale: 0.6 + this.random() * 0.4,
        color: biome.trees[Math.floor(this.random() * biome.trees.length)],
        variant: Math.floor(this.random() * 4),
      });
    }
    this.bgLayers.push({ offset: 0, speed: 0.3, elements: midTrees });

    // Near bushes + flowers
    const near: BackgroundElement[] = [];
    for (let i = 0; i < 40; i++) {
      const isBush = this.random() > 0.4;
      near.push({
        x: i * 80 + this.random() * 40, y: 0,
        type: isBush ? 'bush' : 'flower', scale: 0.3 + this.random() * 0.4,
        color: isBush ? biome.trees[2] : biome.flowers[Math.floor(this.random() * biome.flowers.length)],
        variant: Math.floor(this.random() * 3),
      });
    }
    this.bgLayers.push({ offset: 0, speed: 0.6, elements: near });

    // Clouds
    const clouds: BackgroundElement[] = [];
    for (let i = 0; i < 12; i++) {
      clouds.push({
        x: i * 250 + this.random() * 150, y: 30 + this.random() * 100,
        type: 'cloud', scale: 0.5 + this.random() * 1,
        color: '#ffffff', variant: Math.floor(this.random() * 3),
      });
    }
    this.bgLayers.push({ offset: 0, speed: 0.05, elements: clouds });
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

  start() {
    this.player = this.createPlayer();
    this.state = { ...this.createGameState(), totalLeafTokens: this.state.totalLeafTokens, achievements: this.state.achievements, streak: this.state.streak };
    this.state.isPlaying = true;
    this.platforms = [];
    this.collectibles = [];
    this.obstacles = [];
    this.particles = [];
    this.craftedItems = [];
    this.nextPlatformX = 0;
    this.nextCollectibleX = 300;
    this.nextObstacleX = 800;
    this.terrainX = 0;
    this.seed = Math.random() * 10000;
    this.initBackground();

    // Generate initial terrain
    this.generateInitialTerrain();

    Audio.startMusic();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    this.emitState();
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
    // Ground platforms
    for (let x = -100; x < CANVAS_WIDTH + 600; x += 200 + this.random() * 100) {
      const w = 150 + this.random() * 250;
      this.platforms.push({
        x, y: GROUND_Y, width: w, height: 200,
        type: 'ground', color: BIOME_COLORS[this.state.biome].ground,
      });
      this.nextPlatformX = x + w + 60 + this.random() * 120;
    }
    // Some floating platforms
    for (let i = 0; i < 5; i++) {
      const x = 400 + i * 300 + this.random() * 100;
      this.addFloatingPlatform(x);
    }
    // Initial collectibles
    for (let i = 0; i < 10; i++) {
      this.addCollectible(300 + i * 150 + this.random() * 80);
    }
  }

  addFloatingPlatform(x: number) {
    const types: Platform['type'][] = ['floating', 'mushroom', 'vine', 'log'];
    const type = types[Math.floor(this.random() * types.length)];
    const y = GROUND_Y - 100 - this.random() * 200;
    const w = type === 'mushroom' ? 60 : 80 + this.random() * 120;
    const biome = BIOME_COLORS[this.state.biome];
    const colors: Record<string, string> = {
      floating: biome.trees[2], mushroom: '#FF6B6B', vine: '#4CAF50', log: '#8D6E63',
    };
    this.platforms.push({
      x, y, width: w, height: type === 'mushroom' ? 20 : 16,
      type, color: colors[type], bouncy: type === 'mushroom',
      moving: this.random() > 0.7, moveRange: 40 + this.random() * 60,
      moveSpeed: 0.5 + this.random() * 1.5, originalY: y,
    });
  }

  addCollectible(x: number) {
    const r = this.random();
    let type: Collectible['type'];
    if (r < 0.25) type = 'wood';
    else if (r < 0.45) type = 'stone';
    else if (r < 0.6) type = 'flower';
    else if (r < 0.75) type = 'leaf';
    else if (r < 0.85) type = 'leafToken';
    else if (r < 0.89) type = 'mushroom_powerup';
    else if (r < 0.93) type = 'star';
    else if (r < 0.96) type = 'fireFlower';
    else if (r < 0.98) type = 'leafWings';
    else type = 'speedBoots';

    const y = GROUND_Y - 60 - this.random() * 200;
    this.collectibles.push({
      x, y, width: 24, height: 24, type, collected: false,
      bobOffset: this.random() * Math.PI * 2, sparkle: 0,
    });
  }

  addObstacle(x: number) {
    const types: Obstacle['type'][] = ['slime', 'bird', 'rollingLog'];
    const type = types[Math.floor(this.random() * types.length)];
    const y = type === 'bird' ? GROUND_Y - 120 - this.random() * 100 : GROUND_Y - 30;
    this.obstacles.push({
      x, y, width: type === 'rollingLog' ? 50 : 36, height: type === 'rollingLog' ? 36 : 32,
      type, speed: type === 'bird' ? 2 + this.random() * 2 : 1,
      bounceOffset: this.random() * Math.PI * 2, direction: -1,
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
    } else if (this.player.hasLeafWings && !this.player.gliding) {
      this.player.gliding = true;
    }
  }

  releaseJump() {
    this.player.gliding = false;
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
      type: recipe.type, color: recipe.type === 'bridge' ? '#8D6E63' : recipe.type === 'platform' ? '#FF69B4' : recipe.type === 'ramp' ? '#FFD700' : '#90A4AE',
      bouncy: recipe.type === 'platform',
    });
    Audio.playCraft();
    this.spawnParticles(px, py, 15, '#FFD700', 'sparkle');
    this.emitState();
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

    this.animationId = requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    if (this.state.isGameOver) return;
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawnTimer = 0;
      return;
    }

    const speed = this.state.speed * dt;
    this.state.gameTime += dt;
    this.state.distance += speed;
    this.state.score = Math.floor(this.state.distance) + this.state.leafTokens * 10;
    this.terrainX += speed;

    // Speed increase over time
    this.state.speed = Math.min(this.state.baseSpeed + this.state.distance * 0.0005, 10);
    if (this.player.speedBoost) this.state.speed *= 1.5;

    // Combo timer
    if (this.state.comboTimer > 0) {
      this.state.comboTimer -= dt;
      if (this.state.comboTimer <= 0) {
        this.state.combo = 0;
        this.state.multiplier = 1;
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
      }
    }

    // Biome transitions
    const dist = this.state.distance;
    if (dist > 15000) this.changeBiome('firefly');
    else if (dist > 10000) this.changeBiome('autumn');
    else if (dist > 5000) this.changeBiome('crystal');

    // Checkpoint
    if (this.state.distance - this.state.checkpointDistance > CHECKPOINT_INTERVAL) {
      this.state.checkpointDistance = this.state.distance;
      Audio.playCheckpoint();
      this.spawnParticles(this.player.x, this.player.y, 20, '#FFD700', 'sparkle');
      this.onCheckpoint?.();
    }

    this.updatePlayer(dt);
    this.updatePlatforms(speed);
    this.updateCollectibles(speed, dt);
    this.updateObstacles(speed, dt);
    this.updateParticles(dt);
    this.updateBackground(speed);
    this.generateTerrain();

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
    const grav = p.gliding ? GLIDE_GRAVITY : GRAVITY;
    p.vy += grav * dt;
    if (p.vy > 15) p.vy = 15;
    p.y += p.vy * dt;

    // Squash/stretch animation
    p.squash += (1 - p.squash) * 0.15;
    p.stretch += (1 - p.stretch) * 0.15;

    // Animation
    p.animTimer += dt;
    if (p.animTimer > 8) {
      p.animTimer = 0;
      p.animFrame = (p.animFrame + 1) % 4;
    }

    // Ground/platform collision
    p.grounded = false;
    const allPlatforms = [...this.platforms, ...this.craftedItems];
    for (const plat of allPlatforms) {
      if (this.checkPlatformCollision(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.grounded = true;
          p.doubleJumped = false;
          p.gliding = false;
          if (plat.bouncy) {
            p.vy = JUMP_FORCE * 1.5;
            p.grounded = false;
            p.squash = 0.5;
            p.stretch = 1.5;
            Audio.playBounce();
          }
        }
      }
    }

    // Fall off screen
    if (p.y > CANVAS_HEIGHT + 50) {
      this.handleDeath();
    }

    // Keep player in horizontal bounds
    if (p.x < 50) p.x = 50;
    if (p.x > CANVAS_WIDTH * 0.4) p.x = CANVAS_WIDTH * 0.4;
  }

  checkPlatformCollision(p: PlayerState, plat: Platform): boolean {
    const pw = p.bigMode ? p.width * 1.5 : p.width;
    const ph = p.bigMode ? p.height * 1.5 : p.height;
    return (
      p.x + pw > plat.x && p.x < plat.x + plat.width &&
      p.y + ph > plat.y && p.y + ph < plat.y + plat.height &&
      p.vy >= 0
    );
  }

  updatePlatforms(speed: number) {
    for (const p of this.platforms) {
      p.x -= speed;
      if (p.moving && p.originalY !== undefined) {
        p.y = p.originalY + Math.sin(this.state.gameTime * (p.moveSpeed || 1) * 0.05) * (p.moveRange || 40);
      }
    }
    for (const p of this.craftedItems) {
      p.x -= speed;
    }
    this.platforms = this.platforms.filter(p => p.x + p.width > -100);
    this.craftedItems = this.craftedItems.filter(p => p.x + p.width > -100);
  }

  updateCollectibles(speed: number, dt: number) {
    const p = this.player;
    const pw = p.bigMode ? p.width * 1.5 : p.width;
    const ph = p.bigMode ? p.height * 1.5 : p.height;

    for (const c of this.collectibles) {
      c.x -= speed;
      c.sparkle += dt * 0.1;
      if (c.collected) continue;

      // Collision check
      if (p.x + pw > c.x && p.x < c.x + c.width && p.y + ph > c.y && p.y < c.y + c.height) {
        c.collected = true;
        this.handleCollect(c);
      }
    }
    this.collectibles = this.collectibles.filter(c => c.x > -50);
  }

  handleCollect(c: Collectible) {
    this.state.combo++;
    this.state.comboTimer = 120;
    this.state.multiplier = Math.min(1 + Math.floor(this.state.combo / 5) * 0.5, 5);

    const points = Math.floor(10 * this.state.multiplier);
    this.state.score += points;

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
    }

    if (this.state.combo > 0 && this.state.combo % 5 === 0) Audio.playCombo();

    const colors: Record<string, string> = {
      wood: '#8D6E63', stone: '#90A4AE', flower: '#FF69B4', leaf: '#4CAF50',
      leafToken: '#FFD700', mushroom_powerup: '#FF6B6B', star: '#FFD700',
      fireFlower: '#FF5722', leafWings: '#76FF03', speedBoots: '#00BCD4', shield: '#9C27B0',
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
    }
  }

  updateObstacles(speed: number, dt: number) {
    const p = this.player;
    const pw = p.bigMode ? p.width * 1.5 : p.width;
    const ph = p.bigMode ? p.height * 1.5 : p.height;

    for (const o of this.obstacles) {
      o.x -= speed;
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
    this.obstacles = this.obstacles.filter(o => o.x > -100);
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

    // Respawn at checkpoint
    this.player.y = GROUND_Y - 100;
    this.player.vy = 0;
    this.player.invincible = true;
    this.respawnTimer = 60;
    setTimeout(() => { this.player.invincible = false; }, 2000);
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

  updateBackground(speed: number) {
    for (const layer of this.bgLayers) {
      layer.offset += speed * layer.speed;
    }
  }

  generateTerrain() {
    const ahead = this.terrainX + CANVAS_WIDTH + 600;

    while (this.nextPlatformX < ahead) {
      const gap = 60 + this.random() * 140;
      const w = 150 + this.random() * 300;
      this.platforms.push({
        x: this.nextPlatformX + gap, y: GROUND_Y, width: w, height: 200,
        type: 'ground', color: BIOME_COLORS[this.state.biome].ground,
      });
      // Add floating platforms above
      if (this.random() > 0.4) {
        this.addFloatingPlatform(this.nextPlatformX + gap + this.random() * w);
      }
      this.nextPlatformX += gap + w;
    }

    while (this.nextCollectibleX < ahead) {
      this.addCollectible(this.nextCollectibleX);
      this.nextCollectibleX += 80 + this.random() * 120;
    }

    while (this.nextObstacleX < ahead) {
      this.addObstacle(this.nextObstacleX);
      this.nextObstacleX += 400 + this.random() * 600;
    }
  }

  changeBiome(biome: BiomeType) {
    if (this.state.biome === biome) return;
    this.state.biome = biome;
    this.initBackground();
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

    // Camera shake
    ctx.save();
    if (this.cameraShake > 0) {
      ctx.translate((Math.random() - 0.5) * this.cameraShake, (Math.random() - 0.5) * this.cameraShake);
      this.cameraShake *= 0.9;
      if (this.cameraShake < 0.5) this.cameraShake = 0;
    }

    this.renderSky(ctx, w, h);
    this.renderBackground(ctx, w, h);
    this.renderPlatforms(ctx);
    this.renderCollectibles(ctx);
    this.renderObstacles(ctx);
    this.renderPlayer(ctx);
    this.renderParticles(ctx);

    // Vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  renderSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const colors = BIOME_COLORS[this.state.biome].sky;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[1]);
    grad.addColorStop(1, colors[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const mod = (n: number, m: number) => ((n % m) + m) % m; // positive modulo

    // Clouds layer (index 3)
    const cloudLayer = this.bgLayers[3];
    if (cloudLayer) {
      for (const el of cloudLayer.elements) {
        const x = mod(el.x - cloudLayer.offset, w + 400) - 200;
        this.drawCloud(ctx, x, el.y, el.scale);
      }
    }

    // Mountains (index 0)
    const mtLayer = this.bgLayers[0];
    if (mtLayer) {
      for (const el of mtLayer.elements) {
        const x = mod(el.x - mtLayer.offset, w + 400) - 200;
        this.drawMountain(ctx, x, h * 0.5, el.scale, el.color);
      }
    }

    // Mid trees (index 1)
    const treeLayer = this.bgLayers[1];
    if (treeLayer) {
      for (const el of treeLayer.elements) {
        const x = mod(el.x - treeLayer.offset, w + 300) - 150;
        this.drawTree(ctx, x, h * 0.55, el.scale * 1.5, el.color, el.variant);
      }
    }

    // Near bushes (index 2)
    const nearLayer = this.bgLayers[2];
    if (nearLayer) {
      for (const el of nearLayer.elements) {
        const x = mod(el.x - nearLayer.offset, w + 200) - 100;
        if (el.type === 'bush') {
          this.drawBush(ctx, x, GROUND_Y - 10, el.scale, el.color);
        } else {
          this.drawFlowerBg(ctx, x, GROUND_Y - 5, el.scale, el.color);
        }
      }
    }
  }


  drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
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
    ctx.fillStyle = color + '60';
    ctx.beginPath();
    ctx.moveTo(x - h * 0.8, baseY + 100);
    ctx.lineTo(x, baseY + 100 - h);
    ctx.lineTo(x + h * 0.8, baseY + 100);
    ctx.fill();
    // Snow cap
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
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

  renderPlatforms(ctx: CanvasRenderingContext2D) {
    for (const p of [...this.platforms, ...this.craftedItems]) {
      if (p.x > CANVAS_WIDTH + 50 || p.x + p.width < -50) continue;

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
      if (c.collected || c.x > CANVAS_WIDTH + 30 || c.x < -30) continue;
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
      if (o.x > CANVAS_WIDTH + 50 || o.x < -50) continue;
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
    if (this.respawnTimer > 0 && Math.floor(this.respawnTimer) % 4 < 2) return;
    if (p.invincible && this.frameCount % 4 < 2 && !p.activePowerUp) return;

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
