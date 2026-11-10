// Moleküle: wenige Atome zu einer kleinen, sinnvollen Einheit. Sie dürfen Atome und Tokens
// benutzen, sonst nichts aus dem Design System. Weiterhin nur Props, kein Zugriff auf Daten.
import { Box, Callout, Checkbox, KeyValue, Row, Stack, Toolbar, type IconName } from 'orca'
import type { Focus } from '../../protocol'
import { ActionButton, HexField, Metric, QuickButton, StateBadge } from '../atoms'
import { contrast, contrastTone, type AgentState, type Palette } from '../tokens'

/** Kachel: Zahl plus Stand-Etikett. */
export function StatTile(props: { state: AgentState; value: number }) {
  return (
    <Box border radius="md" padding="sm" gap="xs">
      <Row justify="between">
        <Metric value={props.value} />
        <StateBadge state={props.state} />
      </Row>
    </Box>
  )
}

/** Leiste mit Symbolknöpfen, die Orca-Ansichten öffnen. */
export function QuickBar(props: {
  items: { id: string; icon: IconName; label: string }[]
  onPress: (id: string) => void
}) {
  return (
    <Toolbar label="Orca-Ansichten" gap="xs">
      {props.items.map((item) => (
        <QuickButton key={item.id} icon={item.icon} label={item.label} onPress={() => props.onPress(item.id)} />
      ))}
    </Toolbar>
  )
}

/** Der Workspace im Fokus als Schlüssel-Wert-Liste. */
export function FocusCard(props: { focus: Focus | null; workspaceCount: number }) {
  const { focus } = props
  return (
    <KeyValue
      label="Fokus"
      items={
        focus
          ? [
              { label: 'Workspace', value: focus.name },
              { label: 'Branch', value: focus.branch, code: true },
              { label: 'Terminals', value: focus.terminals.length },
              { label: 'Workspaces gesamt', value: props.workspaceCount }
            ]
          : [{ label: 'Workspace', value: 'keiner im Fokus' }]
      }
    />
  )
}

/** Meldung, dass Agents auf den Menschen warten. */
export function BlockedNotice(props: { count: number }) {
  return props.count > 0 ? (
    <Callout tone="danger" title={`${props.count} Agent(s) warten auf dich`}>
      Reiter „Agents“ zeigt, welche.
    </Callout>
  ) : null
}

/** Meldung, welche Rechte dem Plugin fehlen. */
export function MissingRightsNotice(props: { missing: string[] }) {
  return props.missing.length > 0 ? (
    <Callout tone="warning" title="Rechte fehlen">
      {`Dem Plugin fehlt: ${props.missing.join(', ')}. Das Panel zeigt dafür weniger an.`}
    </Callout>
  ) : null
}

/** Kontrastwerte einer Farbwahl, grün ab 4,5 : 1. */
export function ContrastCard(props: { palette: Palette }) {
  const { palette } = props
  const row = (label: string, color: string) => {
    const ratio = contrast(palette.bg, color)
    return { label, value: `${ratio.toFixed(1)} : 1`, tone: contrastTone(ratio) }
  }
  return (
    <KeyValue
      label="Kontrast (ab 4.5 gut lesbar)"
      items={[
        row('Text auf BG', palette.hg),
        row('Accent auf BG', palette.accent),
        row('Lila auf BG', palette.accent2)
      ]}
    />
  )
}

/** Eine Zeile der Checkliste: Haken plus Entfernen. */
export function TodoRow(props: {
  text: string
  done: boolean
  onToggle: (done: boolean) => void
  onRemove: () => void
}) {
  return (
    <Row justify="between">
      <Checkbox label={props.text} checked={props.done} onChange={props.onToggle} />
      <QuickButton icon="delete" label="Entfernen" onPress={props.onRemove} />
    </Row>
  )
}

/** Zeile mit den vier Farbfeldern und den zwei Aktionen. */
export function PaletteFields(props: {
  palette: Palette
  onChange: (key: 'bg' | 'hg' | 'accent' | 'accent2', value: string) => void
  onApply: () => void
  onReset: () => void
  valid: boolean
}) {
  const { palette, onChange } = props
  return (
    <Stack gap="md">
      <HexField label="BG (Hintergrund)" value={palette.bg} onChange={(v) => onChange('bg', v)} />
      <HexField label="HG (Text)" value={palette.hg} onChange={(v) => onChange('hg', v)} />
      <HexField label="Accent (Orange)" value={palette.accent} onChange={(v) => onChange('accent', v)} />
      <HexField label="Zweitfarbe (Lila)" value={palette.accent2} onChange={(v) => onChange('accent2', v)} />
      <Row gap="xs">
        <ActionButton disabled={!props.valid} onPress={props.onApply}>
          Anwenden
        </ActionButton>
        <ActionButton quiet onPress={props.onReset}>
          Zurücksetzen
        </ActionButton>
      </Row>
    </Stack>
  )
}
