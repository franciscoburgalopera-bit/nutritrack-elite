
import React from 'react';

interface ProgressRingProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ current, target, size = 260, strokeWidth = 14 }) => {
  const radius = (size / 2) - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / target, 1);
  const offset = circumference - (progress * circumference);
  
  let color = '#3ef081'; // Default primary
  if (current >= target * 1.1) color = '#ff4d4d'; // Over target danger
  else if (current >= target) color = '#ffa502'; // At target
  
  const remaining = Math.max(0, target - current);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      {/* Background glow */}
      <div 
        className="absolute inset-4 rounded-full blur-[40px] opacity-10 transition-colors duration-700"
        style={{ backgroundColor: color }}
      />
      
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Track */}
        <circle
          className="stroke-white/5"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          stroke="url(#progressGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter="url(#glow)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-5xl font-extrabold tracking-tighter text-white">
          {remaining.toLocaleString()}
        </span>
        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">
          Kcal Remaining
        </span>
      </div>
    </div>
  );
};

export default ProgressRing;
