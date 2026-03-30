/**
 * Unified Flattening/Unflattening Utilities for Envium
 *
 * Handles conversion between nested objects and flat key structures,
 * supporting both grouped ([AWS] ENDPOINT) and flat (AWS_ENDPOINT) styles.
 */

import type { EnvData, SchemaNode, FieldSpec } from '../types/index.js';
import { Caster } from '../core/Caster.js';

/**
 * Flattens a nested object into flat key-value pairs
 * @param obj - The nested object to flatten
 * @param prefix - Current prefix for nested keys
 * @returns Flat object with underscore-separated keys
 */
export function flattenObject(obj: EnvData, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursively flatten nested objects
            Object.assign(result, flattenObject(value as EnvData, newKey));
        } else {
            // Leaf value
            result[newKey] = value;
        }
    }

    return result;
}

/**
 * Unflattens flat keys into nested structure using schema guidance
 * @param flatData - Flat key-value pairs (e.g., { AWS_ENDPOINT: 'value' })
 * @param schema - Schema definition to guide nesting
 * @param prefix - Current prefix for nested keys
 * @returns Nested object structure
 */
export function unflattenFromSchema(
    flatData: Record<string, any>,
    schema: SchemaNode,
    prefix = ''
): EnvData {
    const result: EnvData = {};

    for (const key in schema) {
        const node = schema[key];
        const flatKey = prefix ? `${prefix}_${key}` : key;

        if (typeof node === 'object' && node !== null && !('type' in node)) {
            // This is a nested group/schema object
            if (!result[key]) {
                result[key] = {};
            }
            // Recursively unflatten nested schema
            (result[key] as EnvData) = unflattenFromSchema(flatData, node as SchemaNode, flatKey);
        } else {
            // This is a leaf field specification
            const fieldSpec = node as FieldSpec;
            const value = flatData[flatKey];

            if (value !== undefined) {
                result[key] = value; // Will be cast later by Caster
            } else if (fieldSpec.default !== undefined) {
                result[key] = fieldSpec.default;
            } else if (fieldSpec.required) {
                throw new Error(`Required field '${flatKey}' is missing`);
            }
        }
    }

    return result;
}

/**
 * Merges flat environment variables with grouped parsed data
 * Handles conflicts by preferring grouped structure over flat
 * @param flatVars - Variables from process.env (flat keys)
 * @param groupedVars - Variables from .env parsing (nested structure)
 * @param schema - Optional schema for validation
 * @returns Unified nested structure
 */
export function mergeFlattAndGrouped(
    flatVars: Record<string, string>,
    groupedVars: EnvData,
    schema?: SchemaNode,
    options?: { allowLeafFallback?: boolean }
): EnvData {
    const result = { ...groupedVars }; // Start with grouped structure

    const allowLeafFallback = options?.allowLeafFallback ?? true;

    for (const flatKey in flatVars) {
        const value = flatVars[flatKey];

        if (schema) {
            // First attempt exact mapping based on schema path.
            const exactPath = findNestedPath(flatKey, schema, [], false);
            if (exactPath) {
                const castValue = Caster.cast(value);
                setNestedValue(result, exactPath, castValue);

                // Keep root-level scalar values in place when the key matches schema root exactly.
                // For nested keys we can remove the flat alias after unflattening.
                if (exactPath.length > 1 && Object.prototype.hasOwnProperty.call(result, flatKey)) {
                    delete (result as any)[flatKey];
                }

                continue;
            }

            // Fallback: match leaf where unique, but do not override existing mapped values.
            if (allowLeafFallback) {
                const fallbackPath = findNestedPath(flatKey, schema, [], true);
                if (fallbackPath) {
                    const existing = getNestedValue(result, fallbackPath);
                    if (existing === undefined) {
                        const castValue = Caster.cast(value);
                        setNestedValue(result, fallbackPath, castValue);

                        if (Object.prototype.hasOwnProperty.call(result, flatKey)) {
                            delete (result as any)[flatKey];
                        }
                    }
                }
            }

            continue;
        }

        const inferredPath = inferNestedPath(flatKey);
        if (inferredPath.length > 1) {
            // Map flat keys into nested shape even if the group does not already exist
            const castValue = Caster.cast(value);
            setNestedValue(result, inferredPath, castValue);

            if (Object.prototype.hasOwnProperty.call(result, flatKey)) {
                delete (result as any)[flatKey];
            }
        }
    }

    return result;
}

/**
 * Infers nested path from flat key by splitting on underscores
 * @param flatKey - Flat key like 'AWS_ENDPOINT'
 * @returns Array of path segments
 */
function inferNestedPath(flatKey: string): string[] {
    return flatKey.split('_');
}

/**
 * Sets a value at a nested path in an object
 * @param obj - Object to modify
 * @param path - Path segments
 * @param value - Value to set
 */
function setNestedValue(obj: EnvData, path: string[], value: any): void {
    let current = obj;

    for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        if (!current[segment] || typeof current[segment] !== 'object') {
            current[segment] = {};
        }
        current = current[segment] as EnvData;
    }

    current[path[path.length - 1]] = value;
}

function getNestedValue(obj: EnvData, path: string[]): any {
    let current: any = obj;
    for (const segment of path) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}

/**
 * Creates flat aliases for nested structure (for cloud platform compatibility)
 * @param nestedData - Nested structure
 * @param prefix - Current prefix
 * @returns Flat key-value pairs
 */
export function createFlatAliases(
    nestedData: EnvData,
    prefix = ''
): Record<string, any> {
    return flattenObject(nestedData, prefix);
}

/**
 * Adds flat aliases directly to the data object for destructuring support
 * @param data - The nested data object to modify
 * @param schema - Schema to determine which keys to flatten (optional)
 */
export function addFlatAliasesToData(data: EnvData, schema?: SchemaNode): void {
    if (!schema) return;

    // Create a map of flattened keys to their nested values
    const flatToNestedMap = createFlatToNestedMap(data, schema, '');

    // Add aliases to the appropriate groups
    for (const [flatKey, nestedPath] of Object.entries(flatToNestedMap)) {
        const value = getNestedValue(data, nestedPath);
        if (value !== undefined) {
            const parts = flatKey.split('_');
            if (parts.length >= 2) {
                const groupName = parts[0];
                const aliasKey = parts.slice(1).join('_');
                if (data[groupName] && typeof data[groupName] === 'object') {
                    (data[groupName] as any)[aliasKey] = value;
                }
            }
        }
    }
}

/**
 * Creates a map from flattened keys to their nested paths
 * @param data - Data object (for structure reference)
 * @param schema - Schema definition
 * @param prefix - Current prefix
 * @returns Map of flat keys to nested paths
 */
function createFlatToNestedMap(
    data: EnvData,
    schema: SchemaNode,
    prefix: string
): Record<string, string[]> {
    const map: Record<string, string[]> = {};

    for (const key in schema) {
        const node = schema[key];
        const newPrefix = prefix ? `${prefix}_${key}` : key;

        if (typeof node === 'object' && node !== null && !('type' in node)) {
            // Nested group - recurse
            Object.assign(map, createFlatToNestedMap(data, node as SchemaNode, newPrefix));
        } else {
            // Leaf field
            map[newPrefix] = newPrefix.split('_');
        }
    }

    return map;
}

/**
 * Finds the nested path for a flat key using schema
 * @param flatKey - Flat key like 'AWS_ENDPOINT'
 * @param schema - Schema to search
 * @param currentPath - Current path being explored
 * @returns Array of path segments or null if not found
 */
function findNestedLeafPaths(
    flatKey: string,
    schema: SchemaNode,
    currentPath: string[] = []
): string[][] {
    let matches: string[][] = [];

    for (const key in schema) {
        const node = schema[key];
        const nodePath = [...currentPath, key];

        if (typeof node === 'object' && node !== null && 'type' in node) {
            if (key === flatKey) {
                matches.push(nodePath);
            }
        } else if (typeof node === 'object' && node !== null) {
            matches = matches.concat(findNestedLeafPaths(flatKey, node as SchemaNode, nodePath));
        }
    }

    return matches;
}

export function findNestedPath(
    flatKey: string,
    schema: SchemaNode,
    currentPath: string[] = [],
    allowLeafFallback = true
): string[] | null {
    for (const key in schema) {
        const node = schema[key];
        const testPath = [...currentPath, key];
        const testFlatKey = testPath.join('_');

        if (testFlatKey === flatKey) {
            return testPath;
        }

        if (typeof node === 'object' && node !== null && !('type' in node)) {
            // Recurse into nested schema
            const found = findNestedPath(flatKey, node as SchemaNode, testPath, allowLeafFallback);
            if (found) return found;
        }
    }

    if (allowLeafFallback) {
        // Fallback: if flatKey matches a leaf property name in sub-schema, resolve to that mapping
        const leafHits = findNestedLeafPaths(flatKey, schema, currentPath);
        if (leafHits.length === 1) {
            return leafHits[0];
        }
    }

    return null;
}