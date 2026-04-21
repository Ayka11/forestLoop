import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from '@/game/engine';
import { DailyChallenge, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/game/types';
import { useGame } from '@/contexts/GameContext';
import EducationOverlay from './EducationOverlay';

export default function GameCanvas() {
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return true;
    // Landscape if width/height ratio is at least 1.2
    return window.innerWidth / window.innerHeight > 1.2;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { engine, avatar, updateGameState, updateChallengeProgress, setScreen, saveProgress, showCheckpointToast, savedRunSnapshot, clearSavedProgress, pendingResume, markResumeConsumed, educationOverlay, showEducationOverlay, hideEducationOverlay } = useGame();
  const challengeProgressRef = useRef(updateChallengeProgress);
  const updateGameStateRef = useRef(updateGameState);
  const setScreenRef = useRef(setScreen);
  const saveProgressRef = useRef(saveProgress);
  const showCheckpointToastRef = useRef(showCheckpointToast);
  const clearSavedProgressRef = useRef(clearSavedProgress);

  // Combine all ref updates into a single useEffect to prevent random restarts
  useEffect(() => {
    challengeProgressRef.current = updateChallengeProgress;
    updateGameStateRef.current = updateGameState;
    setScreenRef.current = setScreen;
    saveProgressRef.current = saveProgress;
    showCheckpointToastRef.current = showCheckpointToast;
    clearSavedProgressRef.current = clearSavedProgress;
  }, [updateChallengeProgress, updateGameState, setScreen, saveProgress, showCheckpointToast, clearSavedProgress]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ge = new GameEngine(canvasRef.current);
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

    ge.setMovementMode('idle');
    const shouldResume = pendingResume && savedRunSnapshot;
    ge.start(shouldResume ? savedRunSnapshot : undefined);
    if (shouldResume) {
      clearSavedProgressRef.current?.();
      markResumeConsumed();
    }

    const handleResize = () => ge.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ge.destroy();
      engine.current = null;
    };
  }, [avatar, savedRunSnapshot, pendingResume, markResumeConsumed]);

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
        engine.current.activateSuperJump(); // Enhanced jump with Shift
      }
      // Regular movement
      else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
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
        // Ctrl+R: Open rename dialog (for character/avatar customization)
        e.preventDefault();
        setScreenRef.current?.('avatar');
      } else if (e.code === 'KeyN' && e.ctrlKey) {
        // Ctrl+N: Change player name
        e.preventDefault();
        const currentName = localStorage.getItem('flo_playerName') || '';
        const newName = prompt('Enter your name:', currentName);
        if (newName && newName.trim()) {
          localStorage.setItem('flo_playerName', newName.trim());
        }
      } else if (e.code === 'KeyS' && e.ctrlKey) {
        // Ctrl+S: Open shop for item customization
        e.preventDefault();
        setScreenRef.current?.('shop');
      } else if (e.code === 'KeyE' && e.ctrlKey) {
        // Ctrl+E: Edit/rename current equipped items
        e.preventDefault();
        setScreenRef.current?.('avatar');
      } else if (e.code === 'KeyC' && e.ctrlKey) {
        // Ctrl+C: Character customization
        e.preventDefault();
        setScreenRef.current?.('avatar');
      } else if (e.code === 'KeyI' && e.ctrlKey) {
        // Ctrl+I: Toggle inventory/items rename
        e.preventDefault();
        setScreenRef.current?.(engine.current.state.isPaused ? 'playing' : 'paused');
      } else if (e.code === 'F2') {
        // F2: Quick rename player name
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
      if (
        ['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'KeyS', 'ArrowDown'].includes(e.code)
      ) {
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
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth / window.innerHeight > 1.2);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Touch controls
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

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="block cursor-pointer select-none"
        style={{ imageRendering: 'auto', width: '100%', height: '100%', maxHeight: '100%', aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
      {!isLandscape && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white text-center px-6">
          For the best experience, rotate your device to landscape (width/height ratio &gt; 1.2).
        </div>
      )}
      <EducationOverlay
        visible={educationOverlay.visible}
        item={educationOverlay.item}
        position={educationOverlay.position}
      />
    </div>
  );
}
