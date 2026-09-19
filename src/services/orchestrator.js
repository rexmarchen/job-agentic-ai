import { parseResume } from './resumeParser.js'
import { analyzeSkills } from './skillAnalyzer.js'
import { fetchAllJobs } from './jobFetcher.js'
import { scoreJobMatch } from './matchScorer.js'
import { runJobApplication } from './browserAgent.js'

export class JobAgenticAI {
  constructor(config = {}) {
    this.config = config
  }

  /**
   * Pipeline step 1 & 2: Parse resume and match against live jobs
   */
  async matchJobs({ resumeBuffer, resumeText, mimetype = 'application/pdf', topN = 10 }) {
    let rawText = resumeText
    if (resumeBuffer) {
      rawText = await parseResume(resumeBuffer, mimetype)
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Resume content is required.')
    }

    // Extract profile
    const profile = await analyzeSkills(rawText)

    // Fetch jobs across ATS & aggregators
    const allJobs = await fetchAllJobs(profile.targetRole)

    // Score & Rank
    const scored = allJobs
      .map(job => scoreJobMatch(profile, job))
      .sort((a, b) => {
        const aTierBoost = a.tier === 1 ? 5 : 0
        const bTierBoost = b.tier === 1 ? 5 : 0
        return (b.score + bTierBoost) - (a.score + aTierBoost)
      })
      .slice(0, topN)

    return {
      profile,
      jobs: scored,
      totalDiscovered: allJobs.length,
      matchedCount: scored.length
    }
  }

  /**
   * Pipeline step 3: Execute automated 1-click apply for a list of matched jobs
   */
  async applyBatch({ jobs, profile, resumePath, evidenceDir = './evidence' }) {
    if (!Array.isArray(jobs) || jobs.length === 0) {
      throw new Error('No jobs provided for batch apply.')
    }

    const results = []
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      console.log(`[Agent] Processing (${i + 1}/${jobs.length}): ${job.title} at ${job.company}`)

      if (job.tier === 3 || /workday|indeed|linkedin/i.test(job.url)) {
        results.push({
          jobTitle: job.title,
          company: job.company,
          status: 'manual_required',
          reason: 'External corporate portal requires manual login.',
          url: job.url
        })
        continue
      }

      const result = await runJobApplication({ job, profile, resumePath, evidenceDir })
      results.push({
        jobTitle: job.title,
        company: job.company,
        ...result
      })
    }

    return {
      appliedCount: results.filter(r => r.status === 'applied').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      manualRequiredCount: results.filter(r => r.status === 'manual_required').length,
      results
    }
  }
}
