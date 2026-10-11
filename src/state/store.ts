// Store_v1.0 — This section is intended to hold the one shared zustand store both devices read (setup, events, entries, theme, presenter state), persist it to localStorage under 'igusa-demo-v1', attach a later severity choice to the original tap timestamp, and reset everything to the tutorial start.
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { Entry, EventDef, Severity } from '../engine'
import { PALETTE, generate, getTemplate } from '../data'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key for the persisted slice. */
export const STORAGE_KEY = 'igusa-demo-v1'

/** How long the severity row stays open after a tap (ms). Override with VITE_SEVERITY_MS. */
export const SEVERITY_MS: number = Number(import.meta.env?.VITE_SEVERITY_MS ?? 15000)

/** How long "Logged." + Undo stays visible after a tap (ms). */
export const LOGGED_MS = 3000

/** Hard cap on events per set (palette has five event colours). */
export const MAX_EVENTS = 5

const BRICK = PALETTE[0]
const MOSS = PALETTE[4]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'newsprint' | 'tatami'
export type PresenterStep = 1 | 2 | 3 | 4 | 5 | 6
export type AppTab = 'log' | 'grid' | 'weave' | 'summary'

/** A pointer at one entry that expires at an epoch-ms instant. */
export interface Expiring {
  entryId: string
  expiresAt: number
}

/** Fields of a new event; `color` is optional and is assigned from the palette when omitted or unavailable. */
export type NewEvent = Omit<EventDef, 'color'> & { color?: string }

export interface IgusaState {
  setupDone: boolean
  templateId: string | null
  events: EventDef[]
  entries: Entry[]
  theme: Theme
  weaveUnlocked: boolean
  pendingSeverity: Expiring | null
  lastLogged: Expiring | null
  presenterStep: PresenterStep
  appTab: AppTab
  appOpen: boolean
  /** Weave unlock sheet shown over the app view (S12 opens, S13 closes). */
  paywallOpen: boolean
}

export interface IgusaActions {
  applyTemplate: (templateId: string, withSampleData: boolean) => void
  setEvents: (events: EventDef[]) => void
  updateEvent: (id: string, patch: Partial<Omit<EventDef, 'id'>>) => void
  /** Adds an event (≤ 5). Returns the stored event, or null when the cap is reached or the id is taken. */
  addEvent: (def: NewEvent) => EventDef | null
  /** Logs one tap at `ts` (default now). Returns the entry id, or null when the event is unknown. */
  log: (eventId: string, ts?: number) => string | null
  /** Attaches a severity to the entry's original timestamp; clears a pending row that points at it. */
  setSeverity: (entryId: string, severity: Severity) => void
  clearPendingSeverity: () => void
  /** Removes the entry; clears lastLogged / pendingSeverity when they point at it. */
  undo: (entryId: string) => void
  deleteEntry: (id: string) => void
  updateEntryTime: (id: string, ts: number) => void
  setTheme: (theme: Theme) => void
  unlockWeave: () => void
  setPaywallOpen: (open: boolean) => void
  setPresenterStep: (step: PresenterStep) => void
  setAppTab: (tab: AppTab) => void
  setAppOpen: (open: boolean) => void
  /** Back to the tutorial start (theme kept) and the persisted key removed. */
  reset: () => void
}

export type IgusaStore = IgusaState & IgusaActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const INITIAL_STATE: IgusaState = {
  setupDone: false,
  templateId: null,
  events: [],
  entries: [],
  theme: 'newsprint',
  weaveUnlocked: false,
  pendingSeverity: null,
  lastLogged: null,
  presenterStep: 1,
  appTab: 'log',
  appOpen: false,
  paywallOpen: false,
}

let entryCounter = 0

/** Deterministic entry id: `${eventId}-${ts}-${counter}` (no Math.random). */
export function makeEntryId(eventId: string, ts: number): string {
  entryCounter += 1
  return `${eventId}-${ts}-${entryCounter}`
}

/**
 * Next palette colour not in use, in assignment order (Brick, Slate, Ochre, Plum, Moss).
 * Brick and Moss are never both among the first four events, so while the new event
 * would land in positions 1–4 the partner of any Brick/Moss already there is skipped.
 */
export function nextColor(events: EventDef[], preferred?: string): string {
  const inUse = new Set(events.map((e) => e.color.toUpperCase()))
  const firstFour = events.slice(0, 4).map((e) => e.color.toUpperCase())
  const landsInFirstFour = events.length < 4
  const blocked = new Set<string>()
  if (landsInFirstFour) {
    if (firstFour.includes(BRICK)) blocked.add(MOSS)
    if (firstFour.includes(MOSS)) blocked.add(BRICK)
  }
  const ok = (c: string) => !inUse.has(c) && !blocked.has(c)
  if (preferred) {
    const p = preferred.toUpperCase()
    if ((PALETTE as readonly string[]).includes(p) && ok(p)) return p
  }
  for (const c of PALETTE) if (ok(c)) return c
  // Palette exhausted (cannot happen below the cap); fall back to the first free colour or Brick.
  return PALETTE.find((c) => !inUse.has(c)) ?? BRICK
}

function applyThemeToDocument(theme: Theme): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = theme
  }
}

/** Storage that lives only for the page: used when `window.localStorage` is unavailable (tests, SSR). */
function memoryStorage(): StateStorage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  }
}

function pickStorage(): StateStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch {
    /* access to localStorage can throw under strict privacy settings */
  }
  return memoryStorage()
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * The shared store. Select narrowly in components:
 *   const count = useIgusaStore((s) => s.entries.length)
 * When a selector returns a new object/array each call, wrap it with `useShallow`
 * from 'zustand/react/shallow' so the component only re-renders on shallow change:
 *   const { events, theme } = useIgusaStore(useShallow((s) => ({ events: s.events, theme: s.theme })))
 */
export const useIgusaStore = create<IgusaStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      applyTemplate: (templateId, withSampleData) => {
        const template = getTemplate(templateId)
        if (!template) return
        const events = template.events.map((e) => ({ ...e }))
        const entries = withSampleData ? generate(template) : []
        set({
          templateId,
          events,
          entries,
          setupDone: true,
          pendingSeverity: null,
          lastLogged: null,
        })
      },

      setEvents: (events) => set({ events: events.slice(0, MAX_EVENTS).map((e) => ({ ...e })) }),

      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch, id } : e)) })),

      addEvent: (def) => {
        const { events } = get()
        if (events.length >= MAX_EVENTS) return null
        if (events.some((e) => e.id === def.id)) return null
        const ev: EventDef = {
          id: def.id,
          name: def.name,
          kind: def.kind,
          askSeverity: def.askSeverity,
          color: nextColor(events, def.color),
        }
        set({ events: [...events, ev] })
        return ev
      },

      log: (eventId, ts = Date.now()) => {
        const { events, entries } = get()
        const ev = events.find((e) => e.id === eventId)
        if (!ev) return null
        const id = makeEntryId(eventId, ts)
        const entry: Entry = { id, eventId, ts }
        set({
          entries: [...entries, entry],
          lastLogged: { entryId: id, expiresAt: ts + LOGGED_MS },
          pendingSeverity: ev.askSeverity ? { entryId: id, expiresAt: ts + SEVERITY_MS } : null,
        })
        return id
      },

      setSeverity: (entryId, severity) =>
        set((s) => ({
          // ts is untouched: severity attaches to the original tap timestamp.
          entries: s.entries.map((e) => (e.id === entryId ? { ...e, severity } : e)),
          pendingSeverity: s.pendingSeverity?.entryId === entryId ? null : s.pendingSeverity,
        })),

      clearPendingSeverity: () => set({ pendingSeverity: null }),

      undo: (entryId) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== entryId),
          lastLogged: s.lastLogged?.entryId === entryId ? null : s.lastLogged,
          pendingSeverity: s.pendingSeverity?.entryId === entryId ? null : s.pendingSeverity,
        })),

      deleteEntry: (id) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== id),
          lastLogged: s.lastLogged?.entryId === id ? null : s.lastLogged,
          pendingSeverity: s.pendingSeverity?.entryId === id ? null : s.pendingSeverity,
        })),

      updateEntryTime: (id, ts) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ts } : e)) })),

      setTheme: (theme) => {
        applyThemeToDocument(theme)
        set({ theme })
      },

      unlockWeave: () => set({ weaveUnlocked: true, paywallOpen: false }),
      setPaywallOpen: (paywallOpen) => set({ paywallOpen }),
      setPresenterStep: (presenterStep) => set({ presenterStep }),
      setAppTab: (appTab) => set({ appTab }),
      setAppOpen: (appOpen) => set({ appOpen }),

      reset: () => {
        const { theme } = get()
        set({ ...INITIAL_STATE, theme })
        useIgusaStore.persist.clearStorage()
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(pickStorage),
      // Transient UI pointers (severity row, Logged./Undo) are not persisted.
      partialize: (s) => ({
        setupDone: s.setupDone,
        templateId: s.templateId,
        events: s.events,
        entries: s.entries,
        theme: s.theme,
        weaveUnlocked: s.weaveUnlocked,
        presenterStep: s.presenterStep,
        appTab: s.appTab,
        appOpen: s.appOpen,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToDocument(state.theme)
      },
    },
  ),
)

/** Non-hook access for tests and imperative code. */
export const igusaStore = useIgusaStore
