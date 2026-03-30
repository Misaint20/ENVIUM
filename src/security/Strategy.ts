import { EnvData } from '../types';

export interface IStrategy {
  /**
   * Applies the parsed environment data to the process.env according
   * to the rules of the specific environment strategy.
   * @param target The object to inject to, usually process.env
   * @param data The parsed layout of environment variables
   */
  apply(target: NodeJS.ProcessEnv, data: EnvData): void;
}
