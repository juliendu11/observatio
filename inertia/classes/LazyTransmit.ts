/*
 * @adonisjs/transmit-client
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Modified version that allows a lazy connection
 * https://github.com/adonisjs/transmit-client/blob/develop/src/transmit.ts
 */

import { HookEvent } from '@adonisjs/transmit-client/src//hook_event.js'
import { Hook } from '@adonisjs/transmit-client/src//hook.js'
import { HttpClient } from '@adonisjs/transmit-client/src//http_client.js'
import { TransmitStatus } from '@adonisjs/transmit-client/src//transmit_status.js'
import { Subscription } from '@adonisjs/transmit-client/src/subscription'

interface TransmitOptions {
  baseUrl: string
  beforeSubscribe?: (request: RequestInit) => void
  beforeUnsubscribe?: (request: RequestInit) => void
  eventSourceFactory?: (url: string | URL, options: { withCredentials: boolean }) => EventSource
  eventTargetFactory?: () => EventTarget | null
  httpClientFactory?: (baseUrl: string, uid: string) => HttpClient
  maxReconnectAttempts?: number
  onReconnectAttempt?: (attempt: number) => void
  onReconnectFailed?: () => void
  onSubscribeFailed?: (response: Response) => void
  onSubscription?: (channel: string) => void
  onUnsubscription?: (channel: string) => void
  uidGenerator?: () => string
}

export class LazyTransmit {
  /**
   * Returns the unique identifier of the client.
   */
  get uid() {
    return this.#uid
  }

  /**
   * EventSource instance.
   */
  #eventSource: EventSource | undefined

  /**
   * EventTarget instance.
   */
  #eventTarget: EventTarget | null

  /**
   * Hook instance.
   */
  #hooks: Hook

  /**
   * HTTP client instance.
   */
  #httpClient: HttpClient

  /**
   * Options for this client.
   */
  #options: TransmitOptions

  /**
   * Number of reconnect attempts.
   */
  #reconnectAttempts: number = 0

  /**
   * Current status of the client.
   */
  #status: TransmitStatus = TransmitStatus.Initializing

  /**
   * Registered subscriptions.
   */
  #subscriptions = new Map<string, Subscription>()

  /**
   * Unique identifier for this client.
   */
  #uid: string

  constructor(options: TransmitOptions) {
    if (typeof options.uidGenerator === 'undefined') {
      options.uidGenerator = () => crypto.randomUUID()
    }

    if (typeof options.eventSourceFactory === 'undefined') {
      options.eventSourceFactory = (...args) => new EventSource(...args)
    }

    if (typeof options.eventTargetFactory === 'undefined') {
      options.eventTargetFactory = () => new EventTarget()
    }

    if (typeof options.httpClientFactory === 'undefined') {
      options.httpClientFactory = (baseUrl, uid) => new HttpClient({ baseUrl, uid })
    }

    if (typeof options.maxReconnectAttempts === 'undefined') {
      options.maxReconnectAttempts = 5
    }

    this.#uid = options.uidGenerator()
    this.#eventTarget = options.eventTargetFactory()
    this.#hooks = new Hook()
    this.#httpClient = options.httpClientFactory(options.baseUrl, this.#uid)

    if (options.beforeSubscribe) {
      this.#hooks.register(HookEvent.BeforeSubscribe, options.beforeSubscribe)
    }

    if (options.beforeUnsubscribe) {
      this.#hooks.register(HookEvent.BeforeUnsubscribe, options.beforeUnsubscribe)
    }

    if (options.onReconnectAttempt) {
      this.#hooks.register(HookEvent.OnReconnectAttempt, options.onReconnectAttempt)
    }

    if (options.onReconnectFailed) {
      this.#hooks.register(HookEvent.OnReconnectFailed, options.onReconnectFailed)
    }

    if (options.onSubscribeFailed) {
      this.#hooks.register(HookEvent.OnSubscribeFailed, options.onSubscribeFailed)
    }

    if (options.onSubscription) {
      this.#hooks.register(HookEvent.OnSubscription, options.onSubscription)
    }

    if (options.onUnsubscription) {
      this.#hooks.register(HookEvent.OnUnsubscription, options.onUnsubscription)
    }

    this.#options = options
  }

  close() {
    this.#eventSource?.close()
  }

  connect() {
    this.#changeStatus(TransmitStatus.Connecting)

    const url = new URL(`${this.#options.baseUrl}/__transmit/events`)
    url.searchParams.append('uid', this.#uid)

    this.#eventSource = this.#options.eventSourceFactory!(url, {
      withCredentials: true,
    })

    this.#eventSource.addEventListener('message', this.#onMessage.bind(this))
    this.#eventSource.addEventListener('error', this.#onError.bind(this))
    this.#eventSource.addEventListener('open', () => {
      this.#changeStatus(TransmitStatus.Connected)
      this.#reconnectAttempts = 0

      for (const subscription of this.#subscriptions.values()) {
        if (subscription.isCreated) {
          void subscription.forceCreate()
        }
      }
    })
  }

  on(event: Exclude<TransmitStatus, 'connecting'>, callback: (event: CustomEvent) => void) {
    // @ts-ignore
    this.#eventTarget?.addEventListener(event, callback)
  }

  subscription(channel: string) {
    const subscription = new Subscription({
      channel,
      getEventSourceStatus: () => this.#status,
      hooks: this.#hooks,
      httpClient: this.#httpClient,
    })

    if (this.#subscriptions.has(channel)) {
      return this.#subscriptions.get(channel)!
    }

    this.#subscriptions.set(channel, subscription)

    return subscription
  }

  #changeStatus(status: TransmitStatus) {
    this.#status = status
    this.#eventTarget?.dispatchEvent(new CustomEvent(status))
  }

  #onError() {
    if (this.#status !== TransmitStatus.Reconnecting) {
      this.#changeStatus(TransmitStatus.Disconnected)
    }

    this.#changeStatus(TransmitStatus.Reconnecting)

    this.#hooks.onReconnectAttempt(this.#reconnectAttempts + 1)

    if (
      this.#options.maxReconnectAttempts &&
      this.#reconnectAttempts >= this.#options.maxReconnectAttempts
    ) {
      this.#eventSource!.close()

      this.#hooks.onReconnectFailed()

      return
    }

    this.#reconnectAttempts++
  }

  #onMessage(event: MessageEvent) {
    const data = JSON.parse(event.data)
    const subscription = this.#subscriptions.get(data.channel)

    if (typeof subscription === 'undefined') {
      return
    }

    try {
      subscription.$runHandler(data.payload)
    } catch (error) {
      // TODO: Rescue
      console.log(error)
    }
  }
}
