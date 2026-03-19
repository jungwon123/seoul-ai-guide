'use client';

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'text-bg-base hover:scale-105',
  secondary: 'bg-bg-elevated text-text-primary border border-border-default hover:border-border-active',
  ghost: 'bg-transparent text-neon-mint hover:bg-neon-mint-glow',
  danger: 'bg-neon-coral/20 text-neon-coral border border-neon-coral/30 hover:bg-neon-coral/30',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-[10px] font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      style={variant === 'primary' ? {
        background: 'linear-gradient(135deg, #00FFB2, #00C8A0)',
        boxShadow: props.disabled ? 'none' : '0 0 20px rgba(0, 255, 178, 0.25)',
      } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
