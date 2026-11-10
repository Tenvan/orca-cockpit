// Seiten: verbinden den Store mit den Organismen. Hier und nur hier wird gelesen und geschrieben.
import { Callout, EmptyState, plugin, read, set, Stack } from 'orca'
import { BlockedNotice, FocusCard, MissingRightsNotice, QuickBar } from '../design/molecules'
import {
  AgentTable,
  Checklist,
  NotesEditor,
  PaletteEditor,
  StatGrid,
  TerminalViewer,
  WorkspaceBrowser
} from '../design/organisms'
import { STATE_LABEL } from '../design/tokens'
import type { SidebarAction } from '../protocol'
import {
  addTodo,
  applyPalette,
  changePalette,
  loadTerminal,
  lookMessage,
  lookMode,
  notes,
  openAgentTerminal,
  overview,
  palettes,
  resetPalette,
  saveNotes,
  saveTodos,
  selectedTerminal,
  terminalOutput,
  todoDraft,
  todos,
  workspaceFilter
} from '../state/store'

const QUICK_ITEMS: { id: SidebarAction; icon: 'branch' | 'check' | 'plug' | 'rocket' | 'folder' | 'search'; label: string }[] = [
  { id: 'sidebar.sourceControl.toggle', icon: 'branch', label: 'Source Control' },
  { id: 'sidebar.checks.toggle', icon: 'check', label: 'Checks' },
  { id: 'sidebar.ports.toggle', icon: 'plug', label: 'Ports' },
  { id: 'view.tasks', icon: 'rocket', label: 'Tasks' },
  { id: 'sidebar.explorer.toggle', icon: 'folder', label: 'Explorer' },
  { id: 'sidebar.search.toggle', icon: 'search', label: 'Suche' }
]

export function OverviewPage() {
  const data = read(overview)
  if (!data) {
    return <EmptyState title="Lade Cockpit …" icon="gauge" />
  }
  return (
    <Stack gap="md">
      <BlockedNotice count={data.agents.filter((a) => a.state === 'blocked').length} />
      <StatGrid agents={data.agents} />
      <FocusCard focus={data.focus} workspaceCount={data.workspaces.length} />
      <QuickBar
        items={QUICK_ITEMS}
        onPress={(id) => void plugin.request('sidebar.run', { action: id as SidebarAction })}
      />
      <MissingRightsNotice missing={data.missing} />
    </Stack>
  )
}

export function AgentsPage() {
  return <AgentTable agents={read(overview)?.agents ?? []} onOpen={openAgentTerminal} />
}

export function WorkspacesPage() {
  const data = read(overview)
  return (
    <WorkspaceBrowser
      workspaces={data?.workspaces ?? []}
      truncated={data?.truncated ?? false}
      filter={read(workspaceFilter)}
      onFilter={(value) => set(workspaceFilter, value)}
      onOpen={(id) => void plugin.request('workspace.open', { id })}
    />
  )
}

export function TerminalPage() {
  const data = read(overview)
  const agents = data?.agents ?? []
  const options = [
    ...agents
      .filter((a) => a.terminalId)
      .map((a) => ({
        value: a.terminalId as string,
        label: `${a.title ?? a.agent ?? 'Agent'} (${STATE_LABEL[a.state]})`
      })),
    ...(data?.focus?.terminals ?? [])
      .filter((t) => !agents.some((a) => a.terminalId === t.id))
      .map((t) => ({ value: t.id, label: t.title ?? t.id }))
  ]
  const selected = read(selectedTerminal)
  return (
    <TerminalViewer
      options={options}
      selected={selected}
      output={read(terminalOutput)}
      onSelect={(id) => void loadTerminal(id)}
      onReload={() => void loadTerminal(selected)}
    />
  )
}

export function NotesPage() {
  return (
    <Stack gap="md">
      <NotesEditor value={read(notes)} onChange={saveNotes} />
      <Checklist
        items={read(todos)}
        draft={read(todoDraft)}
        onDraft={(value) => set(todoDraft, value)}
        onAdd={addTodo}
        onToggle={(id, done) => saveTodos(read(todos).map((t) => (t.id === id ? { ...t, done } : t)))}
        onRemove={(id) => saveTodos(read(todos).filter((t) => t.id !== id))}
      />
    </Stack>
  )
}

export function LookPage() {
  const mode = read(lookMode)
  const message = read(lookMessage)
  return (
    <Stack gap="md">
      <PaletteEditor
        mode={mode}
        palette={read(palettes)[mode]}
        onMode={(next) => set(lookMode, next)}
        onChange={changePalette}
        onApply={() => void applyPalette()}
        onReset={resetPalette}
      />
      {message ? <Callout tone={message.tone}>{message.text}</Callout> : null}
    </Stack>
  )
}
