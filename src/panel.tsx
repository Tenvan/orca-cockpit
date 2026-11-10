// Komponenten-Panel: kein Build-Schritt, Orca zeichnet den Baum mit eigenen Controls.
import {
  atom,
  Badge,
  Button,
  Heading,
  plugin,
  read,
  Row,
  set,
  Stack,
  Text,
  update,
  type PanelContext
} from 'orca'

/** What the worker last reported; null until it answers. */
const total = atom<number | null>(null)
/** A keyed atom: `persist: 'plugin'` keeps it across panel runs. */
const step = atom('step', 1, { persist: 'plugin' })

async function add(): Promise<void> {
  const answer = await plugin.request('counter.add', { by: read(step) })
  set(total, answer.total)
}

export function setup(ctx: PanelContext): void {
  ctx.subscriptions.push(plugin.on('counter.changed', (payload) => set(total, payload.total)))
  void plugin.request('counter.get').then((answer) => set(total, answer.total))
}

export default function Panel() {
  const value = read(total)
  const by = read(step)
  return (
    <Stack gap="md">
      <Row justify="between">
        <Heading>Cockpit</Heading>
        <Badge tone="accent">{value === null ? '-' : value}</Badge>
      </Row>
      <Row gap="xs">
        <Button onPress={add}>Add {by}</Button>
        <Button variant="ghost" onPress={() => update(step, (n) => (n === 1 ? 10 : 1))}>
          Step {by === 1 ? 10 : 1}
        </Button>
        <Button variant="ghost" onPress={() => void plugin.request('hello.notify')}>
          Notify
        </Button>
      </Row>
      <Text muted size="xs">
        Zähler im Worker-Storage, Notify über die Worker-Capability notifications:show.
      </Text>
    </Stack>
  )
}
