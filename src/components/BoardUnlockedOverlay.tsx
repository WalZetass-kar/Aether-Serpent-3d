import React, { useEffect, useRef } from 'react';
import { Coins, Sparkles, Unlock } from 'lucide-react';
import type { BoardConfig } from '../../shared/boardThemes';

interface BoardUnlockedOverlayProps {
  board: BoardConfig;
  unlockSource: 'mission' | 'premium';
  bonusCoins?: number;
  onClose: () => void;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  rotation: number;
  vRot: number;
  shape: 'circle' | 'diamond' | 'shard';
}

export const BoardUnlockedOverlay: React.FC<BoardUnlockedOverlayProps> = ({
  board,
  unlockSource,
  bonusCoins = 0,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dismissTimer = window.setTimeout(() => {
      onClose();
    }, 3400);
    return () => window.clearTimeout(dismissTimer);
  }, [onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = [
      ...board.previewSwatches,
      '#fbbf24',
      '#fde68a',
      '#34d399',
      '#ffffff',
    ];

    const particles: BurstParticle[] = [];
    const spawnBurst = (cx: number, cy: number, count: number, speedScale: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = (2.6 + Math.random() * 7.8) * speedScale;
        const shapes: BurstParticle['shape'][] = ['circle', 'diamond', 'shard'];
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.2,
          size: 3.5 + Math.random() * 5.5,
          alpha: 1,
          decay: 0.009 + Math.random() * 0.011,
          color: palette[Math.floor(Math.random() * palette.length)],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          shape: shapes[i % shapes.length],
        });
      }
    };

    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.48;
    spawnBurst(cx, cy, 84, 1.05);
    const secondBurstTimer = window.setTimeout(() => {
      spawnBurst(cx - 90, cy - 30, 34, 0.85);
      spawnBurst(cx + 90, cy - 30, 34, 0.85);
    }, 240);

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.14;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'diamond') {
          const s = p.size * 0.8;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.7, 0);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.7, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size * 0.8, -p.size * 0.3, p.size * 1.6, p.size * 0.6);
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(render);
      }
    };
    rafId = window.requestAnimationFrame(render);

    return () => {
      window.clearTimeout(secondBurstTimer);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [board.previewSwatches]);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 cursor-pointer animate-[fadeIn_180ms_ease-out]"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 w-full h-full"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-2xl border border-amber-400/60 bg-slate-950/95 p-6 text-center shadow-2xl space-y-4"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/50 bg-emerald-500/15 text-emerald-300 shadow-lg">
          <Unlock className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {unlockSource === 'mission' ? 'Misi Selesai · Board Unlocked' : 'Premium · Board Unlocked'}
            </span>
          </div>
          <h3 className="font-display text-2xl font-bold text-gold-gradient">
            {board.name}
          </h3>
          <p className="text-xs text-slate-300">{board.subtitle}</p>
        </div>

        <div className="flex items-center justify-center gap-2 py-1">
          {board.previewSwatches.map((hex, i) => (
            <span
              key={`unlocked_sw_${i}`}
              className="h-2.5 w-14 rounded-full border border-white/20"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>

        {bonusCoins > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-950/40 px-4 py-2 text-xs font-bold text-amber-200">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-num">+{bonusCoins.toLocaleString('id-ID')} Koin Aether</span>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Arena 3D baru sudah terbuka dan siap dimainkan di mode Solo, Lokal, maupun Multiplayer!
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[42px] rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
        >
          Lanjutkan ke Koleksi
        </button>
      </div>
    </div>
  );
};
