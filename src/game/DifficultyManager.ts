import { DifficultyMode } from './types';

export interface DifficultyTuning {
  phase: 'beginner' | 'early' | 'mid' | 'late';
  baseSpeed: number;
  maxSpeed: number;
  playerMaxForwardSpeed: number;
  playerMaxBackwardSpeed: number;
  minGroundGap: number;
  maxGroundGap: number;
  maxSafeGroundGap: number;
  minGroundWidth: number;
  maxGroundWidth: number;
  floatingPlatformChance: number;
  obstacleSpacingMin: number;
  obstacleSpacingMax: number;
  obstacleDensity: number;
  movingPlatformChance: number;
  movingPlatformSpeed: number;
  coyoteTimeFrames: number;
  jumpBufferFrames: number;
  groundAccel: number;
  airAccel: number;
  groundFriction: number;
  airDrag: number;
  brakingDecel: number;
}

type Phase = DifficultyTuning['phase'];

type PhaseTuning = {
  start: number;
  end: number;
  baseSpeed: number;
  maxSpeed: number;
  minGroundGap: number;
  maxGroundGap: number;
  minGroundWidth: number;
  maxGroundWidth: number;
  floatingPlatformChance: number;
  movingPlatformChance: number;
  coyoteBoost: number;
  jumpBufferBoost: number;
  obstacleDensityBase: number;
};

type DifficultyPreset = {
  speedRampPerKm: number;
  obstacleRampPerKm: number;
  speedScale: number;
  maxSpeedScale: number;
  gapScale: number;
  widthScale: number;
  spacingScale: number;
  assistScale: number;
  movingObstacleBonus: number;
};

const PHASES: Record<Phase, PhaseTuning> = {
  beginner: {
    start: 0,
    end: 6000,
    baseSpeed: 3.25,
    maxSpeed: 5.1,
    minGroundGap: 44,
    maxGroundGap: 92,
    minGroundWidth: 250,
    maxGroundWidth: 460,
    floatingPlatformChance: 0.22,
    movingPlatformChance: 0.06,
    coyoteBoost: 1.6,
    jumpBufferBoost: 1.25,
    obstacleDensityBase: 0.78,
  },
  early: {
    start: 6000,
    end: 18000,
    baseSpeed: 3.95,
    maxSpeed: 6.45,
    minGroundGap: 56,
    maxGroundGap: 114,
    minGroundWidth: 220,
    maxGroundWidth: 400,
    floatingPlatformChance: 0.28,
    movingPlatformChance: 0.12,
    coyoteBoost: 1,
    jumpBufferBoost: 1,
    obstacleDensityBase: 1,
  },
  mid: {
    start: 18000,
    end: 35000,
    baseSpeed: 4.75,
    maxSpeed: 7.4,
    minGroundGap: 64,
    maxGroundGap: 132,
    minGroundWidth: 200,
    maxGroundWidth: 350,
    floatingPlatformChance: 0.34,
    movingPlatformChance: 0.2,
    coyoteBoost: 0.95,
    jumpBufferBoost: 0.95,
    obstacleDensityBase: 1.16,
  },
  late: {
    start: 35000,
    end: 52000,
    baseSpeed: 5.45,
    maxSpeed: 8.25,
    minGroundGap: 74,
    maxGroundGap: 146,
    minGroundWidth: 176,
    maxGroundWidth: 316,
    floatingPlatformChance: 0.38,
    movingPlatformChance: 0.28,
    coyoteBoost: 0.9,
    jumpBufferBoost: 0.9,
    obstacleDensityBase: 1.3,
  },
};

const PRESETS: Record<DifficultyMode, DifficultyPreset> = {
  easy: {
    speedRampPerKm: 0.015,
    obstacleRampPerKm: 0.012,
    speedScale: 0.9,
    maxSpeedScale: 0.88,
    gapScale: 0.85,
    widthScale: 1.1,
    spacingScale: 1.18,
    assistScale: 1.2,
    movingObstacleBonus: -0.04,
  },
  normal: {
    speedRampPerKm: 0.022,
    obstacleRampPerKm: 0.019,
    speedScale: 1,
    maxSpeedScale: 1,
    gapScale: 1,
    widthScale: 1,
    spacingScale: 1,
    assistScale: 1,
    movingObstacleBonus: 0,
  },
  hard: {
    speedRampPerKm: 0.03,
    obstacleRampPerKm: 0.027,
    speedScale: 1.08,
    maxSpeedScale: 1.12,
    gapScale: 1.09,
    widthScale: 0.9,
    spacingScale: 0.88,
    assistScale: 0.8,
    movingObstacleBonus: 0.05,
  },
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const phaseProgress = (distance: number, phase: PhaseTuning) => clamp((distance - phase.start) / Math.max(1, phase.end - phase.start), 0, 1);

export class DifficultyManager {
  private mode: DifficultyMode = 'normal';

  setMode(mode: DifficultyMode) {
    this.mode = mode;
  }

  getMode() {
    return this.mode;
  }

  getPhase(distance: number): Phase {
    if (distance < PHASES.early.start) return 'beginner';
    if (distance < PHASES.mid.start) return 'early';
    if (distance < PHASES.late.start) return 'mid';
    return 'late';
  }

  getTuning(distance: number): DifficultyTuning {
    const preset = PRESETS[this.mode];
    const phase = this.getPhase(distance);
    const phaseConfig = PHASES[phase];
    const p = phaseProgress(distance, phaseConfig);

    // Core ramp: every 1000m applies a small multiplicative increase.
    const kmSteps = Math.floor(distance / 1000);
    const speedStepMultiplier = Math.min(1.9, Math.pow(1 + preset.speedRampPerKm, kmSteps));
    const obstacleStepMultiplier = Math.min(1.75, Math.pow(1 + preset.obstacleRampPerKm, kmSteps));

    // Fairness cap based on jump arc + reaction margin.
    const jumpArcDistance = 210;
    const baseGapMin = phaseConfig.minGroundGap * preset.gapScale;
    const baseGapMax = phaseConfig.maxGroundGap * preset.gapScale;
    const maxSafeGroundGap = clamp(
      Math.min(jumpArcDistance - (this.mode === 'easy' ? 52 : this.mode === 'normal' ? 42 : 34), baseGapMax),
      82,
      170
    );
    const minGroundGap = clamp(baseGapMin, 34, maxSafeGroundGap - 18);
    const maxGroundGap = clamp(baseGapMax, minGroundGap + 20, maxSafeGroundGap);

    const obstacleDensity = clamp(phaseConfig.obstacleDensityBase * obstacleStepMultiplier, 0.7, 1.75);
    const spacingBaseMin = lerp(640, 420, p);
    const spacingBaseMax = lerp(900, 620, p);
    const obstacleSpacingMin = clamp((spacingBaseMin / obstacleDensity) * preset.spacingScale, 260, 960);
    const obstacleSpacingMax = clamp((spacingBaseMax / obstacleDensity) * preset.spacingScale, obstacleSpacingMin + 80, 1160);

    const baseSpeed = clamp(
      (lerp(phaseConfig.baseSpeed, phaseConfig.baseSpeed + 0.55, p) * speedStepMultiplier) * preset.speedScale,
      2.8,
      9.2
    );
    const maxSpeed = clamp(
      (lerp(phaseConfig.maxSpeed, phaseConfig.maxSpeed + 0.75, p) * speedStepMultiplier) * preset.maxSpeedScale,
      4.2,
      11
    );

    return {
      phase,
      baseSpeed,
      maxSpeed,
      playerMaxForwardSpeed: clamp(lerp(5.8, 7.8, p) * preset.speedScale, 5.1, 8.8),
      playerMaxBackwardSpeed: clamp(lerp(2.9, 4.2, p), 2.4, 4.8),
      minGroundGap,
      maxGroundGap,
      maxSafeGroundGap,
      minGroundWidth: clamp(phaseConfig.minGroundWidth * preset.widthScale, 150, 520),
      maxGroundWidth: clamp(phaseConfig.maxGroundWidth * preset.widthScale, 220, 560),
      floatingPlatformChance: clamp(phaseConfig.floatingPlatformChance + (this.mode === 'easy' ? -0.03 : this.mode === 'hard' ? 0.03 : 0), 0.15, 0.5),
      obstacleSpacingMin,
      obstacleSpacingMax,
      obstacleDensity,
      movingPlatformChance: clamp(phaseConfig.movingPlatformChance + preset.movingObstacleBonus, 0.02, 0.38),
      movingPlatformSpeed: clamp(lerp(0.45, 1.6, p), 0.35, 2.1),
      coyoteTimeFrames: clamp((7.2 * phaseConfig.coyoteBoost) * preset.assistScale, 4.5, 11),
      jumpBufferFrames: clamp((6 * phaseConfig.jumpBufferBoost) * preset.assistScale, 4, 9),
      groundAccel: clamp(lerp(0.72, 0.9, p) * (this.mode === 'hard' ? 0.94 : 1), 0.62, 1.05),
      airAccel: clamp(lerp(0.42, 0.56, p) * (this.mode === 'easy' ? 1.1 : 1), 0.36, 0.68),
      groundFriction: clamp(lerp(1.5, 1.8, p) * (this.mode === 'hard' ? 0.9 : 1.08), 1.1, 2.3),
      airDrag: clamp(lerp(0.12, 0.16, p), 0.08, 0.2),
      brakingDecel: clamp(lerp(2.6, 3.2, p) * (this.mode === 'easy' ? 1.12 : this.mode === 'hard' ? 0.92 : 1), 2.2, 3.7),
    };
  }
}
