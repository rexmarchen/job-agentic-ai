import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreJobMatch } from '../src/services/matchScorer.js'
import { analyzeSkills } from '../src/services/skillAnalyzer.js'

test('analyzeSkills extracts profile with fallback heuristics', async () => {
  const sample = `John Doe
Software Engineer
Email: john.doe@example.com
Phone: +1 555 123 4567
Skills: React, Node.js, Python, PostgreSQL
4 years of experience building web apps.`

  const profile = await analyzeSkills(sample)
  assert.equal(profile.email, 'john.doe@example.com')
  assert.equal(profile.yearsExperience, 4)
  assert.ok(profile.skills.includes('React'))
  assert.ok(profile.skills.includes('Node.js'))
})

test('scoreJobMatch calculates score accurately', () => {
  const profile = {
    targetRole: 'Software Engineer',
    skills: ['React', 'Node.js', 'Python'],
    yearsExperience: 4
  }

  const job = {
    title: 'Senior Software Engineer (React & Node)',
    description: 'Looking for an experienced React developer with Node.js and Python knowledge (3+ years).',
    company: 'Stripe',
    url: 'https://boards.greenhouse.io/stripe/jobs/123'
  }

  const scored = scoreJobMatch(profile, job)
  assert.ok(scored.score >= 70 && scored.score <= 98)
  assert.ok(scored.matchReason.includes('Skill alignment'))
})
