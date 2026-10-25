import React, { useEffect, useState, useRef } from 'react';

interface AnimatedPriceProps {
  value: number;
  currency?: string;
  decimals?: number;
  className?: string;
  colorizeOnChange?: boolean;
}

export const AnimatedPrice: React.FC<AnimatedPriceProps> = ({
  value,
  currency = '₹',
  decimals = 2,
  className = '',
  colorizeOnChange = true,
}) => {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    if (colorizeOnChange && prevValueRef.current !== value) {
      if (value > prevValueRef.current) {
        setFlash('up');
      } else if (value < prevValueRef.current) {
        setFlash('down');
      }
      prevValueRef.current = value;

      const timer = setTimeout(() => setFlash(null), 1200);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value, colorizeOnChange]);

  const formatted = `${currency}${value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

  let flashClass = '';
  if (flash === 'up') flashClass = 'text-[var(--color-green)] transition-colors duration-300';
  if (flash === 'down') flashClass = 'text-[var(--color-red)] transition-colors duration-300';

  return <span className={`font-mono ${flashClass} ${className}`}>{formatted}</span>;
};
