import { RedisService } from '@adonisjs/redis/types'

export const RECORDING_CHANNELS = {
  CAMERA_ADD: 'recording:camera:add',
  CAMERA_REMOVE: 'recording:camera:remove',
} as const

export type RecordingChannel = (typeof RECORDING_CHANNELS)[keyof typeof RECORDING_CHANNELS]

export default class RecordingPubSubService {
  constructor(protected redisService: RedisService) {}

  async publish(channel: RecordingChannel, data: Record<string, unknown>) {
    await this.redisService.publish(channel, JSON.stringify(data))
  }

  async disconnect() {
    await this.redisService.quit()
  }
}
