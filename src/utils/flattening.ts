import type { EnvData, SchemaNode, FieldSpec } from '../types/index.js';
import { Caster } from '../core/Caster.js';

export function flattenObject(obj: EnvData, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value as EnvData, newKey));
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

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
            if (!result[key]) {
                result[key] = {};
            }
            (result[key] as EnvData) = unflattenFromSchema(flatData, node as SchemaNode, flatKey);
        } else {
            const fieldSpec = node as FieldSpec;
            const value = flatData[flatKey];

            if (value !== undefined) {
                result[key] = value;
            } else if (fieldSpec.default !== undefined) {
                result[key] = fieldSpec.default;
            } else if (fieldSpec.required) {
                throw new Error(`Required field '${flatKey}' is missing`);
            }
        }
    }

    return result;
}

export function mergeFlattAndGrouped(
    flatVars: Record<string, string>,
    groupedVars: EnvData,
    schema?: SchemaNode,
    options?: { allowLeafFallback?: boolean }
): EnvData {
    const result = { ...groupedVars };

    const allowLeafFallback = options?.allowLeafFallback ?? true;

    for (const flatKey in flatVars) {
        const value = flatVars[flatKey];

        if (schema) {
            const exactPath = findNestedPath(flatKey, schema, [], false);
            if (exactPath) {
                const castValue = Caster.cast(value);
                setNestedValue(result, exactPath, castValue);

                if (exactPath.length > 1 && Object.prototype.hasOwnProperty.call(result, flatKey)) {
                    delete (result as any)[flatKey];
                }

                continue;
            }

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
            const castValue = Caster.cast(value);
            setNestedValue(result, inferredPath, castValue);

            if (Object.prototype.hasOwnProperty.call(result, flatKey)) {
                delete (result as any)[flatKey];
            }
        }
    }

    return result;
}

function inferNestedPath(flatKey: string): string[] {
    return flatKey.split('_');
}

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

export function createFlatAliases(
    nestedData: EnvData,
    prefix = ''
): Record<string, any> {
    return flattenObject(nestedData, prefix);
}

export function addFlatAliasesToData(data: EnvData, schema?: SchemaNode): void {
    if (!schema) return;

    const flatToNestedMap = createFlatToNestedMap(data, schema, '');

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
            Object.assign(map, createFlatToNestedMap(data, node as SchemaNode, newPrefix));
        } else {
            map[newPrefix] = newPrefix.split('_');
        }
    }

    return map;
}

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
            const found = findNestedPath(flatKey, node as SchemaNode, testPath, allowLeafFallback);
            if (found) return found;
        }
    }

    if (allowLeafFallback) {
        const leafHits = findNestedLeafPaths(flatKey, schema, currentPath);
        if (leafHits.length === 1) {
            return leafHits[0];
        }
    }

    return null;
}