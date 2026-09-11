import initSqlJs, { type Database } from 'sql.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import {
  ATTRIBUTE_MAX,
  LOW_ATTRIBUTE_THRESHOLD,
  STARTING_LEVEL,
  STARTING_XP
} from '@shared/balancing.config'
import { applyXp, cappedXpForCommit, decayHunger, decayOrRecoverEnergy } from '@shared/balancing'
import type { Pet, PetState } from '@shared/ipc-contract'

/**
 * Camada de acesso a dados isolada aqui de propósito — ver
 * docs/adr/banco-de-dados/0003-sqljs-em-vez-de-better-sqlite3.md.
 * sql.js é in-memory: toda escrita relevante serializa e regrava o arquivo inteiro (persist()).
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path TEXT NOT NULL,
  repo_path_key TEXT NOT NULL UNIQUE,
  adopted_at TEXT NOT NULL,
  last_processed_commit_hash TEXT
);

CREATE TABLE IF NOT EXISTS pets (
  project_id INTEGER PRIMARY KEY REFERENCES projects(id),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  hunger INTEGER NOT NULL DEFAULT 100,
  energy INTEGER NOT NULL DEFAULT 100,
  state TEXT NOT NULL DEFAULT 'idle',
  last_updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS xp_daily_log (
  project_id INTEGER NOT NULL REFERENCES projects(id),
  day TEXT NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, day)
);
`

interface ProjectRow {
  id: number
  repo_path: string
  repo_path_key: string
  adopted_at: string
  last_processed_commit_hash: string | null
}

interface PetRow {
  project_id: number
  xp: number
  level: number
  hunger: number
  energy: number
  state: PetState
  last_updated_at: string
}

let db: Database
let dbFilePath: string

export async function initDatabase(filePath: string): Promise<void> {
  const SQL = await initSqlJs()
  dbFilePath = filePath

  if (existsSync(filePath)) {
    db = new SQL.Database(readFileSync(filePath))
  } else {
    mkdirSync(dirname(filePath), { recursive: true })
    db = new SQL.Database()
  }

  db.run(SCHEMA)
  persist()
}

function persist(): void {
  writeFileSync(dbFilePath, Buffer.from(db.export()))
}

function getRow<T>(sql: string, params: (string | number)[] = []): T | undefined {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const hasRow = stmt.step()
  const result = hasRow ? (stmt.getAsObject() as T) : undefined
  stmt.free()
  return result
}

/** 'YYYY-MM-DD' no horário local da máquina (não UTC) — ver docs/balancing/daily-xp-cap.md */
function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function deriveAwakeState(hunger: number, energy: number): PetState {
  return hunger < LOW_ATTRIBUTE_THRESHOLD || energy < LOW_ATTRIBUTE_THRESHOLD ? 'sad' : 'idle'
}

function findProjectByPathKey(repoPathKey: string): ProjectRow | undefined {
  return getRow<ProjectRow>('SELECT * FROM projects WHERE repo_path_key = ?', [repoPathKey])
}

function findProjectById(projectId: number): ProjectRow | undefined {
  return getRow<ProjectRow>('SELECT * FROM projects WHERE id = ?', [projectId])
}

function findPetByProjectId(projectId: number): PetRow | undefined {
  return getRow<PetRow>('SELECT * FROM pets WHERE project_id = ?', [projectId])
}

function toPet(project: ProjectRow, pet: PetRow): Pet {
  return {
    projectId: project.id,
    repoPath: project.repo_path,
    xp: pet.xp,
    level: pet.level,
    hunger: pet.hunger,
    energy: pet.energy,
    state: pet.state
  }
}

/**
 * Registra um projeto (idempotente — repo já adotado só retorna o id existente).
 * `currentHeadHash` marca o ponto de partida: histórico anterior à adoção não gera XP retroativo.
 */
export function adoptProject(repoPath: string, repoPathKey: string, currentHeadHash: string): number {
  const existing = findProjectByPathKey(repoPathKey)
  if (existing) return existing.id

  const now = new Date().toISOString()
  db.run(
    'INSERT INTO projects (repo_path, repo_path_key, adopted_at, last_processed_commit_hash) VALUES (?, ?, ?, ?)',
    [repoPath, repoPathKey, now, currentHeadHash]
  )
  const project = findProjectByPathKey(repoPathKey)!
  db.run(
    'INSERT INTO pets (project_id, xp, level, hunger, energy, state, last_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [project.id, STARTING_XP, STARTING_LEVEL, ATTRIBUTE_MAX, ATTRIBUTE_MAX, 'idle', now]
  )
  persist()
  return project.id
}

export function getLastProcessedCommitHash(projectId: number): string | null {
  return findProjectById(projectId)?.last_processed_commit_hash ?? null
}

export function listProjects(): ProjectRow[] {
  const stmt = db.prepare('SELECT * FROM projects')
  const rows: ProjectRow[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as ProjectRow)
  stmt.free()
  return rows
}

/** Lê o pet aplicando o decaimento por tempo decorrido (lazy evaluation) e persiste o resultado. */
export function getAndDecayPet(projectId: number): Pet {
  const project = findProjectById(projectId)
  const pet = findPetByProjectId(projectId)
  if (!project || !pet) throw new Error(`Projeto ${projectId} não encontrado`)

  const hoursElapsed = (Date.now() - new Date(pet.last_updated_at).getTime()) / (1000 * 60 * 60)
  const isSleeping = pet.state === 'sleeping'

  const hunger = decayHunger(pet.hunger, hoursElapsed)
  const energy = decayOrRecoverEnergy(pet.energy, hoursElapsed, isSleeping)

  let state: PetState
  if (isSleeping) {
    state = 'sleeping'
  } else if (energy <= 0) {
    state = 'sleeping' // energia zerada força soneca automática
  } else {
    state = deriveAwakeState(hunger, energy)
  }

  const now = new Date().toISOString()
  db.run('UPDATE pets SET hunger = ?, energy = ?, state = ?, last_updated_at = ? WHERE project_id = ?', [
    hunger,
    energy,
    state,
    now,
    projectId
  ])
  persist()

  return toPet(project, { ...pet, hunger, energy, state, last_updated_at: now })
}

export function applyPetAction(
  projectId: number,
  action: 'FEED' | 'SLEEP' | 'WAKE'
): Pet {
  const decayed = getAndDecayPet(projectId) // primeiro coloca o estado em dia
  let { hunger, energy, state } = decayed

  if (action === 'FEED') {
    hunger = ATTRIBUTE_MAX
    if (state !== 'sleeping') state = deriveAwakeState(hunger, energy)
  } else if (action === 'SLEEP') {
    state = 'sleeping'
  } else {
    state = deriveAwakeState(hunger, energy)
  }

  const now = new Date().toISOString()
  db.run('UPDATE pets SET hunger = ?, energy = ?, state = ?, last_updated_at = ? WHERE project_id = ?', [
    hunger,
    energy,
    state,
    now,
    projectId
  ])
  persist()

  const project = findProjectById(projectId)!
  return toPet(project, { project_id: projectId, xp: decayed.xp, level: decayed.level, hunger, energy, state, last_updated_at: now })
}

/**
 * Aplica XP de um commit já processado pelo git-sync, respeitando o teto diário
 * (docs/balancing/daily-xp-cap.md) e avançando o cursor de reconciliação do projeto.
 * Retorna o XP efetivamente concedido (pode ser 0 se o teto do dia já foi batido).
 */
export function applyCommitXp(projectId: number, commitHash: string, linesChanged: number): number {
  const today = localDateKey(new Date())
  const dailyRow = getRow<{ xp_earned: number }>(
    'SELECT xp_earned FROM xp_daily_log WHERE project_id = ? AND day = ?',
    [projectId, today]
  )
  const xpEarnedToday = dailyRow?.xp_earned ?? 0
  const xpGained = cappedXpForCommit(linesChanged, xpEarnedToday)

  if (xpGained > 0) {
    db.run(
      `INSERT INTO xp_daily_log (project_id, day, xp_earned) VALUES (?, ?, ?)
       ON CONFLICT(project_id, day) DO UPDATE SET xp_earned = xp_earned + excluded.xp_earned`,
      [projectId, today, xpGained]
    )

    const pet = findPetByProjectId(projectId)!
    const { xp, level } = applyXp({ xp: pet.xp, level: pet.level }, xpGained)
    db.run('UPDATE pets SET xp = ?, level = ? WHERE project_id = ?', [xp, level, projectId])
  }

  db.run('UPDATE projects SET last_processed_commit_hash = ? WHERE id = ?', [commitHash, projectId])
  persist()

  return xpGained
}
