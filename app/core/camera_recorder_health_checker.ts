import { promisifyExec } from '#helpers/process_helper'

export type CameraRecorderHealthCheckerConfig = {
  interval?: {
    runEvery: number
  }
  connect?: {
    /**
     * In seconds
     */
    timeout: number
  }
}

export default class CameraRecorderHealthChecker {
  private readonly rtspLink: string
  private checkerTimer: NodeJS.Timeout | null = null

  private readonly checkerTimerTime: number = 5 * 60 * 1000

  /**
   * In seconds
   */
  private readonly connectTimeout: number = 5

  private _isAlive: boolean = false

  public aliveListener: ((isAlive: boolean) => void) | null = null

  public get isAlive(): boolean {
    return this._isAlive
  }

  public set isAlive(value: boolean) {
    this._isAlive = value

    if (this.aliveListener) {
      this.aliveListener(this._isAlive)
    }
  }

  constructor(rtspLink: string, config?: CameraRecorderHealthCheckerConfig) {
    this.rtspLink = rtspLink

    if (config && config.interval) {
      this.checkerTimerTime = config.interval.runEvery
    }
    if (config && config.connect) {
      this.connectTimeout = config.connect.timeout
    }
  }

  private async runCommand(): Promise<boolean> {
    try {
      const result = await promisifyExec(
        `curl --head --silent --output /dev/null --show-error --fail --connect-timeout ${this.connectTimeout} -i -X OPTIONS ${this.rtspLink}`
      )

      return !result.stderr
    } catch {
      return false
    }
  }

  start() {
    this.isAlive = true

    this.checkerTimer = setInterval(async () => {
      this.isAlive = await this.runCommand()
    }, this.checkerTimerTime)
  }

  stop() {
    if (this.checkerTimer) {
      clearInterval(this.checkerTimer)
    }
  }
}
