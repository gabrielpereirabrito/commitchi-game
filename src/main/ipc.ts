import { ipcMain, type BrowserWindow } from 'electron'
import { IPC_CHANNELS, PetActionSchema } from '@shared/ipc-contract'
import { applyPetAction, getAndDecayPet } from './db'
import { appEvents } from './events'
import { logger } from './logger'

/** Contrato IPC validado com Zod — ver docs/adr/backend/0003-zod-para-contrato-ipc.md. */
export function registerIpcHandlers(getActiveProjectId: () => number): void {
  ipcMain.handle(IPC_CHANNELS.PET_GET, () => {
    return getAndDecayPet(getActiveProjectId())
  })

  ipcMain.handle(IPC_CHANNELS.PET_ACTION, (_event, rawPayload) => {
    const action = PetActionSchema.parse(rawPayload)
    logger.info('[ipc] pet:action', { type: action.type })
    return applyPetAction(getActiveProjectId(), action.type)
  })
}

export function forwardXpGainedEvents(window: BrowserWindow): void {
  appEvents.on('xpGained', (event) => {
    if (!window.isDestroyed()) window.webContents.send(IPC_CHANNELS.PET_XP_GAINED, event)
  })
}
