import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/game/engine';
import { useGame } from '@/contexts/GameContext';
import EducationOverlay from './EducationOverlay';
import TouchControls from './TouchControls';
import LevelUpToast from './LevelUpToast';
import LevelCompletionReward from './LevelCompletionReward';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const { engine, avatar, updateGameState, setScreen, saveProgress, showCheckpointToast, savedRunSnapshot, clearSavedProgress, pendingResume, markResumeConsumed, educationOverlay, showEducationOverlay, hideEducationOverlay, difficulty } = useGame();
  const updateGameStateRef = useRef(updateGameState);
  const setScreenRef = useRef(setScreen);

  // Level-up toast state
  const [levelUpToast, setLevelUpToast] = useState({
    visible: false,
    level: 1,
    message: '',
    color: '#00FF00'
  });

  // Level completion reward state
  const [levelCompletion, setLevelCompletion] = useState({
    visible: false,
    level: 1,
    bonusData: undefined as any,
  });

  // Resume game function for level-up notifications
  const handleResumeGame = useCallback(() => {
    if (engine.current?.state.isPaused) {
      engine.current.resume();
      setScreenRef.current?.('playing');
    }
  }, []);
  const saveProgressRef = useRef(saveProgress);
  const showCheckpointToastRef = useRef(showCheckpointToast);
  const clearSavedProgressRef = useRef(clearSavedProgress);

  useEffect(() => {
    updateGameStateRef.current = updateGameState;
    setScreenRef.current = setScreen;
    saveProgressRef.current = saveProgress;
    showCheckpointToastRef.current = showCheckpointToast;
    clearSavedProgressRef.current = clearSavedProgress;
  }, [updateGameState, setScreen, saveProgress, showCheckpointToast, clearSavedProgress]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ge = new GameEngine(canvasRef.current, difficulty);
    ge.setAvatar(avatar);
    engine.current = ge;

    ge.onStateChange = (state) => {
      updateGameStateRef.current?.(state);
    };

    ge.onCheckpoint = () => {
      showCheckpointToastRef.current?.();
      saveProgressRef.current?.();
    };

    ge.onGameOver = () => {
      setScreenRef.current?.('gameover');
    };

    ge.onLevelUp = (level: number) => {
      const levelConfig = {
        2: { message: 'LEVEL UP!', color: '#00FF00' },
        3: { message: 'ADVANCED!', color: '#00BFFF' },
        4: { message: 'MASTER!', color: '#FF00FF' },
        5: { message: 'LEGENDARY!', color: '#FFD700' }
      };

      const config = levelConfig[level as keyof typeof levelConfig] || levelConfig[2];
      setLevelUpToast({
        visible: true,
        level,
        message: config.message,
        color: config.color
      });
    };

    ge.showEducationOverlay = (item: string, position: { x: number; y: number }) => {
      showEducationOverlay(item, position);
    };

    ge.hideEducationOverlay = () => {
      hideEducationOverlay();
    };

    ge.setMovementMode('idle');
    const shouldResume = pendingResume && savedRunSnapshot;
    ge.start(shouldResume ? savedRunSnapshot : undefined);
    if (shouldResume) {
      clearSavedProgressRef.current?.();
      markResumeConsumed();
    }

    const resize = () => ge.resize();
    resize();
    window.addEventListener('resize', resize);

    let observer: ResizeObserver | null = null;
    const parent = canvasRef.current.parentElement;
    if (parent && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => resize());
      observer.observe(parent);
    }

    setCanvasReady(true);

    return () => {
      window.removeEventListener('resize', resize);
      observer?.disconnect();
      ge.destroy();
      engine.current = null;
      setCanvasReady(false);
    };
  }, [avatar, difficulty, savedRunSnapshot, pendingResume, markResumeConsumed, clearSavedProgressRef, engine, hideEducationOverlay, showEducationOverlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engine.current) return;
      let moved = false;

      // Special ability combinations
      if (e.ctrlKey && e.shiftKey) {
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          engine.current.activateSuperSpeed();
          moved = true;
        } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          engine.current.activateSuperJump();
        }
      } else if (e.altKey && (e.code === 'ArrowRight' || e.code === 'KeyD')) {
        e.preventDefault();
        engine.current.activateDash();
        moved = true;
      } else if (e.shiftKey && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW')) {
        e.preventDefault();
        engine.current.activateSuperJump();
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        engine.current.jumpPress();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        engine.current.setMovementMode('reverse');
        moved = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        engine.current.setMovementMode(e.shiftKey ? 'run' : 'walk');
        moved = true;
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        e.preventDefault();
        engine.current.setMovementMode('idle');
      } else if (e.code === 'Escape') {
        engine.current.pause();
        setScreenRef.current?.(engine.current.state.isPaused ? 'paused' : 'playing');
      } else if (e.code === 'KeyR' && e.ctrlKey) {
        e.preventDefault();
        setScreenRef.current?.('avatar');
      } else if (e.code === 'KeyN' && e.ctrlKey) {
        e.preventDefault();
        const currentName = localStorage.getItem('flo_playerName') || '';
        const newName = prompt('Enter your name:', currentName);
        if (newName && newName.trim()) {
          localStorage.setItem('flo_playerName', newName.trim());
        }
      } else if (e.code === 'KeyS' && e.ctrlKey) {
        e.preventDefault();
        setScreenRef.current?.('shop');
      } else if (e.code === 'KeyE' && e.ctrlKey) {
        e.preventDefault();
        setScreenRef.current?.('avatar');
      } else if (e.code === 'KeyC' && e.ctrlKey) {
        e.preventDefault();
        setScreenRef.current?.('avatar');
      } else if (e.code === 'KeyI' && e.ctrlKey) {
        e.preventDefault();
        setScreenRef.current?.(engine.current.state.isPaused ? 'playing' : 'paused');
      } else if (e.code === 'F2') {
        e.preventDefault();
        const currentName = localStorage.getItem('flo_playerName') || '';
        const newName = prompt('Quick rename:', currentName);
        if (newName && newName.trim()) {
          localStorage.setItem('flo_playerName', newName.trim());
        }
      }

      if (!moved && !['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        engine.current.setMovementMode('idle');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engine.current) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        engine.current.releaseJump();
      }
      if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'KeyS', 'ArrowDown'].includes(e.code)) {
        engine.current.setMovementMode('idle');
      }
    };

    const handleBlur = () => {
      engine.current?.setMovementMode('idle');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [engine]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    engine.current?.jumpPress();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    engine.current?.releaseJump();
  }, []);

  const handleMouseDown = useCallback(() => {
    engine.current?.jumpPress();
  }, []);

  const handleMouseUp = useCallback(() => {
    engine.current?.releaseJump();
  }, []);

  const handleMoveLeft = useCallback((e?: React.TouchEvent) => {
    e?.preventDefault();
    engine.current?.setMovementMode('reverse');
  }, []);

  const handleMoveRight = useCallback((e?: React.TouchEvent) => {
    e?.preventDefault();
    engine.current?.setMovementMode('walk');
  }, []);

  const handleStopMoving = useCallback((e?: React.TouchEvent) => {
    e?.preventDefault();
    engine.current?.setMovementMode('idle');
  }, []);

  const handleTouchJump = useCallback((e?: React.TouchEvent) => {
    e?.preventDefault();
    engine.current?.jumpPress();
  }, []);

  const handleTouchRelease = useCallback((e?: React.TouchEvent) => {
    e?.preventDefault();
    engine.current?.releaseJump();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-pointer select-none touch-none"
        style={{ imageRendering: 'auto' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
      <EducationOverlay
        visible={educationOverlay.visible}
        item={educationOverlay.item}
        position={educationOverlay.position}
      />
      <TouchControls
        onMoveLeft={handleMoveLeft}
        onMoveRight={handleMoveRight}
        onJump={handleTouchJump}
        onStopMoving={handleStopMoving}
        onReleaseJump={handleTouchRelease}
        enabled={canvasReady}
      />
      <LevelUpToast
        visible={levelUpToast.visible}
        level={levelUpToast.level}
        message={levelUpToast.message}
        color={levelUpToast.color}
        onComplete={() => setLevelUpToast(prev => ({ ...prev, visible: false }))}
        onResumeGame={handleResumeGame}
      />
      <LevelCompletionReward
        visible={levelCompletion.visible}
        level={levelCompletion.level}
        bonusData={levelCompletion.bonusData}
        onComplete={() => setLevelCompletion(prev => ({ ...prev, visible: false }))}
        onContinue={handleResumeGame}
      />
    </div>
  );
}
