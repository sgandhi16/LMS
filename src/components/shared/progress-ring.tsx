"use client";

import { motion } from "framer-motion";

interface CircularProgressProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  showText?: boolean;
}

export function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 8,
  color = "#6366f1",
  showText = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold tracking-tight text-white">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}

interface LinearProgressProps {
  progress: number; // 0 to 100
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export function LinearProgress({
  progress,
  color = "#6366f1",
  height = 8,
  showLabel = false,
}: LinearProgressProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
          <span>Progress</span>
          <span className="font-semibold text-white">{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        className="w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5"
        style={{ height }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
