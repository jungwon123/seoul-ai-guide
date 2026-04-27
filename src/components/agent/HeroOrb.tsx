import { useEffect, useRef } from 'react';
import type { AgentType } from '@/types';

interface Props {
  agent: AgentType;
  isActive?: boolean;
  size?: number;
}

/** Per-agent hue offsets (360° wheel). Base palette stays electric blue/purple/pink. */
const AGENT_HUE: Record<AgentType, number> = {
  claude: 0,    // 기본 인디고→퍼플→핑크
  gpt: -80,     // 시안/틸 쪽으로
  gemini: 40,   // 마젠타/핑크 쪽으로
};

interface Particle {
  theta: number;
  thetaSpeed: number;
  radius: number;
  phi: number;          // tilt angle 0~2π
  phiSpeed: number;
  size: number;
  hueShift: number;
}

const PARTICLE_COUNT = 90;

export default function HeroOrb({ agent, isActive = false, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  const hueRef = useRef(AGENT_HUE[agent]);
  useEffect(() => { hueRef.current = AGENT_HUE[agent]; }, [agent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      theta: Math.random() * Math.PI * 2,
      thetaSpeed: 0.003 + Math.random() * 0.018,
      radius: 50 + Math.random() * 32,
      phi: Math.random() * Math.PI * 2,
      phiSpeed: (Math.random() - 0.5) * 0.006,
      size: 0.8 + Math.random() * 2.2,
      hueShift: (Math.random() - 0.5) * 40,
    }));

    const cx = size / 2;
    const cy = size / 2;
    let t = 0;

    const tick = () => {
      t += 0.016;
      const active = isActiveRef.current;
      const hueBase = 250 + hueRef.current;

      // Softer trail — brighter overlay, less "deep space"
      ctx.fillStyle = 'rgba(30, 32, 56, 0.16)';
      ctx.fillRect(0, 0, size, size);

      // Pulsing core — softer saturation + lower alpha
      const pulse = Math.sin(t * (active ? 2.5 : 1.3)) * 0.12 + 0.88;
      const coreR = 40 * pulse;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, `hsla(${hueBase}, 75%, 85%, ${0.55 * pulse})`);
      coreGrad.addColorStop(0.4, `hsla(${hueBase - 20}, 70%, 66%, ${0.35 * pulse})`);
      coreGrad.addColorStop(0.8, `hsla(${hueBase - 40}, 60%, 50%, ${0.12 * pulse})`);
      coreGrad.addColorStop(1, 'hsla(260, 60%, 45%, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Outer aura — much softer
      const auraGrad = ctx.createRadialGradient(cx, cy, coreR * 0.7, cx, cy, size * 0.5);
      auraGrad.addColorStop(0, `hsla(${hueBase - 10}, 70%, 65%, 0.04)`);
      auraGrad.addColorStop(1, 'hsla(260, 60%, 40%, 0)');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, size, size);

      // Particles — softer saturation, smaller glow
      particlesRef.current.forEach((p) => {
        p.theta += p.thetaSpeed * (active ? 2 : 1);
        p.phi += p.phiSpeed;

        const xFlat = Math.cos(p.theta) * p.radius;
        const yFlat = Math.sin(p.theta) * p.radius;
        const tilt = Math.sin(p.phi) * 0.55;
        const x = cx + xFlat;
        const y = cy + yFlat * 0.45 + xFlat * tilt * 0.25;
        const z = (Math.sin(p.theta) + 1) / 2;

        const alpha = 0.18 + z * 0.55;
        const drawSize = p.size * (0.5 + z * 0.6);
        const hue = hueBase + p.hueShift + (z * 12 - 6);

        ctx.shadowColor = `hsl(${hue}, 75%, 75%)`;
        ctx.shadowBlur = 5 + z * 4;
        ctx.fillStyle = `hsla(${hue}, 70%, ${62 + z * 18}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, drawSize, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer ambient bloom — softened */}
      <div
        className="absolute inset-[-25%] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, hsla(${250 + AGENT_HUE[agent]}, 70%, 65%, 0.10) 0%, transparent 60%)`,
          filter: 'blur(18px)',
        }}
      />
      {/* Canvas inside lighter portal */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #22263d 0%, #131628 100%)',
          boxShadow: `
            inset 0 0 30px hsla(${250 + AGENT_HUE[agent]}, 60%, 55%, 0.10),
            0 12px 32px hsla(${250 + AGENT_HUE[agent]}, 60%, 50%, 0.14),
            0 0 0 1px hsla(${250 + AGENT_HUE[agent]}, 50%, 65%, 0.10)
          `,
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
