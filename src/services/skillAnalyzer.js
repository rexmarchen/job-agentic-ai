/**
 * Extracts structured candidate profile (skills, experience years, target role, contact info)
 * using Groq LLM API or smart regex heuristic fallback.
 */
export async function analyzeSkills(resumeText) {
  const text = String(resumeText || '').trim()

  // Attempt Groq LLM extraction if API key is present
  const apiKey = process.env.GROQ_API_KEY
  if (apiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are an expert AI resume parser. Extract candidate details in STRICT JSON format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1...",
  "targetRole": "Primary Target Job Title",
  "skills": ["Skill1", "Skill2", ...],
  "yearsExperience": 3
}`
            },
            {
              role: 'user',
              content: text.slice(0, 4000)
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const data = await response.json()
        const content = data?.choices?.[0]?.message?.content
        if (content) {
          const parsed = JSON.parse(content)
          return {
            name: parsed.name || extractNameFallback(text),
            email: parsed.email || extractEmailFallback(text),
            phone: parsed.phone || extractPhoneFallback(text),
            targetRole: parsed.targetRole || 'Software Engineer',
            skills: Array.isArray(parsed.skills) ? parsed.skills : [],
            yearsExperience: Number(parsed.yearsExperience) || extractExpFallback(text)
          }
        }
      }
    } catch (err) {
      // fallback to heuristic extraction
    }
  }

  // Heuristic rule-based extractor fallback
  return {
    name: extractNameFallback(text),
    email: extractEmailFallback(text),
    phone: extractPhoneFallback(text),
    targetRole: extractRoleFallback(text),
    skills: extractSkillsFallback(text),
    yearsExperience: extractExpFallback(text)
  }
}

function extractEmailFallback(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return match ? match[0] : 'applicant@example.com'
}

function extractPhoneFallback(text) {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
  return match ? match[0] : '+15555550100'
}

function extractNameFallback(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines.slice(0, 5)) {
    if (line.length < 35 && /^[A-Z][a-zA-Z\s.-]+$/.test(line) && !/resume|curriculum|profile|contact/i.test(line)) {
      return line
    }
  }
  return 'Candidate'
}

function extractRoleFallback(text) {
  const roles = [
    'Software Engineer', 'Frontend Developer', 'Backend Developer',
    'Full Stack Engineer', 'Machine Learning Engineer', 'Data Scientist',
    'DevOps Engineer', 'Security Engineer', 'Product Manager'
  ]
  for (const role of roles) {
    if (new RegExp(role, 'i').test(text)) return role
  }
  return 'Software Engineer'
}

function extractSkillsFallback(text) {
  const COMMON_SKILLS = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Go', 'Java',
    'C++', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'PostgreSQL', 'MongoDB',
    'GraphQL', 'REST API', 'Git', 'Linux', 'SQL', 'FastAPI', 'Next.js'
  ]
  return COMMON_SKILLS.filter(skill => {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
  })
}

function extractExpFallback(text) {
  const match = text.match(/(\d+)\+?\s*years?(?:\s+of)?\s+experience/i)
  return match ? parseInt(match[1], 10) : 3
}
