import { describe, it, expect } from 'vitest';
import { cn, AGENT_CONFIG, AGENT_COLORS, CATEGORY_CONFIG } from './utils';

describe('cn', () => {
  it('should join truthy classes', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('should filter falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('should return empty string for no args', () => {
    expect(cn()).toBe('');
  });
});

describe('AGENT_CONFIG', () => {
  it('should have all three agents', () => {
    expect(AGENT_CONFIG.claude).toBeDefined();
    expect(AGENT_CONFIG.gpt).toBeDefined();
    expect(AGENT_CONFIG.gemini).toBeDefined();
  });

  it('should have label and color for each agent', () => {
    Object.values(AGENT_CONFIG).forEach((config) => {
      expect(config.label).toBeTruthy();
      expect(config.color).toBeTruthy();
      expect(config.company).toBeTruthy();
    });
  });
});

describe('AGENT_COLORS', () => {
  it('should have hex colors', () => {
    Object.values(AGENT_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('CATEGORY_CONFIG', () => {
  it('should have all categories', () => {
    expect(CATEGORY_CONFIG.tourism).toBeDefined();
    expect(CATEGORY_CONFIG.shopping).toBeDefined();
    expect(CATEGORY_CONFIG.culture).toBeDefined();
    expect(CATEGORY_CONFIG.food).toBeDefined();
  });
});
