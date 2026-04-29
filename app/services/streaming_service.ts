import { ChildProcess } from 'node:child_process'
import type { WebSocket } from 'ws'
import { Logger } from '@adonisjs/core/logger'
import { inject } from '@adonisjs/core'
import FFMPEGService from '#services/ffmpeg_service'

interface StreamCache {
  process: ChildProcess
  clients: Set<WebSocket>
  initBuffer: Buffer[]
}

/**
 * Live streaming management via WebSocket.
 *
 * Management logic to use the same ffmpeg process if multiple users want to view the same camera.
 *
 * Suppression of the ffmpeg process if there is no longer a live connection to the camera.
 */
@inject()
export default class StreamingService {
  private streams: Map<string, StreamCache> = new Map()
  private logger: Logger

  constructor(
    protected parentLogger: Logger,
    protected ffmpegService: FFMPEGService
  ) {
    this.logger = parentLogger.child({
      name: `StreamingService`,
    })
  }

  async newConnection(ws: WebSocket, streamId: string): Promise<void> {
    let stream = this.streams.get(streamId)

    if (!stream) {
      this.logger.debug({ stream: { id: streamId } }, 'Starting new FFmpeg process for stream')

      stream = this.createStream(streamId)
      this.streams.set(streamId, stream)
    } else {
      this.logger.debug({ stream: { id: streamId } }, 'Reusing existing FFmpeg process for stream')

      for (const chunk of stream.initBuffer) {
        if (ws.readyState === ws.OPEN) {
          ws.send(chunk)
        }
      }
    }

    stream.clients.add(ws)

    this.logger.debug({}, `Number of connected clients: ${stream.clients.size}`)

    ws.on('close', () => {
      this.logger.debug({}, 'Client disconnected')

      const currentStream = this.streams.get(streamId)

      if (currentStream) {
        currentStream.clients.delete(ws)

        this.logger.debug({}, `Remaining client from stream ${currentStream.clients.size}`)

        if (currentStream.clients.size === 0) {
          this.logger.debug(
            { stream: { id: streamId } },
            'No clients remaining, stopping FFmpeg process'
          )

          this.stopStream(streamId)
        }
      }
    })

    ws.on('error', (error) => {
      this.logger.error({ err: error }, 'WebSocket error occurred')
    })
  }

  private createStream(streamId: string): StreamCache {
    const clients = new Set<WebSocket>()
    const initBuffer: Buffer[] = []
    let isInitBufferComplete = false

    let chunkCount = 0

    const { process } = this.ffmpegService.convertRTSPToMp4MSEStreaming(
      (chunk: Buffer) => {
        chunkCount++

        // Keep the first chunks for initialization (ftyp + moov)
        // These chunks are essential for new clients
        if (!isInitBufferComplete && chunkCount <= 10) {
          initBuffer.push(chunk)

          // Mark the buffer as full after a few chunks
          if (chunkCount === 10) {
            isInitBufferComplete = true

            this.logger.debug(
              { stream: { id: streamId } },
              `Full init buffer (${initBuffer.length} chunks)`
            )
          }
        }

        // Broadcast the chunk to all connected clients
        clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(chunk)
          }
        })
      },
      (data: Error) => {
        this.logger.error({ err: data }, 'FFmpeg process error')

        this.stopStream(streamId)
      },
      (code: number | null) => {
        this.logger.debug({ code, stream: { id: streamId } }, 'FFmpeg process closed')

        clients.forEach((client) => {
          try {
            client.close()
          } catch {}
        })

        this.streams.delete(streamId)
      }
    )

    return { process, clients, initBuffer }
  }

  private stopStream(streamId: string): void {
    const stream = this.streams.get(streamId)

    if (stream) {
      this.logger.debug({ stream: { id: streamId } }, 'Stopping FFmpeg process')

      try {
        stream.process.kill('SIGINT')
      } catch (error) {
        this.logger.error({ err: error }, 'Error stopping FFmpeg process')
      }

      this.streams.delete(streamId)
    }
  }
}
