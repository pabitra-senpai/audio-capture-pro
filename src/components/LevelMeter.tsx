import { useEffect, useRef } from 'react';
import type { RecordingState } from '@/types';

interface Props {
  level: number;
  state: RecordingState;
  height?: number;
  bars?: number;
}

export function LevelMeter({ level, state, height = 56, bars = 32 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<number[]>(Array.from({ length: bars }, () => 0));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const barGap = 3;
      const barWidth = (w - barGap * (bars - 1)) / bars;
      const styles = getComputedStyle(document.documentElement);
      const brand = styles.getPropertyValue('--brand').trim() || '#ff5a1f';
      const dim = styles.getPropertyValue('--border-2').trim() || 'rgba(0,0,0,0.15)';
      const active = state === 'recording';
      const target = active ? level : Math.max(0, (historyRef.current.at(-1) ?? 0) * 0.85);
      historyRef.current.push(target);
      if (historyRef.current.length > bars) historyRef.current.shift();

      historyRef.current.forEach((v, i) => {
        const bh = Math.max(2, v * (h - 4));
        const x = i * (barWidth + barGap);
        const y = (h - bh) / 2;
        ctx.fillStyle = active ? brand : dim;
        ctx.globalAlpha = active ? 0.35 + Math.min(0.65, v * 1.2) : 0.5;
        const r = Math.min(barWidth / 2, 3);
        roundedRect(ctx, x, y, barWidth, bh, r);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [bars, level, state]);

  return (
    <div style={{ height, width: '100%' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
