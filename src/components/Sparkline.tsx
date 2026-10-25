import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
  strokeWidth?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 36,
  isPositive = true,
  strokeWidth = 1.8,
  className = '',
}) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-[var(--color-border-soft)] rounded" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const paddingY = 4;
  const innerHeight = height - paddingY * 2;

  const pointsArray = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * innerHeight;
    return { x, y, str: `${x.toFixed(1)},${y.toFixed(1)}` };
  });

  const pathD = `M ${pointsArray.map((p) => p.str).join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  const strokeColor = isPositive ? '#00B386' : '#EB5B3C';
  const gradientId = `spark-grad-${Math.abs(Math.round(data[0] + data[data.length - 1]))}-${isPositive ? 'pos' : 'neg'}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.12" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
        <filter id={`${gradientId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price indicator dot */}
      <circle
        cx={pointsArray[pointsArray.length - 1].x}
        cy={pointsArray[pointsArray.length - 1].y}
        r={strokeWidth * 1.5}
        fill={strokeColor}
        filter={`url(#${gradientId}-glow)`}
      />
    </svg>
  );
};
