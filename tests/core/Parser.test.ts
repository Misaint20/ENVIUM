import { describe, it, expect } from 'vitest';
import { Parser } from '../../src/core/Parser';

describe('Parser', () => {
  it('should parse simple key-value pairs at the root level', () => {
    const content = `
      PORT=3000
      HOST=localhost
      DEBUG=true
    `;
    const result = Parser.parse(content);
    expect(result.data.PORT).toBe(3000);
    expect(result.data.HOST).toBe('localhost');
    expect(result.data.DEBUG).toBe(true);
  });

  it('should parse [GROUP] blocks correctly', () => {
    const content = `
      [DATABASE]
      PORT=5432
      HOST=db.local
    `;
    const result = Parser.parse(content);
    expect(result.data.DATABASE).toBeDefined();
    expect((result.data.DATABASE as any).PORT).toBe(5432);
    expect((result.data.DATABASE as any).HOST).toBe('db.local');
  });

  it('should trim quotes from string values', () => {
    const content = `
      SECRET="my-secret-key"
      TOKEN='token-123'
    `;
    const result = Parser.parse(content);
    expect(result.data.SECRET).toBe('my-secret-key');
    expect(result.data.TOKEN).toBe('token-123');
  });

  it('should handle group closing tags gracefully mapping root scope natively', () => {
    const content = `
      [SERVER]
      PORT=3000
      [/SERVER]
      ROOT_CONFIG=true
    `;
    const result = Parser.parse(content);
    expect((result.data.SERVER as any).PORT).toBe(3000);
    expect(result.data.ROOT_CONFIG).toBe(true);
  });

  it('should ignore comments', () => {
    const content = `
      # This is a comment
      API_KEY=123
    `;
    const result = Parser.parse(content);
    expect(result.data.API_KEY).toBe(123);
  });

  it('should parse inline grouped declarations like [AWS] ENDPOINT=value', () => {
    const content = `
      [AWS] ENDPOINT=http://localhost:4566
      [AWS] REGION=us-west-2
    `;
    const result = Parser.parse(content);

    expect(result.data.AWS).toBeDefined();
    expect((result.data.AWS as any).ENDPOINT).toBe('http://localhost:4566');
    expect((result.data.AWS as any).REGION).toBe('us-west-2');
    expect(result.metadata.style).toBe('grouped');
  });
});
