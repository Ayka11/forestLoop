import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Info, Sparkles } from 'lucide-react';

// Covers every collectible type and power-up in Collectible['type'] and PowerUpType.
const EDUCATION_CONTENT: Record<string, { title: string; icon: string; description: string; tip: string }> = {
  // ── Resources ────────────────────────────────────────────────────────────────
  leafToken: {
    title: 'Leaf Token',
    icon: '🍃',
    description: 'The main currency of Forest Loop.',
    tip: 'Spend tokens in the Shop on skins, hats, pets, and boosts!',
  },
  wood: {
    title: 'Wood',
    icon: '🪵',
    description: 'A crafting resource.',
    tip: 'Craft a Bridge (3 wood) to cross wide gaps safely.',
  },
  stone: {
    title: 'Stone',
    icon: '🪨',
    description: 'A sturdy crafting resource.',
    tip: 'Craft a Speed Ramp (2 stone + 1 wood) to launch forward fast.',
  },
  flower: {
    title: 'Flower',
    icon: '🌸',
    description: 'A delicate crafting resource.',
    tip: 'Craft a Bouncy Pad (2 flowers + 1 leaf) for a super-high jump!',
  },
  leaf: {
    title: 'Leaf',
    icon: '🍂',
    description: 'A light crafting resource.',
    tip: 'Used alongside flowers for the Bouncy Pad recipe.',
  },

  // ── Classic power-ups ────────────────────────────────────────────────────────
  mushroom_powerup: {
    title: 'Super Mushroom',
    icon: '🍄',
    description: 'Grow bigger and stronger for 10 seconds.',
    tip: 'Smash through smaller obstacles while super-sized!',
  },
  star: {
    title: 'Star Power',
    icon: '⭐',
    description: 'Full invincibility — nothing can hurt you.',
    tip: 'Run straight through enemies and hazards. Score multiplier stays active!',
  },
  fireFlower: {
    title: 'Fire Flower',
    icon: '🔥',
    description: 'Shoot fireballs at enemies.',
    tip: 'Tap jump while running to launch a fireball forward.',
  },
  leafWings: {
    title: 'Leaf Wings',
    icon: '🌿',
    description: 'Glide through the air.',
    tip: 'Hold jump after a leap to slow your fall and cover huge distances.',
  },
  speedBoots: {
    title: 'Speed Boots',
    icon: '👟',
    description: 'Run faster and jump higher for 10 seconds.',
    tip: 'Great for clearing long gap sequences quickly.',
  },
  shield: {
    title: 'Shield',
    icon: '🛡️',
    description: 'Absorbs one hit from any enemy or hazard.',
    tip: 'The shield breaks on the first damage — stay alert afterwards!',
  },
  timeSlow: {
    title: 'Time Slow',
    icon: '⏳',
    description: 'Slows the world around you.',
    tip: 'Enemies move at half speed — perfect for tricky sections.',
  },
  magnet: {
    title: 'Token Magnet',
    icon: '🧲',
    description: 'Pulls nearby Leaf Tokens to you automatically.',
    tip: 'You don\'t need to land on tokens — they fly to you!',
  },
  doubleJump: {
    title: 'Double Jump',
    icon: '⬆️',
    description: 'Grants one extra mid-air jump.',
    tip: 'Tap jump again at the peak of your arc to reach high platforms.',
  },
  ghostPhase: {
    title: 'Ghost Phase',
    icon: '👻',
    description: 'Pass through solid obstacles for 8 seconds.',
    tip: 'Run straight through enemies — they can\'t touch you!',
  },

  // ── Forest power-ups ─────────────────────────────────────────────────────────
  acornShield: {
    title: 'Acorn Shield',
    icon: '🌰',
    description: 'A nature shield that absorbs two hits.',
    tip: 'Stronger than a regular shield — it cracks before breaking!',
  },
  foxfireDash: {
    title: 'Foxfire Dash',
    icon: '🦊',
    description: 'Blaze forward with a fiery dash.',
    tip: 'Dash through enemies and gaps in a burst of speed.',
  },
  petalFloat: {
    title: 'Petal Float',
    icon: '🌺',
    description: 'Petal wings carry you on the breeze.',
    tip: 'Tap and hold jump to float gently — covers the most horizontal distance.',
  },
  rootSnare: {
    title: 'Root Snare',
    icon: '🌱',
    description: 'Briefly roots approaching enemies in place.',
    tip: 'Enemies freeze for a few seconds — use the window to jump past them.',
  },
  mushroomBounce: {
    title: 'Mushroom Bounce',
    icon: '🍄',
    description: 'Your next 3 landings give a super-bounce.',
    tip: 'Land on any surface and spring sky-high — chain platforms easily!',
  },
  starlightCompass: {
    title: 'Starlight Compass',
    icon: '🧭',
    description: 'Reveals hidden items and secret paths.',
    tip: 'Rare tokens and hidden collectibles glow brightly while active.',
  },

  // ── Special collectibles ─────────────────────────────────────────────────────
  treasureCache: {
    title: 'Treasure Cache',
    icon: '💎',
    description: 'A hidden stash of Leaf Tokens.',
    tip: 'Worth 5× a normal token. Seek them out!',
  },

  // ── Mechanics (shown on first encounter) ─────────────────────────────────────
  firstMushroom: {
    title: 'Bouncy Mushroom',
    icon: '🍄',
    description: 'Mushroom platforms launch you high into the air!',
    tip: 'Time your jump as you leave the mushroom to reach secret platforms above.',
  },
  firstCrumbling: {
    title: 'Crumbling Platform',
    icon: '💥',
    description: 'This platform crumbles 1 second after you land.',
    tip: 'Keep moving! Pause too long and you\'ll fall through.',
  },
  firstEnemy: {
    title: 'Enemy Ahead!',
    icon: '🐾',
    description: 'Enemies patrol the forest path.',
    tip: 'Jump over them or bounce on top to defeat them. Getting hit costs a life!',
  },
  firstRouteChoice: {
    title: 'Route Choice!',
    icon: '🛤️',
    description: 'Two paths diverge ahead — Sky or Deep.',
    tip: 'Sky routes have more coins and rare power-ups. Deep routes hide secret chests and bonus tokens. Choose fast!',
  },
  firstPowerUp: {
    title: 'Power-Up!',
    icon: '✨',
    description: 'You collected your first power-up!',
    tip: 'Power-ups activate instantly and last several seconds. Look for glowing buds in the forest.',
  },
  firstScenario: {
    title: 'Challenge Ahead',
    icon: '⚠️',
    description: 'A tricky obstacle sequence is coming up!',
    tip: 'Take it slow — use double-jump and glide to navigate through safely.',
  },

  // ── Boss encounter (Hard difficulty) ─────────────────────────────────────────
  bossPhase1: {
    title: 'Bramble King — Phase 1',
    icon: '👑',
    description: 'The Bramble King fires thorn sweeps and arcing sprays.',
    tip: 'Jump on his head to deal 5 HP damage. Avoid the two-row thorn sweeps by jumping at the right moment!',
  },
  bossPhase2: {
    title: 'Bramble King — Phase 2',
    icon: '👑',
    description: 'He slams the ground, sending shockwaves left and right.',
    tip: 'Jump over both shockwaves — they travel in opposite directions. Keep stomping his head between slams!',
  },
  bossPhase3: {
    title: 'Bramble King — Phase 3',
    icon: '👑',
    description: '3 glowing seeds appear across the arena.',
    tip: 'Collect all 3 seeds — they fly back at the boss and deal the killing blow. Dodge his projectiles while you gather them!',
  },
  bossDefeated: {
    title: 'Bramble King Defeated!',
    icon: '🏆',
    description: 'You beat the Bramble King and earned 100 Leaf Tokens.',
    tip: 'The Bramble Fox skin is now unlocked in the Shop. The full 3-phase boss respawns every 5 000 m — keep running!',
  },
};

interface EducationOverlayProps {
  visible: boolean;
  item: string;
  position: { x: number; y: number };
}

export default function EducationOverlay({ visible, item }: EducationOverlayProps) {
  const { educationEnabled } = useGame();
  if (!educationEnabled || !visible) return null;

  const content = EDUCATION_CONTENT[item];
  if (!content) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none max-w-[min(65vw,15rem)] rounded-2xl border border-white/15 bg-slate-950/90 p-2.5 text-white shadow-2xl backdrop-blur-md"
      style={{ right: '1rem', top: '6.2rem' }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base leading-none">{content.icon}</span>
        <h3 className="font-black text-xs">{content.title}</h3>
        <Info size={12} className="text-blue-400 flex-shrink-0 ml-auto" />
      </div>

      <p className="mb-1.5 text-[11px] text-white/70 leading-snug">{content.description}</p>

      <div className="flex items-start gap-1 text-[10px] text-yellow-300 leading-snug">
        <Sparkles size={10} className="flex-shrink-0 mt-0.5" />
        <span>{content.tip}</span>
      </div>
    </div>
  );
}
