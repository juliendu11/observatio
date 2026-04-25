import { inject } from '@adonisjs/core'
import { spawn } from 'node:child_process'

@inject()
export default class FFMPEGService {
  /**
   * @param url
   * @param resolution - Format accepted 360x460 or 360:460
   * @param segmentTime - In seconds
   */
  recordRTSPToHLS(
    url: string,
    resolution: string,
    segmentTime: number,
    outputPath: string,
    onError: (data: Error) => void,
    onExit: (data: number | null) => void
  ) {
    const args = [
      '-hide_banner',
      '-y',
      '-loglevel',
      'error',
      '-rtsp_transport',
      'tcp',
      // '-stimeout',
      '-timeout',
      '5000000',
      '-use_wallclock_as_timestamps',
      '1',
      '-i',
      url,
      '-vf',
      `scale=${resolution.replace('x', ':')}`,
      '-vcodec',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-r',
      '30',
      '-f',
      'hls',
      '-hls_time',
      segmentTime.toString(),
      '-hls_list_size',
      '0',
      '-hls_segment_filename',
      `${outputPath}/segment_%03d.ts`,
      `${outputPath}/stream.m3u8`,
    ]

    const process = spawn('ffmpeg', args, {
      detached: false,
    })

    process.on('exit', (code) => onExit(code))
    process.stdout.on('error', (chunk) => onError(chunk))
    process.stderr.on('error', (chunk) => onError(chunk))
    process.on('error', (error) => onError(error))

    process.stdout.on('data', () => {})
    process.stderr.on('data', () => {})
    process.on('disconnect', () => {})
    process.on('close', () => {})

    return {
      process,
      args,
    }
  }
}
