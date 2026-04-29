import { EnvData, IStrategy } from '../types/index.js';

export class ProxyFactory {
    /**
     * Creates the root proxy for the environment data
     * @param data - The environment data to proxy (strategy should already be applied)
     * @param strategy - Security strategy for nested operations
     * @returns Proxy with Symbol support for inspection
     */
    static createRootProxy(data: EnvData, strategy: IStrategy): any {
        return this.createNestedProxy(data, strategy);
    }

    /**
     * Creates a nested proxy with Symbol inspection support
     * @param data - The data object to proxy
     * @param strategy - Security strategy for nested objects
     * @returns Proxy with full inspection support
     */
    static createNestedProxy(data: EnvData, strategy: IStrategy): any {
        return new Proxy(data, {
            get(target, prop: string | symbol) {
                if (prop === Symbol.for('nodejs.util.inspect.custom')) {
                    return () => {
                        return target;
                    };
                }

                const value = target[prop as string];

                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    return ProxyFactory.createNestedProxy(value as EnvData, strategy);
                }

                return value;
            },

            set(target, prop: string | symbol, value: any) {
                if (typeof prop === 'string') {
                    target[prop] = value;
                    strategy.apply(process.env, target);
                    return true;
                }
                return false;
            },

            has(target, prop: string | symbol) {
                return prop in target;
            },

            ownKeys(target) {
                return Reflect.ownKeys(target);
            },

            getOwnPropertyDescriptor(target, prop: string | symbol) {
                if (prop === Symbol.for('nodejs.util.inspect.custom')) {
                    return {
                        configurable: true,
                        enumerable: false,
                        value: () => target,
                        writable: true,
                    };
                }

                return Object.getOwnPropertyDescriptor(target, prop);
            }
        });
    }

    /**
     * Creates a proxy specifically for EventEmitter-like behavior
     * Combines environment data access with event capabilities
     * @param data - Environment data
     * @param strategy - Security strategy
     * @param eventEmitter - Optional event emitter for watch functionality
     * @returns Proxy with both data access and event methods
     */
    static createEventedProxy(
        data: EnvData,
        strategy: IStrategy,
        eventEmitter?: any
    ): any {
        const dataProxy = this.createRootProxy(data, strategy);

        if (!eventEmitter) {
            return dataProxy;
        }

        return new Proxy(dataProxy, {
            get(target, prop: string | symbol) {
                if (prop === Symbol.for('nodejs.util.inspect.custom')) {
                    return () => target;
                }

                if (typeof prop === 'string' && eventEmitter && typeof eventEmitter[prop] === 'function') {
                    return eventEmitter[prop].bind(eventEmitter);
                }

                return target[prop];
            }
        });
    }
}