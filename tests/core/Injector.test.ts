import { describe, it, expect } from 'vitest';
import { Injector } from '../../src/core/Injector.js';

describe('Injector Engine', () => {
  it('should powerfully flatten scoped hierarchical environment grouping data properly', () => {
    const data = {
      PORT: 3000,
      DATABASE: {
        HOST: 'localhost',
        PORT: 5432
      }
    };
    
    const flattened = Injector.flatten(data as any);
    expect(flattened).toEqual({
      PORT: '3000',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: '5432'
    });
  });

  it('should orchestrate secured injection locking targets efficiently', () => {
    const target: any = {};
    const data = { API_KEY: 'top-secret' };
    
    Injector.inject(target, data as any, { writable: false, configurable: false });
    
    expect(target.API_KEY).toBe('top-secret');
    
    // Testing Immutability compliance (Fails-fast enforcing security)
    expect(() => {
      target.API_KEY = 'hacked-secret';
    }).toThrow();
  });

  it('should explicitly unflatten structural process.env setups dynamically natively relying on schema architecture mapping (Vercel behavior)', () => {
    // Setup flat system vars simulating Vercel/AWS flat layouts
    process.env['FRONTEND_PORT'] = '80';
    process.env['FRONTEND_URL'] = 'https://production.com';
    
    const schema: any = {
      FRONTEND: {
        PORT: { type: 'number', required: true },
        URL: { type: 'string', required: true }
      }
    };
    
    const data: any = {};
    Injector.unflattenSchema(data, schema);
    
    expect(data.FRONTEND).toBeDefined();
    expect(data.FRONTEND.PORT).toBe(80);
    expect(data.FRONTEND.URL).toBe('https://production.com');
  });

  it('should unflatten structured rootData natively when not present in process.env (like parsed .env)', () => {
    // AWS_ENDPOINT is present in rootData (parsed .env), but not in process.env
    const rootData: any = {
      AWS_ENDPOINT: 'http://localhost:4566'
    };
    
    const schema: any = {
      AWS: {
        ENDPOINT: { type: 'string', required: true }
      }
    };
    
    Injector.unflattenSchema(rootData, schema);
    
    expect(rootData.AWS).toBeDefined();
    expect(rootData.AWS.ENDPOINT).toBe('http://localhost:4566');
    // Ensure the flat key was cleaned up
    expect(rootData.AWS_ENDPOINT).toBeUndefined();
  });

  it('should map unnested flat env keys into grouped schema root', () => {
    const processEnv: any = {
      PORT: '4000',
      NODE_ENV: 'development'
    };

    const schema: any = {
      data: {
        PORT: { type: 'number', required: true },
        NODE_ENV: { type: 'string', required: true }
      }
    };

    const merged = Injector.unflattenAndMerge({}, { style: 'flat', keySourceMap: {}, groups: [] }, schema, processEnv);

    expect(merged.data).toBeDefined();
    expect(merged.data.PORT).toBe(4000);
    expect(merged.data.NODE_ENV).toBe('development');
  });

  it('should map root key exactly without deleting it', () => {
    const processEnv: any = {
      PORT: '4000'
    };

    const schema: any = {
      PORT: { type: 'number', required: true }
    };

    const merged = Injector.unflattenAndMerge({}, { style: 'flat', keySourceMap: {}, groups: [] }, schema, processEnv);

    expect(merged.PORT).toBe(4000);
  });

  it('should preserve parsed .env flat keys into nested results on unflattenAndMerge with schema', () => {
    const parsedData: any = {
      AWS_ENDPOINT: 'http://localhost:4566',
      AWS_REGION: 'us-west-2'
    };

    const schema: any = {
      AWS: {
        ENDPOINT: { type: 'string', required: true },
        REGION: { type: 'string', required: true }
      }
    };

    const merged = Injector.unflattenAndMerge(parsedData, { style: 'flat', keySourceMap: {}, groups: [] }, schema, {});

    expect(merged.AWS).toBeDefined();
    expect(merged.AWS.ENDPOINT).toBe('http://localhost:4566');
    expect(merged.AWS.REGION).toBe('us-west-2');
    expect(merged.AWS_ENDPOINT).toBeUndefined();
    expect(merged.AWS_REGION).toBeUndefined();
  });

  it('should map plain flat key to group with unique leaf fallback for schema', () => {
    const processEnv: any = {
      AWS_REGION: 'us-east-1',
      REGION: 'should-be-ignored-if-ambiguous'
    };

    const schema: any = {
      AWS: {
        REGION: { type: 'string', required: true }
      }
    };

    const merged = Injector.unflattenAndMerge({}, { style: 'flat', keySourceMap: {}, groups: [] }, schema, processEnv);

    expect(merged.AWS).toBeDefined();
    expect(merged.AWS.REGION).toBe('us-east-1');

    const merged2 = Injector.unflattenAndMerge({}, { style: 'flat', keySourceMap: {}, groups: [] }, schema, { REGION: 'us-east-2' });
    expect(merged2.AWS).toBeDefined();
    expect(merged2.AWS.REGION).toBe('us-east-2');
  });

  it('should not map unrelated process.env flat names with schema when strict mapping is applied', () => {
    const processEnv: any = {
      HOST: 'unrelated-host',
      DATABASE_HOST: 'db-host'
    };

    const schema: any = {
      DATABASE: {
        HOST: { type: 'string', required: true }
      }
    };

    const merged = Injector.unflattenAndMerge({}, { style: 'flat', keySourceMap: {}, groups: [] }, schema, processEnv);
    expect(merged.DATABASE).toBeDefined();
    expect(merged.DATABASE.HOST).toBe('db-host');
    // Since fallback is enabled, plain HOST is considered for mapping if unique leaf exists; we avoid phantom top-level HOST
    expect(merged.HOST).toBeUndefined();
  });
});
