/**
 * Neemt schermbeelden van de echte tool op voor de demovideo (remotion/DakRapportDemo).
 *
 * Gebruik:
 *   1. Start de site lokaal:          npx next dev -p 3123
 *   2. Neem de beelden op:            npx tsx scripts/demo-opname.ts
 *   3. Render de video:               npx tsx scripts/render-demo.ts
 *
 * Er wordt niets verstuurd of opgeslagen: de API's voor leads, 3D-berekening,
 * statistiek en chat worden in de browser afgevangen. Alleen de gratis
 * adres- en kaartgegevens van de Vlaamse overheid worden echt opgevraagd.
 *
 * Opnieuw opnemen (bv. na verbeteringen aan de funnel) = stap 2 en 3 herhalen.
 */

import path from 'path'
import { mkdirSync } from 'fs'
import { chromium } from 'playwright-core'

const BASIS = process.env.DEMO_URL ?? 'http://localhost:3123'
const ADRES = process.env.DEMO_ADRES ?? 'Markt 59 Eeklo'
// Bronbeelden voor de video (niet in public/: ze horen niet als losse bestanden op de site)
const UIT = path.join(process.cwd(), 'remotion', 'DakRapportDemo', 'beelden')

async function main() {
  mkdirSync(UIT, { recursive: true })
  const browser = await chromium.launch()
  // 1280×720 aan 1,5× = beelden van 1920×1080, zoals de video
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 })

  await ctx.route('**/api/funnel/event', (r) => r.fulfill({ status: 204 }))
  await ctx.route('**/api/funnel/step', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }))
  await ctx.route('**/api/lod2/**', (r) => r.abort())
  await ctx.route('**/api/chat/**', (r) => r.fulfill({ status: 204 }))

  const page = await ctx.newPage()
  // De funnel staat in een scrollende modal: zet het juiste stuk in beeld
  const dialoog = page.locator('[role="dialog"][aria-label="Gratis dakrapport"]')
  const scrolNaar = async (selector: string | null, marge = 24) => {
    await dialoog.evaluate((el, [sel, m]) => {
      if (!sel) { el.scrollTo(0, 0); return }
      const doel = el.querySelector(sel as string)
      if (!doel) return
      const top = doel.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
      el.scrollTo(0, Math.max(0, top - (m as number)))
    }, [selector, marge] as const)
    await page.waitForTimeout(400)
  }
  const opslaan = async (naam: string) => {
    await page.screenshot({ path: path.join(UIT, naam) })
    console.log('  ✓', naam)
  }

  await page.goto(BASIS + '/', { waitUntil: 'networkidle', timeout: 90_000 })
  // Ontwikkel-badge van Next.js niet mee in beeld
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
  await page.waitForTimeout(2500)

  // 1 — Adres typen in de hero
  const veld = page.locator('#hero input[role="combobox"]')
  await veld.click()
  await veld.pressSequentially(ADRES, { delay: 60 })
  await page.waitForSelector('[role="option"]', { timeout: 15_000 })
  await page.waitForTimeout(600)
  await opslaan('01-adres.png')

  // 2 — Kaart: woning aanduiden
  await page.keyboard.press('Enter')
  await page.waitForSelector('.leaflet-container', { timeout: 20_000 })
  await page.waitForTimeout(7000)
  const kaart = await page.locator('.leaflet-container').boundingBox()
  if (kaart) {
    await page.mouse.click(kaart.x + kaart.width / 2, kaart.y + kaart.height / 2)
    await page.waitForTimeout(6000)
  }
  // Kaartkop bovenaan in beeld, met de cijfers eronder
  await scrolNaar('.leaflet-container', 70)
  await opslaan('02-kaart.png')

  // 3 — Resultaat
  await page.getByRole('button', { name: /Bekijk resultaat/ }).click()
  await page.waitForTimeout(1500)
  await scrolNaar(null)
  await opslaan('03-resultaat.png')

  // 4 — Rapport aanvragen (afgevangen: er vertrekt geen mail)
  await page.getByRole('button', { name: /volledige rapport/ }).click()
  await page.waitForTimeout(600)
  await page.locator('#email').fill('uw.naam@voorbeeld.be')
  await page.locator('input[type="checkbox"]').first().check()
  await page.getByRole('button', { name: /Stuur mijn rapport/ }).click()
  await page.waitForSelector('text=Rapport verstuurd', { timeout: 10_000 })
  await page.waitForTimeout(800)
  await scrolNaar(null)
  await opslaan('04-rapport.png')

  await browser.close()
  console.log(`\nBeelden staan in ${UIT}`)
}

main().catch((err) => {
  console.error('Opname mislukt:', err)
  process.exit(1)
})
