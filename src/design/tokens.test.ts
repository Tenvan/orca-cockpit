// Die JSON-Dateien müssen genau dem entsprechen, was tokens.ts berechnet, und lesbar sein.
import { readFileSync } from 'node:fs'
import { assert, test } from 'orca/testing'
import { buildAppTheme, buildTerminalTheme, contrast, mix, PRESETS, type Mode } from './tokens'

const read = (file: string) => JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'))

for (const mode of ['dark', 'light'] as Mode[]) {
  test(`${mode}: themes/*.json und terminal/*.json folgen tokens.ts`, () => {
    assert.deepEqual(read(`themes/${mode}.json`), buildAppTheme(PRESETS[mode]))
    assert.deepEqual(read(`terminal/${mode}.json`), buildTerminalTheme(PRESETS[mode]))
  })

  test(`${mode}: Text, Accent und Lila sind auf dem Hintergrund lesbar`, () => {
    const p = PRESETS[mode]
    for (const color of [p.hg, p.accent, p.accent2]) {
      assert.ok(contrast(p.bg, color) >= 4.5, `${color} auf ${p.bg}: ${contrast(p.bg, color)}`)
    }
  })
}

test('mix mischt linear', () => {
  assert.equal(mix('#000000', '#FFFFFF', 0.5), '#808080')
})
