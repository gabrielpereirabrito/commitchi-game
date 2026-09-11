import { z } from 'zod'

/**
 * Contrato de mensagens IPC entre renderer e main process.
 * Ver docs/adr/backend/0003-zod-para-contrato-ipc.md.
 */

export const PetStateSchema = z.enum(['idle', 'sleeping', 'eating', 'celebrating', 'sad'])
export type PetState = z.infer<typeof PetStateSchema>

export const PetSchema = z.object({
  projectId: z.number().int(),
  repoPath: z.string(),
  xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  hunger: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  state: PetStateSchema
})
export type Pet = z.infer<typeof PetSchema>

export const PetActionSchema = z.object({
  type: z.enum(['FEED', 'SLEEP', 'WAKE'])
})
export type PetAction = z.infer<typeof PetActionSchema>

export const XpGainedEventSchema = z.object({
  projectId: z.number().int(),
  xpGained: z.number().int().nonnegative(),
  commitHash: z.string()
})
export type XpGainedEvent = z.infer<typeof XpGainedEventSchema>

export const IPC_CHANNELS = {
  PET_GET: 'pet:get',
  PET_ACTION: 'pet:action',
  PET_XP_GAINED: 'pet:xpGained',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_HIDE: 'window:hide'
} as const
