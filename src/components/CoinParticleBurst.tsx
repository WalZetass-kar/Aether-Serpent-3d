import React, { useEffect, useRef } from 'react';

export interface CoinParticleBurstProps {
  /** Change this key to re-trigger the particle burst waves */
  triggerKey?: string | number;
  /** 'fullscreen' fills the viewport behind an overlay; 'local' fills its positioned parent container */
  variant?: 'fullscreen' | 'local';
  /** Scales particle count slightly for bigger gift amounts */
  coinAmount?: number;
  /** Optional extra CSS classes */
  className?: string;
}

interface MicroCoinParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  radius: number;
  spinPhase: number;
  spinSpeed: number;
  tilt: number;
  tiltSpeed: number;
  alpha: number;
  fadeRate: number;
  age: number;
  maxAge: number;
  shade: 'gold' | 'amber' | 'champagne';
  glintPhase: number;
}

interface GlintSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

function drawMiniCoin(
  ctx: CanvasRenderingContext2D,
  coin: MicroCoinParticle,
): void {
  const cosSpin = Math.cos(coin.spinPhase);
  const scaleX = Math.max(0.16, Math.abs(cosSpin));
  const r = coin.radius;

  ctx.save();
  ctx.translate(coin.x, coin.y);
  ctx.rotate(coin.tilt);
  ctx.globalAlpha = Math.max(0, Math.min(1, coin.alpha));

  // 1. Metallic edge thickness (gives authentic 3D coin silhouette as it flips)
  const edgeOffset = (cosSpin >= 0 ? 1 : -1) * Math.max(1.1, r * 0.24) * (1 - scaleX * 0.55);
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(edgeOffset, 0.35, r * scaleX, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Coin face metallic gradient
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  if (coin.shade === 'champagne') {
    grad.addColorStop(0, '#fffbeb');
    grad.addColorStop(0.45, '#fde68a');
    grad.addColorStop(1, '#d97706');
  } else if (coin.shade === 'amber') {
    grad.addColorStop(0, '#fef3c7');
    grad.addColorStop(0.55, '#f59e0b');
    grad.addColorStop(1, '#b45309');
  } else {
    grad.addColorStop(0, '#fef9c3');
    grad.addColorStop(0.48, '#fbbf24');
    grad.addColorStop(1, '#ca8a04');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * scaleX, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Crisp outer bevel highlight
  ctx.strokeStyle = 'rgba(255, 251, 235, 0.78)';
  ctx.lineWidth = Math.max(0.7, r * 0.12);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.94 * scaleX, r * 0.94, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Inner minted ring & Aether diamond emblem when face is angled toward viewer
  if (scaleX > 0.32 && r >= 4.5) {
    ctx.strokeStyle = 'rgba(146, 64, 14, 0.52)';
    ctx.lineWidth = Math.max(0.75, r * 0.11);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.66 * scaleX, r * 0.66, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed center diamond rune
    ctx.fillStyle = 'rgba(255, 251, 235, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.36);
    ctx.lineTo(r * 0.27 * scaleX, 0);
    ctx.lineTo(0, r * 0.36);
    ctx.lineTo(-r * 0.27 * scaleX, 0);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Specular glint flash when coin aligns with light angle
  const glintStrength = Math.max(0, Math.sin(coin.spinPhase * 2 + coin.glintPhase) - 0.72) / 0.28;
  if (glintStrength > 0.05) {
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.55 * glintStrength).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(
      -r * 0.22 * scaleX,
      -r * 0.26,
      r * 0.28 * scaleX,
      r * 0.16,
      -0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Reusable small coin-shaped particle burst & cascade animation component.
 * Designed for Gift Coins celebrations with high-DPI Canvas 2D rendering
 * and automatic prefers-reduced-motion compliance.
 */
export const CoinParticleBurst: React.FC<CoinParticleBurstProps> = ({
  triggerKey = 0,
  variant = 'fullscreen',
  coinAmount = 250,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 320;
    let height = 180;

    const syncSize = () => {
      if (variant === 'fullscreen') {
        width = window.innerWidth;
        height = window.innerHeight;
      } else {
        const parent = canvas.parentElement;
        width = Math.max(120, parent ? parent.clientWidth : 320);
        height = Math.max(80, parent ? parent.clientHeight : 160);
      }
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();

    let resizeObserver: ResizeObserver | null = null;
    if (variant === 'fullscreen') {
      window.addEventListener('resize', syncSize);
    } else if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas.parentElement);
    }

    const shades: Array<MicroCoinParticle['shade']> = ['gold', 'amber', 'champagne'];
    const sparkColors = ['#fef3c7', '#fbbf24', '#fcd34d', '#34d399', '#ffffff'];

    // Static decorative coin constellation when reduced motion is enabled
    if (prefersReduced) {
      ctx.clearRect(0, 0, width, height);
      const count = variant === 'fullscreen' ? 14 : 8;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const distX = width * (variant === 'fullscreen' ? 0.28 : 0.38);
        const distY = height * (variant === 'fullscreen' ? 0.26 : 0.34);
        drawMiniCoin(ctx, {
          x: width * 0.5 + Math.cos(angle) * distX,
          y: height * 0.5 + Math.sin(angle) * distY,
          vx: 0,
          vy: 0,
          gravity: 0,
          drag: 1,
          radius: variant === 'fullscreen' ? 6.5 : 5,
          spinPhase: i * 0.55,
          spinSpeed: 0,
          tilt: (i % 2 === 0 ? 1 : -1) * 0.18,
          tiltSpeed: 0,
          alpha: 0.72,
          fadeRate: 0,
          age: 0,
          maxAge: 1,
          shade: shades[i % shades.length],
          glintPhase: i,
        });
      }
      return () => {
        if (variant === 'fullscreen') window.removeEventListener('resize', syncSize);
        resizeObserver?.disconnect();
      };
    }

    const coins: MicroCoinParticle[] = [];
    const sparks: GlintSpark[] = [];
    const amountFactor = Math.min(1.45, Math.max(0.85, Math.log10(Math.max(10, coinAmount)) / 2.6));

    const spawnBurstWave = (originX: number, originY: number, count: number, localMode: boolean) => {
      for (let i = 0; i < count; i++) {
        const angle = localMode
          ? -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.55
          : -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.65;
        const speed = localMode
          ? 2.2 + Math.random() * 4.4
          : 4.2 + Math.random() * 8.6;

        coins.push({
          x: originX + (Math.random() - 0.5) * (localMode ? 54 : 76),
          y: originY + (Math.random() - 0.5) * (localMode ? 18 : 34),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (localMode ? 1.4 : 2.6),
          gravity: localMode ? 0.13 : 0.21,
          drag: localMode ? 0.985 : 0.992,
          radius: localMode
            ? 4.2 + Math.random() * 3.8
            : 5.5 + Math.random() * 5.2,
          spinPhase: Math.random() * Math.PI * 2,
          spinSpeed: 0.18 + Math.random() * 0.22,
          tilt: (Math.random() - 0.5) * 0.55,
          tiltSpeed: (Math.random() - 0.5) * 0.055,
          alpha: 1,
          fadeRate: localMode ? 0.015 + Math.random() * 0.01 : 0.008 + Math.random() * 0.007,
          age: 0,
          maxAge: localMode ? 95 + Math.random() * 45 : 185 + Math.random() * 90,
          shade: shades[i % shades.length],
          glintPhase: Math.random() * Math.PI * 2,
        });
      }

      const sparkCount = localMode ? Math.round(count * 0.7) : Math.round(count * 1.15);
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.18;
        const speed = localMode ? 1.4 + Math.random() * 3.8 : 2.0 + Math.random() * 6.5;
        sparks.push({
          x: originX + (Math.random() - 0.5) * (localMode ? 36 : 48),
          y: originY + (Math.random() - 0.5) * 18,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          size: localMode ? 1.6 + Math.random() * 2.2 : 2.0 + Math.random() * 3.2,
          alpha: 1,
          decay: localMode ? 0.02 + Math.random() * 0.015 : 0.013 + Math.random() * 0.012,
          color: sparkColors[i % sparkColors.length],
        });
      }
    };

    const spawnTopMicroRain = (count: number) => {
      for (let i = 0; i < count; i++) {
        coins.push({
          x: Math.random() * width,
          y: -14 - Math.random() * height * 0.42,
          vx: (Math.random() - 0.5) * 1.1,
          vy: 1.8 + Math.random() * 2.4,
          gravity: 0.065,
          drag: 0.996,
          radius: 4.8 + Math.random() * 4.4,
          spinPhase: Math.random() * Math.PI * 2,
          spinSpeed: 0.14 + Math.random() * 0.16,
          tilt: (Math.random() - 0.5) * 0.45,
          tiltSpeed: (Math.random() - 0.5) * 0.035,
          alpha: 0.92,
          fadeRate: 0.006,
          age: 0,
          maxAge: 260,
          shade: shades[i % shades.length],
          glintPhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const cx = width * 0.5;
    const cy = variant === 'fullscreen' ? height * 0.45 : height * 0.58;

    if (variant === 'fullscreen') {
      spawnBurstWave(cx, cy, Math.round(46 * amountFactor), false);
      spawnTopMicroRain(Math.round(30 * amountFactor));
    } else {
      spawnBurstWave(cx, cy, Math.round(24 * amountFactor), true);
    }

    // Staggered second & third mini bursts for rich celebratory cadence
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        if (variant === 'fullscreen') {
          spawnBurstWave(width * 0.34, height * 0.48, 18, false);
          spawnBurstWave(width * 0.66, height * 0.48, 18, false);
        } else {
          spawnBurstWave(width * 0.5, height * 0.55, 16, true);
        }
      }, 380),
    );

    if (variant === 'local') {
      timers.push(
        window.setTimeout(() => {
          spawnBurstWave(width * 0.5, height * 0.56, 12, true);
        }, 1150),
      );
    } else {
      timers.push(
        window.setTimeout(() => {
          spawnTopMicroRain(16);
        }, 950),
      );
    }

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (variant === 'fullscreen') {
        const glow = ctx.createRadialGradient(
          width * 0.5,
          height * 0.46,
          16,
          width * 0.5,
          height * 0.46,
          Math.min(width, height) * 0.38,
        );
        glow.addColorStop(0, 'rgba(251, 191, 36, 0.18)');
        glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      let hasAlive = false;

      // Update & draw diamond glint sparks
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        if (s.alpha <= 0.01) continue;
        hasAlive = true;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy = s.vy * 0.96 + 0.045;
        s.alpha = Math.max(0, s.alpha - s.decay);

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(0, -s.size);
        ctx.lineTo(s.size * 0.65, 0);
        ctx.lineTo(0, s.size);
        ctx.lineTo(-s.size * 0.65, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Update & draw small 3D-spinning coin particles
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i];
        if (c.alpha <= 0.01 || c.y > height + 28) continue;
        hasAlive = true;

        c.age += 1;
        c.x += c.vx;
        c.y += c.vy;
        c.vy += c.gravity;
        c.vx *= c.drag;
        c.spinPhase += c.spinSpeed;
        c.tilt += c.tiltSpeed;

        if (c.age > c.maxAge * 0.62 || c.y > height * 0.8) {
          c.alpha = Math.max(0, c.alpha - c.fadeRate * 2.1);
        }

        drawMiniCoin(ctx, c);
      }

      if (hasAlive || timers.length > 0) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      timers.forEach((id) => window.clearTimeout(id));
      if (variant === 'fullscreen') {
        window.removeEventListener('resize', syncSize);
      }
      resizeObserver?.disconnect();
    };
  }, [triggerKey, variant, coinAmount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none ${
        variant === 'fullscreen' ? 'fixed inset-0' : 'absolute inset-0 h-full w-full'
      } ${className}`}
    />
  );
};
