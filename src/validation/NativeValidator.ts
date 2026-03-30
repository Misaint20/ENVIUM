import { EnvData, SchemaNode, FieldDefinition } from '../types';

export class NativeValidator {
  /**
   * Validates environmental data against the provided schema definition.
   * Modifies the data argument with defaults if missing but available.
   * Throws errors immediately upon invalidation.
   */
  static validate(data: EnvData, schema: SchemaNode, prefix = ''): void {
    for (const key in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        const fieldOrNode = schema[key];
        const dataValue = data[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;

        // Nested grouped section
        if (typeof fieldOrNode === 'object' && fieldOrNode !== null && !('type' in fieldOrNode)) {
          if (dataValue !== undefined && (typeof dataValue !== 'object' || dataValue === null)) {
            throw new Error(`[Envium Validation] Expected group [${fullKey}] but received a scalar/primitive value.`);
          }
          NativeValidator.validate(
            (dataValue || {}) as EnvData,
            fieldOrNode as SchemaNode,
            fullKey
          );

          if (dataValue === undefined) {
            // In case child defaults are resolved, update original data value
            data[key] = data[key] || {};
          }
          continue;
        }

        const definition = fieldOrNode as FieldDefinition;

        // Nullish handling
        if (dataValue === undefined) {
          if (definition.default !== undefined) {
            data[key] = definition.default;
            continue;
          }
          if (definition.required) {
            const extraHelp = prefix 
              ? `Ensure it exists and is defined INSIDE the [${prefix}] sub-group tag and not outside.`
              : 'The variable must be defined at the environment root without any parent groups.';
            
            throw new Error(`[Envium Validation] Missing required environment variable: '${fullKey}'. ${extraHelp}`);
          }
          continue;
        }

        // Exact Type matching validation
        const actualType = typeof dataValue;
        if (actualType !== definition.type) {
          throw new Error(`[Envium Validation] Type mismatch in '${fullKey}'. Expected ${definition.type}, but got ${actualType}`);
        }
      }
    }
  }
}
