// Templates: das Seitengerüst ohne Inhalt. Sie legen fest, wie Seiten angeordnet sind, und
// bekommen die fertigen Seiten als Props. Kein Datenzugriff.
import { Tab, Tabs, type IconName } from 'orca'
import type { OrcaNode } from 'orca'

export type PageSlot = { value: string; label: string; icon: IconName; content: OrcaNode }

/** Reiter-Gerüst: ein Reiter pro Seite, Orca zeichnet nur den gewählten. */
export function TabbedShell(props: {
  label: string
  value: string
  onChange: (value: string) => void
  pages: PageSlot[]
}) {
  return (
    <Tabs label={props.label} value={props.value} onChange={props.onChange}>
      {props.pages.map((page) => (
        <Tab key={page.value} value={page.value} label={page.label} icon={page.icon}>
          {page.content}
        </Tab>
      ))}
    </Tabs>
  )
}
