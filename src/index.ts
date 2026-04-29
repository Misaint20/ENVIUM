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

export function init<T extends SchemaNode>(
  config: EnviumConfig & { schema?: T } = {}
): EnvProxy<T> {
  if (isInitialized) return proxyEnv;

  const path = config.path || '.env';

  eventEmitter = new EventEmitter();

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

  const parsedNodeEnv = (parseResult.data as any).NODE_ENV;
  const mode = (config.mode || parsedNodeEnv || process.env.NODE_ENV || 'development').toLowerCase();
  activeMode = mode;

  if (!process.env.NODE_ENV || process.env.NODE_ENV !== mode) {
    process.env.NODE_ENV = mode;
  }

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

  addFlatAliasesToData(unifiedData, config.schema);

  Injector.createFlatAliases(unifiedData);

  const strategy = mode === 'production'
    ? new ProdStrategy()
    : new DevStrategy(path);

  strategy.apply(process.env, unifiedData);

  proxyEnv = ProxyFactory.createEventedProxy(unifiedData, strategy, eventEmitter);

  if (strategy instanceof DevStrategy && config.watch !== false) {
    let previousState = { ...unifiedData };

    strategy.on('reload', (newParsedData: EnvData) => {
      try {
        let reloadData = newParsedData;
        if (config.schema) {
          reloadData = Injector.unflattenAndMerge(
            { ...newParsedData },
            { style: 'grouped', keySourceMap: {}, groups: [] },
            config.schema
          );
          NativeValidator.validate(reloadData, config.schema);
        }

        addFlatAliasesToData(reloadData, config.schema);

        const changedKeys: string[] = [];
        const changes: Record<string, { old: any; new: any }> = {};

        const allKeys = new Set([...Object.keys(previousState), ...Object.keys(reloadData)]);
        allKeys.forEach((key) => {
          // Use JSON.stringify to compare potentially nested objects
          if (JSON.stringify(previousState[key]) !== JSON.stringify(reloadData[key])) {
            changedKeys.push(key);
            changes[key] = { old: previousState[key], new: reloadData[key] };
          }
        });

        if (changedKeys.length === 0) return;

        previousState = { ...reloadData };

        Object.keys(unifiedData).forEach(key => delete unifiedData[key]);
        Object.assign(unifiedData, reloadData);

        const changeEvent = {
          keys: changedKeys,
          changes,
          data: unifiedData
        };

        eventEmitter.emit('change', changeEvent);
        eventEmitter.emit('reload', changeEvent);
      } catch (e: any) {
        console.error('[Envium] Hot-Reload rejected due to schema error:', e.message);
      }
    });
  }

  isInitialized = true;
  return proxyEnv;
}

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
      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop);
      }
      throw new Error('[Envium] Not initialized! Call init() before accessing env variables.');
    }

    if (Reflect.has(target, prop)) {
      return Reflect.get(target, prop);
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

    if (Reflect.has(target, prop)) {
      return Object.getOwnPropertyDescriptor(target, prop);
    }

    if (isInitialized && proxyEnv) {
      return Object.getOwnPropertyDescriptor(proxyEnv, prop);
    }

    return undefined;
  },

  ownKeys(target) {
    return Reflect.ownKeys(proxyEnv);
  }
});

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

Object.defineProperty(env, 'onChange', {
  value: (keys: string | string[], listener: (changes: any) => void) => {
    const keysToWatch = Array.isArray(keys) ? keys : [keys];
    if (eventEmitter) {
      eventEmitter.on('change', (event: any) => {
        const hasRelevantChange = event.keys.some((key: string) => 
          keysToWatch.some(watchKey => key.includes(watchKey))
        );
        if (hasRelevantChange) {
          listener(event);
        }
      });
    }
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
