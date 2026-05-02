import abstractTransport from 'pino-abstract-transport'
import { Redis } from 'ioredis'

export default async function (opts: { host: string; port: number; password?: string }) {
  const redis = new Redis({
    host: opts.host ?? '127.0.0.1',
    port: opts.port ?? 6379,
    password: opts.password || undefined,
    enableOfflineQueue: true,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  })

  return abstractTransport(
    async function (source: AsyncIterable<string>) {
      for await (const line of source) {
        try {
          await redis.publish('system:logs', JSON.stringify(line))
        } catch {
          // ignore
        }
      }
    },
    {
      parseLine: (line: string) => line,
      async close() {
        try {
          await redis.quit()
        } catch {
          // ignore
        }
      },
    }
  )
}
