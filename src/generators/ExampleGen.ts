import { SchemaNode, FieldDefinition } from '../types';
import * as fs from 'node:fs';

export class ExampleGen {
  /**
   * Generates a robust `.env.example` structure based on schema groupings.
   */
  static generate(schema: SchemaNode, outputPath: string = '.env.example'): void {
    const lines = ExampleGen.traverseSchemaForExample(schema);
    fs.writeFileSync(outputPath, lines, 'utf8');
  }

  private static traverseSchemaForExample(schema: SchemaNode): string {
    let rootResult = '';
    let groupResult = '';
    
    for (const key in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        const node = schema[key];
        
        if (typeof node === 'object' && node !== null && !('type' in node)) {
          groupResult += `\n[${key}]\n`;
          for (const subKey in node) {
            const subNode = (node as SchemaNode)[subKey] as FieldDefinition;
            if (subNode.description) {
              groupResult += `# ${subNode.description}\n`;
            }
            if (subNode.required) {
              groupResult += `# REQUIRED\n`;
            }
            const defaultVal = subNode.default !== undefined 
                ? String(subNode.default) 
                : (subNode.required ? `(REQUIRED_${subNode.type})` : '');
            groupResult += `${subKey}=${defaultVal}\n\n`;
          }
        } else {
          const def = node as FieldDefinition;
          if (def.description) {
            rootResult += `# ${def.description}\n`;
          }
          if (def.required) {
            rootResult += `# REQUIRED\n`;
          }
          const defaultVal = def.default !== undefined 
              ? String(def.default) 
              : (def.required ? `(REQUIRED_${def.type})` : '');
          rootResult += `${key}=${defaultVal}\n\n`;
        }
      }
    }
    return (rootResult + groupResult).trim() + '\n';
  }
}
