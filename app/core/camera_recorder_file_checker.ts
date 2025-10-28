import { FSWatcher, watch } from 'node:fs'
import dayjs from 'dayjs'

export default class CameraRecorderFileChecker {
  private readonly folderPath: string

  private lastChange: Date | null = null

  private checkerTimerToLaunch: NodeJS.Timeout | null = null
  private checkerTimer: NodeJS.Timeout | null = null
  private checkerTimerTime = 5 * 60 * 1000 + 10 * 1000

  private watcher: FSWatcher | null = null

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

  constructor(folderPath: string) {
    this.folderPath = folderPath
  }

  private startWatcher() {
    this.watcher = watch(
      this.folderPath,
      { encoding: 'buffer', recursive: true },
      async (eventType) => {
        if (eventType === 'change') {
          this.lastChange = new Date()
        }
      }
    )
  }

  private startTick() {
    this.checkerTimer = setInterval(() => {
      const currentDate = dayjs()
      const lastChangeParsedDate = dayjs(this.lastChange)

      if (currentDate.diff(lastChangeParsedDate, 'minutes') > 5) {
        this.isAlive = false
      } else {
        this.isAlive = true
      }
    }, this.checkerTimerTime)
  }

  start() {
    this.isAlive = true

    this.startWatcher()
    this.startTick()
  }

  stop() {
    if (this.checkerTimer) {
      clearInterval(this.checkerTimer)
    }
    if (this.watcher) {
      this.watcher.close()
    }
    if (this.checkerTimerToLaunch) {
      clearInterval(this.checkerTimerToLaunch)
    }
  }
}
