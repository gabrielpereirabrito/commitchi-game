import log from 'electron-log/main'

/**
 * Log local em arquivo, só metadados — nunca conteúdo de diff/código do usuário.
 * Ver docs/adr/backend/0004-logging-local-e-exportacao.md.
 */
log.initialize()
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

export const logger = log
export const logFilePath = log.transports.file.getFile().path
