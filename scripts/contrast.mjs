// Contrast_v1.0 — This section is intended to parse the theme token files, resolve each theme's text and tile colours, compute WCAG 2.1 contrast ratios for every required pair, print a Markdown table and exit 1 if any pair falls below its threshold (D7).
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILES = ['src/theme/tokens.css', 'src/theme/tatami.css'].map((f) => join(root, f)).filter((f) => existsSync(f))
const THEMES = ['newsprint', 'tatami']
const TEXT_MIN = 4.5
const TILE_MIN = 3

/** Collects every custom property declared inside [data-theme="<id>"] blocks, later blocks overriding earlier ones. */
function parseThemes(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const out = Object.fromEntries(THEMES.map((t) => [t, {}]))
  const blockRe = /\[data-theme="([a-z]+)"\]\s*\{([^}]*)\}/g
  let m
  while ((m = blockRe.exec(clean))) {
    const theme = m[1]
    if (!out[theme]) out[theme] = {}
    for (const decl of m[2].split(';')) {
      const i = decl.indexOf(':')
      if (i < 0) continue
      const name = decl.slice(0, i).trim()
      if (name.startsWith('--')) out[theme][name] = decl.slice(i + 1).trim()
    }
  }
  return out
}

/** Resolves var(--x) chains within one theme. */
function resolve(tokens, name, depth = 0) {
  const v = tokens[name]
  if (v === undefined) throw new Error(`token ${name} missing`)
  const ref = v.match(/^var\((--[\w-]+)\)$/)
  if (ref && depth < 10) return resolve(tokens, ref[1], depth + 1)
  return v
}

/** Parses #rgb, #rrggbb, rgb() and rgba() into [r, g, b, a]. */
function parseColor(v) {
  const s = v.trim().toLowerCase()
  if (s === 'white') return [255, 255, 255, 1]
  let m = s.match(/^#([0-9a-f]{3})$/)
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16)).concat(1)
  m = s.match(/^#([0-9a-f]{6})$/)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1)
  m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/)
  if (m) {
    let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
    return [Number(m[1]), Number(m[2]), Number(m[3]), a]
  }
  throw new Error(`cannot parse colour "${v}"`)
}

/** Composites a possibly translucent foreground over an opaque background. */
function over(fg, bg) {
  const a = fg[3]
  return [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a))).concat(1)
}

function luminance([r, g, b]) {
  const ch = (c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const hex = (c) => '#' + c.slice(0, 3).map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()

const TEXT_PAIRS = [
  ['ink / ground', '--ink', '--ground'],
  ['muted / ground', '--muted', '--ground'],
  ['ink / grid-empty', '--ink', '--grid-empty'],
  ['ink / page-ground', '--ink', '--page-ground'],
  ['control-ink / control-ground', '--control-ink', '--control-ground'],
  ['control-selected-ink / control-selected-ground', '--control-selected-ink', '--control-selected-ground'],
  ['watch-ink / watch-ground', '--watch-ink', '--watch-ground'],
  ['watch-muted / watch-ground', '--watch-muted', '--watch-ground'],
]

const css = FILES.map((f) => readFileSync(f, 'utf8')).join('\n')
const themes = parseThemes(css)
const rows = []
let failed = 0
const summary = []

for (const theme of THEMES) {
  const t = themes[theme]
  let lowText = { r: Infinity, pair: '' }
  let lowTile = { r: Infinity, pair: '' }
  for (const [label, fgName, bgName] of TEXT_PAIRS) {
    const bg = parseColor(resolve(t, bgName))
    const fg = over(parseColor(resolve(t, fgName)), bg)
    const r = ratio(fg, bg)
    const pass = r >= TEXT_MIN
    if (!pass) failed++
    if (r < lowText.r) lowText = { r, pair: label }
    rows.push([theme, label, `${hex(fg)} on ${hex(bg)}`, r, `≥ ${TEXT_MIN}`, pass])
  }
  const ink = parseColor(resolve(t, '--ink'))
  const white = [255, 255, 255, 1]
  for (let i = 1; i <= 5; i++) {
    const ev = parseColor(resolve(t, `--event-${i}`))
    const rw = ratio(white, ev)
    const ri = ratio(ink, ev)
    const useInk = ri > rw
    const r = Math.max(rw, ri)
    const pass = r >= TILE_MIN
    if (!pass) failed++
    const label = `tile label on event-${i} (${useInk ? 'ink' : 'white'})`
    if (r < lowTile.r) lowTile = { r, pair: label }
    rows.push([theme, label, `${hex(useInk ? ink : white)} on ${hex(ev)} (white ${rw.toFixed(2)} / ink ${ri.toFixed(2)})`, r, `≥ ${TILE_MIN}`, pass])
  }
  summary.push(`${theme}: lowest text ratio ${lowText.r.toFixed(2)}:1 (${lowText.pair}); lowest tile ratio ${lowTile.r.toFixed(2)}:1 (${lowTile.pair})`)
}

console.log(`Contrast (WCAG 2.1) — sources: ${FILES.map((f) => f.slice(root.length + 1).replace(/\\/g, '/')).join(', ')}`)
console.log('')
console.log('| Theme | Pair | Colours | Ratio | Min | Result |')
console.log('|---|---|---|---|---|---|')
for (const [theme, label, cols, r, min, pass] of rows) {
  console.log(`| ${theme} | ${label} | ${cols} | ${r.toFixed(2)}:1 | ${min} | ${pass ? 'PASS' : 'FAIL'} |`)
}
console.log('')
for (const s of summary) console.log(s)
console.log(failed === 0 ? `All ${rows.length} pairs pass.` : `${failed} of ${rows.length} pairs FAIL.`)
process.exit(failed === 0 ? 0 : 1)
