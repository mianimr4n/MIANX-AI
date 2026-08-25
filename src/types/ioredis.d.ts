// Type declaration for optional ioredis dependency (used by rate-limit.ts)
declare module 'ioredis' {
  import { EventEmitter } from 'events'

  interface RedisOptions {
    host?: string
    port?: number
    password?: string
    db?: number
    keyPrefix?: string
    retryStrategy?: (times: number) => number | null
    maxRetriesPerRequest?: number
    enableReadyCheck?: boolean
    lazyConnect?: boolean
    connectTimeout?: number
  }

  class Redis extends EventEmitter {
    constructor(options?: RedisOptions | string)
    get(key: string): Promise<string | null>
    set(key: string, value: string, ...args: unknown[]): Promise<unknown>
    del(key: string | string[]): Promise<number>
    expire(key: string, seconds: number): Promise<number>
    ttl(key: string): Promise<number>
    keys(pattern: string): Promise<string[]>
    ping(): Promise<string>
    info(section?: string): Promise<string>
    on(event: string, callback: (...args: unknown[]) => void): this
    connect(): Promise<void>
    disconnect(): Promise<void>
    quit(): Promise<string>
  }

  export { Redis, RedisOptions }
}