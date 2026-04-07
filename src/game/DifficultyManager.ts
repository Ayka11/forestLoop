import { DifficultyMode } from './types';

export interface DifficultyTuning {
  baseSpeed: number;
  maxSpeed: number;
  playerMaxForwardSpeed: number;
  playerMaxBackwardSpeed: number;
  minGroundGap: number;
  maxGroundGap: number;
  minGroundWidth: number;
  maxGroundWidth: number;
  floatingPlatformChance: number;
  obstacleSpacingMin: number;
  obstacleSpacingMax: number;
  movingPlatformChance: number;
  movingPlatformSpeed: number;
}

type DifficultyPreset = {
  baseSpeedOffset: number;
  maxSpeedOffset: number;
  minGapOffset: number;
  maxGapOffset: number;
  obstacleSpacingOffset: number;
  movingPlatformOffset: number;
};

const PRESETS: Record<DifficultyMode, DifficultyPreset> = {
  easy: {
    baseSpeedOffset: -0.45,
    maxSpeedOffset: -0.8,
    minGapOffset: -18,
    maxGapOffset: -30,
    obstacleSpacingOffset: 120,
    movingPlatformOffset: -0.08,
  },
  normal: {
    baseSpeedOffset: 0,
    maxSpeedOffset: 0,
    minGapOffset: 0,
    maxGapOffset: 0,
    obstacleSpacingOffset: 0,
    movingPlatformOffset: 0,
  },
  hard: {
    baseSpeedOffset: 0.45,
    maxSpeedOffset: 1.2,
    minGapOffset: 12,
    maxGapOffset: 28,
    obstacleSpacingOffset: -110,
    movingPlatformOffset: 0.08,
  },
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

export class DifficultyManager {
  private mode: DifficultyMode = 'normal';

  setMode(mode: DifficultyMode) {
    this.mode = mode;
  }

  getMode() {
    return this.mode;
  }

  getTuning(distance: number): DifficultyTuning {
    const preset = PRESETS[this.mode];
    const progress = smoothstep(distance / 12000);

    const baseSpeed = lerp(3.6, 6.7, progress) + preset.baseSpeedOffset;
    const maxSpeed = lerp(5.2, 9.4, progress) + preset.maxSpeedOffset;

    // Gap growth is smooth and intentionally conservative to avoid impossible jumps.
    const minGroundGap = clamp(lerp(56, 98, progress) + preset.minGapOffset, 36, 130);
    const maxGroundGap = clamp(lerp(122, 175, progress) + preset.maxGapOffset, 88, 205);

    // Obstacle spacing keeps reaction windows fair at high speeds.
    const obstacleSpacingMin = clamp(lerp(520, 365, progress) + preset.obstacleSpacingOffset, 285, 740);
    const obstacleSpacingMax = clamp(lerp(820, 600, progress) + preset.obstacleSpacingOffset, 440, 960);

    return {
      baseSpeed,
      maxSpeed,
      playerMaxForwardSpeed: clamp(lerp(5.5, 7.2, progress), 5.2, 8.5),
      playerMaxBackwardSpeed: clamp(lerp(3, 4, progress), 2.6, 4.5),
      minGroundGap,
      maxGroundGap,
      minGroundWidth: clamp(lerp(240, 190, progress), 160, 280),
      maxGroundWidth: clamp(lerp(430, 300, progress), 250, 500),
      floatingPlatformChance: clamp(lerp(0.28, 0.44, progress), 0.2, 0.5),
      obstacleSpacingMin,
      obstacleSpacingMax,
      movingPlatformChance: clamp(lerp(0.08, 0.25, progress) + preset.movingPlatformOffset, 0.03, 0.34),
      movingPlatformSpeed: clamp(lerp(0.45, 1.35, progress), 0.35, 1.8),
    };
  }
}
