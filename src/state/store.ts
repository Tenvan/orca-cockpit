// Zustand und Aktionen des Panels an einem Ort. Nur die Seiten (src/pages) lesen und schreiben
// hier; das Design System darunter bekommt alles als Props.
import { atom, plugin, read, set, update, type PanelContext } from 'orca'
import { PRESETS, type Mode, type Palette, type Tone } from '../design/tokens'
import type { Overview, Todo } from '../protocol'

export const tab = atom('tab', 'overview', { persist: 'plugin' })
export const overview = atom<Overview | null>(null)
export const workspaceFilter = atom('')
export const selectedTerminal = atom<string | null>(null)
export const terminalOutput = atom<{ lines: string[]; ok: boolean } | null>(null)
export const notes = atom('')
export const todos = atom<Todo[]>([])
export const todoDraft = atom('')
export const palettes = atom<Record<Mode, Palette>>({ dark: PRESETS.dark, light: PRESETS.light })
export const lookMode = atom<Mode>('dark')
export const lookMessage = atom<{ tone: Tone; text: string } | null>(null)

export async function loadTerminal(terminalId: string | null): Promise<void> {
  set(selectedTerminal, terminalId)
  if (!terminalId) {
    set(terminalOutput, null)
    return
  }
  set(terminalOutput, await plugin.request('terminal.tail', { terminalId, maxLines: 80 }))
}

export function openAgentTerminal(terminalId: string | null): void {
  set(tab, 'terminal')
  void loadTerminal(terminalId)
}

export function saveNotes(value: string): void {
  set(notes, value)
  void plugin.request('notes.set', { notes: value })
}

export function saveTodos(next: Todo[]): void {
  set(todos, next)
  void plugin.request('notes.set', { todos: next })
}

export function addTodo(text: string): void {
  const clean = text.trim()
  if (clean) {
    saveTodos([...read(todos), { id: `t${Date.now()}`, text: clean, done: false }])
  }
  set(todoDraft, '')
}

export function changePalette(key: 'bg' | 'hg' | 'accent' | 'accent2', value: string): void {
  const mode = read(lookMode)
  update(palettes, (all) => ({ ...all, [mode]: { ...all[mode], [key]: value } }))
}

export function resetPalette(): void {
  const mode = read(lookMode)
  update(palettes, (all) => ({ ...all, [mode]: PRESETS[mode] }))
}

export async function applyPalette(): Promise<void> {
  const mode = read(lookMode)
  set(lookMessage, null)
  const answer = await plugin.request('look.apply', { palette: read(palettes)[mode] })
  set(
    lookMessage,
    answer.ok
      ? { tone: 'success', text: `Angewendet (${mode}). Orca nutzt jetzt dieses Theme.` }
      : { tone: 'danger', text: answer.error ?? 'Orca hat die Farben nicht angenommen.' }
  )
}

/** Startet die Abos und lädt den ersten Stand; Orca ruft es beim Öffnen des Panels. */
export function connect(ctx: PanelContext): void {
  ctx.subscriptions.push(plugin.on('overview.changed', (payload) => set(overview, payload)))
  void plugin.request('overview.get').then((answer) => set(overview, answer))
  void plugin.request('notes.get').then((answer) => {
    set(notes, answer.notes)
    set(todos, answer.todos)
  })
  void plugin.request('look.get').then((answer) => set(palettes, answer))
}
