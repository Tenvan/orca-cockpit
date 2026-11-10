# Orca Cockpit

Ein Cockpit für Orca: Agents, Workspaces, Terminal-Ausgabe, Notizen und Farben auf einen Blick.
Gedacht als Test-Cockpit und Vorlage für ein eigenes. Farben: **Orange** und **Lila** auf Aubergine.

| Farbe        | Dark      | Light     |
| ------------ | --------- | --------- |
| BG           | `#1A1030` | `#FBF6FF` |
| HG           | `#F5EEFA` | `#2A1840` |
| Accent (Orange) | `#FF8A1F` | `#B35000` |
| Zweitfarbe (Lila) | `#B388FF` | `#6B2FB5` |

Die Farben stehen einmal in `src/palette.ts`. Daraus entstehen `themes/*.json` und `terminal/*.json`
(`node scripts/build-themes.ts`), und der Reiter „Look“ im Panel wendet dieselbe Rechnung live an.
Ein Test hält die JSON-Dateien und die Rechnung gleich und prüft den Kontrast (mind. 4,5 : 1).

## Das Cockpit-Panel (rechte Seitenleiste)

| Reiter      | Zeigt                                                                          | Braucht                |
| ----------- | ------------------------------------------------------------------------------ | ---------------------- |
| Übersicht   | Agents nach Stand (arbeitet, blockiert, wartet, fertig), Fortschritt, Fokus-Workspace, Warnung bei blockierten Agents, Schnellzugriff auf Orca-Ansichten | `agent:read`, `workspace:read`, `workspace:write` |
| Agents      | Tabelle mit Stand und „seit“; Doppelklick springt zur Terminal-Ausgabe          | `agent:read`           |
| Workspaces  | Alle Workspaces mit Filter; Doppelklick zeigt ihn in Orca                       | `workspace:read`, `workspace:write` |
| Terminal    | Letzte Zeilen eines Terminals, nur lesend                                       | `terminal:read`        |
| Notizen     | Notizen und Checkliste im Plugin-Speicher                                       | `storage:own`          |
| Look        | Vier Farben bearbeiten, Kontrast sehen, als Theme in Orca anwenden              | `appearance:write`     |

Fehlt ein Recht, bricht nichts ab: die Übersicht nennt dann, was fehlt.

## Was sonst noch drin ist

| Möglichkeit                | Datei                                  | Zu sehen als                                      |
| -------------------------- | -------------------------------------- | ------------------------------------------------- |
| App-Themes, Terminal-Paletten | `themes/*.json`, `terminal/*.json`  | Settings → Appearance / Terminal                  |
| HTML-Panel                 | `panels/farben.html`                   | Rechte Seitenleiste „Cockpit Farben“              |
| Worker                     | `src/worker.ts`, `src/protocol.ts`     | Daten fürs Panel, Statusleiste, Events            |
| Befehle und Shortcut       | `orca-plugin.json`                     | Palette „Cockpit: …“, `Mod+Alt+K`                 |
| Statusleiste               | `src/worker.ts`                        | „Agents: … aktiv, … blockiert“, „Workspace: …“    |
| Events                     | `src/worker.ts`                        | Agent-Status, Workspace geändert/angelegt/entfernt |
| Hook (nur beobachtend)     | `src/worker.ts`                        | `orca plugin logs local.orca-cockpit`             |
| Settings                   | `orca-plugin.json`                     | Settings → Plugins → Orca Cockpit                 |
| Custom Editor, neue Datei  | `editor/index.html`, `templates/`      | `.cockpit`-Dateien, „+“-Menü                      |

Bewusst nicht enthalten: Icon-Themes, Fonts, Syntaxen, Sprachpakete und VM-Rezepte (reine
Datenpakete, brauchen eigene Assets). Das Plugin schreibt nie in ein Terminal (`terminal:send`
fehlt) und startet keine Agents.

## Rechte

`storage:own`, `settings:own`, `agent:read`, `workspace:read`, `workspace:write`, `terminal:read`,
`appearance:write`, `notifications:show`. Ein trusted-worker läuft ohne OS-Sandbox mit deinen
Benutzerrechten; `terminal:read` kann jede Terminal-Ausgabe lesen. Nur den eigenen Ordner laden.

## Laden und testen

```sh
orca plugin validate .
orca plugin test .            # Panel-, Worker- und Farb-Tests in Node
orca plugin check .           # rendert das Panel und prüft den Editor
orca plugin dev load .        # lädt den Ordner in Orca (verlangt eine Freigabe)
```

Beim ersten Laden zeigt Orca, was das Plugin darf, und nennt einen Fingerprint für `--approve`.
Neue Rechte verlangen eine neue Freigabe. Keine Kataloge und keine Git-URLs hinzufügen.

**Bekannter Stolperstein (Orca 1.4.255):** Orca legt beim Laden `.orca/types/` an und bildet den
Hash der Freigabe ohne, die Prüfung beim Start aber mit diesem Ordner. Dann steht das Plugin auf
`errored` („content hash mismatch“). Abhilfe: `.orca/` löschen und
`orca plugin restart local.orca-cockpit`.
