/**
 * Computes multi-factor match score between candidate profile and a job listing.
 */
export function scoreJobMatch(profile, job) {
  const candidateSkills = Array.isArray(profile.skills) ? profile.skills.map(s => s.toLowerCase()) : []
  const candidateRole = (profile.targetRole || '').toLowerCase()
  const candidateYears = Number(profile.yearsExperience) || 2

  const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase()
  const jobTitle = (job.title || '').toLowerCase()

  // 1. Title Similarity (0 - 40 points)
  let titleScore = 0
  if (jobTitle.includes(candidateRole) || candidateRole.includes(jobTitle)) {
    titleScore = 40
  } else {
    const roleWords = candidateRole.split(/\s+/).filter(w => w.length > 2)
    const matchingWords = roleWords.filter(w => jobTitle.includes(w))
    titleScore = roleWords.length > 0 ? (matchingWords.length / roleWords.length) * 35 : 15
  }

  // 2. Skill Overlap (0 - 40 points)
  let skillScore = 0
  if (candidateSkills.length > 0) {
    const matchedSkills = candidateSkills.filter(skill => {
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(jobText)
    })
    skillScore = (matchedSkills.length / candidateSkills.length) * 40
  } else {
    skillScore = 20
  }

  // 3. Experience Match (0 - 20 points)
  let expScore = 15
  const expMatch = jobText.match(/(\d+)\+?\s*years?/i)
  if (expMatch) {
    const requiredYears = parseInt(expMatch[1], 10)
    if (candidateYears >= requiredYears) {
      expScore = 20
    } else if (candidateYears >= requiredYears - 1) {
      expScore = 14
    } else {
      expScore = 8
    }
  }

  const totalScore = Math.min(98, Math.max(30, Math.round(titleScore + skillScore + expScore)))

  return {
    ...job,
    score: totalScore,
    matchReason: `Skill alignment: ${Math.round(skillScore)}/40 | Title relevance: ${Math.round(titleScore)}/40 | Experience: ${Math.round(expScore)}/20`
  }
}
