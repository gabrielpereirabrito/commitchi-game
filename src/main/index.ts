import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'
import { normalizeRepoPathKey } from '@shared/paths'
import { adoptProject, initDatabase, listProjects } from './db'
import { getCurrentHead, reconcileProject } from './git-sync'
import { forwardXpGainedEvents, registerIpcHandlers } from './ipc'
import { logger } from './logger'
import { watchProjectForCommits } from './watcher'

let activeProjectId: number | null = null

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 260,
    height: 340,
    alwaysOnTop: true, // janela flutuante nativa — ver docs/adr/frontend/0001
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  window.on('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

/**
 * Garante que exista um projeto adotado. No MVP ainda não existe uma UI/CLI dedicada de
 * "commitchi adopt" — usamos um seletor de pasta nativo como primeira aproximação dessa ação.
 * [A DEFINIR] formalizar esse fluxo (ver docs/guides/mvp.md §5).
 */
async function ensureActiveProject(): Promise<number> {
  const existing = listProjects()[0]
  if (existing) {
    await reconcileProject(existing.repo_path, existing.id, existing.last_processed_commit_hash)
    return existing.id
  }

  const result = await dialog.showOpenDialog({
    title: 'Adote um repositório pro seu bichinho',
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Nenhum repositório selecionado — o Commitchi precisa de um projeto pra adotar.')
  }

  const repoPath = result.filePaths[0]
  const repoPathKey = normalizeRepoPathKey(repoPath)
  const currentHead = await getCurrentHead(repoPath)
  return adoptProject(repoPath, repoPathKey, currentHead)
}

app.whenReady().then(async () => {
  await initDatabase(join(app.getPath('userData'), 'commitchi.sqlite'))

  const window = createWindow()
  forwardXpGainedEvents(window)

  // Registrado antes do fluxo de adoção (que pode ficar minutos esperando o diálogo)
  // pra evitar "No handler registered" enquanto isso — pet:get/pet:action rejeitam
  // com um erro claro até activeProjectId existir.
  registerIpcHandlers(() => {
    if (activeProjectId === null) throw new Error('Nenhum projeto ativo ainda')
    return activeProjectId
  })

  try {
    activeProjectId = await ensureActiveProject()
    const project = listProjects().find((p) => p.id === activeProjectId)!
    watchProjectForCommits(project.id, project.repo_path)
    logger.info('[main] projeto ativo', { projectId: project.id, repoPath: project.repo_path })
  } catch (error) {
    logger.error('[main] falha ao preparar projeto ativo', { error: String(error) })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
