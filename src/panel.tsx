// Cockpit-Panel: dünner Einstieg. Aufbau nach Atomic Design, siehe src/design/README.md:
//   tokens -> atoms -> molecules -> organisms -> templates -> pages (src/pages) -> dieses Panel
import { read, set } from 'orca'
import { TabbedShell } from './design/templates'
import { AgentsPage, LookPage, NotesPage, OverviewPage, TerminalPage, WorkspacesPage } from './pages'
import { connect, tab } from './state/store'

export const setup = connect

export default function Panel() {
  return (
    <TabbedShell
      label="Cockpit"
      value={read(tab)}
      onChange={(value) => set(tab, value)}
      pages={[
        { value: 'overview', label: 'Übersicht', icon: 'gauge', content: <OverviewPage /> },
        { value: 'agents', label: 'Agents', icon: 'agent', content: <AgentsPage /> },
        { value: 'workspaces', label: 'Workspaces', icon: 'folder', content: <WorkspacesPage /> },
        { value: 'terminal', label: 'Terminal', icon: 'terminal', content: <TerminalPage /> },
        { value: 'notes', label: 'Notizen', icon: 'edit', content: <NotesPage /> },
        { value: 'look', label: 'Look', icon: 'settings', content: <LookPage /> }
      ]}
    />
  )
}
