# Orca Cockpit

Test-Cockpit: je ein kleines Beispiel pro Plugin-Möglichkeit. Alles ist mit drei Farben erkennbar:
**BG** (Hintergrund), **HG** (Vordergrund/Text) und **Accent**.

| Farbe  | Dark      | Light     |
| ------ | --------- | --------- |
| BG     | `#101820` | `#F7F3E8` |
| HG     | `#F2EFE6` | `#1A1F2B` |
| Accent | `#FF3D9A` | `#C2005A` |

## Was wo steckt

| Möglichkeit                  | Datei                                    | Zu sehen als                                  |
| ---------------------------- | ---------------------------------------- | --------------------------------------------- |
| App-Themes (Dark/Light)      | `themes/*.json`                          | Settings → Appearance                         |
| Terminal-Paletten            | `terminal/*.json`                        | Settings → Terminal                           |
| Komponenten-Panel            | `src/panel.tsx`                          | Rechte Seitenleiste „Cockpit"                 |
| HTML-Panel                   | `panels/farben.html`                     | Rechte Seitenleiste „Cockpit Farben"          |
| Worker + Panel-Anfragen      | `src/worker.ts`, `src/protocol.ts`       | Zähler und Notify im Panel                    |
| Befehle + Shortcut           | `orca-plugin.json`                       | Palette „Cockpit: …", `Mod+Alt+K`             |
| Statusleiste                 | `orca-plugin.json`, `src/worker.ts`      | „Agents: … aktiv, … blockiert", „Workspace: …" |
| Events                       | `src/worker.ts`                          | Agent-Status und Workspace-Wechsel            |
| Hook (nur beobachtend)       | `src/worker.ts`                          | `orca plugin logs local.orca-cockpit`         |
| Settings                     | `orca-plugin.json`                       | Settings → Plugins → Orca Cockpit             |
| Custom Editor + neue Datei   | `editor/index.html`, `templates/`        | `.cockpit`-Dateien, „+"-Menü                  |

Bewusst nicht enthalten: Icon-Themes, Fonts, Syntaxen, Sprachpakete und VM-Rezepte (reine Datenpakete, brauchen eigene Assets).

## Laden und testen

```sh
orca plugin validate .
orca plugin test .            # Panel- und Worker-Tests in Node
orca plugin check .           # rendert Panel und prüft Editor
orca plugin dev watch . --check   # lädt den Ordner in Orca (verlangt eine Freigabe)
```

Beim ersten Laden zeigt Orca, was das Plugin darf, und nennt einen Fingerprint für `--approve`.
Nur diesen eigenen Ordner laden: keine Kataloge und keine Git-URLs hinzufügen.
