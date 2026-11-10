// Die Farbwelt an einem Ort: aus vier Farben (BG, HG, Accent, Lila) entstehen App-Theme und
// Terminal-Palette. Die JSON-Dateien in themes/ und terminal/ werden daraus erzeugt
// (`node scripts/build-themes.ts`), der Look-Reiter im Panel wendet dieselbe Rechnung live an.
// Nur löschbare TypeScript-Syntax, damit Node die Datei ohne Build direkt ausführt.

export type Mode = 'dark' | 'light'

export type Palette = {
  mode: Mode
  /** BG: Hintergrund */
  bg: string
  /** HG: Vordergrund und Text */
  hg: string
  /** Hauptakzent (Orange) */
  accent: string
  /** Zweitfarbe (Lila) */
  accent2: string
}

export const PRESETS: Record<Mode, Palette> = {
  dark: { mode: 'dark', bg: '#1A1030', hg: '#F5EEFA', accent: '#FF8A1F', accent2: '#B388FF' },
  light: { mode: 'light', bg: '#FBF6FF', hg: '#2A1840', accent: '#B35000', accent2: '#6B2FB5' }
}

const HEX = /^#[0-9a-fA-F]{6}$/

export function isHex(value: string): boolean {
  return HEX.test(value)
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** `amount` (0..1) von `b` in `a` gemischt, als Hex. */
export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  const part = (x: number, y: number) =>
    Math.round(x + (y - x) * amount)
      .toString(16)
      .padStart(2, '0')
  return `#${part(ar, br)}${part(ag, bg)}${part(ab, bb)}`.toUpperCase()
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG-Kontrastverhältnis zweier Hex-Farben (1 bis 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Von zwei Kandidaten die Farbe, die auf `onto` besser lesbar ist. */
function readable(onto: string, first: string, second: string): string {
  return contrast(onto, first) >= contrast(onto, second) ? first : second
}

export function buildAppTheme(p: Palette): { schemaVersion: 1; base: Mode; tokens: Record<string, string> } {
  const surface = mix(p.bg, p.hg, 0.06)
  const quiet = mix(p.bg, p.hg, 0.1)
  const border = mix(p.bg, p.hg, 0.18)
  const sidebar = mix(p.bg, p.hg, 0.08)
  const onAccent = readable(p.accent, p.bg, p.hg)
  return {
    schemaVersion: 1,
    base: p.mode,
    tokens: {
      '--background': p.bg,
      '--foreground': p.hg,
      '--card': surface,
      '--popover': surface,
      '--primary': p.accent,
      '--primary-foreground': onAccent,
      '--secondary': quiet,
      '--muted': quiet,
      '--muted-foreground': mix(p.bg, p.hg, 0.7),
      '--accent': mix(p.bg, p.accent2, 0.22),
      '--border': border,
      '--input': border,
      '--ring': p.accent,
      '--chart-1': p.accent,
      '--chart-2': p.accent2,
      '--sidebar': sidebar,
      '--sidebar-primary': p.accent,
      '--sidebar-primary-foreground': onAccent,
      '--sidebar-accent': mix(sidebar, p.accent2, 0.22),
      '--sidebar-border': border,
      '--tab-active-indicator': p.accent,
      '--text-link': p.accent2,
      '--chat-bold-foreground': p.accent
    }
  }
}

const ANSI: Record<Mode, Record<string, string>> = {
  dark: {
    black: '#2A1F44',
    red: '#FF6B8A',
    green: '#8EE0A1',
    yellow: '#FFD166',
    blue: '#8AB4FF'
  },
  light: {
    black: '#2A1840',
    red: '#B3002D',
    green: '#1F7A3A',
    yellow: '#8A5A00',
    blue: '#0B5FA5'
  }
}

export function buildTerminalTheme(p: Palette): {
  schemaVersion: 1
  mode: Mode
  terminal: Record<string, string>
} {
  return {
    schemaVersion: 1,
    mode: p.mode,
    terminal: {
      background: p.bg,
      foreground: p.hg,
      ...ANSI[p.mode],
      magenta: p.accent2,
      cyan: p.mode === 'dark' ? '#5CE1E6' : '#00707A',
      white: p.mode === 'dark' ? p.hg : mix(p.bg, p.hg, 0.15)
    }
  }
}

/** Was `appearance.apply` erwartet: App-Theme und Terminal-Palette als JSON-Text. */
export function buildAppearance(p: Palette): { app: string; terminal: string } {
  const { base, tokens } = buildAppTheme(p)
  return {
    app: JSON.stringify({ base, tokens }),
    terminal: JSON.stringify(buildTerminalTheme(p))
  }
}

// ---------------------------------------------------------------------------------------------
// Semantische Tokens: Welche Bedeutung welchen Ton und Text bekommt. Alle Bausteine darüber
// (Atome bis Seiten) lesen sie von hier, nichts steht doppelt in einer Komponente.
// ---------------------------------------------------------------------------------------------

/** Orcas Farbvokabular für Komponenten: keine Hex-Werte in Komponenten, nur Töne. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export type AgentState = 'working' | 'blocked' | 'waiting' | 'done'

export const AGENT_STATES: readonly AgentState[] = ['working', 'blocked', 'waiting', 'done']

export const STATE_TONE: Record<AgentState, Tone> = {
  working: 'accent',
  blocked: 'danger',
  waiting: 'warning',
  done: 'success'
}

export const STATE_LABEL: Record<AgentState, string> = {
  working: 'arbeitet',
  blocked: 'blockiert',
  waiting: 'wartet',
  done: 'fertig'
}

/** Ab diesem Kontrastverhältnis gilt Text als gut lesbar (WCAG AA). */
export const CONTRAST_MIN = 4.5

export function contrastTone(ratio: number): Tone {
  return ratio >= CONTRAST_MIN ? 'success' : 'warning'
}
