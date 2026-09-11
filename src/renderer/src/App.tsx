import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AttributeBar } from './components/AttributeBar'
import { TitleBar } from './components/TitleBar'
import { usePetStore } from './store/petStore'
import type { PetState } from '@shared/ipc-contract'

// Tick visual (lazy evaluation) — ver docs/guides/mvp.md §9.
const TICK_INTERVAL_MS = 5000

// TODO: trocar pelo react-sprite-animator + manifest quando os assets 96x96 chegarem
// (docs/adr/frontend/0003-sprites-via-spritesheet-configuravel.md). Placeholder por enquanto.
const STATE_EMOJI: Record<PetState, string> = {
  idle: '🥚',
  sleeping: '😴',
  eating: '😋',
  celebrating: '🎉',
  sad: '😢'
}

function App(): React.JSX.Element {
  const { pet, isLoading, fetchPet, sendAction } = usePetStore()
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    fetchPet()
    const interval = setInterval(fetchPet, TICK_INTERVAL_MS)
    const unsubscribe = window.api.onXpGained(() => {
      setCelebrating(true)
      fetchPet()
      setTimeout(() => setCelebrating(false), 2000)
    })
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [fetchPet])

  if (isLoading || !pet) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden rounded-2xl bg-slate-900/80 text-white/70">
        <TitleBar />
        <div className="flex flex-1 items-center justify-center text-xs">carregando bichinho…</div>
      </div>
    )
  }

  const displayState: PetState = celebrating ? 'celebrating' : pet.state

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden rounded-2xl bg-slate-900/90 text-white select-none">
      <TitleBar />

      <div className="flex flex-1 flex-col items-center justify-between gap-3 p-4 pt-1">
        <div className="flex flex-col items-center gap-1">
          <AnimatePresence mode="wait">
            <motion.span
              key={displayState}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-6xl"
            >
              {STATE_EMOJI[displayState]}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs text-white/60">Nível {pet.level}</span>
        </div>

        <div className="flex w-full flex-col gap-2">
          <AttributeBar label="Fome" value={pet.hunger} colorClassName="bg-amber-400" />
          <AttributeBar label="Energia" value={pet.energy} colorClassName="bg-sky-400" />
        </div>

        <div className="flex w-full gap-2">
          <button
            onClick={() => sendAction('FEED')}
            className="flex-1 rounded-lg bg-amber-500/80 py-1.5 text-xs font-medium hover:bg-amber-500"
          >
            Alimentar
          </button>
          {pet.state === 'sleeping' ? (
            <button
              onClick={() => sendAction('WAKE')}
              className="flex-1 rounded-lg bg-sky-500/80 py-1.5 text-xs font-medium hover:bg-sky-500"
            >
              Acordar
            </button>
          ) : (
            <button
              onClick={() => sendAction('SLEEP')}
              className="flex-1 rounded-lg bg-indigo-500/80 py-1.5 text-xs font-medium hover:bg-indigo-500"
            >
              Dormir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
