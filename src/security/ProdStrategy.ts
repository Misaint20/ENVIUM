import { IStrategy } from './Strategy';
import { EnvData } from '../types';
import { Injector } from '../core/Injector';

export class ProdStrategy implements IStrategy {
  apply(target: NodeJS.ProcessEnv, data: EnvData): void {
    Injector.inject(target, data, {
      writable: false,
      configurable: false,
    });
  }
}
