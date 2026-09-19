import express from 'express'
import cors from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'
import { JobAgenticAI } from './services/orchestrator.js'

dotenv.config()

const app = express()
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } })
const agent = new JobAgenticAI()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Job Agentic AI', timestamp: new Date().toISOString() })
})

// Match endpoint
app.post('/api/agent/match', upload.single('resume'), async (req, res) => {
  try {
    const resumeBuffer = req.file?.buffer
    const resumeText = req.body?.resumeText
    const topN = parseInt(req.body?.topN, 10) || 10

    const result = await agent.matchJobs({
      resumeBuffer,
      resumeText,
      mimetype: req.file?.mimetype,
      topN
    })

    res.json({ success: true, ...result })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})

// Apply endpoint
app.post('/api/agent/apply', async (req, res) => {
  try {
    const { jobs, profile, resumePath } = req.body
    const result = await agent.applyBatch({ jobs, profile, resumePath })
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
})

const PORT = process.env.PORT || 5050
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🤖 Job Agentic AI Server running on http://localhost:${PORT}`)
  })
}

export default app
