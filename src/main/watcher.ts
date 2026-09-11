import { watch, type FSWatcher } from 'chokidar'
import { join } from 'path'
import { getLastProcessedCommitHash } from './db'
import { reconcileProject } from './git-sync'
import { logger } from './logger'

/**
 * File watcher em .git/logs/HEAD em vez de git hook — ver
 * docs/adr/backend/0001-electron-main-process-como-backend.md.
 */

const watchers = new Map<number, FSWatcher>()
const DEBOUNCE_MS = 300

export function watchProjectForCommits(projectId: number, repoPath: string): void {
  if (watchers.has(projectId)) return

  const headLogPath = join(repoPath, '.git', 'logs', 'HEAD')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const watcher = watch(headLogPath, { ignoreInitial: true })
  watcher.on('change', () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      reconcileProject(repoPath, projectId, getLastProcessedCommitHash(projectId)).catch((error) => {
        logger.error('[watcher] falha ao reconciliar commits', { projectId, error: String(error) })
      })
    }, DEBOUNCE_MS)
  })
  watcher.on('error', (error) => {
    logger.error('[watcher] erro observando .git/logs/HEAD', { projectId, error: String(error) })
  })

  watchers.set(projectId, watcher)
}

export async function stopAllWatchers(): Promise<void> {
  await Promise.all([...watchers.values()].map((watcher) => watcher.close()))
  watchers.clear()
}
