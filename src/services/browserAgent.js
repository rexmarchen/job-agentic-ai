import puppeteer from 'puppeteer'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ATS_PATTERNS = {
  greenhouse:    /greenhouse\.io|boards\.greenhouse|job-boards\.greenhouse/i,
  lever:         /lever\.co/i,
  workday:       /myworkdayjobs\.com|\.workday\.com/i,
  manual_portal: /mygwork\.com|adzuna\.|indeed\.com|linkedin\.com|monster\.com|careerbuilder\.com|glassdoor\.com|ziprecruiter\.com|simplyhired\.com|taleo\.net|icims\.com|brassring\.com|successfactors\.com/i
}

function classifyUrl(url) {
  if (!url || typeof url !== 'string') return 'unknown'
  if (/gh_jid=/i.test(url) || /boards\.greenhouse/i.test(url)) return 'greenhouse'
  if (/lever\.co/i.test(url) || (/lever/i.test(url) && url.includes('?'))) return 'lever'
  for (const [platform, re] of Object.entries(ATS_PATTERNS)) {
    if (re.test(url)) return platform
  }
  return 'unknown'
}

function getBrowserExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ]
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return undefined
}

async function verifyConfirmationSignal(page, frame) {
  const finalUrl = page.url().toLowerCase()
  const content = (await frame.content().catch(() => '')).toLowerCase()

  const CONFIRMATION_URL_PATTERNS = [
    '/confirmation', '/thank', '/submitted', '/success', 'application_received', 'status=submitted'
  ]
  const hasUrlSignal = CONFIRMATION_URL_PATTERNS.some(pat => finalUrl.includes(pat))

  const CONFIRMATION_TEXT_PATTERNS = [
    'thank you for applying', 'application submitted', 'your application has been submitted',
    'your application has been received', 'application received', 'thanks for applying',
    'we have received your application', 'successfully submitted your application'
  ]
  const matchedTextPattern = CONFIRMATION_TEXT_PATTERNS.find(pat => content.includes(pat))

  if (hasUrlSignal || matchedTextPattern) {
    return {
      confirmed: true,
      signal: hasUrlSignal ? `URL confirmation: ${page.url()}` : `DOM text matched: "${matchedTextPattern}"`
    }
  }

  return { confirmed: false, reason: 'Submission unconfirmed — no verified confirmation URL or success text signal observed.' }
}

async function fillGreenhouseForm(page, profile, resumePath, appId, evidenceDir) {
  let frame = page
  let emailInput = null

  for (let attempt = 0; attempt < 8; attempt++) {
    emailInput = await page.$('input[type="email"], input[name*="email" i], input[id*="email" i]').catch(() => null)
    if (emailInput) break

    for (const f of page.frames()) {
      if (/greenhouse|boards|job_app|stripe|airbnb/i.test(f.url())) {
        const found = await f.$('input[type="email"], input[name*="email" i], input[id*="email" i]').catch(() => null)
        if (found) {
          frame = f
          emailInput = found
          break
        }
      }
    }
    if (emailInput) break
    await sleep(1000)
  }

  if (!emailInput) {
    return { status: 'failed', reason: 'Email field not found in Greenhouse form.' }
  }

  const fullName = String(profile.fullName || profile.name || 'Candidate').trim()
  const email = String(profile.email || 'candidate@example.com').trim()
  const phone = String(profile.phone || '+15555550100').trim()
  const [firstName, ...rest] = fullName.split(/\s+/)
  const lastName = rest.join(' ') || 'Applicant'

  async function typeField(sel, val) {
    if (!val) return
    try {
      const el = await frame.$(sel)
      if (el) {
        await el.click({ clickCount: 3 })
        await el.type(val, { delay: 15 })
        await sleep(100)
      }
    } catch {}
  }

  await typeField('#first_name, input[name*="first_name" i]', firstName)
  await typeField('#last_name, input[name*="last_name" i]', lastName)
  await typeField('#name, input[name="name" i]', fullName)
  await typeField('input[type="email"], input[name*="email" i], input[id*="email" i]', email)
  await typeField('#phone, input[type="tel"], input[name*="phone" i]', phone)

  if (resumePath && existsSync(resumePath)) {
    try {
      const fileInput = await frame.$('input[type="file"]')
      if (fileInput) await fileInput.uploadFile(resumePath)
    } catch {}
  }

  return { status: 'ready', frame }
}

async function fillLeverForm(page, profile, resumePath, appId, evidenceDir) {
  let frame = page
  let emailInput = await page.$('input[name="email"], input[type="email"]').catch(() => null)

  if (!emailInput) {
    await sleep(2000)
    emailInput = await page.$('input[name="email"], input[type="email"]').catch(() => null)
  }

  if (!emailInput) {
    return { status: 'failed', reason: 'Email field not found in Lever form.' }
  }

  const fullName = String(profile.fullName || profile.name || 'Candidate').trim()
  const email = String(profile.email || 'candidate@example.com').trim()
  const phone = String(profile.phone || '+15555550100').trim()

  async function typeField(sel, val) {
    if (!val) return
    try {
      const el = await frame.$(sel)
      if (el) {
        await el.click({ clickCount: 3 })
        await el.type(val, { delay: 15 })
      }
    } catch {}
  }

  await typeField('input[name="name"]', fullName)
  await typeField('input[name="email"]', email)
  await typeField('input[name="phone"]', phone)

  if (resumePath && existsSync(resumePath)) {
    try {
      const fileInput = await frame.$('input[type="file"]')
      if (fileInput) await fileInput.uploadFile(resumePath)
    } catch {}
  }

  return { status: 'ready', frame }
}

export async function runJobApplication({ job, profile, resumePath, evidenceDir = './evidence' }) {
  const appId = `job-${Date.now()}`
  const postingUrl = job.url || job.posting_url || ''

  if (!existsSync(evidenceDir)) mkdirSync(evidenceDir, { recursive: true })

  const rawPlatform = classifyUrl(postingUrl)
  if (rawPlatform === 'workday') {
    return {
      status: 'manual_required',
      reason: 'Workday requires candidate account login. Manual apply required.',
      jobUrl: postingUrl
    }
  }

  let browser
  try {
    const executablePath = getBrowserExecutablePath()
    browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS !== 'false',
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto(postingUrl, { waitUntil: 'networkidle2', timeout: 20000 })

    const resolvedUrl = page.url()
    let platform = classifyUrl(resolvedUrl)

    if (platform === 'lever' && !resolvedUrl.includes('/apply')) {
      await page.goto(`${resolvedUrl.replace(/\/$/, '')}/apply`, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
      platform = classifyUrl(page.url())
    }

    let fillResult
    if (platform === 'greenhouse' || /greenhouse|gh_jid/i.test(resolvedUrl)) {
      fillResult = await fillGreenhouseForm(page, profile, resumePath, appId, evidenceDir)
    } else if (platform === 'lever' || /lever\.co/i.test(resolvedUrl)) {
      fillResult = await fillLeverForm(page, profile, resumePath, appId, evidenceDir)
    } else {
      const hasEmailOrFrame = await page.$('input[type="email"], input[name*="email" i], iframe[src*="greenhouse"], iframe[src*="lever"]')
      if (hasEmailOrFrame) {
        fillResult = await fillGreenhouseForm(page, profile, resumePath, appId, evidenceDir)
      } else {
        const shot = path.join(evidenceDir, `${appId}_manual.png`)
        await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
        await browser.close()
        return {
          status: 'manual_required',
          reason: `External portal requires manual application/login.`,
          screenshotPath: shot,
          jobUrl: resolvedUrl
        }
      }
    }

    if (!fillResult || fillResult.status !== 'ready') {
      const shot = path.join(evidenceDir, `${appId}_fail.png`)
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
      await browser.close()
      return {
        status: 'failed',
        reason: fillResult?.reason || 'Form filling could not be completed.',
        screenshotPath: shot,
        jobUrl: resolvedUrl
      }
    }

    const { frame } = fillResult
    await sleep(500)

    // Submit
    const submitBtn = await frame.$('button[type="submit"], input[type="submit"], #btn-submit, #submit_app')
    if (submitBtn) {
      await submitBtn.evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {})
      await sleep(300)
      await submitBtn.click()
    }
    await sleep(5000)

    const confirmation = await verifyConfirmationSignal(page, frame)
    const shot = path.join(evidenceDir, `${appId}.png`)
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    await browser.close()

    return {
      status: confirmation.confirmed ? 'applied' : 'failed',
      reason: confirmation.confirmed ? confirmation.signal : confirmation.reason,
      screenshotPath: shot,
      jobUrl: resolvedUrl,
      submittedAt: new Date().toISOString()
    }
  } catch (err) {
    if (browser) await browser.close()
    return {
      status: 'failed',
      reason: `Browser execution error: ${err.message}`,
      jobUrl: postingUrl
    }
  }
}
