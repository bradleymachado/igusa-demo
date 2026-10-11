// SetupSpec_v1.0 — This section is intended to check the S9 setup tutorial end to end: Migraine with a renamed event and sample data, Start blank with one typed event and no data, Back keeping edits, and the touch-target and aria-label audit on every step; completion is read from the persisted store.
import { test, expect, type Page } from '@playwright/test'

const STORAGE_KEY = 'igusa-demo-v1'

interface Persisted {
  state: {
    setupDone: boolean
    templateId: string | null
    events: { id: string; name: string; color: string; kind: string; askSeverity: boolean }[]
    entries: unknown[]
  }
}

async function stored(page: Page): Promise<Persisted['state']> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)
  expect(raw, 'persisted store').not.toBeNull()
  return (JSON.parse(raw!) as Persisted).state
}

async function names(page: Page): Promise<string[]> {
  return page.getByLabel('Event name', { exact: true }).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.goto('./')
  await expect(page.getByTestId('setup-flow')).toBeVisible()
})

test('Migraine: rename Aura, keep sample data, store holds the edit', async ({ page }) => {
  const flow = page.getByTestId('setup-flow')
  await flow.getByRole('button', { name: 'Choose Migraine', exact: true }).click()
  await expect(flow.getByTestId('event-row')).toHaveCount(5)
  const before = await names(page)
  expect(before).toEqual(['Headache', 'Aura', 'Short sleep', 'Alcohol', 'Skipped meal'])

  await page.getByLabel('Event name', { exact: true }).nth(1).fill('Aura signs')
  await flow.getByRole('button', { name: 'Continue to widget', exact: true }).click()
  await expect(flow.getByTestId('widget-tile')).toHaveCount(5)
  const tiles = await flow.getByTestId('widget-tile').count()
  const box = (await flow.getByTestId('widget-illustration').boundingBox())!
  const tileText = (await flow.getByTestId('widget-illustration').innerText()).trim()

  await flow.getByRole('button', { name: 'Continue to sample data', exact: true }).click()
  await expect(flow.getByRole('radio', { name: 'Sample data', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(flow.getByRole('radio', { name: 'Start empty', exact: true })).toHaveAttribute('aria-checked', 'false')
  await flow.getByRole('button', { name: 'Done', exact: true }).click()

  await expect(page.getByTestId('setup-flow')).toHaveCount(0)
  const s = await stored(page)
  console.log(
    `[S9 migraine] names before ${JSON.stringify(before)} | tiles ${tiles} | widget ${box.width}x${box.height} | tile text "${tileText}" | setupDone ${s.setupDone} | templateId ${s.templateId} | events ${s.events.length} ${JSON.stringify(s.events.map((e) => e.name))} | colours ${s.events.map((e) => e.color).join(' ')} | entries ${s.entries.length}`,
  )
  expect(box.width).toBe(364)
  expect(box.height).toBe(170)
  expect(tileText).toBe('')
  expect(s.setupDone).toBe(true)
  expect(s.templateId).toBe('migraine')
  expect(s.events).toHaveLength(5)
  expect(s.events[1].name).toBe('Aura signs')
  expect(s.events[1].id).toBe('migraine-aura')
  expect(s.entries.length).toBeGreaterThanOrEqual(400)
  expect(s.entries.length).toBeLessThanOrEqual(1200)
})

test('Start blank: one typed event, Start empty only, no entries', async ({ page }) => {
  const flow = page.getByTestId('setup-flow')
  await flow.getByRole('button', { name: 'Choose Start blank', exact: true }).click()
  await expect(flow.getByTestId('event-row')).toHaveCount(1)
  expect(await names(page)).toEqual([''])
  await expect(page.getByLabel('Event name', { exact: true })).toHaveAttribute('placeholder', 'New event')
  const cont = flow.getByRole('button', { name: 'Continue to widget', exact: true })
  await expect(cont).toBeDisabled()
  await page.getByLabel('Event name', { exact: true }).fill('Sneezing')
  await expect(cont).toBeEnabled()
  await cont.click()
  await expect(flow.getByTestId('widget-tile')).toHaveCount(1)
  await flow.getByRole('button', { name: 'Continue to sample data', exact: true }).click()
  const radios = flow.getByRole('radio')
  await expect(radios).toHaveCount(1)
  await expect(flow.getByRole('radio', { name: 'Start empty', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(flow.getByRole('radio', { name: 'Sample data', exact: true })).toHaveCount(0)
  await flow.getByRole('button', { name: 'Done', exact: true }).click()

  await expect(page.getByTestId('setup-flow')).toHaveCount(0)
  const s = await stored(page)
  console.log(`[S9 blank] options ${await radios.count()} | setupDone ${s.setupDone} | templateId ${s.templateId} | events ${s.events.length} ${JSON.stringify(s.events)} | entries ${s.entries.length}`)
  expect(s.setupDone).toBe(true)
  expect(s.templateId).toBe('blank')
  expect(s.events).toHaveLength(1)
  expect(s.events[0].name).toBe('Sneezing')
  expect(s.entries).toHaveLength(0)
})

test('Back from Step 3 returns to Step 2 with edits intact; Back reaches Step 1', async ({ page }) => {
  const flow = page.getByTestId('setup-flow')
  await flow.getByRole('button', { name: 'Choose IBS', exact: true }).click()
  await page.getByLabel('Event name', { exact: true }).nth(0).fill('Bloat')
  await flow.getByRole('switch', { name: 'Ask severity for Cramping', exact: true }).click()
  await flow.getByRole('button', { name: 'Remove Caffeine', exact: true }).click()
  await flow.getByRole('button', { name: 'Continue to widget', exact: true }).click()
  await expect(flow.getByTestId('widget-tile')).toHaveCount(4)
  await flow.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(flow.getByTestId('setup-step-2')).toBeVisible()
  const after = await names(page)
  const sev = await flow.getByRole('switch', { name: 'Ask severity for Cramping', exact: true }).getAttribute('aria-checked')
  console.log(`[S9 back] names after Back ${JSON.stringify(after)} | Cramping ask severity ${sev}`)
  expect(after).toEqual(['Bloat', 'Cramping', 'Dairy', 'Fried food'])
  expect(sev).toBe('false')
  await flow.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(flow.getByTestId('setup-step-1')).toBeVisible()
  await flow.getByRole('button', { name: 'Choose IBS', exact: true }).click()
  expect(await names(page)).toEqual(['Bloat', 'Cramping', 'Dairy', 'Fried food'])
})

test('every button ≥ 44×44 with an aria-label and every input labelled, on all four steps', async ({ page }) => {
  const flow = page.getByTestId('setup-flow')
  const audit = (step: number) =>
    page.evaluate((n) => {
      const root = document.querySelector('[data-testid="setup-flow"]')!
      const vis = (el: Element) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }
      const buttons = [...root.querySelectorAll('button')].filter(vis)
      const inputs = [...root.querySelectorAll('input, textarea, select')].filter(vis)
      const rects = buttons.map((b) => b.getBoundingClientRect())
      return {
        step: n,
        buttons: buttons.length,
        unlabelled: buttons.filter((b) => !(b.getAttribute('aria-label') ?? '').trim()).length,
        small: buttons.filter((b) => {
          const r = b.getBoundingClientRect()
          return r.width < 44 || r.height < 44
        }).map((b) => b.getAttribute('aria-label')),
        minW: Math.min(...rects.map((r) => r.width)),
        minH: Math.min(...rects.map((r) => r.height)),
        inputs: inputs.length,
        inputsUnlabelled: inputs.filter((i) => !(i.getAttribute('aria-label') ?? '').trim()).length,
      }
    }, step)

  const results = []
  results.push(await audit(1))
  await flow.getByRole('button', { name: 'Choose IBS', exact: true }).click()
  results.push(await audit(2))
  await flow.getByRole('button', { name: 'Continue to widget', exact: true }).click()
  results.push(await audit(3))
  await flow.getByRole('button', { name: 'Continue to sample data', exact: true }).click()
  results.push(await audit(4))
  for (const r of results) {
    console.log(`[S9 a11y] step ${r.step}: buttons ${r.buttons}, unlabelled ${r.unlabelled}, under 44 ${r.small.length}, min ${r.minW.toFixed(1)}x${r.minH.toFixed(1)}, inputs ${r.inputs}, inputs unlabelled ${r.inputsUnlabelled}`)
    expect(r.unlabelled).toBe(0)
    expect(r.small).toEqual([])
    expect(r.inputsUnlabelled).toBe(0)
  }
  expect(results[1].inputs).toBe(5)
})

test('swatch cycling keeps colours unique and never puts Brick and Moss together in the first four', async ({ page }) => {
  const flow = page.getByTestId('setup-flow')
  await flow.getByRole('button', { name: 'Choose IBS', exact: true }).click()
  await flow.getByRole('button', { name: 'Remove Fried food', exact: true }).click()
  const seen: string[][] = []
  for (let i = 0; i < 6; i += 1) {
    await flow.getByRole('button', { name: 'Colour for Bloating', exact: true }).click()
    const colours = await flow.locator('.setup-swatch-dot').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))
    seen.push(colours)
    expect(new Set(colours).size).toBe(colours.length)
    const firstFour = colours.slice(0, 4)
    expect(firstFour.includes('rgb(181, 70, 47)') && firstFour.includes('rgb(94, 127, 58)')).toBe(false)
  }
  console.log(`[S9 swatch] after removing Fried food: ${seen[0].slice(1).join(' ')} | Bloating colours over 6 taps: ${seen.map((c) => c[0]).join(' → ')}`)
  expect(new Set(seen.map((c) => c[0])).size).toBeGreaterThanOrEqual(2)
})
