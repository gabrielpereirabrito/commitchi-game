import { EventEmitter } from 'events'
import type { XpGainedEvent } from '@shared/ipc-contract'

interface AppEvents {
  xpGained: (event: XpGainedEvent) => void
}

class TypedAppEvents extends EventEmitter {
  emit<K extends keyof AppEvents>(event: K, ...args: Parameters<AppEvents[K]>): boolean {
    return super.emit(event, ...args)
  }
  on<K extends keyof AppEvents>(event: K, listener: AppEvents[K]): this {
    return super.on(event, listener)
  }
}

export const appEvents = new TypedAppEvents()
