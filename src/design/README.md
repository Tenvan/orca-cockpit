# Design System (Atomic Design)

Von unten nach oben. Jede Schicht darf nur aus den tieferen importieren; `layers.test.ts` prüft das.

| Schicht       | Ordner / Datei            | Was                                                                 | Darf importieren                         |
| ------------- | ------------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| Tokens        | `tokens.ts`               | Farben (BG, HG, Orange, Lila), Mischung, Kontrast, Zustand → Ton und Text | nichts                            |
| Atome         | `atoms/`                  | Kleinste Bausteine: `StateBadge`, `Metric`, `Hint`, `SectionTitle`, `HexField`, `QuickButton`, `ActionButton` | `orca`, Tokens |
| Moleküle      | `molecules/`              | Kleine Einheiten: `StatTile`, `QuickBar`, `FocusCard`, `BlockedNotice`, `MissingRightsNotice`, `ContrastCard`, `TodoRow`, `PaletteFields` | + Atome, Protokoll-Typen |
| Organismen    | `organisms/`              | Eigenständige Bereiche: `StatGrid`, `AgentTable`, `WorkspaceBrowser`, `TerminalViewer`, `NotesEditor`, `Checklist`, `PaletteEditor` | + Moleküle |
| Templates     | `templates/`              | Seitengerüst ohne Inhalt: `TabbedShell`                              | `orca`                                   |
| Seiten        | `../pages/`               | Verbinden Store und Organismen; einzige Stelle mit Lesen/Schreiben   | alles darunter, `../state`               |
| Einstieg      | `../panel.tsx`            | Setzt Template und Seiten zusammen                                   | Template, Seiten, Store                  |

Regeln:

- Komponenten unterhalb der Seiten kennen keinen Store und keinen Worker: Daten kommen als Props,
  Ereignisse gehen als Callbacks nach oben.
- Keine Hex-Werte in Komponenten: Farbe läuft über `tone` (`neutral`, `accent`, `success`,
  `warning`, `danger`); Orca färbt sie mit dem aktiven Theme.
- Bedeutungen (welcher Stand welche Farbe und welchen Text hat) stehen nur in `tokens.ts`.
- Themes und Terminal-Paletten entstehen aus denselben Tokens: `node scripts/build-themes.ts`.
- Neue Komponente: in die tiefste Schicht, die sie trägt. Braucht sie Daten aus dem Worker, ist sie
  eine Seite.
