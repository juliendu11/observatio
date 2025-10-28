import { TRANSMIT_CLIENT_KEY } from '~/symbols'
import { inject, InjectionKey } from 'vue'

const getItem = <T>(key: InjectionKey<T>): T => {
  const item = inject(key)
  if (!item) {
    throw new Error('Unable to get service: ' + key.description)
  }

  return item as T
}

export const useTransmitClient = () => getItem(TRANSMIT_CLIENT_KEY)
