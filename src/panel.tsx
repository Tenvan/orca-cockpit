// Cockpit-Panel: alles, was man wissen muss, an einem Ort. Sechs Reiter, kein Build-Schritt;
// Orca zeichnet den Baum mit eigenen Controls und färbt ihn mit dem aktiven Theme.
import {
  atom,
  Badge,
  Box,
  Button,
  Callout,
  Checkbox,
  CodeView,
  EmptyState,
  Grid,
  Heading,
  IconButton,
  Input,
  KeyValue,
  plugin,
  Progress,
  read,
  Row,
  Select,
  set,
  Stack,
  Tab,
  Table,
  Tabs,
  Text,
  Textarea,
  Toolbar,
  update,
  type PanelContext,
  type Tone
} from 'orca'
import { contrast, isHex, PRESETS, type Mode, type Palette } from './palette'
import type { AgentRow, Overview, SidebarAction, Todo } from './protocol'

const tab = atom('tab', 'overview', { persist: 'plugin' })
const overview = atom<Overview | null>(null)
const filter = atom('')
const selectedTerminal = atom<string | null>(null)
const tail = atom<{ lines: string[]; ok: boolean } | null>(null)
const notes = atom('')
const todos = atom<Todo[]>([])
const newTodo = atom('')
const look = atom<Record<Mode, Palette>>({ dark: PRESETS.dark, light: PRESETS.light })
const lookMode = atom<Mode>('dark')
const lookMessage = atom<{ tone: Tone; text: string } | null>(null)

const STATE_TONE: Record<AgentRow['state'], Tone> = {
  working: 'accent',
  blocked: 'danger',
  waiting: 'warning',
  done: 'success'
}
const STATE_LABEL: Record<AgentRow['state'], string> = {
  working: 'arbeitet',
  blocked: 'blockiert',
  waiting: 'wartet',
  done: 'fertig'
}

const SHORTCUTS: { action: SidebarAction; icon: 'branch' | 'check' | 'plug' | 'rocket' | 'folder' | 'search'; label: string }[] = [
  { action: 'sidebar.sourceControl.toggle', icon: 'branch', label: 'Source Control' },
  { action: 'sidebar.checks.toggle', icon: 'check', label: 'Checks' },
  { action: 'sidebar.ports.toggle', icon: 'plug', label: 'Ports' },
  { action: 'view.tasks', icon: 'rocket', label: 'Tasks' },
  { action: 'sidebar.explorer.toggle', icon: 'folder', label: 'Explorer' },
  { action: 'sidebar.search.toggle', icon: 'search', label: 'Suche' }
]

async function loadTail(terminalId: string | null): Promise<void> {
  set(selectedTerminal, terminalId)
  if (!terminalId) {
    set(tail, null)
    return
  }
  set(tail, await plugin.request('terminal.tail', { terminalId, maxLines: 80 }))
}

async function applyLook(): Promise<void> {
  const mode = read(lookMode)
  const palette = read(look)[mode]
  set(lookMessage, null)
  const answer = await plugin.request('look.apply', { palette })
  set(
    lookMessage,
    answer.ok
      ? { tone: 'success', text: `Angewendet (${mode}). Orca nutzt jetzt dieses Theme.` }
      : { tone: 'danger', text: answer.error ?? 'Orca hat die Farben nicht angenommen.' }
  )
}

function saveTodos(next: Todo[]): void {
  set(todos, next)
  void plugin.request('notes.set', { todos: next })
}

export function setup(ctx: PanelContext): void {
  ctx.subscriptions.push(plugin.on('overview.changed', (payload) => set(overview, payload)))
  void plugin.request('overview.get').then((answer) => set(overview, answer))
  void plugin.request('notes.get').then((answer) => {
    set(notes, answer.notes)
    set(todos, answer.todos)
  })
  void plugin.request('look.get').then((answer) => set(look, answer))
}

function Overview_() {
  const data = read(overview)
  if (!data) {
    return <EmptyState title="Lade Cockpit …" icon="gauge" />
  }
  const count = (state: AgentRow['state']) => data.agents.filter((a) => a.state === state).length
  const total = data.agents.length
  const done = count('done')
  return (
    <Stack gap="md">
      {count('blocked') > 0 ? (
        <Callout tone="danger" title={`${count('blocked')} Agent(s) warten auf dich`}>
          Reiter „Agents“ zeigt, welche.
        </Callout>
      ) : null}
      <Grid columns={2} gap="sm">
        {(['working', 'blocked', 'waiting', 'done'] as const).map((state) => (
          <Box key={state} border radius="md" padding="sm" gap="xs">
            <Text muted size="xs">
              {STATE_LABEL[state]}
            </Text>
            <Row justify="between">
              <Heading level={2}>{count(state)}</Heading>
              <Badge tone={STATE_TONE[state]}>{state}</Badge>
            </Row>
          </Box>
        ))}
      </Grid>
      <Progress label="Agents fertig" value={total === 0 ? 0 : Math.round((done / total) * 100)} />
      <KeyValue
        label="Fokus"
        items={
          data.focus
            ? [
                { label: 'Workspace', value: data.focus.name },
                { label: 'Branch', value: data.focus.branch, code: true },
                { label: 'Terminals', value: data.focus.terminals.length },
                { label: 'Workspaces gesamt', value: data.workspaces.length }
              ]
            : [{ label: 'Workspace', value: 'keiner im Fokus' }]
        }
      />
      <Toolbar label="Orca-Ansichten" gap="xs">
        {SHORTCUTS.map((s) => (
          <IconButton
            key={s.action}
            icon={s.icon}
            label={s.label}
            variant="ghost"
            onPress={() => void plugin.request('sidebar.run', { action: s.action })}
          />
        ))}
      </Toolbar>
      {data.missing.length > 0 ? (
        <Callout tone="warning" title="Rechte fehlen">
          {`Dem Plugin fehlt: ${data.missing.join(', ')}. Das Panel zeigt dafür weniger an.`}
        </Callout>
      ) : null}
    </Stack>
  )
}

function Agents() {
  const data = read(overview)
  if (!data || data.agents.length === 0) {
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
      rows={data.agents.map((agent, index) => ({
        key: agent.terminalId ?? `agent-${index}`,
        cells: {
          title: agent.title ?? agent.agent ?? 'Agent',
          state: STATE_LABEL[agent.state],
          since: { type: 'relative', at: agent.since, format: 'short' }
        }
      }))}
      selectionMode="single"
      onRowAction={({ key }) => {
        set(tab, 'terminal')
        void loadTail(key.startsWith('agent-') ? null : key)
      }}
      emptyText="Keine Agents"
    />
  )
}

function Workspaces() {
  const data = read(overview)
  const query = read(filter).trim().toLowerCase()
  const rows = (data?.workspaces ?? []).filter(
    (w) => !query || `${w.name} ${w.branch ?? ''} ${w.project ?? ''}`.toLowerCase().includes(query)
  )
  return (
    <Stack gap="sm">
      <Input label="Workspaces filtern" labelHidden type="search" placeholder="Filtern …" value={read(filter)} onChange={(value) => set(filter, value)} />
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
        onRowAction={({ key }) => void plugin.request('workspace.open', { id: key })}
        emptyText="Keine Workspaces"
      />
      <Text muted size="xs">
        Doppelklick oder Enter zeigt den Workspace in Orca.
        {data?.truncated ? ' Die Liste ist gekürzt.' : ''}
      </Text>
    </Stack>
  )
}

function Terminal() {
  const data = read(overview)
  const options = [
    ...(data?.agents ?? [])
      .filter((a) => a.terminalId)
      .map((a) => ({ value: a.terminalId as string, label: `${a.title ?? a.agent ?? 'Agent'} (${STATE_LABEL[a.state]})` })),
    ...(data?.focus?.terminals ?? [])
      .filter((t) => !(data?.agents ?? []).some((a) => a.terminalId === t.id))
      .map((t) => ({ value: t.id, label: t.title ?? t.id }))
  ]
  const output = read(tail)
  return (
    <Stack gap="sm">
      <Row gap="xs" align="end">
        <Select
          label="Terminal"
          placeholder="Terminal wählen"
          options={options}
          value={read(selectedTerminal) ?? undefined}
          onChange={(value) => void loadTail(value)}
        />
        <IconButton icon="refresh" label="Neu laden" variant="ghost" onPress={() => void loadTail(read(selectedTerminal))} />
      </Row>
      {output && !output.ok ? (
        <Callout tone="warning" title="Terminal nicht lesbar">
          Das Recht terminal:read fehlt oder das Terminal ist weg.
        </Callout>
      ) : null}
      {output?.ok ? (
        <CodeView label="Letzte Ausgabe" code={output.lines.join('\n') || '(leer)'} wrap />
      ) : (
        <Text muted size="xs">
          Nur lesend: das Plugin kann nichts in ein Terminal schreiben.
        </Text>
      )}
    </Stack>
  )
}

function Notes() {
  const items = read(todos)
  return (
    <Stack gap="md">
      <Textarea
        label="Notizen"
        rows={6}
        value={read(notes)}
        onChange={(value) => {
          set(notes, value)
          void plugin.request('notes.set', { notes: value })
        }}
      />
      <Stack gap="xs">
        <Heading level={3}>Checkliste</Heading>
        <Input
          label="Neuer Punkt"
          placeholder="Neuer Punkt, Enter zum Hinzufügen"
          value={read(newTodo)}
          onChange={(value) => set(newTodo, value)}
          onSubmit={(value) => {
            const text = value.trim()
            if (text) {
              saveTodos([...items, { id: `t${Date.now()}`, text, done: false }])
            }
            set(newTodo, '')
          }}
        />
        {items.map((item) => (
          <Row key={item.id} justify="between">
            <Checkbox
              label={item.text}
              checked={item.done}
              onChange={(checked) => saveTodos(items.map((t) => (t.id === item.id ? { ...t, done: checked } : t)))}
            />
            <IconButton icon="delete" label="Entfernen" variant="ghost" onPress={() => saveTodos(items.filter((t) => t.id !== item.id))} />
          </Row>
        ))}
      </Stack>
    </Stack>
  )
}

function Look() {
  const mode = read(lookMode)
  const palette = read(look)[mode]
  const message = read(lookMessage)
  const field = (key: 'bg' | 'hg' | 'accent' | 'accent2', label: string) => (
    <Input
      key={key}
      label={label}
      value={palette[key]}
      invalid={!isHex(palette[key])}
      maxLength={7}
      onChange={(value) => update(look, (all) => ({ ...all, [mode]: { ...all[mode], [key]: value.toUpperCase() } }))}
    />
  )
  const ok = [palette.bg, palette.hg, palette.accent, palette.accent2].every(isHex)
  return (
    <Stack gap="md">
      <Select
        label="Modus"
        value={mode}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' }
        ]}
        onChange={(value) => set(lookMode, value === 'light' ? 'light' : 'dark')}
      />
      {field('bg', 'BG (Hintergrund)')}
      {field('hg', 'HG (Text)')}
      {field('accent', 'Accent (Orange)')}
      {field('accent2', 'Zweitfarbe (Lila)')}
      {ok ? (
        <KeyValue
          label="Kontrast (ab 4.5 gut lesbar)"
          items={[
            { label: 'Text auf BG', value: `${contrast(palette.bg, palette.hg).toFixed(1)} : 1`, tone: contrast(palette.bg, palette.hg) >= 4.5 ? 'success' : 'danger' },
            { label: 'Accent auf BG', value: `${contrast(palette.bg, palette.accent).toFixed(1)} : 1`, tone: contrast(palette.bg, palette.accent) >= 4.5 ? 'success' : 'warning' },
            { label: 'Lila auf BG', value: `${contrast(palette.bg, palette.accent2).toFixed(1)} : 1`, tone: contrast(palette.bg, palette.accent2) >= 4.5 ? 'success' : 'warning' }
          ]}
        />
      ) : null}
      <Row gap="xs">
        <Button disabled={!ok} onPress={() => void applyLook()}>
          Anwenden
        </Button>
        <Button variant="ghost" onPress={() => update(look, (all) => ({ ...all, [mode]: PRESETS[mode] }))}>
          Zurücksetzen
        </Button>
      </Row>
      {message ? <Callout tone={message.tone}>{message.text}</Callout> : null}
      <Text muted size="xs">
        „Anwenden“ wählt die Farben als Theme in Orca (Recht appearance:write). Die Werte bleiben im Plugin-Speicher.
      </Text>
    </Stack>
  )
}

export default function Panel() {
  return (
    <Tabs label="Cockpit" value={read(tab)} onChange={(value) => set(tab, value)}>
      <Tab value="overview" label="Übersicht" icon="gauge">
        <Overview_ />
      </Tab>
      <Tab value="agents" label="Agents" icon="agent">
        <Agents />
      </Tab>
      <Tab value="workspaces" label="Workspaces" icon="folder">
        <Workspaces />
      </Tab>
      <Tab value="terminal" label="Terminal" icon="terminal">
        <Terminal />
      </Tab>
      <Tab value="notes" label="Notizen" icon="edit">
        <Notes />
      </Tab>
      <Tab value="look" label="Look" icon="settings">
        <Look />
      </Tab>
    </Tabs>
  )
}
