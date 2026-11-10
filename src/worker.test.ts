// Runs src/worker.ts's activate(orca) with the orca object Orca passes, over a mock host.
import { assert, mockHost, mountWorker, test } from 'orca/testing'
import * as main from './worker'

const CAPABILITIES = [
  'storage:own',
  'settings:own',
  'agent:read',
  'workspace:read',
  'notifications:show'
]

test('adds to the stored total and tells open panels', async () => {
  const host = mockHost({ capabilities: CAPABILITIES, storage: { total: 2 } })
  const worker = await mountWorker(main, { host })
  assert.deepEqual(await worker.request('counter.get'), { total: 2 })
  assert.deepEqual(await worker.request('counter.add', { by: 3 }), { total: 5 })
  assert.deepEqual(worker.posts, [{ event: 'counter.changed', payload: { total: 5 } }])
  assert.deepEqual(host.data().storage, { total: 5 })
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})

test('shows blocked agents in the status bar', async () => {
  const host = mockHost({
    capabilities: CAPABILITIES,
    results: {
      'agents.list': {
        agents: [
          { terminalId: 't1', title: 'a', agent: 'claude', state: 'working', stateStartedAt: 1 },
          { terminalId: 't2', title: 'b', agent: 'claude', state: 'blocked', stateStartedAt: 2 }
        ]
      }
    }
  })
  const worker = await mountWorker(main, {
    host,
    events: ['agent.status.changed']
  })
  await worker.emit('agent.status.changed', {
    workspaceId: null,
    paneKey: 'p',
    state: 'blocked',
    receivedAt: 1
  })
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
