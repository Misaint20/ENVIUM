/**
 * Proxy Factory for Envium
 *
 * Creates proxies with Symbol.for('nodejs.util.inspect.custom') support
 * to enable proper console.log() output and deep inspection.
 */

import { EnvData, IStrategy } from '../types/index.js';

export class ProxyFactory {
    /**
     * Creates the root proxy for the environment data
     * @param data - The environment data to proxy (strategy should already be applied)
     * @param strategy - Security strategy for nested operations
     * @returns Proxy with Symbol support for inspection
     */
    static createRootProxy(data: EnvData, strategy: IStrategy): any {
        // Note: Strategy should already be applied to data before calling this method
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
                // Handle Symbol.for('nodejs.util.inspect.custom') for console.log support
                if (prop === Symbol.for('nodejs.util.inspect.custom')) {
                    return () => {
                        // Return the actual data for inspection
                        // In production, strategy might return empty object
                        return target;
                    };
                }

                const value = target[prop as string];

                // If it's an object and not null, create a nested proxy
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    return ProxyFactory.createNestedProxy(value as EnvData, strategy);
                }

                // Return primitive values directly
                return value;
            },

            set(target, prop: string | symbol, value: any) {
                // Allow setting if strategy permits
                if (typeof prop === 'string') {
                    target[prop] = value;
                    // Re-apply strategy after modification (for dev mode hot-reload)
                    strategy.apply(process.env, target);
                    return true;
                }
                return false;
            },

            has(target, prop: string | symbol) {
                // Support 'in' operator
                return prop in target;
            },

            ownKeys(target) {
                // Support Object.keys(), for...in loops
                return Reflect.ownKeys(target);
            },

            getOwnPropertyDescriptor(target, prop: string | symbol) {
                // Support custom inspect hook for console.log debugging
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

        // Return a proxy that combines data access with event methods
        return new Proxy(dataProxy, {
            get(target, prop: string | symbol) {
                // Handle Symbol inspection
                if (prop === Symbol.for('nodejs.util.inspect.custom')) {
                    return () => target;
                }

                // Check if it's an event emitter method
                if (typeof prop === 'string' && eventEmitter && typeof eventEmitter[prop] === 'function') {
                    return eventEmitter[prop].bind(eventEmitter);
                }

                // Otherwise, delegate to data proxy
                return target[prop];
            }
        });
    }
}