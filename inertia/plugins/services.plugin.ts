import { TRANSMIT_CLIENT_KEY } from '~/symbols'
import { App } from 'vue'
import { LazyTransmit } from '~/classes/LazyTransmit'

export default {
  install: (app: App) => {
    const transmit = new LazyTransmit({
      baseUrl: window.location.origin,
    })

    app.provide(TRANSMIT_CLIENT_KEY, transmit)
  },
}
