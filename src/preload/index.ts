import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type Pet, type PetAction, type XpGainedEvent } from '@shared/ipc-contract'

const api = {
  getPet: (): Promise<Pet> => ipcRenderer.invoke(IPC_CHANNELS.PET_GET),
  doAction: (action: PetAction): Promise<Pet> => ipcRenderer.invoke(IPC_CHANNELS.PET_ACTION, action),
  onXpGained: (callback: (event: XpGainedEvent) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: XpGainedEvent): void => callback(payload)
    ipcRenderer.on(IPC_CHANNELS.PET_XP_GAINED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PET_XP_GAINED, listener)
  },
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  hideWindow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_HIDE)
}

export type CommitchiApi = typeof api

contextBridge.exposeInMainWorld('api', api)
