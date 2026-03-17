import React, { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/game/engine';
import { useGame } from '@/contexts/GameContext';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { engine, avatar, updateGameState, setScreen } = useGame();

  useEffect(() => {
    if (!canvasRef.current) return;
    const ge = new GameEngine(canvasRef.current);
    ge.setAvatar(avatar);
    engine.current = ge;

    ge.onStateChange = (state) => {
      updateGameState(state);
    };

    ge.onGameOver = () => {
      setScreen('gameover');
    };

    ge.onCheckpoint = () => {
      // Could show checkpoint notification
    };

    const handleResize = () => ge.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ge.destroy();
      engine.current = null;
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engine.current) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        engine.current.jump();
      }
      if (e.code === 'Escape') {
        engine.current.pause();
        setScreen(engine.current.state.isPaused ? 'paused' : 'playing');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engine.current) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        engine.current.releaseJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    engine.current?.jump();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    engine.current?.releaseJump();
  }, []);

  const handleMouseDown = useCallback(() => {
    engine.current?.jump();
  }, []);

  const handleMouseUp = useCallback(() => {
    engine.current?.releaseJump();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block mx-auto cursor-pointer select-none"
      style={{ imageRendering: 'auto', maxWidth: '100%', maxHeight: '100%' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
}
