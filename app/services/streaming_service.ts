import { ChildProcess, spawn } from 'node:child_process'
import type { WebSocket } from 'ws'
import { Logger } from '@adonisjs/core/logger'
import { inject } from '@adonisjs/core'

interface StreamCache {
  process: ChildProcess
  clients: Set<WebSocket>
  initBuffer: Buffer[]
}

@inject()
export default class StreamingService {
  private streams: Map<string, StreamCache> = new Map()
  private logger: Logger

  constructor(protected parentLogger: Logger) {
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

    // Launch FFmpeg to produce fMP4 (H.264) suitable for MSE
    const ff = spawn(
      'ffmpeg',
      [
        '-hide_banner',
        '-y',
        '-loglevel',
        'error',
        '-re', // reads at real speed (useful for "live" from a file)
        '-rtsp_transport',
        'tcp',
        '-i',
        'rtsp://admin:R45cb700@192.168.1.8:554/11',
        // Low-latency H.264 video
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-tune',
        'zerolatency',
        '-g',
        '48', // GOP size (at ~2 s if 24 fps)
        '-keyint_min',
        '48',
        '-sc_threshold',
        '0',
        '-pix_fmt',
        'yuv420p',
        // No audio
        '-an',
        // Important for producing a fragmented MP4 file compatible with MSE
        '-movflags',
        'frag_keyframe+empty_moov+default_base_moof+omit_tfhd_offset',
        '-f',
        'mp4',
        '-', // output to stdout
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    )

    let chunkCount = 0

    ff.stdout.on('data', (chunk: Buffer) => {
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
    })

    ff.on('error', (error) => {
      this.logger.error({ err: error }, 'FFmpeg process error')

      this.stopStream(streamId)
    })

    ff.on('close', (code) => {
      this.logger.debug({ code, stream: { id: streamId } }, 'FFmpeg process closed')

      clients.forEach((client) => {
        try {
          client.close()
        } catch {}
      })

      this.streams.delete(streamId)
    })

    return { process: ff, clients, initBuffer }
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
