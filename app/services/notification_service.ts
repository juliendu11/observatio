import { inject } from '@adonisjs/core'
import TelegramNotificationService from '#services/telegram_notification_service'
import Camera from '#models/camera'

@inject()
export default class NotificationService {
  constructor(protected telegramNotificationService: TelegramNotificationService) {}

  async sendCameraStatusNotification(camera: Camera, isAlive: boolean): Promise<void> {
    const status = isAlive ? '✅ En ligne' : '❌ Hors ligne'
    const message = `*Alerte Caméra*\n\nCaméra: ${camera.label}\nStatut: ${status}`

    await this.telegramNotificationService.sendMessage(message)
  }
}
