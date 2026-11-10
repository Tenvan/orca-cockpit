// The panel <-> worker contract, declared once: src/panel.tsx and src/worker.ts both read it.
import type { Palette } from './palette'

export type AgentState = 'working' | 'blocked' | 'waiting' | 'done'

export type AgentRow = {
  terminalId: string | null
  title: string | null
  agent: string | null
  state: AgentState
  /** Wann der Agent in diesen Zustand kam (ms seit Epoche). */
  since: number
}

export type WorkspaceRow = {
  id: string
  name: string
  kind: 'worktree' | 'folder'
  branch: string | null
  path: string
  project: string | null
}

export type Focus = {
  name: string
  branch: string
  terminals: { id: string; title?: string }[]
}

/** Alles, was die Übersicht braucht, in einem Stück. Fehlende Rechte ergeben leere Felder. */
export type Overview = {
  agents: AgentRow[]
  focus: Focus | null
  workspaces: WorkspaceRow[]
  truncated: boolean
  /** Rechte, die dem Plugin fehlen: Panel zeigt dafür einen Hinweis statt leerer Flächen. */
  missing: string[]
  updatedAt: number
}

export type Todo = { id: string; text: string; done: boolean }

export type SidebarAction =
  | 'sidebar.left.toggle'
  | 'sidebar.right.toggle'
  | 'sidebar.explorer.toggle'
  | 'sidebar.search.toggle'
  | 'sidebar.sourceControl.toggle'
  | 'sidebar.checks.toggle'
  | 'sidebar.ports.toggle'
  | 'view.tasks'

declare module 'orca' {
  interface PluginRequests {
    /** Aktueller Stand von Agents, Fokus-Workspace und allen Workspaces. */
    'overview.get': { output: Overview }
    /** Zeigt einen Workspace in Orca (workspace:write). */
    'workspace.open': { input: { id: string }; output: { opened: boolean } }
    /** Letzte Zeilen eines Terminals, nur lesend (terminal:read). */
    'terminal.tail': {
      input: { terminalId: string; maxLines?: number }
      output: { lines: string[]; ok: boolean }
    }
    /** Notizen und Checkliste aus dem Plugin-Speicher. */
    'notes.get': { output: { notes: string; todos: Todo[] } }
    'notes.set': { input: { notes?: string; todos?: Todo[] }; output: { ok: boolean } }
    /** Die aktuell gespeicherte Farbwahl je Modus. */
    'look.get': { output: { dark: Palette; light: Palette } }
    /** Berechnet Theme und Terminal-Palette aus der Farbwahl und wählt sie in Orca (appearance:write). */
    'look.apply': {
      input: { palette: Palette }
      output: { ok: boolean; themeId?: string; error?: string }
    }
    /** Öffnet eine eingebaute Orca-Ansicht (workspace:write). */
    'sidebar.run': { input: { action: SidebarAction }; output: { ran: boolean } }
  }
  interface PluginPanelEvents {
    /** Posted to every open panel after agents or workspaces change. */
    'overview.changed': Overview
  }
}
