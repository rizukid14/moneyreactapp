import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedNumberProps {
  /** The target numeric value */
  value: number;
  /** Optional prefix (e.g. "Rp ") */
  prefix?: string;
  /** Optional suffix (e.g. "%", " kg") */
  suffix?: string;
  /** Number of decimal places (default 0) */
  decimals?: number;
  /** Animation duration in seconds (default 0.6) */
  duration?: number;
  /** CSS class for the number element */
  className?: string;
  /** Use Indonesian locale formatting with dots as thousand separators */
  formatLocale?: 'id-ID' | 'en-US';
}

/**
 * Animated number that counts up/down when the value changes.
 * Uses framer-motion spring animation for smooth transitions.
 * Respects prefers-reduced-motion by skipping animation.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 0.6,
  className = '',
  formatLocale = 'id-ID',
}) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = useMotionValue(value);
  const rounded = useTransform(count, (v) => {
    const num = Math.round(v * 10 ** decimals) / 10 ** decimals;
    return new Intl.NumberFormat(formatLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  });
  const prevValue = useRef(value);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (value === prevValue.current) return;

    const controls = animate(count, value, {
      duration: reducedMotion ? 0 : duration,
      ease: [0.25, 0.1, 0.25, 1], // ease-out cubic
    });

    prevValue.current = value;
    return controls.stop;
  }, [value, duration, count, reducedMotion]);

  return (
    <span className={className} aria-label={`${prefix}${value}${suffix}`}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
};

/**
 * Lightweight wrapper for currency values.
 * Uses AnimatedNumber with Rp prefix and Indonesian formatting.
 */
export const AnimatedCurrency: React.FC<Omit<AnimatedNumberProps, 'prefix' | 'formatLocale'>> = (props) => (
  <AnimatedNumber {...props} prefix="Rp " formatLocale="id-ID" />
);
