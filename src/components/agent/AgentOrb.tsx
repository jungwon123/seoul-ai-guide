import { useEffect, useRef, useState, useCallback } from 'react';

// LocalBiz 단일 에이전트 시각화 — 회전하는 와이어프레임 구 + 입자.
// Seoul Edit 88 올림픽 팔레트 (네이비/레드/오렌지/그린).
// 모든 치수는 baseRadius에 비례 — 어떤 size에서도 캔버스 안에 들어가도록 설계.
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AgentOrbProps {
  state?: OrbState;
  size?: number;
  /** size가 작을 때 호버 인터랙션/포인터를 끔. 헤더 같은 임베디드 용도. */
  interactive?: boolean;
}

const BRAND_PALETTE: { r: number; g: number; b: number }[] = [
  { r: 31, g: 58, b: 139 },   // navy   #1F3A8B
  { r: 220, g: 33, b: 39 },   // red    #DC2127
  { r: 244, g: 161, b: 44 },  // orange #F4A12C
  { r: 0, g: 133, b: 62 },    // green  #00853E
];

const GLOW_PRIMARY = '31, 58, 139';
const GLOW_SECONDARY = '244, 161, 44';

// Compact 모드(헤더/채팅 버블 같은 작은 사이즈): 입자·링 없으니 와이어프레임이 캔버스 채움.
// Full 모드(웰컴 큰 오브): 입자·링·글로우 모두 표시되도록 안쪽으로 여유.
const FULL_RADIUS_RATIO = 0.22;
const COMPACT_RADIUS_RATIO = 0.42;
const COMPACT_THRESHOLD = 80;

export default function AgentOrb({ state = 'idle', size = 400, interactive = true }: AgentOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const compactMode = size < COMPACT_THRESHOLD;
      const baseRadius = Math.min(width, height) * (compactMode ? COMPACT_RADIUS_RATIO : FULL_RADIUS_RATIO);

      // 작은 사이즈에선 입자·링은 끔(어차피 잘리고 시각 노이즈만 됨).
      const showParticles = !compactMode;
      const showRings = size >= 50;
      // compact 모드는 글로우 레이어/오프셋 줄여서 와이어프레임이 캔버스 채워도 글로우는 잘리지 않게.
      const glowLayers = compactMode ? 3 : 6;
      const glowOffsetPerLayer = compactMode ? 0.06 : 0.16;
      const glowPulseAmp = compactMode ? 0.04 : 0.08;

      // 라인 밀도는 size에 따라 점진적으로. 작은 헤더에선 정리된 와이어프레임.
      const numLongitudeLines = Math.max(5, Math.min(16, Math.round(size / 25)));
      const numLatitudeLines = Math.max(5, Math.min(12, Math.round(size / 30)));

      const stateConfig = {
        idle: { speed: 0.5, intensity: 0.3, pulseSpeed: 0.8 },
        listening: { speed: 0.8, intensity: 0.6, pulseSpeed: 1.5 },
        thinking: { speed: 1.2, intensity: 0.8, pulseSpeed: 2.0 },
        speaking: { speed: 1.5, intensity: 1.0, pulseSpeed: 2.5 },
      } as const;

      const config = stateConfig[state];
      const hoverBoost = interactive && isHovered ? 1.15 : 1;

      // 1) Ambient glow — 모드별 레이어 수/오프셋. 캔버스 안에 안전하게 머무름.
      for (let layer = glowLayers - 1; layer >= 0; layer--) {
        const glowRadius =
          baseRadius * (1 + layer * glowOffsetPerLayer) +
          Math.sin(time * config.pulseSpeed) * baseRadius * glowPulseAmp;
        const alpha = 0.04 - layer * (0.04 / glowLayers);

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
        gradient.addColorStop(0, `rgba(${GLOW_PRIMARY}, ${alpha * hoverBoost})`);
        gradient.addColorStop(0.5, `rgba(${GLOW_SECONDARY}, ${alpha * 0.5 * hoverBoost})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // 2) 와이어프레임 — wave 진폭도 baseRadius 비례.
      ctx.lineWidth = Math.max(0.8, baseRadius * 0.015);
      ctx.lineCap = 'round';

      const rotationX = time * config.speed * 0.3;
      const rotationY = time * config.speed * 0.5;
      const rotationZ = time * config.speed * 0.2;
      const waveAmp = baseRadius * 0.08;

      // Longitude
      for (let i = 0; i < numLongitudeLines; i++) {
        const color = BRAND_PALETTE[i % BRAND_PALETTE.length];
        const longitudeAngle = (i / numLongitudeLines) * Math.PI * 2 + rotationY;

        ctx.beginPath();
        for (let j = 0; j <= 50; j++) {
          const latitudeAngle = (j / 50) * Math.PI - Math.PI / 2;

          let x = Math.cos(latitudeAngle) * Math.cos(longitudeAngle);
          let y = Math.sin(latitudeAngle);
          let z = Math.cos(latitudeAngle) * Math.sin(longitudeAngle);

          const cosX = Math.cos(rotationX);
          const sinX = Math.sin(rotationX);
          const cosZ = Math.cos(rotationZ);
          const sinZ = Math.sin(rotationZ);

          const y1 = y * cosX - z * sinX;
          const z1 = y * sinX + z * cosX;
          y = y1;
          z = z1;

          const x2 = x * cosZ - y * sinZ;
          const y2 = x * sinZ + y * cosZ;
          x = x2;
          y = y2;

          const wave =
            Math.sin(time * config.pulseSpeed + latitudeAngle * 3 + longitudeAngle * 2) *
            config.intensity *
            waveAmp *
            hoverBoost;
          const radius = baseRadius + wave;

          const screenX = centerX + x * radius;
          const screenY = centerY + y * radius;

          const depth = (z + 1) / 2;
          const alpha = 0.3 + depth * 0.7;

          if (j === 0) ctx.moveTo(screenX, screenY);
          else ctx.lineTo(screenX, screenY);

          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.6})`;
        }
        ctx.stroke();
      }

      // Latitude
      for (let i = 1; i < numLatitudeLines; i++) {
        const color = BRAND_PALETTE[(i + 2) % BRAND_PALETTE.length];
        const latitudeAngle = (i / numLatitudeLines) * Math.PI - Math.PI / 2;

        ctx.beginPath();
        for (let j = 0; j <= 60; j++) {
          const longitudeAngle = (j / 60) * Math.PI * 2 + rotationY;

          let x = Math.cos(latitudeAngle) * Math.cos(longitudeAngle);
          let y = Math.sin(latitudeAngle);
          let z = Math.cos(latitudeAngle) * Math.sin(longitudeAngle);

          const cosX = Math.cos(rotationX);
          const sinX = Math.sin(rotationX);
          const cosZ = Math.cos(rotationZ);
          const sinZ = Math.sin(rotationZ);

          const y1 = y * cosX - z * sinX;
          const z1 = y * sinX + z * cosX;
          y = y1;
          z = z1;

          const x2 = x * cosZ - y * sinZ;
          const y2 = x * sinZ + y * cosZ;
          x = x2;
          y = y2;

          const wave =
            Math.sin(time * config.pulseSpeed * 1.5 + longitudeAngle * 4) *
            config.intensity *
            waveAmp *
            0.8 *
            hoverBoost;
          const radius = baseRadius + wave;

          const screenX = centerX + x * radius;
          const screenY = centerY + y * radius;

          const depth = (z + 1) / 2;
          const alpha = 0.2 + depth * 0.6;

          if (j === 0) ctx.moveTo(screenX, screenY);
          else ctx.lineTo(screenX, screenY);

          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`;
        }
        ctx.stroke();
      }

      // 3) 입자 — 작은 사이즈에선 비활성.
      if (showParticles) {
        const numParticles =
          state === 'idle' ? 20 : state === 'listening' ? 35 : state === 'thinking' ? 50 : 60;
        const particleSizeBase = Math.max(1, baseRadius * 0.022);
        const particleSizeNoise = Math.max(0.5, baseRadius * 0.016);

        for (let i = 0; i < numParticles; i++) {
          const angle = (i / numParticles) * Math.PI * 2 + time * config.speed * 0.3;
          const radiusOffset = Math.sin(time * 2 + i * 0.5) * baseRadius * 0.25;
          const particleRadius = baseRadius * 1.4 + radiusOffset;

          const x = centerX + Math.cos(angle) * particleRadius;
          const y = centerY + Math.sin(angle) * particleRadius * 0.8;

          const color = BRAND_PALETTE[i % BRAND_PALETTE.length];
          const alpha = 0.4 + Math.sin(time * 3 + i) * 0.3;
          const particleSize = particleSizeBase + Math.sin(time * 2 + i * 0.3) * particleSizeNoise;

          ctx.beginPath();
          ctx.arc(x, y, particleSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
          ctx.fill();

          const particleGlow = ctx.createRadialGradient(x, y, 0, x, y, particleSize * 4);
          particleGlow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);
          particleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.beginPath();
          ctx.arc(x, y, particleSize * 4, 0, Math.PI * 2);
          ctx.fillStyle = particleGlow;
          ctx.fill();
        }
      }

      // 4) 코어 글로우
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 0.6);
      coreGradient.addColorStop(0, `rgba(255, 255, 255, ${0.15 * hoverBoost})`);
      coreGradient.addColorStop(0.3, `rgba(${GLOW_SECONDARY}, ${0.08 * hoverBoost})`);
      coreGradient.addColorStop(0.6, `rgba(${GLOW_PRIMARY}, ${0.06 * hoverBoost})`);
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // 5) 활성 상태 에너지 링 — 너무 작은 사이즈에선 끔.
      if (showRings && state !== 'idle') {
        const numRings = state === 'speaking' ? 3 : state === 'thinking' ? 2 : 1;

        for (let ring = 0; ring < numRings; ring++) {
          const ringProgress = (time * config.speed * 0.5 + ring * 0.3) % 1;
          const ringRadius = baseRadius * (0.85 + ringProgress * 0.8);
          const ringAlpha = (1 - ringProgress) * 0.4;

          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${GLOW_PRIMARY}, ${ringAlpha})`;
          ctx.lineWidth = Math.max(1, baseRadius * 0.018) * (1 - ringProgress);
          ctx.stroke();
        }
      }
    },
    [state, isHovered, interactive, size],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      timeRef.current += 0.016;
      draw(ctx, rect.width, rect.height, timeRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        className={interactive ? 'cursor-pointer transition-transform duration-300 hover:scale-105' : ''}
        style={{ width: size, height: size }}
        onMouseEnter={interactive ? () => setIsHovered(true) : undefined}
        onMouseLeave={interactive ? () => setIsHovered(false) : undefined}
      />
    </div>
  );
}
