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

      if (!line || line.startsWith('#')) continue;

      const inlineGroupKvMatch = line.match(/^\s*\[([^\]]+)\]\s+([^=]+)=(.*)$/);
      if (inlineGroupKvMatch) {
        const groupName = inlineGroupKvMatch[1].trim();
        const key = inlineGroupKvMatch[2].trim();
        let value = inlineGroupKvMatch[3].trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        if (!result[groupName]) {
          result[groupName] = {};
        }

        if (!metadata.groups.includes(groupName)) {
          metadata.groups.push(groupName);
        }

        metadata.style = 'grouped';

        (result[groupName] as EnvGroup)[key] = Caster.cast(value);
        const nestedKey = [groupName, key].join('.');
        const flatKey = [groupName, key].join('_');
        metadata.keySourceMap[nestedKey] = flatKey;

        continue;
      }

      const groupMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
      if (groupMatch) {
        const groupName = groupMatch[1].trim();

        if (groupName.startsWith('/') || groupName === '') {
          currentGroup = result;
          currentGroupPath = [];
          continue;
        }

        if (!result[groupName]) {
          result[groupName] = {};
        }

        if (!metadata.groups.includes(groupName)) {
          metadata.groups.push(groupName);
        }

        currentGroup = result[groupName] as EnvGroup;
        currentGroupPath = [groupName];
        metadata.style = 'grouped';
        continue;
      }

      const kvMatch = line.match(/^([^=]+)=(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        let value = kvMatch[2].trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        const castValue = Caster.cast(value);

        currentGroup[key] = castValue;

        const nestedKey = [...currentGroupPath, key].join('.');
        const flatKey = [...currentGroupPath, key].join('_');
        metadata.keySourceMap[nestedKey] = flatKey;
      }
    }

    const hasRootKeys = Object.keys(result).some(key =>
      typeof result[key] !== 'object' || Array.isArray(result[key])
    );
    if (metadata.groups.length > 0 && hasRootKeys) {
      metadata.style = 'mixed';
    }

    return { data: result, metadata };
  }
}
