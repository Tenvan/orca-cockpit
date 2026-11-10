// `orca plugin test .` runs this in Node with the same runtime and checks Orca uses.
import { assert, mockHost, mount, test } from 'orca/testing'
import * as panel from './panel'
import { PRESETS } from './palette'
import type { Overview } from './protocol'

const overview: Overview = {
  agents: [
    { terminalId: 't1', title: 'Alpha', agent: 'claude', state: 'working', since: 1 },
    { terminalId: 't2', title: 'Beta', agent: 'codex', state: 'blocked', since: 2 },
    { terminalId: 't3', title: 'Gamma', agent: 'claude', state: 'done', since: 3 }
  ],
  focus: { name: 'cockpit', branch: 'main', terminals: [{ id: 't1', title: 'Alpha' }] },
  workspaces: [
    { id: 'w1', name: 'orca-cockpit', kind: 'worktree', branch: 'main', path: 'C:/x', project: null },
    { id: 'w2', name: 'K3C', kind: 'folder', branch: null, path: 'C:/y', project: null }
  ],
  truncated: false,
  missing: [],
  updatedAt: 1
}

function requests(extra: Record<string, unknown> = {}) {
  return {
    'overview.get': () => overview,
    'workspace.open': () => ({ opened: true }),
    'terminal.tail': () => ({ lines: ['npm test', 'ok'], ok: true }),
    'notes.get': () => ({ notes: 'Notiz', todos: [] }),
    'notes.set': () => ({ ok: true }),
    'look.get': () => ({ dark: PRESETS.dark, light: PRESETS.light }),
    'look.apply': () => ({ ok: true, themeId: 'plugin:x/runtime-dark' }),
    'sidebar.run': () => ({ ran: true }),
    ...extra
  } as never
}

test('overview warns about blocked agents and shows the focus', async () => {
  const view = await mount(panel, { host: mockHost({ requests: requests() }) })
  assert.ok(view.find({ text: /1 Agent\(s\) warten auf dich/ }))
  assert.ok(view.find({ text: /main/ }))
  assert.deepEqual(view.errors, [])
  assert.deepEqual(view.refusals, [])
  await view.unmount()
})

test('lists agents and opens a workspace from the table', async () => {
  const opened: unknown[] = []
  const view = await mount(panel, {
    host: mockHost({
      requests: requests({
        'workspace.open': (input: unknown) => (opened.push(input), { opened: true })
      })
    })
  })
  await view.select({ role: 'tablist' }, 'agents')
  assert.ok(view.find({ text: /Beta/ }))
  await view.select({ role: 'tablist' }, 'workspaces')
  await view.activateRow({ type: 'Table' }, 'w2')
  assert.deepEqual(opened, [{ id: 'w2' }])
  assert.deepEqual(view.errors, [])
  await view.unmount()
})

test('reads the last terminal lines of an agent', async () => {
  const view = await mount(panel, { host: mockHost({ requests: requests() }) })
  await view.select({ role: 'tablist' }, 'agents')
  await view.activateRow({ type: 'Table' }, 't1')
  assert.ok(view.find({ text: /npm test/ }))
  assert.deepEqual(view.errors, [])
  await view.unmount()
})

test('applies the chosen palette', async () => {
  const applied: unknown[] = []
  const view = await mount(panel, {
    host: mockHost({
      requests: requests({
        'look.apply': (input: unknown) => (applied.push(input), { ok: true, themeId: 'plugin:x/y' })
      })
    })
  })
  await view.select({ role: 'tablist' }, 'look')
  await view.press({ text: 'Anwenden' })
  assert.equal(applied.length, 1)
  assert.ok(view.find({ text: /Angewendet/ }))
  assert.deepEqual(view.errors, [])
  await view.unmount()
})
