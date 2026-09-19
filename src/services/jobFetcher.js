const GREENHOUSE_COMPANIES = [
  'airbnb',
  'gitlab',
  'fingerprint',
  'figma',
  'anthropic',
  'scaleai',
  'cloudflare',
  'datadog',
  'canonical',
  'elastic',
  'instacart',
  'reddit',
  'roblox',
  'discord',
  'twitch',
  'coursera',
  'duolingo',
  'pagerduty',
  'seatgeek',
  'affirm',
  'flexport',
  'brex',
  'carta',
  'checkr',
  'coinbase'
]

const LEVER_COMPANIES = [
  'palantir'
]

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function capitalise(s) {
  return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1)
}

async function fetchGreenhouseJobs(companyToken) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${companyToken}/jobs?content=true`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    const jobs = Array.isArray(data?.jobs) ? data.jobs : []
    return jobs.map(j => ({
      id: `greenhouse-${companyToken}-${j.id}`,
      title: j.title || 'Untitled Role',
      company: capitalise(companyToken),
      location: j.location?.name || 'Remote',
      description: stripHtml(j.content || '').slice(0, 1000),
      url: j.absolute_url || `https://boards.greenhouse.io/${companyToken}/jobs/${j.id}`,
      tier: 1,
      source: 'Greenhouse'
    }))
  } catch {
    return []
  }
}

async function fetchLeverJobs(companyToken) {
  const url = `https://api.lever.co/v0/postings/${companyToken}?mode=json`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    const postings = Array.isArray(data) ? data : []
    return postings.map(j => ({
      id: `lever-${companyToken}-${j.id}`,
      title: j.text || 'Untitled Role',
      company: capitalise(companyToken),
      location: j.categories?.location || 'Remote',
      description: stripHtml(j.description || j.descriptionPlain || '').slice(0, 1000),
      url: j.hostedUrl || `https://jobs.lever.co/${companyToken}/${j.id}`,
      tier: 1,
      source: 'Lever'
    }))
  } catch {
    return []
  }
}

async function fetchAdzunaJobs(role = 'Software Engineer') {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  const country = process.env.ADZUNA_COUNTRY || 'in'
  if (!appId || !appKey) return []

  try {
    const query = encodeURIComponent(role)
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${query}&content-type=application/json`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    const results = Array.isArray(data?.results) ? data.results : []
    return results.map(j => ({
      id: `adzuna-${j.id}`,
      title: j.title,
      company: j.company?.display_name || 'Company',
      location: j.location?.display_name || 'Flexible',
      description: stripHtml(j.description || ''),
      url: j.redirect_url || '',
      tier: 3,
      source: 'Adzuna'
    }))
  } catch {
    return []
  }
}

export async function fetchAllJobs(targetRole = 'Software Engineer') {
  const [ghResults, lvResults, adzunaResults] = await Promise.all([
    Promise.all(GREENHOUSE_COMPANIES.map(fetchGreenhouseJobs)),
    Promise.all(LEVER_COMPANIES.map(fetchLeverJobs)),
    fetchAdzunaJobs(targetRole)
  ])

  return [
    ...ghResults.flat(),
    ...lvResults.flat(),
    ...adzunaResults
  ]
}
