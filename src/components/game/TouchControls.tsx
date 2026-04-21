import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TouchControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onStopMoving: () => void;
  onReleaseJump: () => void;
}

export default function TouchControls({ onMoveLeft, onMoveRight, onJump, onStopMoving, onReleaseJump }: TouchControlsProps) {
  const isMobile = useIsMobile();
  const [isMovingLeft, setIsMovingLeft] = useState(false);
  const [isMovingRight, setIsMovingRight] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 50, y: 50 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Handle joystick movement
  const handleJoystickStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!joystickRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    touchStartRef.current = { x: clientX, y: clientY };

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 3;

    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      const limitedX = Math.cos(angle) * maxDistance;
      const limitedY = Math.sin(angle) * maxDistance;
      
      setJoystickPosition({
        x: 50 + (limitedX / maxDistance) * 30,
        y: 50 + (limitedY / maxDistance) * 30
      });

      // Determine movement direction
      if (Math.abs(limitedX) > Math.abs(limitedY)) {
        if (limitedX < -10) {
          setIsMovingLeft(true);
          setIsMovingRight(false);
          onMoveLeft();
        } else if (limitedX > 10) {
          setIsMovingRight(true);
          setIsMovingLeft(false);
          onMoveRight();
        }
      }
    } else {
      setJoystickPosition({
        x: 50 + (deltaX / maxDistance) * 30,
        y: 50 + (deltaY / maxDistance) * 30
      });
    }
  }, [onMoveLeft, onMoveRight]);

  const handleJoystickMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!touchStartRef.current || !joystickRef.current) return;
    handleJoystickStart(e);
  }, [handleJoystickStart]);

  const handleJoystickEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setJoystickPosition({ x: 50, y: 50 });
    setIsMovingLeft(false);
    setIsMovingRight(false);
    onStopMoving();
    touchStartRef.current = null;
  }, [onStopMoving]);

  // Handle jump button
  const handleJumpStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onJump();
  }, [onJump]);

  const handleJumpEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onReleaseJump();
  }, [onReleaseJump]);

  // Prevent default touch behaviors
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefault);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 md:hidden">
      {/* Virtual Joystick - Left Side */}
      <div 
        ref={joystickRef}
        className="absolute left-8 bottom-24 w-32 h-32 pointer-events-auto"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onMouseDown={handleJoystickStart}
        onMouseMove={handleJoystickMove}
        onMouseUp={handleJoystickEnd}
        onMouseLeave={handleJoystickEnd}
      >
        {/* Joystick Base */}
        <div className="absolute inset-0 bg-black/20 rounded-full border-2 border-white/30 backdrop-blur-sm">
          {/* Joystick Handle */}
          <div 
            className="absolute w-12 h-12 bg-white/80 rounded-full shadow-lg border-2 border-white/60 transition-all duration-100"
            style={{
              left: `${joystickPosition.x}%`,
              top: `${joystickPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: isMovingLeft || isMovingRight ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.8)'
            }}
          />
        </div>
        {/* Direction Indicators */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/40 text-xs font-bold">← MOVE →</div>
        </div>
      </div>

      {/* Jump Button - Right Side */}
      <div 
        className="absolute right-8 bottom-24 w-20 h-20 pointer-events-auto"
        onTouchStart={handleJumpStart}
        onTouchEnd={handleJumpEnd}
        onMouseDown={handleJumpStart}
        onMouseUp={handleJumpEnd}
        onMouseLeave={handleJumpEnd}
      >
        <div className="w-full h-full bg-blue-500/80 rounded-full shadow-lg border-2 border-blue-400 active:bg-blue-600/80 transition-all duration-100 flex items-center justify-center backdrop-blur-sm">
          <span className="text-white font-bold text-lg">JUMP</span>
        </div>
      </div>

      {/* Special Ability Buttons - Top Corners */}
      <div className="absolute top-4 left-4 pointer-events-auto flex gap-2">
        <button 
          className="w-12 h-12 bg-purple-500/80 rounded-full shadow-lg border border-purple-400 text-white text-xs font-bold backdrop-blur-sm"
          onTouchStart={(e) => { e.preventDefault(); /* Handle special ability 1 */ }}
        >
          A1
        </button>
      </div>

      <div className="absolute top-4 right-4 pointer-events-auto flex gap-2">
        <button 
          className="w-12 h-12 bg-orange-500/80 rounded-full shadow-lg border border-orange-400 text-white text-xs font-bold backdrop-blur-sm"
          onTouchStart={(e) => { e.preventDefault(); /* Handle special ability 2 */ }}
        >
          A2
        </button>
      </div>

      {/* Pause Button - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <button 
          className="w-16 h-10 bg-gray-700/80 rounded-full shadow-lg border border-gray-600 text-white text-xs font-bold backdrop-blur-sm"
          onTouchStart={(e) => { e.preventDefault(); /* Handle pause */ }}
        >
          PAUSE
        </button>
      </div>
    </div>
  );
}
