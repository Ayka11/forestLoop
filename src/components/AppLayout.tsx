import React, { Suspense, lazy } from 'react';
import { GameProvider, useGame } from '@/contexts/GameContext';
import GameCanvas from '@/components/game/GameCanvas';
import GameHUD from '@/components/game/GameHUD';

// Lazy load heavy components
const MainMenu = lazy(() => import('@/components/game/MainMenu'));
const ShopModal = lazy(() => import('@/components/game/ShopModal'));
const AvatarCustomizer = lazy(() => import('@/components/game/AvatarCustomizer'));
const CraftingPanel = lazy(() => import('@/components/game/CraftingPanel'));
const GameOverScreen = lazy(() => import('@/components/game/GameOverScreen'));
const PauseMenu = lazy(() => import('@/components/game/PauseMenu'));
const AchievementsModal = lazy(() => import('@/components/game/AchievementsModal'));
const DailyChallenges = lazy(() => import('@/components/game/DailyChallenges'));
const Leaderboard = lazy(() => import('@/components/game/Leaderboard'));

function GameApp() {
  const { screen } = useGame();
  const isInGame = screen === 'playing' || screen === 'paused' || screen === 'crafting';

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      {/* Force GameCanvas to always render for testing */}
      <div className="absolute inset-0 flex items-center justify-center">
        <GameCanvas />
      </div>

      {/* UI Overlays */}
      {screen === 'menu' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <MainMenu />
        </Suspense>
      )}
      {isInGame && <GameHUD />}
      {screen === 'paused' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <PauseMenu />
        </Suspense>
      )}
      {screen === 'gameover' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <GameOverScreen />
        </Suspense>
      )}
      {screen === 'crafting' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <CraftingPanel />
        </Suspense>
      )}
      {screen === 'shop' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <ShopModal />
        </Suspense>
      )}
      {screen === 'avatar' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <AvatarCustomizer />
        </Suspense>
      )}
      {screen === 'achievements' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <AchievementsModal />
        </Suspense>
      )}
      {screen === 'daily' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <DailyChallenges />
        </Suspense>
      )}
      {screen === 'leaderboard' && (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white">Loading...</div></div>}>
          <Leaderboard />
        </Suspense>
      )}
    </div>
  );
}

const AppLayout: React.FC = () => {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
};

export default AppLayout;
