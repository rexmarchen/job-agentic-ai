import pdfParse from 'pdf-parse'

/**
 * Parses raw text from a PDF or plain text buffer.
 */
export async function parseResume(buffer, mimetype = 'application/pdf') {
  if (!buffer) {
    throw new Error('No resume buffer provided for parsing.')
  }

  if (typeof buffer === 'string') {
    return buffer.trim()
  }

  if (mimetype.includes('pdf') || buffer.slice(0, 4).toString() === '%PDF') {
    try {
      const parsed = await pdfParse(buffer)
      return (parsed.text || '').trim()
    } catch (err) {
      // Fallback: decode raw text if pdfParse fails on raw stream
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim()
    }
  }

  return buffer.toString('utf-8').trim()
}
