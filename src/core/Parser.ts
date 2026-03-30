import { Caster } from './Caster';
import { EnvData, EnvGroup, ParseResult, ParseMetadata } from '../types';

export class Parser {
  /**
   * Parses `.env` content, grouping variables if `[GROUP]` syntax is found.
   * Returns both parsed data and metadata about the parsing process.
   */
  static parse(envContent: string): ParseResult {
    const lines = envContent.split('\n');
    const result: EnvData = {};
    const metadata: ParseMetadata = {
      style: 'flat',
      keySourceMap: {},
      groups: []
    };

    let currentGroup: EnvGroup = result;
    let currentGroupPath: string[] = [];

    for (let line of lines) {
      line = line.trim();

      // Ignore empty lines and comments
      if (!line || line.startsWith('#')) continue;

      // Match inline group + key, e.g. [GROUP] KEY=value
      const inlineGroupKvMatch = line.match(/^\s*\[([^\]]+)\]\s+([^=]+)=(.*)$/);
      if (inlineGroupKvMatch) {
        const groupName = inlineGroupKvMatch[1].trim();
        const key = inlineGroupKvMatch[2].trim();
        let value = inlineGroupKvMatch[3].trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Ensure group exists
        if (!result[groupName]) {
          result[groupName] = {};
        }

        if (!metadata.groups.includes(groupName)) {
          metadata.groups.push(groupName);
        }

        metadata.style = 'grouped';

        // Cast and assign
        (result[groupName] as EnvGroup)[key] = Caster.cast(value);
        const nestedKey = [groupName, key].join('.');
        const flatKey = [groupName, key].join('_');
        metadata.keySourceMap[nestedKey] = flatKey;

        continue;
      }

      // Match group headers e.g. [DATABASE]
      const groupMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
      if (groupMatch) {
        const groupName = groupMatch[1].trim();

        // Handle closing tags: e.g. [/DATABASE] or []
        if (groupName.startsWith('/') || groupName === '') {
          currentGroup = result; // Return to root scope
          currentGroupPath = [];
          continue;
        }

        // Opening a new group
        if (!result[groupName]) {
          result[groupName] = {};
        }

        // Track group in metadata
        if (!metadata.groups.includes(groupName)) {
          metadata.groups.push(groupName);
        }

        currentGroup = result[groupName] as EnvGroup;
        currentGroupPath = [groupName];
        metadata.style = 'grouped'; // At least one group found
        continue;
      }

      // Match key=value
      const kvMatch = line.match(/^([^=]+)=(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        let value = kvMatch[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Cast the value
        const castValue = Caster.cast(value);

        // Store in current group
        currentGroup[key] = castValue;

        // Track in metadata: map nested key to original flat key
        const nestedKey = [...currentGroupPath, key].join('.');
        const flatKey = [...currentGroupPath, key].join('_');
        metadata.keySourceMap[nestedKey] = flatKey;
      }
    }

    // If we have both groups and root-level keys, mark as mixed
    const hasRootKeys = Object.keys(result).some(key =>
      typeof result[key] !== 'object' || Array.isArray(result[key])
    );
    if (metadata.groups.length > 0 && hasRootKeys) {
      metadata.style = 'mixed';
    }

    return { data: result, metadata };
  }
}
