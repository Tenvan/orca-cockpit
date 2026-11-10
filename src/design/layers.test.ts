// Erzwingt die Atomic-Design-Regel: jede Schicht importiert nur von unten, nie von oben.
import { readFileSync } from 'node:fs'
import { assert, test } from 'orca/testing'

const ALLOWED: Record<string, string[]> = {
  'tokens.ts': [],
  'atoms/index.tsx': ['orca', '../tokens'],
  'molecules/index.tsx': ['orca', '../tokens', '../atoms', '../../protocol'],
  'organisms/index.tsx': ['orca', '../tokens', '../atoms', '../molecules', '../../protocol'],
  'templates/index.tsx': ['orca']
}

for (const [file, allowed] of Object.entries(ALLOWED)) {
  test(`${file} importiert nur aus tieferen Schichten`, () => {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1])
    const forbidden = imports.filter((name) => !allowed.includes(name))
    assert.deepEqual(forbidden, [], `${file} greift nach oben oder zur Seite: ${forbidden.join(', ')}`)
  })
}
