import { describe, it, expect, vi, afterEach } from 'vitest';
import { ExampleGen } from '../../src/generators/ExampleGen.js';
import * as fs from 'fs';

vi.mock('fs');

describe('Example Generating DX CLI Bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should dynamically produce robust .env.example placeholder footprints preserving grouping syntaxes natively!', () => {
    const schema: any = {
      PORT: { type: 'number', required: true, default: 3000, description: 'Protocol Port Allocation' },
      API_KEY: { type: 'string', required: true },
      DB: {
        HOST: { type: 'string', required: true },
      }
    };

    const spyExecution = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    
    ExampleGen.generate(schema, 'testing-pipeline.env.example');
    
    expect(spyExecution).toHaveBeenCalledWith('testing-pipeline.env.example', expect.stringContaining('# Protocol Port Allocation'), 'utf8');
    expect(spyExecution).toHaveBeenCalledWith('testing-pipeline.env.example', expect.stringContaining('PORT=3000'), 'utf8');
    expect(spyExecution).toHaveBeenCalledWith('testing-pipeline.env.example', expect.stringContaining('API_KEY=(REQUIRED_string)'), 'utf8'); // Placeholder validation check!
    expect(spyExecution).toHaveBeenCalledWith('testing-pipeline.env.example', expect.stringContaining('[DB]'), 'utf8');
    expect(spyExecution).toHaveBeenCalledWith('testing-pipeline.env.example', expect.stringContaining('HOST=(REQUIRED_string)'), 'utf8');
  });
});
