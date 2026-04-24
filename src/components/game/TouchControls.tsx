import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TouchControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onStopMoving: () => void;
  onReleaseJump: () => void;
  enabled?: boolean;
}

export default function TouchControls({ onMoveLeft, onMoveRight, onJump, onStopMoving, onReleaseJump, enabled = true }: TouchControlsProps) {
  const isMobile = useIsMobile();
  const [shouldRender, setShouldRender] = useState(true);
  const [isMovingLeft, setIsMovingLeft] = useState(false);
  const [isMovingRight, setIsMovingRight] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 50, y: 50 });
  const joystickRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleJoystickStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!enabled) return;
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
  }, [enabled, onMoveLeft, onMoveRight]);

  const handleJoystickMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    if (!touchStartRef.current || !joystickRef.current) return;
    handleJoystickStart(e);
  }, [enabled, handleJoystickStart]);

  const handleJoystickEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    setJoystickPosition({ x: 50, y: 50 });
    setIsMovingLeft(false);
    setIsMovingRight(false);
    onStopMoving();
    touchStartRef.current = null;
  }, [enabled, onStopMoving]);

  const handleJumpStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    onJump();
  }, [enabled, onJump]);

  const handleJumpEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    onReleaseJump();
  }, [enabled, onReleaseJump]);

  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefault);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const isActualMobile = typeof window !== 'undefined' && 
        (window.innerWidth < 768 || 'ontouchstart' in window);
      setShouldRender(isActualMobile && enabled);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [enabled]);

  if (!shouldRender) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 md:hidden" style={{ display: shouldRender ? 'fixed' : 'none' }}>
      <div
        ref={joystickRef}
        className="pointer-events-auto absolute left-4 bottom-[max(3rem,calc(env(safe-area-inset-bottom)+2.5rem))] h-28 w-28 sm:left-6 sm:h-32 sm:w-32"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onMouseDown={handleJoystickStart}
        onMouseMove={handleJoystickMove}
        onMouseUp={handleJoystickEnd}
        onMouseLeave={handleJoystickEnd}
      >
        <div className="absolute inset-0 rounded-full border border-white/25 bg-black/20 backdrop-blur-md">
          <div
            className="absolute h-11 w-11 rounded-full border border-white/50 bg-white/80 shadow-lg transition-all duration-100"
            style={{
              left: `${joystickPosition.x}%`,
              top: `${joystickPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: isMovingLeft || isMovingRight ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.8)'
            }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-[0.25em] text-white/45">
          MOVE
        </div>
      </div>

      <div
        className="pointer-events-auto absolute right-4 bottom-[max(3rem,calc(env(safe-area-inset-bottom)+2.5rem))] flex h-20 w-20 items-center justify-center rounded-full border border-blue-300/70 bg-blue-500/80 shadow-lg backdrop-blur-md transition-all duration-100 active:bg-blue-600/80 sm:right-6 sm:h-24 sm:w-24"
        onTouchStart={handleJumpStart}
        onTouchEnd={handleJumpEnd}
        onMouseDown={handleJumpStart}
        onMouseUp={handleJumpEnd}
        onMouseLeave={handleJumpEnd}
      >
        <span className="text-sm font-black tracking-[0.2em] text-white sm:text-base">JUMP</span>
      </div>

      <div className="pointer-events-auto absolute left-1/2 top-4 flex -translate-x-1/2 gap-2">
        <button
          className="h-11 w-11 rounded-full border border-purple-300/40 bg-purple-500/80 text-xs font-black text-white shadow-lg backdrop-blur-md"
          onTouchStart={(e) => { e.preventDefault(); }}
        >
          A1
        </button>
        <button
          className="h-11 w-11 rounded-full border border-orange-300/40 bg-orange-500/80 text-xs font-black text-white shadow-lg backdrop-blur-md"
          onTouchStart={(e) => { e.preventDefault(); }}
        >
          A2
        </button>
      </div>

      <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2">
        <button
          className="h-10 rounded-full border border-white/20 bg-gray-700/80 px-5 text-xs font-black text-white shadow-lg backdrop-blur-md"
          onTouchStart={(e) => { e.preventDefault(); }}
        >
          PAUSE
        </button>
      </div>
    </div>
  );
}
