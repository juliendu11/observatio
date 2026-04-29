import { inject } from '@adonisjs/core'
import { exec, spawn } from 'node:child_process'
import { promisify } from 'node:util'

@inject()
export default class FFMPEGService {
  convertRTSPToMp4MSEStreaming(
    onData: (chunk: Buffer) => void,
    onError: (data: Error) => void,
    onClose: (code: number | null) => void
  ) {
    const args = [
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
    ]

    const process = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'inherit'] })

    process.stdout.on('data', (chunk: Buffer) => onData(chunk))
    process.on('error', (error) => onError(error))
    process.on('close', (code) => onClose(code))

    return { process, args }
  }

  async convertHLSToMp4(
    hlsStreamPath: string,
    hlsListPath: string,
    hlsListMergedPath: string,
    mp4FIlePath: string
  ) {
    const sh = promisify(exec)

    // 1) Générer list.txt avec ../ devant chaque ligne
    await sh(`grep -v '^#' ${hlsStreamPath} | sed "s|^|file '../|; s|$|'|" > ${hlsListPath}`)

    // 2) Concaténer les TS en un seul
    await sh(`ffmpeg -y -f concat -safe 0 -i ${hlsListPath} -c copy ${hlsListMergedPath}`, {
      maxBuffer: 10 * 1024 * 1024,
    })

    // 3) Remux en MP4
    await sh(
      `ffmpeg -y -i ${hlsListMergedPath} -c copy -bsf:a aac_adtstoasc -movflags +faststart ${mp4FIlePath}`,
      {
        maxBuffer: 10 * 1024 * 1024,
      }
    )
  }

  /**
   * @param url
   * @param resolution - Format accepted 360x460 or 360:460
   * @param segmentTime - In seconds
   * @param outputPath
   * @param onError
   * @param onExit
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
