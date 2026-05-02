import SSEService from '#services/sse_service'
import net from 'node:net'
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
  private tcpServer: net.Server | undefined

  constructor(protected sseService: SSEService) {}

  async start() {
    this.tcpServer = net.createServer()
    this.tcpServer.on('connection', (sock) => {
      sock.on('data', (data) => {
        this.sseService.emitLogMessage(data.toString() as any)
      })
    })
    this.tcpServer.listen(3250, '127.0.0.1')
  }

  async stop() {
    this.tcpServer?.close()
  }
}
