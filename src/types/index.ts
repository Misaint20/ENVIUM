export type EnvValue = string | number | boolean;
export type EnvGroup = { [key: string]: EnvValue | EnvGroup };
export type EnvData = { [key: string]: EnvValue | EnvGroup };

export type FieldType = 'string' | 'number' | 'boolean';

// Enhanced field definition with discriminated union
export type FieldSpec = {
  type: FieldType;
  required?: boolean;
  default?: any;
  description?: string;
};

// Legacy interface for backward compatibility
export interface FieldDefinition extends FieldSpec {}

export interface SchemaNode {
  [key: string]: FieldDefinition | SchemaNode;
}

export interface IStrategy {
  apply(target: NodeJS.ProcessEnv, data: EnvData): void;
}

export interface EnviumConfig {
  path?: string;
  mode?: 'development' | 'production';
  watch?: boolean;
  schema?: SchemaNode;
}

// Metadata for parsing results
export interface ParseMetadata {
  style: 'grouped' | 'flat' | 'mixed';
  keySourceMap: Record<string, string>; // nested key -> original flat key
  groups: string[]; // List of group names found
}

// Enhanced parse result
export interface ParseResult {
  data: EnvData;
  metadata: ParseMetadata;
}

// Magia de TypeScript para inferir el tipo directamente del esquema en código
export type InferType<T> = T extends 'number' ? number : T extends 'boolean' ? boolean : string;

export type InferSchema<T> = T extends SchemaNode
  ? {
      -readonly [K in keyof T]: T[K] extends { type: infer U }
        ? InferType<U>
        : T[K] extends SchemaNode
        ? InferSchema<T[K]>
        : never;
    }
  : never;

// Utility type for schema validation
export type SchemaField<T extends FieldSpec> = T['required'] extends true
  ? InferType<T['type']>
  : InferType<T['type']> | undefined;

// Type for the env proxy with event emitter capabilities
export type EnvProxy<T extends SchemaNode = any> = InferSchema<T> & {
  on?(event: string, listener: (...args: any[]) => void): void;
  off?(event: string, listener: (...args: any[]) => void): void;
  emit?(event: string, ...args: any[]): boolean;
};
