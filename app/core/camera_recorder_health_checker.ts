import { exec } from 'node:child_process'

export default class CameraRecorderHealthChecker {
  private readonly rtspLink: string
  private checkerTimer: NodeJS.Timeout | null = null
  private checkerTimerTime = 5 * 60 * 1000

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

  constructor(rtspLink: string) {
    this.rtspLink = rtspLink
  }

  private runCommand(): Promise<boolean> {
    return new Promise((resolve) => {
      exec(
        `curl --head --silent --output /dev/null --show-error --fail --connect-timeout 5 -i -X OPTIONS ${this.rtspLink}`,
        (err) => {
          if (err) {
            resolve(this.isAlive)
            return
          }
          resolve(this.isAlive)
        }
      )
    })
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
