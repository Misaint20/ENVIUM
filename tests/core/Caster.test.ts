import { describe, it, expect } from 'vitest';
import { Caster } from '../../src/core/Caster.js';

describe('Caster Engine', () => {
  it('should correctly cast "true" and "false" into booleans', () => {
    expect(Caster.cast('true')).toBe(true);
    expect(Caster.cast('false')).toBe(false);
    expect(Caster.cast('TRUE')).toBe(true);
  });

  it('should seamlessly identify numeric strings into numbers', () => {
    expect(Caster.cast('42')).toBe(42);
    expect(Caster.cast('3.14')).toBe(3.14);
    expect(Caster.cast('0')).toBe(0);
    expect(Caster.cast('-99')).toBe(-99);
  });

  it('should explicitly fallback empty strings protecting runtime integrity', () => {
    expect(Caster.cast('')).toBe('');
    expect(Caster.cast('   ')).toBe('   ');
  });

  it('should bypass non-castable strings mapping them organically', () => {
    expect(Caster.cast('Envium Rules')).toBe('Envium Rules');
    expect(Caster.cast('123abcde')).toBe('123abcde');
  });
});
