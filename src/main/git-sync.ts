import { simpleGit } from 'simple-git'
import { applyCommitXp } from './db'
import { appEvents } from './events'
import { logger } from './logger'

/**
 * Extração de diff via CLI do git — ver docs/adr/backend/0002-extracao-de-diff-via-git-cli.md.
 * Merges são excluídos (--no-merges) por não representarem esforço novo do dia
 * (docs/balancing/daily-xp-cap.md, seção "casos extremos").
 */

export async function getCurrentHead(repoPath: string): Promise<string> {
  const git = simpleGit(repoPath)
  return (await git.revparse(['HEAD'])).trim()
}

function parseNumstat(numstatOutput: string): number {
  let linesChanged = 0
  for (const line of numstatOutput.split('\n')) {
    const [added, removed] = line.split('\t')
    if (!added || !removed) continue
    linesChanged += (Number(added) || 0) + (Number(removed) || 0)
  }
  return linesChanged
}

async function getLinesChangedForCommit(repoPath: string, commitHash: string): Promise<number> {
  const git = simpleGit(repoPath)
  const numstat = await git.raw(['show', '--numstat', '--format=', commitHash])
  return parseNumstat(numstat)
}

/**
 * Processa commits novos de `lastProcessedHash` (exclusivo) até HEAD, na ordem em que
 * aconteceram, aplicando XP a cada um. Usado tanto pelo file watcher (commit ao vivo)
 * quanto na reconciliação de startup (commits feitos com o app fechado) — mesma função,
 * só muda o que é "novo" a cada chamada.
 */
export async function reconcileProject(
  repoPath: string,
  projectId: number,
  lastProcessedHash: string | null
): Promise<void> {
  const git = simpleGit(repoPath)
  const range = lastProcessedHash ? `${lastProcessedHash}..HEAD` : 'HEAD'

  const log = await git.raw(['log', range, '--no-merges', '--reverse', '--format=%H'])
  const commitHashes = log.split('\n').map((line) => line.trim()).filter(Boolean)

  for (const commitHash of commitHashes) {
    const linesChanged = await getLinesChangedForCommit(repoPath, commitHash)
    const xpGained = applyCommitXp(projectId, commitHash, linesChanged)
    logger.info('[git-sync] commit processado', { projectId, commitHash, linesChanged, xpGained })
    appEvents.emit('xpGained', { projectId, xpGained, commitHash })
  }
}
