'use client';

interface NeonIconProps {
  path: string;
  color?: string;
  size?: number;
  glow?: boolean;
}

export default function NeonIcon({ path, color = '#00FFB2', size = 24, glow = true }: NeonIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={glow ? { filter: `drop-shadow(0 0 12px ${color})` } : undefined}
    >
      <path d={path} />
    </svg>
  );
}
