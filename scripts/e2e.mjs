// End-to-end test of the static build using the system Chrome (Playwright).
// Run: npm run test:e2e            (builds, serves out/ on :4173, runs everything)
//      node scripts/e2e.mjs mobile (desktop | mobile | fallback | all; needs an existing out/)
// Screenshots land in e2e-shots/. The page is loaded with ?debug, which exposes window.__game.
import { chromium, devices } from 'playwright-core'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const ROOT = path.resolve('out')
const PORT = 4173
const URL = `http://localhost:${PORT}/?debug`
const SHOTS = path.resolve('e2e-shots') + '/'
fs.mkdirSync(SHOTS, { recursive: true })

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.json': 'application/json' }
const server = http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]))
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end() }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}).listen(PORT)

const results = []
const errors = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const game = (page) => page.evaluate(() => window.__game)

async function launch(extraArgs = []) {
  return chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', ...extraArgs] })
}

function watch(page, label) {
  page.on('pageerror', (e) => errors.push(`${label} pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${label} console.${m.type()}: ${m.text().slice(0, 300)}`) })
}

async function ready(page) {
  await page.goto(URL)
  await page.waitForFunction(() => window.__game?.frames > 3, null, { timeout: 60000 })
  await page.getByRole('button', { name: 'Explore my work' }).waitFor({ timeout: 30000 })
}

// Drive the player toward (tx, tz) with digital keys until within tol.
async function steer(page, tx, tz, { tol = 0.6, timeout = 12000, jumpWithin = 0, stopOn } = {}) {
  const held = new Set()
  const set = async (k, on) => {
    if (on && !held.has(k)) { held.add(k); await page.keyboard.down(k) }
    if (!on && held.has(k)) { held.delete(k); await page.keyboard.up(k) }
  }
  const t0 = Date.now()
  let g
  let jumped = false
  while (Date.now() - t0 < timeout) {
    g = await game(page)
    if (stopOn && stopOn(g)) break
    const dx = tx - g.x, dz = tz - g.z
    const d = Math.hypot(dx, dz)
    if (jumpWithin && d < jumpWithin && !jumped && g.y === 0) { await page.keyboard.press(' '); jumped = true }
    if (!jumpWithin && d < tol) break
    await set('d', dx > tol * 0.5)
    await set('a', dx < -tol * 0.5)
    await set('s', dz > tol * 0.5)
    await set('w', dz < -tol * 0.5)
    if (jumped && g.y === 0 && jumpWithin) jumped = false
    await sleep(30)
  }
  for (const k of [...held]) await set(k, false)
  await sleep(250)
  return game(page)
}

async function navTo(page, label) {
  await page.getByRole('button', { name: label, exact: true }).click()
  await page.waitForFunction(() => window.__game && !window.__game.hopping, null, { timeout: 10000 })
  await sleep(400)
}

// ─── Desktop ──────────────────────────────────────────────────────────────────
async function desktop() {
  const browser = await launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  watch(page, 'desktop')
  const t0 = Date.now()
  await ready(page)
  check('desktop: loads to intro card', true, `${Date.now() - t0} ms`)
  await sleep(900)
  await page.screenshot({ path: SHOTS + 'd01-intro.png' })

  let g = await game(page)
  check('intro: cinematic camera while intro is open', g.cinematic === true)
  const h1 = await page.locator('#intro-title').textContent()
  check('intro: plain headline shown', /reach doctors and patients/.test(h1), h1)

  // Movement keys are ignored while the intro is open, and W dismisses it
  const before = await game(page)
  await page.keyboard.down('w'); await sleep(600); await page.keyboard.up('w')
  g = await game(page)
  const introGone = await page.locator('#intro-title').count() === 0
  check('intro: W key dismisses intro', introGone)
  check('intro: dismiss key does not move player', Math.hypot(g.x - before.x, g.z - before.z) < 0.5, `moved ${Math.hypot(g.x - before.x, g.z - before.z).toFixed(2)}`)

  const hint = page.locator('kbd', { hasText: 'Space' })
  check('controls hint visible before first move', await hint.count() === 1)

  // Chrome
  const talk = page.getByRole('link', { name: "Let's talk" })
  check("chrome: Let's talk mailto", (await talk.getAttribute('href')) === 'mailto:work.ashutoshpathak@gmail.com')
  check('chrome: LinkedIn link', (await page.getByLabel('LinkedIn').getAttribute('href'))?.includes('linkedin.com/in/ashutosh-pathak'))

  // Walk speed (units/sec) at steady state
  await sleep(600)
  const a = await game(page)
  await page.keyboard.down('s'); await sleep(400)
  const b = await game(page); const tb = Date.now()
  await sleep(1000)
  const c = await game(page); const tc = Date.now()
  await page.keyboard.up('s')
  const v = (c.z - b.z) / ((tc - tb) / 1000)
  const fpsDuring = (c.frames - b.frames) / ((tc - tb) / 1000)
  check('movement: walk speed ≈ 4.2 u/s (time-based)', v > 3.3 && v < 4.8, `${v.toFixed(2)} u/s at ${fpsDuring.toFixed(0)} fps`)
  check('movement: player facing +z after walking toward camera', Math.abs(Math.atan2(Math.sin(c.yaw), Math.cos(c.yaw))) < 0.3, `yaw ${c.yaw.toFixed(2)}`)
  await sleep(700)
  const stop = await game(page)
  check('movement: inertia settles to stop', stop.speed < 0.05, `speed ${stop.speed.toFixed(3)}`)

  // Controls hint hides after first move
  await sleep(700)
  const hintOpacity = await page.locator('kbd', { hasText: 'Space' }).evaluate((el) => getComputedStyle(el.closest('div.glass')).opacity)
  check('controls hint fades after first move', Number(hintOpacity) < 0.1, `opacity ${hintOpacity}`)

  // Turning takes the short way across ±π: face -z, then turn to -x
  await page.keyboard.down('w'); await sleep(700); await page.keyboard.up('w'); await sleep(300)
  const y0 = (await game(page)).yaw
  const yaws = []
  await page.keyboard.down('a')
  for (let i = 0; i < 12; i++) { yaws.push((await game(page)).yaw); await sleep(40) }
  await page.keyboard.up('a')
  const travel = Math.abs(yaws[yaws.length - 1] - y0)
  check('turning: short way round (≈π/2, not 3π/2)', travel < 2.2, `rotated ${travel.toFixed(2)} rad`)

  // Collisions: walk into the arch post at (-2.1,-3.2)
  // Walk into obstacles; track the closest approach to catch any pass-through
  const bump = async (ox, oz, r, label) => {
    await navTo(page, 'Home')
    const pre = await steer(page, ox + 0.05, oz + 2.0, { tol: 0.2 })
    let min = Infinity
    await page.keyboard.down('w')
    for (let i = 0; i < 30; i++) { const s = await game(page); min = Math.min(min, Math.hypot(s.x - ox, s.z - oz)); await sleep(40) }
    await page.keyboard.up('w')
    check(`collision: ${label} blocks the player`, min >= r + 0.35 - 0.05, `closest ${min.toFixed(2)} (limit ${(r + 0.35).toFixed(2)}), start (${pre.x.toFixed(2)}, ${pre.z.toFixed(2)})`)
  }
  await bump(-2.1, -3.2, 0.35, 'arch post')
  await bump(4, -3, 0.36, 'tree')

  // Zones via nav: hop, panel, goals
  for (const [label, zone, heading] of [['About', 'about', 'About Ashutosh'], ['Work', 'work', 'Campaigns'], ['Contact', 'contact', 'Let’s work together']]) {
    const tHop = Date.now()
    await page.getByRole('button', { name: label, exact: true }).click()
    await page.waitForFunction(() => window.__game.hopping, null, { timeout: 3000 }).catch(() => {})
    await page.waitForFunction(() => !window.__game.hopping, null, { timeout: 10000 })
    const hopMs = Date.now() - tHop
    await sleep(700)
    g = await game(page)
    check(`nav ${label}: hops to zone`, g.zone === zone, `zone=${g.zone}, hop ${hopMs} ms`)
    const panelHeading = await page.locator('[role=dialog] h2').first().textContent().catch(() => null)
    check(`nav ${label}: panel shows "${heading}"`, panelHeading === heading, String(panelHeading))
    await page.screenshot({ path: SHOTS + `d-zone-${zone}.png` })
  }
  const emailBtn = page.getByRole('link', { name: /Email me/ })
  check('contact panel: email link', (await emailBtn.first().getAttribute('href'))?.startsWith('mailto:'))

  // Esc closes the panel; it comes back on the next zone
  await page.keyboard.press('Escape'); await sleep(300)
  check('panel: Esc closes it', await page.locator('[role=dialog][aria-label]').count() === 0)

  // HUD
  const hud = page.getByRole('button', { name: /goals/ })
  const hudText = await hud.textContent()
  check('HUD: ≥3/5 goals after visiting three zones', /[345]\/5 goals/.test(hudText), hudText)
  await hud.click(); await sleep(300)
  await page.screenshot({ path: SHOTS + 'd-hud-open.png' })
  const hudItems = await page.locator('text=Collect 5 skill coins').isVisible()
  check('HUD: expands to show goals', hudItems)
  await hud.click()

  // Coins: walk to 5 of them
  await navTo(page, 'Home')
  for (const [x, z] of [[-1.5, 7.5], [1.5, 8.5], [4, -1], [-4, -1], [-7, -5]]) await steer(page, x, z, { tol: 0.5, timeout: 9000 })
  g = await game(page)
  check('coins: collected 5+', g.coins >= 5, `coins=${g.coins} at (${g.x.toFixed(1)}, ${g.z.toFixed(1)})`)
  const hud2 = await hud.textContent()
  check('HUD: coin goal ticked', /4\/5 goals/.test(hud2) && /Coins [5-8]\/8/.test(hud2), hud2)

  // Scooter + jump
  await page.keyboard.press('e'); await sleep(300)
  g = await game(page)
  check('scooter: E mounts scooter', g.scooter === true)
  const fr0 = (await game(page)).frames
  await page.keyboard.press(' ')
  let peakY = 0
  for (let i = 0; i < 10; i++) { peakY = Math.max(peakY, (await game(page)).y); await sleep(50) }
  g = await game(page)
  const dprNow = await page.evaluate(() => { const c = document.querySelector('canvas'); return (c.width / c.clientWidth).toFixed(2) })
  check('scooter: Space jumps', peakY > 0.5, `peak y=${peakY.toFixed(2)}, frames +${g.frames - fr0} in 500ms, dpr ${dprNow}, focus ${await page.evaluate(() => document.activeElement?.tagName + ':' + document.activeElement?.textContent?.slice(0, 20))}`)
  await sleep(700)

  // Scooter speed
  await navTo(page, 'Home')
  await page.keyboard.down('s'); await sleep(1400)
  const s1 = await game(page); const ts1 = Date.now(); await sleep(500)
  const s2 = await game(page); const ts2 = Date.now()
  await page.keyboard.up('s')
  const sv = (s2.z - s1.z) / ((ts2 - ts1) / 1000)
  check('scooter: faster than walking', sv > 7, `${sv.toFixed(1)} u/s, frames +${s2.frames - s1.frames}`)
  await sleep(1500)

  // Stars: ride the play zone and jump through all 5
  await navTo(page, 'Play')
  await page.screenshot({ path: SHOTS + 'd-zone-play.png' })
  const rings = [[-2.8, -14.8], [2.8, -14.8], [0, -18.5], [-3.2, -21.5], [3.2, -21.5]]
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const [i, [x, z]] of rings.entries()) {
      g = await game(page)
      if (g.rings >= 5) break
      const before = g.rings
      // approach from 2.5 units south, then ride through while jumping
      await steer(page, x, z + 2.5, { tol: 0.6, timeout: 6000 })
      await sleep(600)
      await steer(page, x, z, { jumpWithin: 1.6, timeout: 2500, stopOn: (s) => s.rings > before })
      await sleep(500)
    }
  }
  g = await game(page)
  check('stars: collected all 5 on scooter', g.rings === 5, `rings=${g.rings}`)
  const superIntro = page.locator('#super-intro-title')
  await superIntro.waitFor({ timeout: 4000 }).catch(() => {})
  check('Super Intro dialog appears after 5 stars', await superIntro.count() === 1)
  if (await superIntro.count()) {
    await page.screenshot({ path: SHOTS + 'd-super-intro.png' })
    const href = await page.getByRole('link', { name: /Send Super Intro/ }).getAttribute('href')
    check('Super Intro: prefilled mailto', href.startsWith('mailto:work.ashutoshpathak@gmail.com?subject='))
    await page.getByRole('button', { name: 'Keep playing' }).click()
  }
  const hud3 = await hud.textContent()
  check('HUD: 5/5 goals', /5\/5 goals/.test(hud3), hud3)

  // Hopping across the map must not collect coins or hit boost pads
  await ready(page)
  await page.getByRole('button', { name: 'Explore my work' }).click(); await sleep(400)
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.waitForFunction(() => !window.__game.hopping && window.__game.zone === 'home', null, { timeout: 10000 })
  // Home landing (0,3) → About landing (-12,-7) passes ~0.7 from the SEO coin at (-4,-1)
  await page.getByRole('button', { name: 'About', exact: true }).click()
  await page.waitForFunction(() => !window.__game.hopping && window.__game.zone === 'about', null, { timeout: 10000 })
  g = await game(page)
  check('hop: flying over coins does not collect them', g.coins === 0, `coins=${g.coins}`)

  // Tour from a fresh load
  await ready(page)
  await page.getByRole('button', { name: 'Take a quick tour' }).click()
  const seen = []
  const tt = Date.now()
  while (Date.now() - tt < 21000) {
    g = await game(page)
    if (g.zone && !seen.includes(g.zone)) seen.push(g.zone)
    await sleep(250)
  }
  check('tour: visits about → work → contact', seen.join(',').includes('about,work,contact'), seen.join(','))
  check('tour: caption hides when tour ends', await page.locator('text=Tour 3/3').count() === 0)

  // Tour interrupt
  await ready(page)
  await page.getByRole('button', { name: 'Take a quick tour' }).click()
  await sleep(1500)
  await page.keyboard.press('x')
  await sleep(7000)
  g = await game(page)
  check('tour: any key stops it', g.zone === 'about' && await page.locator('text=/Tour \\d\\/3/').count() === 0, `zone=${g.zone}`)

  // FPS
  const f1 = (await game(page)).frames; await sleep(2000); const f2 = (await game(page)).frames
  check('perf: desktop frame rate (headless, with effects)', (f2 - f1) / 2 >= 30, `${(f2 - f1) / 2} fps`)

  await browser.close()
}

// ─── Mobile (iPhone 13 emulation, touch) ─────────────────────────────────────
async function mobile() {
  const browser = await launch()
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await ctx.newPage()
  watch(page, 'mobile')
  await ready(page)
  await sleep(900)
  await page.screenshot({ path: SHOTS + 'm01-intro.png' })
  const card = await page.locator('[aria-labelledby=intro-title]').boundingBox()
  const vp = page.viewportSize()
  check('mobile intro: card fits the screen', card && card.x >= 0 && card.x + card.width <= vp.width && card.y >= 0 && card.y + card.height <= vp.height, JSON.stringify(card))
  await page.getByRole('button', { name: 'Explore my work' }).tap()
  await sleep(800)
  await page.screenshot({ path: SHOTS + 'm02-play.png' })

  // Layout: no overlapping chrome
  const boxes = {
    name: await page.locator('#game .glass.rounded-2xl').first().boundingBox(),
    talk: await page.getByRole('link', { name: "Let's talk" }).boundingBox(),
    nav: await page.getByRole('button', { name: 'Home', exact: true }).locator('xpath=../..').boundingBox(),
    hud: await page.getByRole('button', { name: /goals/ }).boundingBox(),
    scooterBtn: await page.getByRole('button', { name: 'Scooter' }).boundingBox(),
  }
  const overlap = (p, q) => p && q && p.x < q.x + q.width && q.x < p.x + p.width && p.y < q.y + q.height && q.y < p.y + p.height
  const names = Object.keys(boxes)
  const clashes = []
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (overlap(boxes[names[i]], boxes[names[j]])) clashes.push(`${names[i]}×${names[j]}`)
  check('mobile layout: chrome elements do not overlap', clashes.length === 0, clashes.join(' ') || JSON.stringify(Object.fromEntries(Object.entries(boxes).map(([k, b]) => [k, b && [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]]))))
  const offscreen = Object.entries(boxes).filter(([, b]) => b && (b.x < 0 || b.x + b.width > vp.width + 1)).map(([k]) => k)
  check('mobile layout: nothing off-screen horizontally', offscreen.length === 0, offscreen.join(','))

  // Joystick drag (touch events via CDP)
  const cdp = await ctx.newCDPSession(page)
  const joy = await page.locator('div.rounded-full.w-\\[120px\\]').boundingBox()
  const cx = joy.x + joy.width / 2, cy = joy.y + joy.height / 2
  const start = await game(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] })
  for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - i * 10, id: 1 }] }); await sleep(30) }
  await sleep(1200)
  const mid = await game(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(800)
  const end = await game(page)
  check('mobile: joystick up moves player forward (-z)', mid.z < start.z - 2, `z ${start.z.toFixed(1)} → ${mid.z.toFixed(1)}`)
  check('mobile: releasing joystick stops player', end.speed < 0.1, `speed ${end.speed.toFixed(2)}`)

  // Half-tilt → slower (analog)
  const s0 = await game(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 2 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 22, y: cy, id: 2 }] })
  await sleep(1500)
  const s1 = await game(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  check('mobile: joystick is analog (half tilt < full speed)', s1.speed > 0.5 && s1.speed < 3.6, `speed ${s1.speed.toFixed(2)}`)

  // Scooter button + jump button
  await page.getByRole('button', { name: 'Scooter' }).tap()
  await sleep(400)
  check('mobile: scooter button toggles scooter', (await game(page)).scooter === true)
  const jump = page.getByRole('button', { name: 'Jump' })
  check('mobile: jump button appears on scooter', await jump.count() === 1)
  if (await jump.count()) {
    const pre = await game(page)
    await jump.tap()
    let peak = 0
    for (let i = 0; i < 12; i++) { peak = Math.max(peak, (await game(page)).y); await sleep(50) }
    check('mobile: jump button jumps', peak > 0.5, `peak y ${peak.toFixed(2)} (before: y=${pre.y.toFixed(2)} hopping=${pre.hopping} scooter=${pre.scooter})`)
  }

  // Zone panel as bottom sheet
  await page.getByRole('button', { name: 'About', exact: true }).tap()
  await page.waitForFunction(() => !window.__game.hopping && window.__game.zone === 'about', null, { timeout: 10000 }).catch(() => {})
  await sleep(700)
  await page.screenshot({ path: SHOTS + 'm03-about.png' })
  const sheet = page.locator('#game h2', { hasText: 'About Ashutosh' })
  check('mobile: About bottom sheet opens', await sheet.isVisible())
  const sheetBox = await page.locator('#game div.rounded-3xl.overflow-hidden').first().boundingBox()
  const joyBox = await page.locator('div.rounded-full.w-\\[120px\\]').boundingBox()
  const scootBox = await page.getByRole('button', { name: 'Scooter' }).boundingBox()
  const jumpBox = await page.getByRole('button', { name: 'Jump' }).boundingBox()
  const covered = [['joystick', joyBox], ['scooter', scootBox], ['jump', jumpBox]].filter(([, b]) => overlap(sheetBox, b)).map(([n]) => n)
  check('mobile: panel does not cover the controls', covered.length === 0, covered.join(',') || `sheet bottom ${Math.round(sheetBox.y + sheetBox.height)}`)
  const toastBox = await page.locator('[role=status]').boundingBox().catch(() => null)
  check('mobile: goal toast does not overlap panel', !toastBox || !overlap(sheetBox, toastBox), toastBox ? `toast bottom ${Math.round(toastBox.y + toastBox.height)}, sheet top ${Math.round(sheetBox.y)}` : 'no toast')
  const hudBox = await page.getByRole('button', { name: /goals/ }).boundingBox()
  check('mobile: panel does not cover the HUD', !overlap(sheetBox, hudBox), `sheet top ${Math.round(sheetBox.y)}, hud bottom ${Math.round(hudBox.y + hudBox.height)}`)
  await page.getByRole('button', { name: 'Minimize panel' }).tap(); await sleep(400)
  check('mobile: sheet minimizes to a pill', await page.locator('button', { hasText: 'About' }).locator('text=▴').count() === 1)
  await page.screenshot({ path: SHOTS + 'm04-minimized.png' })

  await page.getByRole('button', { name: 'Play', exact: true }).tap()
  await page.waitForFunction(() => !window.__game.hopping && window.__game.zone === 'play', null, { timeout: 10000 }).catch(() => {})
  await sleep(700)
  await page.screenshot({ path: SHOTS + 'm05-play.png' })
  check('mobile: Play zone panel starts minimized', await page.locator('#game h2', { hasText: 'Play zone' }).count() === 0)
  const pill = await page.locator('#game button', { hasText: 'Scooter park' }).boundingBox()
  check('mobile: minimized pill is centred', Math.abs(pill.x + pill.width / 2 - vp.width / 2) < 3, `centre ${Math.round(pill.x + pill.width / 2)} vs ${vp.width / 2}`)

  const f1 = (await game(page)).frames; await sleep(2000); const f2 = (await game(page)).frames
  check('perf: mobile-emulated frame rate', (f2 - f1) / 2 >= 30, `${(f2 - f1) / 2} fps`)

  // Landscape phone
  await page.setViewportSize({ width: 844, height: 390 })
  await sleep(800)
  await page.screenshot({ path: SHOTS + 'm06-landscape.png' })
  await page.getByRole('button', { name: 'About', exact: true }).tap()
  await page.waitForFunction(() => !window.__game.hopping && window.__game.zone === 'about', null, { timeout: 10000 }).catch(() => {})
  await sleep(900)
  await page.screenshot({ path: SHOTS + 'm07-landscape-about.png' })
  const lvp = page.viewportSize()
  const lsheet = await page.locator('#game div.rounded-3xl.overflow-hidden').first().boundingBox()
  const lcontent = await page.locator('#game div.rounded-3xl.overflow-hidden div.overflow-y-auto').first().boundingBox()
  const lctrl = [['joystick', await page.locator('div.rounded-full.w-\\[120px\\]').boundingBox()], ['scooter', await page.getByRole('button', { name: 'Scooter' }).boundingBox()], ['jump', await page.getByRole('button', { name: 'Jump' }).boundingBox()], ['talk', await page.getByRole('link', { name: "Let's talk" }).boundingBox()]]
  const lcovered = lctrl.filter(([, bb]) => bb && overlap(lsheet, bb)).map(([n]) => n)
  check('landscape: panel fits on screen', lsheet.y >= 0 && lsheet.y + lsheet.height <= lvp.height && lsheet.x + lsheet.width <= lvp.width, JSON.stringify(lsheet))
  check('landscape: panel content is readable height (≥120px)', lcontent.height >= 120, `${Math.round(lcontent.height)}px`)
  check('landscape: panel clear of controls', lcovered.length === 0, lcovered.join(','))
  const lnav = await page.getByRole('button', { name: 'Home', exact: true }).locator('xpath=../..').boundingBox()
  check('landscape: panel clear of nav', !overlap(lsheet, lnav), `nav ${JSON.stringify(lnav)}`)
  const lname = await page.locator('#game .glass.rounded-2xl').first().boundingBox()
  check('landscape: nav clear of name + buttons', !overlap(lnav, lname) && !overlap(lnav, await page.getByLabel('LinkedIn').boundingBox()))
  await ctx.close()
  await browser.close()
}

// ─── Fallbacks: reduced motion, no WebGL, no JS ──────────────────────────────
async function fallback() {
  let browser = await launch()
  let ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  let page = await ctx.newPage()
  watch(page, 'reduced-motion')
  await ready(page)
  await page.getByRole('button', { name: 'Explore my work' }).click()
  await sleep(500)
  await page.getByRole('button', { name: 'Work', exact: true }).click()
  await sleep(300)
  const g = await game(page)
  check('reduced motion: nav jumps instantly (no hop)', !g.hopping && Math.hypot(g.x - 12, g.z + 7) < 0.5, `(${g.x.toFixed(1)}, ${g.z.toFixed(1)})`)
  await ctx.close(); await browser.close()

  browser = await launch(['--disable-webgl', '--disable-webgl2'])
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  watch(page, 'no-webgl')
  await page.goto(URL)
  await sleep(2000)
  await page.screenshot({ path: SHOTS + 'f-no-webgl.png', fullPage: true })
  check('no WebGL: readable fallback page', await page.locator('main h1', { hasText: 'Ashutosh Pathak' }).isVisible() && await page.locator('canvas').count() === 0)
  const scrollable = await page.evaluate(() => { window.scrollTo(0, 400); return window.scrollY > 0 })
  check('no WebGL: fallback page scrolls', scrollable)
  await browser.close()

  browser = await launch()
  ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } })
  page = await ctx.newPage()
  await page.goto(URL)
  const text = await page.locator('main').textContent()
  check('no JS: content in HTML (bio, work, contact)', /reach doctors and patients/.test(text) && /Pharma brand launch/.test(text) && /work.ashutoshpathak@gmail.com/.test(text))
  const meta = await page.evaluate(() => ['og:image', 'og:title'].map((p) => document.querySelector(`meta[property="${p}"]`)?.content))
  check('meta: og:image + og:title', meta.every(Boolean), meta.join(' | '))
  await browser.close()

  // Static assets referenced by the page exist
  for (const p of ['/og.jpg', '/ashutosh.jpg', '/fonts/Urbanist-900.ttf', '/fonts/Urbanist-700.ttf', '/favicon.svg', '/404.html']) {
    const r = await fetch(`http://localhost:${PORT}` + p)
    check(`asset ${p}`, r.ok, String(r.status))
  }
}

const which = process.argv[2] ?? 'all'
try {
  if (which === 'desktop' || which === 'all') await desktop()
  if (which === 'mobile' || which === 'all') await mobile()
  if (which === 'fallback' || which === 'all') await fallback()
} catch (e) {
  check('runner crashed', false, e.stack?.split('\n').slice(0, 3).join(' | '))
}
console.log('\n--- console errors/warnings ---')
for (const e of [...new Set(errors)]) console.log(e)
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
server.close()
process.exit(failed.length ? 1 : 0)
