// E2EHelpers_v1.0 — This section is intended to give every Playwright spec one way to seed the shared store with a template's sample data (the state applyTemplate(id, true) produces), open the app view on a tab, read the persisted state back, and audit buttons for aria-labels and 44 px targets.
import { expect, type Page } from '@playwright/test'
import { generate, getTemplate } from '../src/data'

export const KEY = 'igusa-demo-v1'

export interface StoredEntry { id: string; eventId: string; ts: number; severity?: number }
export interface StoredEvent { id: string; name: string; color: string; kind: 'symptom' | 'exposure'; askSeverity: boolean }
export interface StoredState {
  setupDone: boolean
  templateId: string | null
  events: StoredEvent[]
  entries: StoredEntry[]
  theme: 'newsprint' | 'tatami'
  weaveUnlocked: boolean
  presenterStep: number
  appTab: 'log' | 'grid' | 'weave' | 'summary'
  appOpen: boolean
}

export async function readState(page: Page): Promise<StoredState> {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.state, KEY)
}

/** Builds the persisted JSON for a template with 183 days of sample data, optionally overriding fields (e.g. appOpen, appTab, weaveUnlocked). */
export function seedState(templateId: string, overrides: Partial<StoredState> = {}): string {
  const t = getTemplate(templateId)
  if (!t) throw new Error(`unknown template ${templateId}`)
  const state: StoredState = {
    setupDone: true,
    templateId,
    events: t.events.map((e) => ({ ...e })),
    entries: generate(t),
    theme: 'newsprint',
    weaveUnlocked: false,
    presenterStep: 1,
    appTab: 'log',
    appOpen: false,
    ...overrides,
  }
  return JSON.stringify({ state, version: 1 })
}

/** Loads the page with the seeded store in place (seed written before the app boots, then reload). */
export async function openSeeded(page: Page, templateId = 'ibs', overrides: Partial<StoredState> = {}, url = './') {
  await page.goto(url)
  await page.getByTestId('phone-screen').waitFor()
  const seed = seedState(templateId, overrides)
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, seed] as const)
  await page.reload()
  await page.getByTestId('phone-screen').waitFor()
}

/** Seeds and opens the in-app view on a tab. */
export async function openApp(page: Page, tab: StoredState['appTab'] = 'log', templateId = 'ibs', overrides: Partial<StoredState> = {}) {
  await openSeeded(page, templateId, { appOpen: true, appTab: tab, ...overrides })
  await expect(page.getByTestId('app-view')).toBeVisible()
}

export async function buttonAudit(page: Page, rootTestId = 'phone-screen') {
  return page.getByTestId(rootTestId).evaluate((root) => {
    const buttons = [...root.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    const noLabel = buttons.filter((b) => !(b.getAttribute('aria-label') ?? '').trim()).map((b) => b.outerHTML.slice(0, 80))
    let min = { w: Infinity, h: Infinity, label: '' }
    for (const b of buttons) {
      const r = b.getBoundingClientRect()
      if (Math.min(r.width, r.height) < Math.min(min.w, min.h)) min = { w: r.width, h: r.height, label: b.getAttribute('aria-label') ?? '' }
    }
    const tooSmall = buttons.filter((b) => {
      const r = b.getBoundingClientRect()
      return r.width < 44 || r.height < 44
    }).length
    return { count: buttons.length, noLabel, tooSmall, min }
  })
}
