import { InjectionKey } from 'vue'
import { LazyTransmit } from '~/classes/LazyTransmit'

export const transmitClientSymbol = Symbol('transmitClientSymbol')
export const TRANSMIT_CLIENT_KEY: InjectionKey<LazyTransmit> = transmitClientSymbol
