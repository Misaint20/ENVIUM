import { describe, it, expect, vi } from 'vitest';
import { DevStrategy } from '../../src/security/DevStrategy.js';
import * as fs from 'fs';

vi.mock('fs');

describe('Development Hot Reloading Strategy', () => {
  it('should effortlessly setup watcher hooks bypassing mutability locks', () => {
    const strategy = new DevStrategy('mock-envium.env');
    const target: any = {};
    const data = { DEBUG: true };
    
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const watchSpy = vi.spyOn(fs, 'watch').mockImplementation(() => { return {} as any; });

    strategy.apply(target, data as any);
    
    // Validate mutable integration natively mapped efficiently!
    expect(target.DEBUG).toBe('true');
    target.DEBUG = 'false';
    expect(target.DEBUG).toBe('false');

    expect(watchSpy).toHaveBeenCalledWith('mock-envium.env', expect.any(Function));
  });
});
