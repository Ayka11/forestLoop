# Forest Loop Odyssey

An endless, colourful platformer built with React, TypeScript, and Canvas 2D. Run through 9 hand-crafted biomes, collect resources, craft platforms, fight a boss, and unlock cosmetics along the way.

**Live:** https://forestloop.azurewebsites.net

---

## Game Modes

Choose your experience before each run from the main menu:

| Mode | Description |
|---|---|
| 🌿 **Endless** | Relaxed run. No enemies, no boss, no scenarios. Focus on flow, coins, and exploring biomes. |
| 🔥 **Adventure** | Full experience. Enemies, boss battles, challenge scenarios, Sky/Deep route choices, score ×3. |

The PLAY button turns **green** for Endless and **orange** for Adventure. Your choice is saved between sessions.

---

## Biome Progression

All 9 base biomes are now reachable through normal play. The three previously-orphaned biomes (Crystal, Autumn, Firefly) are woven between the original milestones.

| Distance | Biome | Notes |
|---|---|---|
| 0 m | **Enchanted Forest** | Always — every run starts here |
| 2 500 m | **Crystal Cave** | First magical shift |
| 5 000 m | **Moonlit Grove** | Night atmosphere begins |
| 7 500 m | **Autumn Forest** | Warm seasonal palette |
| 10 000 m | **Crystal Caverns** | Underground, dramatic lighting |
| 12 500 m | **Firefly Night** | Bioluminescent dense particles |
| 15 000 m | **Whispering Canopy** | High treetops, vertical emphasis |
| 20 000 m | **Ancient Ruins** | Stone and mystery |
| 25 000 m | **Starfall Meadow** | Cosmic climax biome |
| 27 500 m+ | **Cycle** | Random from all 9 base biomes, no immediate repeat |

Premium biomes (shop unlock): Candy · Frozen · Volcanic · Cloud

Biome transitions are a 3-second crossfade where both background sets render simultaneously at blended opacity.

---

## Difficulty

Three age-calibrated difficulty presets. Independent of Game Mode — you can play Adventure on Easy or Endless on Hard.

| | Easy — Ages 6–8 | Normal — Ages 9–11 | Hard — Ages 12–15 |
|---|---|---|---|
| Gap size | 45 % narrower | Baseline | 30 % wider |
| Stepping stones | Almost every gap | Most gaps | Rare |
| Enemy speed | 60 % | 100 % | 140 % |
| Enemy frequency | 40 % | 100 % | 160 % |
| First enemy | 600 m | 200 m | Immediately |
| Power-up rate | 1.8× | 1× | 0.65× |
| Jump trajectory guide | ✅ | ✅ | ❌ |
| Enemy warnings | ✅ | ✅ | ❌ |
| Safe opening | 1 800 m | 400 m | None |

---

## Adventure Mode — Feature Pacing

| Distance | What unlocks |
|---|---|
| 0–1 500 m | Open terrain — learn the controls |
| 1 500 m | First challenge scenario |
| 2 000 m | First route choice (Sky / Main / Deep) |
| Every 400–600 m | New scenario (flow zone between challenges) |
| Every 2 000–2 500 m | Route choice |
| 5 000 m | **Bramble King boss** (tutorial version — 2 phases, slower) |
| Every 5 000 m after | Full Bramble King (3 phases) |

---

## Bramble King Boss (Adventure mode)

Spawns at **5 000 m**. First encounter is a tutorial boss: 2 phases only, slower attack cadence. Subsequent encounters are the full 3-phase fight.

| Phase | Attack | How to beat |
|---|---|---|
| 1 | Thorn sweeps (2 rows) + 5-way arcing spray | Stomp his head (5 HP each). Jump over the two-row sweeps. |
| 2 | Ground slam → shockwaves left and right | Jump over both shockwaves. Keep stomping. |
| 3 *(full fight only)* | 3 glowing seeds appear across the arena | Collect all 3 seeds — they auto-fire at boss for the kill. Dodge while gathering. |

**Reward:** 100 Leaf Tokens + **Bramble Fox** skin unlocked permanently.

---

## Route System (Adventure mode)

First route choice at **2 000 m**, then every 2 000–2 500 m. Each route lasts **500 m** before rejoining the main path.

| Route | Height offset | Emphasis | Rewards |
|---|---|---|---|
| ☁️ Sky | –120 px (higher) | Precision jumping, gliding | Extra coins, rare power-ups |
| 🌿 Main | Baseline | Balanced | Standard |
| 🕳️ Deep | +80 px (lower) | Exploration | Hidden chests, bonus tokens (1.5×) |

---

## Scenarios (Adventure mode, 8 types)

First scenario at **1 500 m**, spaced **400–600 m** apart for breathing room between challenges.

Bounce Chain · Crumbling Gauntlet · Swing Gap · Elevator Garden · Mushroom Steps · Breaking Bridge · Enemy Gauntlet · Sky Highway

---

## Education Mode

Toggle in Settings. Tips appear **once per run** at the natural moment each mechanic first appears — not on a timer, not on a fixed distance.

| Trigger | Card shown |
|---|---|
| First mushroom platform | Bouncy Mushroom |
| First crumbling platform | Crumbling Platform |
| First enemy | Enemy Ahead |
| First power-up collected | Power-Up |
| First scenario | Challenge Ahead |
| First route choice | Route Choice |
| Boss phase 1 spawn | Bramble King Phase 1 |
| Boss phase 2 | Bramble King Phase 2 |
| Boss phase 3 | Bramble King Phase 3 |
| Boss defeated | Defeat reward |
| Each new collectible type | Item-specific card |

Cards are cleared when returning to the main menu.

---

## Painterly Background System

**Sky (rendered before all layers):**
- 6-stop biome-specific gradient (unique palette per biome)
- 3 parallax volumetric cloud layers (far 0.03×, mid 0.10×, near 0.22×)
- Animated god rays for day/enchanted biomes
- Sun or moon with animated rays
- Horizon warm-glow band

**4 parallax background layers:**

| Layer | Content | Parallax |
|---|---|---|
| 0 front | Bushes · flowers · mushrooms (60 elements) | 0.45× |
| 1 mid | Trees / fireflies (35 elements) | 0.25× |
| 2 far | Mountains + distant trees (30 elements) | 0.08× |
| 3 sky | Clouds (15 elements) | 0.03× |

**Atmosphere (per-biome):** ground mist · falling petals · pollen motes · stardust · fireflies · god rays

---

## Power-ups (16)

Star · Mushroom · Fire Flower · Leaf Wings · Speed Boots · Shield · Time Slow · Magnet · Double Jump · Ghost Phase · Acorn Shield · Foxfire Dash · Petal Float · Root Snare · Mushroom Bounce · Starlight Compass

---

## Gameplay Features

- Free bidirectional movement (left/right/stop)
- Charged variable-height jump (hold to charge), coyote time 180 ms, jump-buffer 180 ms
- Combo multiplier up to 5× — collect items in sequence
- Crafting: spend resources mid-run to place bridges, bouncy pads, ramps, walls
- Adventure events: Golden Deer · Fairy Ring · Fallen Star · Wishing Well · Bridge Troll
- Checkpoints every 2 000 m with run-resume

---

## Shop

29+ items: Skins · Hats · Pets · Boosts · Blocks — purchased with Leaf Tokens.

Adventure-exclusive unlocks:
- **Bramble Fox** 🌿 — defeat the Bramble King
- **Thornling Buddy** 🌵 — survive 1 000 m in Adventure mode

---

## Daily Challenges & Streaks

3–5 challenges per day (2 easy · 2 medium · 1 hard · optional weekend/monthly bonus), rotating daily. Earn Leaf Tokens on completion.

---

## Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move right | `→` / `D` | Joystick right |
| Run | `Shift + →` | — |
| Move left | `←` / `A` | Joystick left |
| Jump / charged jump | `Space` / `↑` / `W` (hold) | JUMP button (hold) |
| Double jump | `Space` again mid-air | JUMP again mid-air |
| Glide (Leaf Wings) | Hold `Space` in air | Hold JUMP |
| Use stored power-up | `E` | Power-up button |
| Pause | `Escape` | Pause button |
| Dash | `Alt + →` | — |

---

## Tech Stack

| | |
|---|---|
| React 18 + TypeScript | UI, state management, contexts |
| Canvas 2D API | All game rendering — no WebGL |
| Vite | Build tool and dev server |
| Tailwind CSS | UI component styling |
| Supabase | Leaderboard and optional auth |
| Azure Web Apps | Hosting, CI/CD via GitHub Actions |

Deploy triggers automatically on push to the `updated` branch.

---

## Development

```bash
npm install
npm run dev      # dev server → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

### Project structure

```
src/
  game/
    engine.ts      # GameEngine — physics, rendering, boss, terrain, biome transitions
    types.ts       # Shared types, DIFFICULTY_CONFIGS, BIOME_COLORS, AppGameMode
    audio.ts       # Web Audio API sound effects
  components/game/
    GameCanvas.tsx              # Canvas mount, engine lifecycle, mode mapping
    GameHUD.tsx                 # In-game HUD (score, distance, combo, route badge)
    MainMenu.tsx                # Main menu — mode selector (Endless/Adventure) + difficulty
    EducationOverlay.tsx        # Per-mechanic and per-boss-phase education cards
    GameOverScreen.tsx          # End-of-run summary
    PauseMenu.tsx               # Pause overlay
    LevelUpToast.tsx            # Biome transition notification
    ShopModal.tsx
    AchievementsModal.tsx
    DailyChallenges.tsx
    Leaderboard.tsx
  contexts/
    GameContext.tsx   # Global state: tokens, high score, difficulty, gameMode, avatar, shop
```
