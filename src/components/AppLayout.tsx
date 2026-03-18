import React from 'react';
import { GameProvider, useGame } from '@/contexts/GameContext';
import GameCanvas from '@/components/game/GameCanvas';
import GameHUD from '@/components/game/GameHUD';
import MainMenu from '@/components/game/MainMenu';
import ShopModal from '@/components/game/ShopModal';
import AvatarCustomizer from '@/components/game/AvatarCustomizer';
import CraftingPanel from '@/components/game/CraftingPanel';
import GameOverScreen from '@/components/game/GameOverScreen';
import PauseMenu from '@/components/game/PauseMenu';
import AchievementsModal from '@/components/game/AchievementsModal';
import DailyChallenges from '@/components/game/DailyChallenges';
import Leaderboard from '@/components/game/Leaderboard';

function GameApp() {
  const { screen } = useGame();
  const isInGame = screen === 'playing' || screen === 'paused' || screen === 'crafting' || screen === 'gameover';
  console.log('GameApp screen state:', screen);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ fontFamily: "'Fredoka', 'Comic Neue', sans-serif" }}>
      {/* Force GameCanvas to always render for testing */}
      <div className="absolute inset-0 flex items-center justify-center">
        <GameCanvas />
      </div>

      {/* UI Overlays */}
      {screen === 'menu' && <MainMenu />}
      {isInGame && <GameHUD />}
      {screen === 'paused' && <PauseMenu />}
      {screen === 'gameover' && <GameOverScreen />}
      {screen === 'crafting' && <CraftingPanel />}
      {screen === 'shop' && <ShopModal />}
      {screen === 'avatar' && <AvatarCustomizer />}
      {screen === 'achievements' && <AchievementsModal />}
      {screen === 'daily' && <DailyChallenges />}
      {screen === 'leaderboard' && <Leaderboard />}
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
