// Erzeugt themes/*.json und terminal/*.json aus src/design/tokens.ts. Aufruf aus dem Plugin-Ordner:
//   node scripts/build-themes.ts
import { writeFileSync } from 'node:fs'
import { buildAppTheme, buildTerminalTheme, PRESETS, type Mode } from '../src/design/tokens.ts'

for (const mode of ['dark', 'light'] as Mode[]) {
  const write = (file: string, data: unknown) =>
    writeFileSync(new URL(`../${file}`, import.meta.url), `${JSON.stringify(data, null, 2)}\n`)
  write(`themes/${mode}.json`, buildAppTheme(PRESETS[mode]))
  write(`terminal/${mode}.json`, buildTerminalTheme(PRESETS[mode]))
  console.log(`${mode}: themes/${mode}.json, terminal/${mode}.json`)
}
