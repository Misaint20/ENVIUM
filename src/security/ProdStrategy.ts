import { IStrategy } from './Strategy';
import { EnvData } from '../types';
import { Injector } from '../core/Injector';

export class ProdStrategy implements IStrategy {
  apply(target: NodeJS.ProcessEnv, data: EnvData): void {
    // In Production mode, variables are strictly locked
    // writable: false, configurable: false
    Injector.inject(target, data, {
      writable: false,
      configurable: false,
    });

    // We can also Deep Freeze the target object if needed, 
    // although injecting with non-configurable takes care of the exact properties updated.
  }
}
