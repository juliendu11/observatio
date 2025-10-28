import { onMounted, onUnmounted } from 'vue'
import { useTransmitClient } from '~/composables/useServices'
import { createEventHook } from '@vueuse/core'

export const useSSESubscription = <T>(url: string) => {
  let subscription: any = null

  const transmitClient = useTransmitClient()

  const result = createEventHook<T>()

  onMounted(async () => {
    subscription = transmitClient.subscription(url)

    subscription.onMessage((data: T) => {
      result.trigger(data)
    })

    await subscription.create()
  })

  onUnmounted(async () => {
    if (subscription) await subscription.delete()
  })

  return {
    onResult: result.on,
  }
}
