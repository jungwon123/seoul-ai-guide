'use client';

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-bg-primary hover:brightness-110 shadow-glow',
  secondary: 'bg-bg-elevated text-text-primary hover:bg-bg-elevated/80 border border-border-default',
  ghost: 'bg-transparent text-brand-primary hover:bg-brand-primary/10',
  danger: 'bg-accent-coral text-white hover:brightness-110',
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
        'rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
