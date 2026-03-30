import { describe, it, expect } from 'vitest';
import { ProdStrategy } from '../../src/security/ProdStrategy.js';

describe('Production Strategy', () => {
  it('should strictly comply to deep-freeze immutability rendering execution variables static natively', () => {
    const strategy = new ProdStrategy();
    const target: any = {};
    const data = { PORT: 3000 };
    
    strategy.apply(target, data as any);
    expect(target.PORT).toBe('3000');
    expect(() => {
      target.PORT = '4000'; // Illegal runtime exception mapped!
    }).toThrowError();
  });
});
