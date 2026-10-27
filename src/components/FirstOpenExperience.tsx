import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useEscapeKey } from '../lib/useEscapeKey';

interface FirstOpenExperienceProps {
  onComplete: () => void;
}

export const FirstOpenExperience: React.FC<FirstOpenExperienceProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'drawing' | 'morphing' | 'completed'>('drawing');
  const [stageText, setStageText] = useState('Initializing Market Feed...');

  useEscapeKey(onComplete);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Pre-generate smooth price wave
    const pointsCount = 140;
    const pathPoints: { x: number; y: number; vol: number; text?: string }[] = [];
    const centerY = height * 0.52;
    const amplitude = height * 0.16;

    for (let i = 0; i < pointsCount; i++) {
      const t = i / pointsCount;
      const x = t * width;
      // Elegant stock curve: gentle rise, hesitation, breakout
      const wave = Math.sin(t * 8) * 0.25 + Math.sin(t * 3.2) * 0.55 - Math.cos(t * 12) * 0.12;
      const trend = (t - 0.5) * 1.1; // upward trend
      const y = centerY - (wave + trend) * amplitude;
      const vol = 15 + Math.abs(Math.sin(t * 18)) * 60 + (t > 0.6 ? 40 : 0);
      const text = i === 40 ? '₹24,980' : i === 85 ? '+3.8% SURGE' : i === 120 ? '₹25,142' : undefined;
      pathPoints.push({ x, y, vol, text });
    }

    let progress = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startTime = performance.now();
    const duration = 1800; // 1.8 seconds fast cinematic intro

    // Stage updates
    const t1 = setTimeout(() => setStageText('Mapping Volatility & Volume...'), 500);
    const t2 = setTimeout(() => setStageText('Calculating Meaningful Attention Shifts...'), 1100);
    const t3 = setTimeout(() => {
      setPhase('morphing');
      setStageText('Welcome to Nazar.');
    }, 1500);
    const t4 = setTimeout(() => {
      onComplete();
    }, 2000);

    const render = (time: number) => {
      const elapsed = time - startTime;
      // Reduced motion: draw the finished chart in a single frame.
      progress = reduceMotion ? 1 : Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, width, height);

      // 1. Subtle financial grid lines
      ctx.strokeStyle = `rgba(68, 71, 91, ${0.05 * progress})`;
      ctx.lineWidth = 1;
      const gridRows = 8;
      const gridCols = 12;
      for (let r = 1; r < gridRows; r++) {
        const y = (height / gridRows) * r;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width * progress, y);
        ctx.stroke();
      }
      for (let c = 1; c < gridCols; c++) {
        const x = (width / gridCols) * c;
        if (x <= width * progress) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }

      // 2. Volume bars at bottom
      const visibleIndex = Math.floor(progress * (pointsCount - 1));
      for (let i = 0; i <= visibleIndex; i++) {
        const p = pathPoints[i];
        const barHeight = p.vol * 1.1 * progress;
        const barY = height - barHeight - 40;
        ctx.fillStyle = i > 80 ? 'rgba(4, 180, 136, 0.4)' : 'rgba(68, 71, 91, 0.08)';
        ctx.fillRect(p.x - 2, barY, 4, barHeight);
      }

      // 3. Glowing market line
      if (visibleIndex > 0) {
        // Line styling
        ctx.save();
        ctx.shadowColor = '#04B488'; // var(--color-green)
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#04B488';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i <= visibleIndex; i++) {
          ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // Lead head pulse
        const head = pathPoints[visibleIndex];
        ctx.beginPath();
        ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(4, 180, 136, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 4. Data points & price tags along path
        for (let i = 0; i <= visibleIndex; i += 30) {
          const pt = pathPoints[i];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(68, 71, 91, 0.7)'; // var(--color-ink)
          ctx.fill();

          if (pt.text) {
            ctx.font = '500 11px Inter, sans-serif';
            ctx.fillStyle = 'rgba(68, 71, 91, 0.85)';
            ctx.fillText(pt.text, pt.x + 8, pt.y - 10);
          }
        }
      }

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'morphing' ? 0.05 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 bg-[var(--color-background)] flex flex-col justify-between p-8 overflow-hidden cursor-pointer select-none"
        onClick={onComplete}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Top brand header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/nazar-favicon.png" alt="" className="w-8 h-8 object-contain" />
            <span className="font-semibold text-lg tracking-tight text-[var(--color-ink)]">Nazar</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border-soft)] text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-all"
          >
            <span>Skip intro</span>
            <span className="text-xs px-1 py-0.5 rounded bg-[var(--color-background)] border border-[var(--color-border)] font-mono text-[var(--color-muted)] group-hover:text-[var(--color-ink)]">
              ESC
            </span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Bottom narrative transition text */}
        <div className="relative z-10 max-w-lg mb-8">
          <motion.div
            key={stageText}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-green)] animate-pulse" />
              <p className="text-xs font-mono text-[var(--color-green)]">{stageText}</p>
            </div>
            <h2 className="text-2xl font-normal text-[var(--color-ink)] ">
              Graph <span className="text-[var(--color-border)]">→</span> Market{' '}
              <span className="text-[var(--color-border)]">→</span> Watchlist{' '}
              <span className="text-[var(--color-border)]">→</span> Attention
            </h2>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
