export type EnvValue = string | number | boolean;
export type EnvGroup = { [key: string]: EnvValue | EnvGroup };
export type EnvData = { [key: string]: EnvValue | EnvGroup };

export type FieldType = 'string' | 'number' | 'boolean';

export type FieldSpec = {
  type: FieldType;
  required?: boolean;
  default?: any;
  description?: string;
};

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

export interface ParseMetadata {
  style: 'grouped' | 'flat' | 'mixed';
  keySourceMap: Record<string, string>;
  groups: string[];
}

export interface ParseResult {
  data: EnvData;
  metadata: ParseMetadata;
}

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

export type SchemaField<T extends FieldSpec> = T['required'] extends true
  ? InferType<T['type']>
  : InferType<T['type']> | undefined;

export interface EnvChanges {
  keys: string[];
  changes: Record<string, { old: any; new: any }>;
  data: EnvData;
}

export type EnvProxy<T extends SchemaNode = any> = InferSchema<T> & {
  on?(event: string, listener: (...args: any[]) => void): void;
  off?(event: string, listener: (...args: any[]) => void): void;
  emit?(event: string, ...args: any[]): boolean;
  onChange?(keys: string | string[], listener: (changes: EnvChanges) => void): void;
};
