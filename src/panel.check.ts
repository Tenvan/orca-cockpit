// `orca plugin check` renders the panel once per scenario, each with the worker on a fresh
// host. Seed what the worker reads so check shows more than the first state.
import { defineCheck } from 'orca/testing'

export default defineCheck({
  leer: {},
  mitAgents: {
    results: {
      'agents.list': {
        agents: [
          { terminalId: 't1', title: 'Alpha', agent: 'claude', state: 'working', stateStartedAt: 1 },
          { terminalId: 't2', title: 'Beta', agent: 'codex', state: 'blocked', stateStartedAt: 2 }
        ]
      },
      'workspace.readContext': { branch: 'main', displayName: 'orca-cockpit', terminals: [{ id: 't1' }] }
    }
  }
})
