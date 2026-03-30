import { describe, it, expect, vi, afterEach } from 'vitest';
import { DocGenerator } from '../../src/generators/DocGenerator.js';
import * as fs from 'fs';

vi.mock('fs');

describe('Documentation Generation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should powerfully format complex nested structures into Markdown documentation perfectly mapped!', () => {
    const schema: any = {
      PORT: { type: 'number', required: false, default: 3000, description: 'Server Boot Protocol Port' },
    };

    const fsSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    
    DocGenerator.generateMD(schema, 'unit-test-docs.md');
    
    expect(fsSpy).toHaveBeenCalledWith(
        'unit-test-docs.md', 
        expect.stringContaining('| `PORT` | `number` | ❌ No | `3000` | Server Boot Protocol Port |'), 
        'utf8'
    );
  });
});
