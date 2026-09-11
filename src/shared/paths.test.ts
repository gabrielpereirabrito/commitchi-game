import { describe, expect, it } from 'vitest'
import { toRepoPathKey } from './paths'

describe('toRepoPathKey', () => {
  it('converts backslashes to forward slashes on Windows', () => {
    expect(toRepoPathKey('C:\\Projetos\\App', 'win32')).toBe('c:/projetos/app')
  })

  it('lowercases the path on Windows (case-insensitive filesystem)', () => {
    expect(toRepoPathKey('C:\\Projetos\\App', 'win32')).toBe(
      toRepoPathKey('c:\\projetos\\app', 'win32')
    )
  })

  it('preserves case on Linux (case-sensitive filesystem)', () => {
    expect(toRepoPathKey('/home/user/App', 'linux')).toBe('/home/user/App')
    expect(toRepoPathKey('/home/user/App', 'linux')).not.toBe('/home/user/app')
  })

  it('does not touch separators that are already forward slashes', () => {
    expect(toRepoPathKey('/home/user/App', 'linux')).toBe('/home/user/App')
  })
})
