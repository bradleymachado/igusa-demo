// LiveCheck_v1.0 — This section is intended to load the published demo (default https://bradmachado.com/igusa-demo/) in Playwright chromium at 1440×900 and 390×844, collect console errors, page errors and failed requests, count Google Fonts 200 responses, walk presenter steps 1→6 through the #step=N hash, save the two S19 portfolio screenshots, and print a JSON summary.
// Usage: node scripts/live-check.mjs [url]
import { chromium } from 'playwright'
import { statSync } from 'node:fs'

const URL = process.argv[2] ?? 'https://bradmachado.com/igusa-demo/'
const OUT = '00_Plan/process-images'
const VIEWPORTS = [
  { name: 'wide', width: 1440, height: 900, shotStep: 2, file: `${OUT}/Igusa_S19_Live_v1.0.png` },
  { name: 'phone', width: 390, height: 844, shotStep: 3, file: `${OUT}/Igusa_S19_LivePhone_v1.0.png` },
]

const stepButton = (page, n) => page.locator(`[data-testid="presenter-bar"] button[aria-label^="Step ${n}:"]`)

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(1700) // widget ring / watch pulse run ≈ 1.2–1.6 s
}

const browser = await chromium.launch()
const summary = { url: URL, viewports: {} }
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()
    const consoleErrors = []
    const pageErrors = []
    const failedRequests = []
    let fontsGstatic200 = 0
    let googleapisCss200 = 0
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('pageerror', (e) => pageErrors.push(String(e)))
    page.on('requestfailed', (r) => failedRequests.push(`${r.url()} ${r.failure()?.errorText ?? ''}`))
    page.on('response', (r) => {
      const u = r.url()
      if (r.status() >= 400) failedRequests.push(`${u} HTTP ${r.status()}`)
      if (r.status() === 200 && u.includes('fonts.gstatic.com')) fontsGstatic200++
      if (r.status() === 200 && u.includes('fonts.googleapis.com/css')) googleapisCss200++
    })

    // Fresh store, then the presenter's own deep link.
    await page.goto(URL)
    await page.evaluate(() => localStorage.clear())
    await page.goto(`${URL}#step=1`)
    await page.getByTestId('phone-screen').waitFor()
    await settle(page)

    const steps = []
    for (let n = 1; n <= 6; n++) {
      if (n > 1) await page.evaluate((s) => { location.hash = `#step=${s}` }, n)
      await stepButton(page, n).waitFor()
      await page.waitForFunction((s) => document.querySelector(`[data-testid="presenter-bar"] button[aria-label^="Step ${s}:"]`)?.getAttribute('aria-current') === 'step', n, { timeout: 5000 })
      await settle(page)
      steps.push({ step: n, hash: await page.evaluate(() => location.hash) })
      if (n === vp.shotStep) {
        // Narrow stage: the Watch sits behind the toggle; open it (only if step 3 has not already) so both devices show.
        const toggle = page.getByTestId('watch-toggle')
        let opened = false
        if (vp.name === 'phone' && (await toggle.count()) && (await toggle.getAttribute('aria-pressed')) !== 'true') {
          await toggle.click(); opened = true; await page.waitForTimeout(600)
        }
        await page.screenshot({ path: vp.file })
        if (opened) await toggle.click()
      }
    }

    summary.viewports[`${vp.width}x${vp.height}`] = {
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      failedRequests,
      fontsGstatic200,
      googleapisCss200,
      steps: steps.map((s) => s.hash).join(' '),
      screenshot: { file: vp.file, step: vp.shotStep, bytes: statSync(vp.file).size },
      consoleErrorText: consoleErrors,
      pageErrorText: pageErrors,
    }
    await context.close()
  }
} finally {
  await browser.close()
}
console.log(JSON.stringify(summary, null, 2))
