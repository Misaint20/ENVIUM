import { describe, it, expect } from 'vitest';
import { NativeValidator } from '../../src/validation/NativeValidator.js';
import { SchemaNode } from '../../src/types/index.js';

describe('NativeValidator Engine Validation', () => {
  const schema: SchemaNode = {
    PORT: { type: 'number', required: true, default: 8080 },
    API_URL: { type: 'string', required: true },
    DEBUG: { type: 'boolean', required: false },
    DB: {
      HOST: { type: 'string', required: true },
      PORT: { type: 'number', required: false, default: 5432 }
    }
  };

  it('should flawlessly validate variables scaling default fallbacks actively', () => {
    const data: any = {
      API_URL: 'https://api.example.com',
      DB: {
        HOST: 'localhost'
      }
    };
    
    NativeValidator.validate(data, schema);
    
    expect(data.PORT).toBe(8080); // Default applied natively
    expect(data.DB.PORT).toBe(5432); // Deep default nested validation passed successfully!
  });

  it('should enforce fail-fast breaking exceptions if REQUIRED fields are missing', () => {
    const data: any = {};
    expect(() => NativeValidator.validate(data, schema)).toThrowError(/Missing required environment variable/);
  });

  it('should heavily enforce static fail-fast strict validations matching structural expectations', () => {
    const data: any = {
      PORT: 'Not a number string layout',
      API_URL: 'https://api.example.com',
      DB: { HOST: 'localhost' }
    };
    expect(() => NativeValidator.validate(data, schema)).toThrowError(/Type mismatch/);
  });
});
