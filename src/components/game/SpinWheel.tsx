import React, { useState, useRef } from 'react';

interface SpinWheelProps {
  onResult: (reward: number) => void;
}

const SEGMENTS = [
  { value: 5, color: '#4CAF50', label: '5' },
  { value: 10, color: '#2196F3', label: '10' },
  { value: 15, color: '#FF9800', label: '15' },
  { value: 25, color: '#9C27B0', label: '25' },
  { value: 50, color: '#F44336', label: '50' },
  { value: 5, color: '#00BCD4', label: '5' },
  { value: 100, color: '#FFD700', label: '100' },
  { value: 10, color: '#E91E63', label: '10' },
];

export default function SpinWheel({ onResult }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWheel = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const segAngle = (Math.PI * 2) / SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);

    SEGMENTS.forEach((seg, i) => {
      const startAngle = i * segAngle;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segAngle / 2);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 16px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(seg.label, radius * 0.65, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  React.useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current);
  }, []);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const spins = 3 + Math.random() * 5;
    const targetRotation = rotation + spins * 360 + Math.random() * 360;
    setRotation(targetRotation);

    setTimeout(() => {
      const normalizedAngle = targetRotation % 360;
      const segIndex = Math.floor(((360 - normalizedAngle) % 360) / (360 / SEGMENTS.length));
      const reward = SEGMENTS[segIndex % SEGMENTS.length].value;
      setSpinning(false);
      onResult(reward);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-red-500" />
        </div>
        <div
          className="transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? '3s' : '0s',
            transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
          }}
        >
          <canvas ref={canvasRef} width={200} height={200} className="rounded-full" />
        </div>
      </div>
      <button
        onClick={spin}
        disabled={spinning}
        className={`px-6 py-2 rounded-xl font-bold text-white transition-all ${
          spinning
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 hover:scale-105 active:scale-95'
        }`}
      >
        {spinning ? 'Spinning...' : 'SPIN!'}
      </button>
    </div>
  );
}
