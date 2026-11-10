// Worker: sammelt Agents, Workspaces und Terminal-Ausgabe für das Cockpit, hält Notizen und
// Farbwahl im Storage, pflegt die Statusleiste und beobachtet terminal.send. Er liest nur und
// zeigt an; Terminals bekommen von ihm nie Text. Fehlende Rechte brechen nichts ab: das
// Panel bekommt in `missing` gemeldet, was fehlt.
// Orca transpiliert die Datei beim Laden (kein Build-Schritt); Zustand liegt in orca.storage.
import type { OrcaWorkerApi } from 'orca/worker'
import { buildAppearance, isHex, PRESETS, type Mode, type Palette } from './design/tokens'
import type { AgentRow, Overview, Todo, WorkspaceRow } from './protocol'

const NOTES = 'notes'
const TODOS = 'todos'
const LOOK = 'look'

/** Ruft `run` und liefert bei einem Fehler (meist: Recht nicht erteilt) `fallback` und merkt sich `right`. */
async function attempt<T>(
  missing: Set<string>,
  right: string,
  run: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await run()
  } catch {
    missing.add(right)
    return fallback
  }
}

async function collect(orca: OrcaWorkerApi): Promise<Overview> {
  const missing = new Set<string>()
  const { agents } = await attempt(missing, 'agent:read', () => orca.host.call('agents.list'), {
    agents: []
  })
  const context = await attempt(
    missing,
    'workspace:read',
    () => orca.host.call('workspace.readContext'),
    null
  )
  const list = await attempt(missing, 'workspace:read', () => orca.host.call('workspace.list'), {
    workspaces: [],
    truncated: false
  })
  const agentRows: AgentRow[] = (agents ?? []).map((agent) => ({
    terminalId: agent.terminalId,
    title: agent.title,
    agent: agent.agent,
    state: agent.state,
    since: agent.stateStartedAt
  }))
  const workspaceRows: WorkspaceRow[] = (list.workspaces ?? []).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind,
    branch: workspace.branch,
    path: workspace.path,
    project: workspace.project ?? null
  }))
  return {
    agents: agentRows,
    focus: context
      ? { name: context.displayName, branch: context.branch, terminals: context.terminals }
      : null,
    workspaces: workspaceRows,
    truncated: list.truncated ?? false,
    missing: [...missing],
    updatedAt: Date.now()
  }
}

function count(agents: AgentRow[], state: AgentRow['state']): number {
  return agents.filter((agent) => agent.state === state).length
}

async function storedPalette(orca: OrcaWorkerApi, mode: Mode): Promise<Palette> {
  const stored = (await orca.storage.get(LOOK)) as Partial<Record<Mode, Palette>> | null
  const palette = stored?.[mode]
  const valid =
    palette &&
    [palette.bg, palette.hg, palette.accent, palette.accent2].every(
      (value) => typeof value === 'string' && isHex(value)
    )
  return valid ? { ...palette, mode } : PRESETS[mode]
}

export default function activate(orca: OrcaWorkerApi): void {
  let lastBlocked = 0
  // Aktualisierungen laufen nacheinander: Orca liefert beim Abonnieren sofort den Kontext, sonst
  // würden zwei gleichzeitige Läufe beide "neu blockiert" sehen und doppelt benachrichtigen.
  let queue: Promise<unknown> = Promise.resolve()

  function refresh(): Promise<Overview> {
    const next = queue.then(runRefresh, runRefresh)
    queue = next.catch(() => undefined)
    return next
  }

  async function runRefresh(): Promise<Overview> {
    const overview = await collect(orca)
    const working = count(overview.agents, 'working')
    const blocked = count(overview.agents, 'blocked')
    const label = String((await orca.settings.get('agentsLabel')) ?? 'Agents')
    await orca.host.call('statusBar.update', {
      id: 'agents',
      text: `${label}: ${working} aktiv, ${blocked} blockiert`,
      tone: blocked > 0 ? 'warning' : 'accent'
    })
    await orca.host.call('statusBar.update', {
      id: 'workspace',
      text: overview.focus
        ? `Workspace: ${overview.focus.name} (${overview.focus.branch})`
        : 'Workspace: –'
    })
    // Nur melden, wenn ein weiterer Agent blockiert, nicht bei jedem Ereignis.
    if (blocked > lastBlocked && (await orca.settings.get('notifyOnBlocked')) !== false) {
      await orca.host.call('notifications.show', {
        title: 'Orca Cockpit',
        body: `${blocked} Agent(s) blockiert`
      })
    }
    lastBlocked = blocked
    orca.panels.post('overview.changed', overview)
    return overview
  }

  orca.panels.handle('overview.get', async () => refresh())

  orca.panels.handle('workspace.open', async ({ id }) => {
    try {
      await orca.host.call('workspace.open', { workspaceId: id })
      return { opened: true }
    } catch {
      return { opened: false }
    }
  })

  orca.panels.handle('terminal.tail', async ({ terminalId, maxLines }) => {
    try {
      const { lines } = await orca.host.call('terminal.read', {
        terminalId,
        maxLines: Math.min(Math.max(maxLines ?? 60, 1), 200)
      })
      return { lines, ok: true }
    } catch {
      return { lines: [], ok: false }
    }
  })

  orca.panels.handle('notes.get', async () => {
    const notes = await orca.storage.get(NOTES)
    const todos = await orca.storage.get(TODOS)
    return {
      notes: typeof notes === 'string' ? notes : '',
      todos: Array.isArray(todos) ? (todos as Todo[]) : []
    }
  })

  orca.panels.handle('notes.set', async ({ notes, todos }) => {
    if (notes !== undefined) {
      await orca.storage.set(NOTES, notes.slice(0, 20_000))
    }
    if (todos !== undefined) {
      await orca.storage.set(TODOS, todos.slice(0, 100))
    }
    return { ok: true }
  })

  orca.panels.handle('look.get', async () => ({
    dark: await storedPalette(orca, 'dark'),
    light: await storedPalette(orca, 'light')
  }))

  orca.panels.handle('look.apply', async ({ palette }) => {
    if (![palette.bg, palette.hg, palette.accent, palette.accent2].every(isHex)) {
      return { ok: false, error: 'Farben müssen wie #RRGGBB geschrieben sein.' }
    }
    try {
      const { revision } = await orca.host.call('appearance.read')
      const applied = await orca.host.call('appearance.apply', {
        expectedRevision: revision,
        ...buildAppearance(palette)
      })
      const stored = ((await orca.storage.get(LOOK)) as object | null) ?? {}
      await orca.storage.set(LOOK, { ...stored, [palette.mode]: palette })
      return { ok: true, themeId: applied.themeId }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  orca.panels.handle('sidebar.run', async ({ action }) => {
    try {
      await orca.host.call('commands.run', { action })
      return { ran: true }
    } catch {
      return { ran: false }
    }
  })

  orca.commands.register('cockpit.hello', async () => {
    await orca.host.call('notifications.show', { title: 'Orca Cockpit', body: 'Hallo vom Worker' })
    return 'Hallo vom Cockpit-Worker'
  })

  for (const event of [
    'agent.status.changed',
    'workspace.changed',
    'workspace.created',
    'workspace.removed'
  ] as const) {
    orca.events.on(event, () => refresh())
  }

  // Beobachter: protokolliert nur Länge und Art, nie den Text, und lässt alles durch.
  orca.hooks.on('terminal.send', (event, next) => {
    orca.log(`terminal.send ${event.terminalId} (${event.inputKind}): ${event.text.length} Zeichen`)
    return next(event)
  })
}
