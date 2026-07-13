import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SpinWheelProps {
  multiplier: number;
  isWeekend: boolean;
  onComplete: () => void;
}

const WEEKDAY_SLICES = [
  { label: '1x', value: 1, color: '#F59E0B' }, // amber-500
  { label: '2x', value: 2, color: '#EF4444' }, // red-500
  { label: '1x', value: 1, color: '#F59E0B' },
  { label: '5x', value: 5, color: '#8B5CF6' }, // violet-500
  { label: '1x', value: 1, color: '#F59E0B' },
  { label: '2x', value: 2, color: '#EF4444' },
];

const WEEKEND_SLICES = [
  { label: '1x', value: 1, color: '#F59E0B' },
  { label: '2x', value: 2, color: '#EF4444' },
  { label: '5x', value: 5, color: '#8B5CF6' },
  { label: '10x', value: 10, color: '#3B82F6' }, // blue-500
  { label: '1x', value: 1, color: '#F59E0B' },
  { label: '2x', value: 2, color: '#EF4444' },
  { label: '1x', value: 1, color: '#F59E0B' },
  { label: '5x', value: 5, color: '#8B5CF6' },
];

export default function SpinWheel({ multiplier, isWeekend, onComplete }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);

  const slices = isWeekend ? WEEKEND_SLICES : WEEKDAY_SLICES;
  const numSlices = slices.length;
  const sliceAngle = 360 / numSlices;

  // Build the conic-gradient string
  const gradientStops = slices
    .map((slice, i) => {
      const start = i * sliceAngle;
      const end = start + sliceAngle;
      return `${slice.color} ${start}deg ${end}deg`;
    })
    .join(', ');

  useEffect(() => {
    // Find the target slice index
    // If there are multiple slices with the same value, pick a random one for variation
    const matchingIndices = slices
      .map((s, i) => (s.value === multiplier ? i : -1))
      .filter((i) => i !== -1);
    
    // Fallback to 0 if something goes wrong (e.g., multiplier not in slices)
    const targetIndex = matchingIndices.length > 0 
      ? matchingIndices[Math.floor(Math.random() * matchingIndices.length)] 
      : 0;

    const spins = 5; // Spin 5 full times
    const baseRotation = spins * 360;
    
    // To land exactly in the middle of targetIndex at 12 o'clock:
    const offset = targetIndex * sliceAngle + (sliceAngle / 2);
    const finalRotation = baseRotation - offset;

    // We add a tiny delay so the modal animation finishes opening first
    const timer = setTimeout(() => {
      setRotation(finalRotation);
    }, 100);

    return () => clearTimeout(timer);
  }, [multiplier, slices, sliceAngle]);

  return (
    <div className="relative w-64 h-64 mx-auto my-6 flex items-center justify-center">
      {/* Pointer (Triangle) at 12 o'clock */}
      <div className="absolute -top-4 z-10 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-on-surface filter drop-shadow-md" />
      
      {/* The Spinning Wheel */}
      <motion.div
        className="w-full h-full rounded-full shadow-inner border-4 border-surface overflow-hidden relative"
        style={{
          background: `conic-gradient(${gradientStops})`,
        }}
        initial={{ rotate: 0 }}
        animate={{ rotate: rotation }}
        transition={{ duration: 3.5, ease: [0.2, 0.8, 0.2, 1] }}
        onAnimationComplete={() => {
          if (rotation > 0) {
            onComplete();
          }
        }}
      >
        {/* Render text for each slice */}
        {slices.map((slice, i) => {
          // Center of the slice
          const centerAngle = i * sliceAngle + (sliceAngle / 2);
          return (
            <div
              key={i}
              className="absolute top-0 left-0 w-full h-full"
              style={{
                transform: `rotate(${centerAngle}deg)`,
              }}
            >
              {/* Text placed near the top edge */}
              <div className="text-white font-black text-xl mt-3 drop-shadow-md">
                {slice.label}
              </div>
            </div>
          );
        })}
      </motion.div>
      
      {/* Center Pin */}
      <div className="absolute w-12 h-12 bg-surface rounded-full shadow-md z-10 flex items-center justify-center border-4 border-on-surface/10">
        <span className="text-lg">✨</span>
      </div>
    </div>
  );
}
