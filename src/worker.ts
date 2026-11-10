// Worker: Panel-Anfragen, Befehl, Events, Statusleiste, Hook und Settings an einem Ort.
// Orca transpiliert die Datei beim Laden (kein Build-Schritt); Zustand liegt in orca.storage.
import type { OrcaWorkerApi } from 'orca/worker'

const TOTAL = 'total'

async function storedTotal(orca: OrcaWorkerApi): Promise<number> {
  const value = await orca.storage.get(TOTAL)
  return typeof value === 'number' ? value : 0
}

async function notify(orca: OrcaWorkerApi): Promise<boolean> {
  const { delivered } = await orca.host.call('notifications.show', {
    title: 'Orca Cockpit',
    body: 'Hallo vom Worker'
  })
  return delivered
}

async function refreshAgents(orca: OrcaWorkerApi): Promise<void> {
  const { agents } = await orca.host.call('agents.list')
  const working = agents.filter((agent) => agent.state === 'working').length
  const blocked = agents.filter((agent) => agent.state === 'blocked').length
  const label = String((await orca.settings.get('agentsLabel')) ?? 'Agents')
  await orca.host.call('statusBar.update', {
    id: 'agents',
    text: `${label}: ${working} aktiv, ${blocked} blockiert`,
    tone: blocked > 0 ? 'warning' : 'accent'
  })
  if (blocked > 0 && (await orca.settings.get('notifyOnBlocked')) !== false) {
    await orca.host.call('notifications.show', {
      title: 'Orca Cockpit',
      body: `${blocked} Agent(s) blockiert`
    })
  }
}

export default function activate(orca: OrcaWorkerApi): void {
  orca.panels.handle('counter.get', async () => ({ total: await storedTotal(orca) }))
  orca.panels.handle('counter.add', async ({ by }) => {
    const total = (await storedTotal(orca)) + by
    await orca.storage.set(TOTAL, total)
    orca.panels.post('counter.changed', { total })
    return { total }
  })
  orca.panels.handle('hello.notify', async () => ({ delivered: await notify(orca) }))

  orca.commands.register('cockpit.hello', async () => {
    await notify(orca)
    return 'Hallo vom Cockpit-Worker'
  })

  orca.events.on('agent.status.changed', () => refreshAgents(orca))
  orca.events.on('workspace.changed', async ({ context }) => {
    await orca.host.call('statusBar.update', {
      id: 'workspace',
      text: `Workspace: ${context?.displayName ?? '–'}`
    })
  })

  // Beobachter: protokolliert nur Länge und Art, nie den Text, und lässt alles durch.
  orca.hooks.on('terminal.send', (event, next) => {
    orca.log(`terminal.send ${event.terminalId} (${event.inputKind}): ${event.text.length} Zeichen`)
    return next(event)
  })
}
