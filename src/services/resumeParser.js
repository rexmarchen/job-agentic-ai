import pdfParse from 'pdf-parse'

/**
 * Parses raw text and extracts structured candidate profile from a PDF or plain text buffer.
 */
export async function parseResume(buffer, mimetype = 'application/pdf') {
  if (!buffer) {
    throw new Error('No resume buffer provided for parsing.')
  }

  let text = ''
  if (typeof buffer === 'string') {
    text = buffer.trim()
  } else if (mimetype.includes('pdf') || buffer.slice(0, 4).toString() === '%PDF') {
    try {
      const parsed = await pdfParse(buffer)
      text = (parsed.text || '').trim()
    } catch (err) {
      text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim()
    }
  } else {
    text = buffer.toString('utf-8').trim()
  }

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const phoneMatch = text.match(/(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}/)
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i)

  // Extract name from first clean line
  let name = ''
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 50)
  for (const l of lines.slice(0, 5)) {
    if (!/@|http|\.com|\.io|\.pdf|\d/.test(l) && /^[a-zA-Z\s.-]+$/.test(l)) {
      name = l
      break
    }
  }

  return {
    rawText: text,
    fullName: name || 'Candidate',
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0].trim() : '',
    linkedinUrl: linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : '',
    githubUrl: githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : ''
  }
}
