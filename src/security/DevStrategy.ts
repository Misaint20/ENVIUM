import * as fs from 'node:fs';
import { EventEmitter } from 'events';
import { IStrategy } from './Strategy';
import { EnvData } from '../types';
import { Injector } from '../core/Injector';
import { Parser } from '../core/Parser';

export class DevStrategy extends EventEmitter implements IStrategy {
  private envPath: string;

  constructor(envPath: string = '.env') {
    super();
    this.envPath = envPath;
  }

  apply(target: NodeJS.ProcessEnv, data: EnvData): void {
    // In Dev mode, properties are injected but mutable.
    Injector.inject(target, data, {
      writable: true,
      configurable: true,
    });

    this.setupWatcher(target);
  }

  private setupWatcher(target: NodeJS.ProcessEnv): void {
    if (!fs.existsSync(this.envPath)) {
      return;
    }

    // Setup an fs watcher for hot-reload
    fs.watch(this.envPath, (eventType) => {
      if (eventType === 'change') {
        try {
          const content = fs.readFileSync(this.envPath, 'utf8');
          const parseResult = Parser.parse(content);

          Injector.inject(target, parseResult.data, {
            writable: true,
            configurable: true,
          });

          this.emit('reload', parseResult.data);
        } catch (error) {
          console.error('[Envium] Error reloading .env file', error);
        }
      }
    });
  }
}
