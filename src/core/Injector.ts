import { EnvData, EnvGroup, SchemaNode, ParseMetadata } from '../types/index';
import { Caster } from './Caster';
import { mergeFlattAndGrouped, createFlatAliases } from '../utils/flattening';

export class Injector {
  /**
   * Flattens a grouped EnvData into a one-dimensional record.
   * Format: GROUP_KEY
   */
  static flatten(data: EnvData, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (typeof value === 'object' && value !== null) {
          Object.assign(result, Injector.flatten(value as EnvGroup, newKey));
        } else {
          result[newKey] = String(value);
        }
      }
    }
    return result;
  }

  /**
   * Unified unflattening and merging of flat and grouped environment variables.
   * Handles both process.env flat keys and parsed grouped structure.
   */
  static unflattenAndMerge(
    parsedData: EnvData,
    metadata: ParseMetadata,
    schema?: SchemaNode,
    processEnv: Record<string, string> = process.env as Record<string, string>
  ): EnvData {
    let result: EnvData = { ...parsedData };

    const parsedFlat = Injector.flatten(parsedData);

    if (schema) {
      result = mergeFlattAndGrouped(parsedFlat, result, schema, { allowLeafFallback: true });
      result = mergeFlattAndGrouped(processEnv, result, schema, { allowLeafFallback: true });
    } else {
      result = mergeFlattAndGrouped(parsedFlat, result);
      result = mergeFlattAndGrouped(processEnv, result);
    }

    return result;
  }

  /**
   * Legacy method - kept for backward compatibility but deprecated.
   * Use unflattenAndMerge instead.
   */
  static unflattenSchema(data: EnvData, schema: SchemaNode, prefix = '', rootData: EnvData = data): void {
    console.warn('[Envium] unflattenSchema is deprecated. Use unflattenAndMerge instead.');
    for (const key in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        const node = schema[key];
        const flatKey = prefix ? `${prefix}_${key}` : key;

        if (typeof node === 'object' && node !== null && !('type' in node)) {
          if (!data[key] || typeof data[key] !== 'object') {
            data[key] = {};
          }
          Injector.unflattenSchema(data[key] as EnvData, node as SchemaNode, flatKey, rootData);
        } else {
          const envValue = process.env[flatKey];
          const rootDataValue = rootData[flatKey];

          if (envValue !== undefined) {
            data[key] = Caster.cast(envValue as string);
          } else if (rootDataValue !== undefined && prefix !== '') {
            data[key] = rootDataValue;
            delete rootData[flatKey];
          }
        }
      }
    }
  }

  /**
   * Creates flat aliases in process.env for cloud platform compatibility.
   * This ensures that third-party libraries expecting flat keys still work.
   */
  static createFlatAliases(data: EnvData, target: Record<string, any> = process.env): void {
    const flatAliases = createFlatAliases(data);

    for (const flatKey in flatAliases) {
      if (!(flatKey in target)) {
        target[flatKey] = flatAliases[flatKey];
      }
    }
  }

  /**
   * Injects properties into a target object using Object.defineProperty
   * to strictly control mutability.
   */
  static inject(
    target: NodeJS.ProcessEnv | Record<string, any>,
    data: EnvData,
    options: { writable: boolean; configurable: boolean }
  ): void {
    const flattened = Injector.flatten(data);

    for (const key in flattened) {
      if (Object.prototype.hasOwnProperty.call(flattened, key)) {
        Object.defineProperty(target, key, {
          value: flattened[key],
          writable: options.writable,
          enumerable: true,
          configurable: options.configurable,
        });
      }
    }
  }
}
