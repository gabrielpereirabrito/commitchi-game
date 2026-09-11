import { create } from 'zustand'
import type { Pet, PetAction } from '@shared/ipc-contract'

interface PetStore {
  pet: Pet | null
  isLoading: boolean
  fetchPet: () => Promise<void>
  sendAction: (type: PetAction['type']) => Promise<void>
}

export const usePetStore = create<PetStore>((set) => ({
  pet: null,
  isLoading: true,
  fetchPet: async () => {
    const pet = await window.api.getPet()
    set({ pet, isLoading: false })
  },
  sendAction: async (type) => {
    const pet = await window.api.doAction({ type })
    set({ pet })
  }
}))
