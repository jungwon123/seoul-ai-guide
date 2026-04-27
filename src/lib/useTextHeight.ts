

import { useRef, useMemo } from 'react';
import { prepare, layout } from '@chenglou/pretext';

/**
 * Uses Pretext to predict text height without DOM reflow.
 * Returns a stable minHeight so the container doesn't jump during streaming.
 */
export function useTextHeight(
  text: string,
  containerWidth: number,
  font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  lineHeight = 23.8, // 14px * 1.7 line-height
): number {
  const prevHeight = useRef(0);

  const height = useMemo(() => {
    if (!text || containerWidth <= 0) return 0;
    try {
      const prepared = prepare(text, font);
      const result = layout(prepared, containerWidth, lineHeight);
      return result.height;
    } catch {
      return 0;
    }
  }, [text, containerWidth, font, lineHeight]);

  // Only grow, never shrink during streaming (prevents jumps)
  if (height > prevHeight.current) {
    prevHeight.current = height;
  }

  return prevHeight.current;
}
