import { describe, it, expect, vi, afterEach } from 'vitest';
import { TypeGen } from '../../src/generators/TypeGen.js';
import * as fs from 'fs';

vi.mock('fs');

describe('TypeScript Autocomplete Generators', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should deeply translate validation schema instances actively creating global node and proxy augmentations strictly executed', () => {
    const schema: any = {
      PORT: { type: 'number', required: true },
      DB: { HOST: { type: 'string', required: false } }
    };

    const generatorExecutionHook = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    
    TypeGen.generate(schema, 'testing-envium.d.ts');
    
    const argumentBlockOutput = generatorExecutionHook.mock.calls[0][1] as string;
    
    // Assert process.env flatted typings injected appropriately!
    expect(argumentBlockOutput).toContain('PORT: string;');
    expect(argumentBlockOutput).toContain('DB_HOST?: string;');
    
    // Validate custom library proxy definition augmentations safely executing!
    expect(argumentBlockOutput).toContain('PORT: number;');
    expect(argumentBlockOutput).toContain('HOST?: string;');
  });
});
