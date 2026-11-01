/**
 * Bronbeelden voor het promofilmpje (remotion/DakPromo): de echte funnel op een gsm, plus het rapport op desktop.
 * Bewaart ook waar de knoppen staan, zodat de "vinger" in het filmpje op de juiste plek tikt.
 *
 * Gebruik: start eerst een lokale site ZONDER echte databank en ZONDER mails, bv.
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 SUPABASE_SERVICE_ROLE_KEY=nep RESEND_API_KEY= npx next dev -p 3123
 * (met een nagebootste PostgREST op poort 54399), en dan:
 *   PROMO_URL=http://localhost:3123 npx tsx scripts/promo-opname.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { chromium, type Locator, type Page } from 'playwright-core'

const BASIS = process.env.PROMO_URL ?? 'http://localhost:3123'
const ADRES = process.env.PROMO_ADRES ?? 'Markt 59 Eeklo'
const UIT = path.join(process.cwd(), 'remotion', 'DakPromo', 'beelden')

type Doos = { x: number; y: number; b: number; h: number }
const posities: Record<string, Doos | string> = {}

async function doos(l: Locator, t?: Locator): Promise<Doos> {
  const b = (await l.boundingBox())!
  // Ten opzichte van een element (lange schermafbeelding) of van het venster
  const o = t ? (await t.boundingBox())! : { x: 0, y: 0 }
  return { x: Math.round(b.x - o.x), y: Math.round(b.y - o.y), b: Math.round(b.width), h: Math.round(b.height) }
}

async function main() {
  mkdirSync(UIT, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await ctx.route('**/api/lod2/**', (r) => r.abort())
  await ctx.route('**/api/chat/**', (r) => r.fulfill({ status: 204 }))
  const page = await ctx.newPage()
  const verberg = (p: Page) => p.addStyleTag({ content: 'nextjs-portal{display:none!important} [aria-label="Contact"],[aria-label^="Chat"]{visibility:hidden!important}' })
  const foto = async (naam: string, l?: Locator) => {
    await page.waitForTimeout(500)
    if (l) await l.screenshot({ path: path.join(UIT, naam), quality: 86 })
    else await page.screenshot({ path: path.join(UIT, naam), quality: 86 })
    console.log('  ✓', naam)
  }

  // 1 — Hero met het adresveld, leeg en ingevuld
  await page.goto(BASIS + '/', { waitUntil: 'networkidle', timeout: 120_000 })
  await verberg(page)
  await page.waitForTimeout(2500)
  const veld = page.locator('#hero input[role="combobox"]')
  posities.veld = await doos(veld)
  await foto('1-hero.jpg')
  await veld.click()
  await veld.pressSequentially(ADRES, { delay: 30 })
  await page.waitForSelector('[role="option"]', { timeout: 20_000 })
  posities.optie = await doos(page.locator('[role="option"]').first())
  posities.adresTekst = (await page.locator('[role="option"]').first().innerText()).split('\n')[0]
  await foto('1-hero-getypt.jpg')

  // Vanaf de modal: een hoog venster, zodat alles in één beeld staat en het filmpje kan "scrollen"
  // (de modal scrolt binnen het venster: een gewone schermafbeelding knipt de onderkant af)
  await page.keyboard.press('Enter')
  const verder = page.getByRole('button', { name: /Ja, verder/ })
  await verder.waitFor({ timeout: 60_000 })
  await page.setViewportSize({ width: 390, height: 1700 })
  await page.waitForTimeout(2500)
  const dialoog = page.locator('[role="dialog"][aria-label="Gratis dakrapport"]')
  const zonderFocus = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())

  // 2 — Dakscan op de kaart
  await dialoog.evaluate((el) => el.scrollTo(0, 0))
  await zonderFocus()
  posities.verder = await doos(verder)
  posities.kaart = await doos(page.locator('.leaflet-container'))
  posities.paneelScan = await doos(dialoog.locator('div.shadow-2xl').first())
  await foto('2-scan.jpg')

  // 3 — Wat wilt u laten doen?
  await verder.click()
  await page.waitForSelector('text=Wat wilt u laten doen?')
  await zonderFocus()
  posities.keuze = await doos(page.getByRole('button', { name: /^Nieuwe dakbedekking/ }))
  posities.paneelWerk = await doos(dialoog.locator('div.shadow-2xl').first())
  await foto('3-werk.jpg')

  // 4 — De prijs, met isolatie erbij
  await page.getByRole('button', { name: /^Nieuwe dakbedekking/ }).click()
  await page.waitForSelector('text=Wat kost het?')
  posities.isolatie = await doos(page.getByRole('button', { name: /Isolatie \(langs buiten\)/ }))
  await page.getByRole('button', { name: /Isolatie \(langs buiten\)/ }).click()
  await page.waitForTimeout(1200)
  await zonderFocus()
  posities.prijskaart = await doos(dialoog.locator('.rounded-2xl.bg-navy').first())
  posities.prijs = (await dialoog.locator('.rounded-2xl.bg-navy p').nth(1).innerText()).trim()
  posities.paneelPrijs = await doos(dialoog.locator('div.shadow-2xl').first())
  await foto('4-prijs.jpg')

  // 5 — Rapport aanvragen (lokaal: nagebootste databank, geen mail) en het rapport op desktop
  await page.getByRole('button', { name: /Stuur mij het (algemene )?rapport/ }).click()
  await page.locator('#email').fill('uw.naam@voorbeeld.be')
  await dialoog.locator('input[type="checkbox"]').first().check()
  await page.getByRole('button', { name: /Stuur mijn rapport/ }).click()
  await page.waitForSelector('text=Uw rapport is onderweg', { timeout: 30_000 })
  const rapportLink = await page.getByRole('link', { name: /Bekijk meteen uw rapport/ }).getAttribute('href')

  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const rapport = await desk.newPage()
  await rapport.goto(BASIS + rapportLink, { waitUntil: 'networkidle', timeout: 120_000 })
  await verberg(rapport)
  await rapport.waitForTimeout(2000)
  await rapport.screenshot({ path: path.join(UIT, '5-rapport.jpg'), quality: 86 })
  console.log('  ✓ 5-rapport.jpg')

  writeFileSync(path.join(UIT, 'posities.json'), JSON.stringify(posities, null, 2))
  console.log('  ✓ posities.json', posities.adresTekst, posities.prijs)
  await browser.close()
}

main().catch((err) => {
  console.error('Opname mislukt:', err)
  process.exit(1)
})
