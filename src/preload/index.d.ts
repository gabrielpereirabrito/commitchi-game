import type { CommitchiApi } from './index'

declare global {
  interface Window {
    api: CommitchiApi
  }
}
