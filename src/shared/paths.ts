import { resolve } from 'path'

/**
 * Transforma um caminho absoluto na chave usada pra unicidade de projeto.
 * Pura (sem tocar o filesystem) pra ser testável independente do SO onde os testes rodam.
 * Ver docs/adr/banco-de-dados/0002-normalizacao-de-repo-path.md.
 */
export function toRepoPathKey(absolutePath: string, platform: NodeJS.Platform): string {
  const withForwardSlashes = absolutePath.replace(/\\/g, '/')
  return platform === 'win32' ? withForwardSlashes.toLowerCase() : withForwardSlashes
}

/** Resolve o path recebido (relativo ao cwd, se for o caso) e normaliza pro SO atual. */
export function normalizeRepoPathKey(rawPath: string): string {
  return toRepoPathKey(resolve(rawPath), process.platform)
}
