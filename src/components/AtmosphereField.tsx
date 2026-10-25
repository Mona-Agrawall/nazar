import React, { useEffect, useRef } from 'react';

export const AtmosphereField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes
    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.15 + 0.05,
    }));

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const render = () => {
      // Smooth mouse easing
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Subtle atmospheric radial light anchored to top-center & mouse
      const gradient = ctx.createRadialGradient(
        mouseX,
        mouseY * 0.7,
        10,
        mouseX,
        mouseY * 0.7,
        Math.max(width, height) * 0.65,
      );
      gradient.addColorStop(0, 'rgba(232, 232, 236, 0.25)'); // Subtle neutral
      gradient.addColorStop(0.5, 'rgba(241, 241, 244, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Extremely faint green accent from top right for financial context
      const accentGrad = ctx.createRadialGradient(width, 0, 10, width, 0, Math.max(width, height) * 0.5);
      accentGrad.addColorStop(0, 'rgba(0, 179, 134, 0.015)'); // Barely visible green
      accentGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = accentGrad;
      ctx.fillRect(0, 0, width, height);

      // Render calm particles with subtle connection lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        // Faint, almost invisible particles for depth instead of dark dots
        ctx.fillStyle = `rgba(155, 158, 163, ${p.alpha * 0.4})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.8 }} />;
};
