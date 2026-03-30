import { EnviumConfig, EnvData, SchemaNode, InferSchema, EnvProxy, ParseResult } from './types/index';
import { Parser } from './core/Parser.js';
import { NativeValidator } from './validation/NativeValidator';
import { DevStrategy } from './security/DevStrategy';
import { ProdStrategy } from './security/ProdStrategy';
import { Injector } from './core/Injector';
import { ProxyFactory } from './core/ProxyFactory';
import { addFlatAliasesToData } from './utils/flattening';
import * as fs from 'node:fs';
import { EventEmitter } from 'node:events';

let proxyEnv: any = {};
let isInitialized = false;
let activeMode = 'development';
let eventEmitter: EventEmitter;

/**
 * Initializes the Envium engine. Unifies parsing, validation, injection, and proxy creation.
 * @param config Envium configuration block.
 */
export function init<T extends SchemaNode>(
  config: EnviumConfig & { schema?: T } = {}
): EnvProxy<T> {
  if (isInitialized) return proxyEnv;

  const path = config.path || '.env';

  // Initialize event emitter for watch functionality
  eventEmitter = new EventEmitter();

  // Step 1: Parse .env file
  let parseResult: ParseResult;
  try {
    let content = '';
    if (fs.existsSync(path)) {
      content = fs.readFileSync(path, 'utf8');
    }
    parseResult = Parser.parse(content);
  } catch (error) {
    throw new Error(`[Envium] Failed to parse .env file at ${path}: ${error}`);
  }

  // Decide runtime mode, with prioritization:
  // 1) config.mode
  // 2) NODE_ENV found in parsed .env content
  // 3) process.env.NODE_ENV
  // 4) default to development
  const parsedNodeEnv = (parseResult.data as any).NODE_ENV;
  const mode = (config.mode || parsedNodeEnv || process.env.NODE_ENV || 'development').toLowerCase();
  activeMode = mode;

  if (!process.env.NODE_ENV || process.env.NODE_ENV !== mode) {
    process.env.NODE_ENV = mode;
  }

  // Step 2: Apply schema and unflatten/merge if schema provided
  let unifiedData = parseResult.data;
  if (config.schema) {
    try {
      unifiedData = Injector.unflattenAndMerge(
        parseResult.data,
        parseResult.metadata,
        config.schema
      );
      NativeValidator.validate(unifiedData, config.schema);
    } catch (error) {
      throw new Error(`[Envium] Schema validation failed: ${error}`);
    }
  }

  // Step 4: Add flat aliases to data for destructuring support
  addFlatAliasesToData(unifiedData, config.schema);

  // Step 5: Inject flat aliases into process.env for cloud compatibility
  Injector.createFlatAliases(unifiedData);

  // Step 6: Apply security strategy to the data
  const strategy = mode === 'production'
    ? new ProdStrategy()
    : new DevStrategy(path);

  // Apply strategy to process.env and data
  strategy.apply(process.env, unifiedData);

  // Step 7: Create proxy with Symbol support
  proxyEnv = ProxyFactory.createEventedProxy(unifiedData, strategy, eventEmitter);

  // Step 8: Setup hot-reload for development
  if (strategy instanceof DevStrategy && config.watch !== false) {
    strategy.on('reload', (newParsedData: EnvData) => {
      try {
        let reloadData = newParsedData;
        if (config.schema) {
          // Re-apply schema to the newly parsed data
          // Note: DevStrategy already parsed the content, so we work with the result
          reloadData = Injector.unflattenAndMerge(
            { ...newParsedData }, // Clone to avoid mutation
            { style: 'grouped', keySourceMap: {}, groups: [] }, // Basic metadata for reload
            config.schema
          );
          NativeValidator.validate(reloadData, config.schema);
        }

        // Add flat aliases to reloaded data
        addFlatAliasesToData(reloadData, config.schema);

        // Update the underlying data (proxy will reflect changes)
        Object.keys(unifiedData).forEach(key => delete unifiedData[key]);
        Object.assign(unifiedData, reloadData);

        // Emit reload event
        eventEmitter.emit('reload', reloadData);
      } catch (e: any) {
        console.error('[Envium] Hot-Reload rejected due to schema error:', e.message);
      }
    });
  }

  isInitialized = true;
  return proxyEnv;
}

// Export the env proxy with proper typing
const envRootTarget: any = {};

Object.defineProperty(envRootTarget, Symbol.for('nodejs.util.inspect.custom'), {
  configurable: true,
  enumerable: false,
  writable: true,
  value: () => (activeMode === 'production' ? {} : proxyEnv),
});

export const env: any = new Proxy(envRootTarget, {
  get(target, prop: string | symbol) {
    if (!isInitialized) {
      if (prop === Symbol.for('nodejs.util.inspect.custom')) {
        return () => '[Envium: Uninitialized]';
      }
      throw new Error('[Envium] Not initialized! Call init() before accessing env variables.');
    }

    return proxyEnv[prop as string];
  },

  getOwnPropertyDescriptor(target, prop: string | symbol) {
    if (prop === Symbol.for('nodejs.util.inspect.custom')) {
      return {
        configurable: true,
        enumerable: false,
        value: () => (activeMode === 'production' ? {} : proxyEnv),
        writable: true,
      };
    }

    return Object.getOwnPropertyDescriptor(target, prop);
  },

  ownKeys(target) {
    return Reflect.ownKeys(proxyEnv);
  }
});

// Event emitter methods on env proxy
Object.defineProperty(env, 'on', {
  value: (event: string, listener: (...args: any[]) => void) => {
    if (eventEmitter) eventEmitter.on(event, listener);
  },
  enumerable: false,
  configurable: false
});

Object.defineProperty(env, 'off', {
  value: (event: string, listener: (...args: any[]) => void) => {
    if (eventEmitter) eventEmitter.off(event, listener);
  },
  enumerable: false,
  configurable: false
});

Object.defineProperty(env, 'emit', {
  value: (event: string, ...args: any[]) => {
    return eventEmitter ? eventEmitter.emit(event, ...args) : false;
  },
  enumerable: false,
  configurable: false
});

export const envium = {
  init,
  get env() {
    return env;
  }
};

export default envium;
