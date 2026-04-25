import { test } from '@japa/runner'
import NotificationService from '#services/notification_service'
import { CameraFactory } from '#database/factories/camera_factory'
import TelegramNotificationService from '#services/telegram_notification_service'
import sinon from 'sinon'

test.group('services - NotificationService', () => {
  test('Should send correct notification to telegram when call sendCameraStatusNotification()', async ({
    assert,
  }) => {
    const telegramNotificationServiceStub = sinon.createStubInstance(TelegramNotificationService)
    telegramNotificationServiceStub.sendMessage.resolves(true)

    const camera = await CameraFactory.make()

    const instance = new NotificationService(telegramNotificationServiceStub)

    await instance.sendCameraStatusNotification(camera, false)
    await instance.sendCameraStatusNotification(camera, true)

    assert.equal(telegramNotificationServiceStub.sendMessage.callCount, 2)

    const firstCallSendMessage = telegramNotificationServiceStub.sendMessage.firstCall
    assert.deepEqual(
      firstCallSendMessage.args[0],
      `*Alerte Caméra*\n\nCaméra: ${camera.label}\nStatut: ❌ Hors ligne`
    )

    const secondCallSendMessage = telegramNotificationServiceStub.sendMessage.secondCall
    assert.deepEqual(
      secondCallSendMessage.args[0],
      `*Alerte Caméra*\n\nCaméra: ${camera.label}\nStatut: ✅ En ligne`
    )
  })
})
