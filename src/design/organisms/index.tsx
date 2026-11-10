// Organismen: eigenständige Bereiche aus Molekülen und Atomen (Kachelfeld, Tabellen, Editoren).
// Weiterhin rein über Props: Daten kommen von oben, Ereignisse gehen als Callbacks nach oben.
import {
  CodeView,
  EmptyState,
  Grid,
  Input,
  Progress,
  Row,
  Select,
  Stack,
  Table,
  Textarea
} from 'orca'
import type { AgentRow, Todo, WorkspaceRow } from '../../protocol'
import { Hint, QuickButton, SectionTitle } from '../atoms'
import { ContrastCard, PaletteFields, StatTile, TodoRow } from '../molecules'
import {
  AGENT_STATES,
  isHex,
  STATE_LABEL,
  type AgentState,
  type Mode,
  type Palette
} from '../tokens'

/** Vier Kacheln plus Fortschritt „fertig“. */
export function StatGrid(props: { agents: AgentRow[] }) {
  const count = (state: AgentState) => props.agents.filter((a) => a.state === state).length
  const total = props.agents.length
  return (
    <Stack gap="sm">
      <Grid columns={2} gap="sm">
        {AGENT_STATES.map((state) => (
          <StatTile key={state} state={state} value={count(state)} />
        ))}
      </Grid>
      <Progress label="Agents fertig" value={total === 0 ? 0 : Math.round((count('done') / total) * 100)} />
    </Stack>
  )
}

/** Tabelle der Agents; Doppelklick meldet das Terminal (oder null). */
export function AgentTable(props: { agents: AgentRow[]; onOpen: (terminalId: string | null) => void }) {
  if (props.agents.length === 0) {
    return <EmptyState title="Keine Agents" description="Im fokussierten Workspace läuft keiner." icon="agent" />
  }
  return (
    <Table
      label="Agents"
      columns={[
        { key: 'title', label: 'Agent', minWidth: 'md' },
        { key: 'state', label: 'Stand' },
        { key: 'since', label: 'seit', hideBelow: 'sm' }
      ]}
      rows={props.agents.map((agent, index) => ({
        key: agent.terminalId ?? `agent-${index}`,
        cells: {
          title: agent.title ?? agent.agent ?? 'Agent',
          state: STATE_LABEL[agent.state],
          since: { type: 'relative', at: agent.since, format: 'short' }
        }
      }))}
      selectionMode="single"
      onRowAction={({ key }) => props.onOpen(key.startsWith('agent-') ? null : key)}
      emptyText="Keine Agents"
    />
  )
}

/** Workspace-Liste mit Filterfeld; Doppelklick meldet die Workspace-ID. */
export function WorkspaceBrowser(props: {
  workspaces: WorkspaceRow[]
  truncated: boolean
  filter: string
  onFilter: (value: string) => void
  onOpen: (id: string) => void
}) {
  const query = props.filter.trim().toLowerCase()
  const rows = props.workspaces.filter(
    (w) => !query || `${w.name} ${w.branch ?? ''} ${w.project ?? ''}`.toLowerCase().includes(query)
  )
  return (
    <Stack gap="sm">
      <Input
        label="Workspaces filtern"
        labelHidden
        type="search"
        placeholder="Filtern …"
        value={props.filter}
        onChange={props.onFilter}
      />
      <Table
        label="Workspaces"
        columns={[
          { key: 'name', label: 'Name', minWidth: 'md' },
          { key: 'branch', label: 'Branch', hideBelow: 'sm' },
          { key: 'kind', label: 'Art', hideBelow: 'md' }
        ]}
        rows={rows.map((w) => ({
          key: w.id,
          cells: { name: w.name, branch: w.branch, kind: w.kind === 'worktree' ? 'Worktree' : 'Ordner' }
        }))}
        selectionMode="single"
        onRowAction={({ key }) => props.onOpen(key)}
        emptyText="Keine Workspaces"
      />
      <Hint>
        {props.truncated
          ? 'Doppelklick oder Enter zeigt den Workspace in Orca. Die Liste ist gekürzt.'
          : 'Doppelklick oder Enter zeigt den Workspace in Orca.'}
      </Hint>
    </Stack>
  )
}

/** Terminal-Auswahl und die letzten Ausgabezeilen, nur lesend. */
export function TerminalViewer(props: {
  options: { value: string; label: string }[]
  selected: string | null
  output: { lines: string[]; ok: boolean } | null
  onSelect: (terminalId: string) => void
  onReload: () => void
}) {
  const { output } = props
  return (
    <Stack gap="sm">
      <Row gap="xs" align="end">
        <Select
          label="Terminal"
          placeholder="Terminal wählen"
          options={props.options}
          value={props.selected ?? undefined}
          onChange={props.onSelect}
        />
        <QuickButton icon="refresh" label="Neu laden" onPress={props.onReload} />
      </Row>
      {output?.ok ? (
        <CodeView label="Letzte Ausgabe" code={output.lines.join('\n') || '(leer)'} wrap />
      ) : output ? (
        <EmptyState
          title="Terminal nicht lesbar"
          description="Das Recht terminal:read fehlt oder das Terminal ist weg."
          icon="terminal"
        />
      ) : (
        <Hint>Nur lesend: das Plugin kann nichts in ein Terminal schreiben.</Hint>
      )}
    </Stack>
  )
}

/** Notizfeld. */
export function NotesEditor(props: { value: string; onChange: (value: string) => void }) {
  return <Textarea label="Notizen" rows={6} value={props.value} onChange={props.onChange} />
}

/** Checkliste mit Eingabezeile. */
export function Checklist(props: {
  items: Todo[]
  draft: string
  onDraft: (value: string) => void
  onAdd: (text: string) => void
  onToggle: (id: string, done: boolean) => void
  onRemove: (id: string) => void
}) {
  return (
    <Stack gap="xs">
      <SectionTitle>Checkliste</SectionTitle>
      <Input
        label="Neuer Punkt"
        placeholder="Neuer Punkt, Enter zum Hinzufügen"
        value={props.draft}
        onChange={props.onDraft}
        onSubmit={props.onAdd}
      />
      {props.items.map((item) => (
        <TodoRow
          key={item.id}
          text={item.text}
          done={item.done}
          onToggle={(done) => props.onToggle(item.id, done)}
          onRemove={() => props.onRemove(item.id)}
        />
      ))}
    </Stack>
  )
}

/** Farbwahl: Modus, vier Farbfelder, Kontrast, Anwenden. */
export function PaletteEditor(props: {
  mode: Mode
  palette: Palette
  onMode: (mode: Mode) => void
  onChange: (key: 'bg' | 'hg' | 'accent' | 'accent2', value: string) => void
  onApply: () => void
  onReset: () => void
}) {
  const { palette } = props
  const valid = [palette.bg, palette.hg, palette.accent, palette.accent2].every(isHex)
  return (
    <Stack gap="md">
      <Select
        label="Modus"
        value={props.mode}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' }
        ]}
        onChange={(value) => props.onMode(value === 'light' ? 'light' : 'dark')}
      />
      <PaletteFields
        palette={palette}
        valid={valid}
        onChange={props.onChange}
        onApply={props.onApply}
        onReset={props.onReset}
      />
      {valid ? <ContrastCard palette={palette} /> : null}
      <Hint>
        „Anwenden“ wählt die Farben als Theme in Orca (Recht appearance:write). Die Werte bleiben im
        Plugin-Speicher.
      </Hint>
    </Stack>
  )
}

