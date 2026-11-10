// Runs src/worker.ts's activate(orca) with the orca object Orca passes, over a mock host.
import { assert, mockHost, mountWorker, test } from 'orca/testing'
import * as main from './worker'

const CAPABILITIES = [
  'storage:own',
  'settings:own',
  'agent:read',
  'workspace:read',
  'workspace:write',
  'terminal:read',
  'appearance:write',
  'notifications:show'
]

const AGENTS = {
  agents: [
    { terminalId: 't1', title: 'a', agent: 'claude', state: 'working', stateStartedAt: 1 },
    { terminalId: 't2', title: 'b', agent: 'claude', state: 'blocked', stateStartedAt: 2 }
  ]
}

test('collects agents, focus and workspaces into one overview', async () => {
  const host = mockHost({
    capabilities: CAPABILITIES,
    results: {
      'agents.list': AGENTS,
      'workspace.readContext': { branch: 'main', displayName: 'cockpit', terminals: [{ id: 't1' }] },
      'workspace.list': {
        workspaces: [{ id: 'w1', kind: 'worktree', name: 'cockpit', path: 'C:/x', branch: 'main', hostId: null }],
        truncated: false
      }
    }
  })
  const worker = await mountWorker(main, { host })
  const overview = (await worker.request('overview.get')) as {
    agents: unknown[]
    focus: { name: string } | null
    workspaces: unknown[]
    missing: string[]
  }
  assert.equal(overview.agents.length, 2)
  assert.equal(overview.focus?.name, 'cockpit')
  assert.equal(overview.workspaces.length, 1)
  assert.deepEqual(overview.missing, [])
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})

test('shows blocked agents in the status bar and notifies once', async () => {
  const host = mockHost({ capabilities: CAPABILITIES, results: { 'agents.list': AGENTS } })
  const worker = await mountWorker(main, { host, events: ['agent.status.changed'] })
  const event = { workspaceId: null, paneKey: 'p', state: 'blocked', receivedAt: 1 } as const
  await worker.emit('agent.status.changed', event)
  await worker.emit('agent.status.changed', event)
  const update = host
    .callsOf('statusBar.update')
    .map((params) => params as { id: string; text: string; tone: string } | undefined)
    .find((params) => params?.id === 'agents')
  assert.equal(update?.text, 'Agents: 1 aktiv, 1 blockiert')
  assert.equal(update?.tone, 'warning')
  assert.equal(host.callsOf('notifications.show').length, 1)
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})

test('reports missing rights instead of failing', async () => {
  const host = mockHost({ capabilities: ['storage:own', 'settings:own', 'notifications:show'] })
  const worker = await mountWorker(main, { host })
  const overview = (await worker.request('overview.get')) as { missing: string[]; agents: unknown[] }
  assert.deepEqual(overview.agents, [])
  assert.ok(overview.missing.includes('agent:read'))
  await worker.deactivate()
})

test('keeps notes and the checklist in storage', async () => {
  const host = mockHost({ capabilities: CAPABILITIES })
  const worker = await mountWorker(main, { host })
  await worker.request('notes.set', { notes: 'Hallo', todos: [{ id: 'a', text: 'x', done: false }] })
  assert.deepEqual(await worker.request('notes.get'), {
    notes: 'Hallo',
    todos: [{ id: 'a', text: 'x', done: false }]
  })
  await worker.deactivate()
})

test('applies a palette as app theme and terminal palette', async () => {
  const host = mockHost({
    capabilities: CAPABILITIES,
    results: {
      'appearance.read': { revision: 'a'.repeat(64) },
      'appearance.apply': { revision: 'b'.repeat(64), themeId: 'plugin:x/runtime-dark', mode: 'dark', delivery: 'published' }
    }
  })
  const worker = await mountWorker(main, { host })
  const palette = { mode: 'dark', bg: '#1A1030', hg: '#F5EEFA', accent: '#FF8A1F', accent2: '#B388FF' }
  assert.deepEqual(await worker.request('look.apply', { palette }), {
    ok: true,
    themeId: 'plugin:x/runtime-dark'
  })
  const call = host.callsOf('appearance.apply')[0] as { expectedRevision: string; app: string; terminal: string }
  assert.equal(call.expectedRevision, 'a'.repeat(64))
  assert.equal(JSON.parse(call.app).tokens['--primary'], '#FF8A1F')
  assert.equal(JSON.parse(call.terminal).terminal.magenta, '#B388FF')
  const refused = await worker.request('look.apply', { palette: { ...palette, bg: 'rot' } })
  assert.equal((refused as { ok: boolean }).ok, false)
  await worker.deactivate()
})

test('reads terminal output without ever sending text', async () => {
  const host = mockHost({
    capabilities: CAPABILITIES,
    results: { 'terminal.read': { lines: ['a', 'b'], truncated: false } }
  })
  const worker = await mountWorker(main, { host })
  assert.deepEqual(await worker.request('terminal.tail', { terminalId: 't1' }), { lines: ['a', 'b'], ok: true })
  assert.equal(host.callsOf('terminal.sendText').length, 0)
  await worker.deactivate()
})
