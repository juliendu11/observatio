import SSEService from '#services/sse_service'
import net from 'node:net'
import app from '@adonisjs/core/services/app'

export interface SystemLog {
  level: number
  time: number
  pid: number
  hostname: string
  msg: string
  name?: string
}

export default class SystemLogsService {
  private tcpServer: net.Server | undefined

  async start() {
    const sseService = await app.container.make(SSEService)

    this.tcpServer = net.createServer()
    this.tcpServer.on('connection', function (sock) {
      sock.on('data', function (data) {
        sseService.emitLogMessage(data.toString() as any)
      })
    })
    this.tcpServer.listen(3250, '127.0.0.1')
  }

  async stop() {
    this.tcpServer?.close()
  }
}
