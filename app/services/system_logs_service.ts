import SSEService from '#services/sse_service'
import env from '#start/env'
import { Redis } from 'ioredis'
import { inject } from '@adonisjs/core'

export interface SystemLog {
  level: number
  time: number
  pid: number
  hostname: string
  msg: string
  name?: string
}

@inject()
export default class SystemLogsService {
  private subscriber: Redis | undefined

  constructor(protected sseService: SSEService) {}

  async start() {
    this.subscriber = new Redis({
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD') || undefined,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    })

    await this.subscriber.subscribe('system:logs')
    this.subscriber.on('message', (_channel, message) => {
      try {
        const parsedMessage = JSON.parse(message)
        const log = JSON.parse(parsedMessage.data) as SystemLog
        this.sseService.emitLogMessage(log)
      } catch {
        // ignore malformed messages
      }
    })
  }

  async stop() {
    await this.subscriber?.quit()
  }
}
