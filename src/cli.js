#!/usr/bin/env node
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { JobAgenticAI } from './services/orchestrator.js'

dotenv.config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const ask = (q) => new Promise((res) => rl.question(q, res))

async function runCLI() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║               🤖 JOB AGENTIC AI                      ║')
  console.log('║  Autonomous Resume Matching & Auto-Apply Assistant   ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  const resumeInput = await ask('Enter path to Resume PDF or plain text summary: ')
  let resumeBuffer = null
  let resumeText = null

  if (fs.existsSync(resumeInput.trim())) {
    resumeBuffer = fs.readFileSync(resumeInput.trim())
  } else {
    resumeText = resumeInput.trim() || 'Software Engineer with 3+ years experience in React, Node.js, Python'
  }

  const agent = new JobAgenticAI()
  console.log('\n🔍 Scanning 27+ live ATS boards and scoring matching roles...')
  
  const matchResult = await agent.matchJobs({ resumeBuffer, resumeText, topN: 5 })
  console.log(`\n✅ Profile Identified: ${matchResult.profile.name} (${matchResult.profile.targetRole})`)
  console.log(`Skills: ${matchResult.profile.skills.join(', ')}`)
  console.log(`Discovered ${matchResult.totalDiscovered} live jobs.\n`)

  console.log('── Top Ranked Matches ─────────────────────────────────')
  matchResult.jobs.forEach((j, i) => {
    console.log(`[${i + 1}] ${j.company} - ${j.title} (Fit: ${j.score}%)`)
    console.log(`    Tier: ${j.tier === 1 ? '1-Click ATS (Greenhouse/Lever)' : 'Manual Portal'}`)
    console.log(`    URL: ${j.url}`)
  })

  const confirmApply = await ask('\nLaunch 1-Click Auto Apply for compatible jobs? (y/N): ')
  if (confirmApply.toLowerCase() === 'y') {
    console.log('\n🚀 Starting autonomous browser application agent...\n')
    const applyResults = await agent.applyBatch({
      jobs: matchResult.jobs,
      profile: matchResult.profile
    })
    console.log('\n=== Application Summary ===')
    console.log(`✅ Applied: ${applyResults.appliedCount}`)
    console.log(`📝 Manual Required: ${applyResults.manualRequiredCount}`)
    console.log(`❌ Failed: ${applyResults.failedCount}`)
  } else {
    console.log('\nSession completed without applying.')
  }

  rl.close()
}

runCLI().catch(err => {
  console.error('CLI Error:', err.message)
  rl.close()
})
