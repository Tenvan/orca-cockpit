// Atome: die kleinsten Bausteine. Sie kennen nur Tokens und Orcas Grundkomponenten, nie Daten
// aus dem Worker und nie andere Atome außer Tokens. Alles läuft über Props.
import { Badge, Button, Heading, IconButton, Input, Text, type IconName } from 'orca'
import { STATE_LABEL, STATE_TONE, isHex, type AgentState, type Tone } from '../tokens'

/** Farbiges Etikett für den Stand eines Agents. */
export function StateBadge(props: { state: AgentState }) {
  return <Badge tone={STATE_TONE[props.state]}>{STATE_LABEL[props.state]}</Badge>
}

/** Eine große Zahl. */
export function Metric(props: { value: number | string }) {
  return <Heading level={2}>{props.value}</Heading>
}

/** Leiser Hinweistext. */
export function Hint(props: { children: string }) {
  return (
    <Text muted size="xs">
      {props.children}
    </Text>
  )
}

/** Zwischenüberschrift innerhalb eines Reiters. */
export function SectionTitle(props: { children: string }) {
  return <Heading level={3}>{props.children}</Heading>
}

/** Ein Hex-Farbfeld, rot markiert bei ungültiger Eingabe. */
export function HexField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Input
      label={props.label}
      value={props.value}
      invalid={!isHex(props.value)}
      maxLength={7}
      onChange={(value) => props.onChange(value.toUpperCase())}
    />
  )
}

/** Knopf nur mit Symbol; `label` ist Name und Tooltip. */
export function QuickButton(props: { icon: IconName; label: string; onPress: () => void }) {
  return <IconButton icon={props.icon} label={props.label} variant="ghost" onPress={props.onPress} />
}

/** Textknopf, `quiet` für Nebenaktionen. */
export function ActionButton(props: {
  children: string
  onPress: () => void
  quiet?: boolean
  disabled?: boolean
  tone?: Tone
}) {
  return (
    <Button
      variant={props.quiet ? 'ghost' : 'solid'}
      tone={props.tone}
      disabled={props.disabled}
      onPress={props.onPress}
    >
      {props.children}
    </Button>
  )
}
