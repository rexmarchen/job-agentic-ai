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

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Job Agentic AI - Live Service</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e14; color: #e6edf3; padding: 40px 20px; line-height: 1.6; }
        .container { max-width: 720px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 32px; box-shadow: 0 12px 30px rgba(0,0,0,0.4); }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(46,160,67,0.15); color: #3fb950; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(46,160,67,0.3); margin-bottom: 16px; }
        .dot { width: 8px; height: 8px; background: #3fb950; border-radius: 50%; box-shadow: 0 0 8px #3fb950; }
        h1 { font-size: 26px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
        p { color: #8b949e; margin-bottom: 24px; font-size: 15px; }
        .grid { display: grid; gap: 16px; margin-bottom: 28px; }
        .card { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .method { font-family: monospace; font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px; }
        .get { background: rgba(56,139,253,0.15); color: #58a6ff; border: 1px solid rgba(56,139,253,0.3); }
        .post { background: rgba(210,153,34,0.15); color: #d29922; border: 1px solid rgba(210,153,34,0.3); }
        .path { font-family: monospace; color: #f0f6fc; font-weight: 600; }
        .desc { color: #8b949e; font-size: 13px; }
        .footer { border-top: 1px solid #30363d; padding-top: 16px; font-size: 13px; color: #8b949e; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="badge"><span class="dot"></span> Operational & Live on Render</div>
        <h1>🤖 Job Agentic AI API</h1>
        <p>Autonomous resume parsing, multi-source ATS matching, and 1-click browser application submission engine.</p>
        
        <div class="grid">
          <div class="card">
            <div class="card-header">
              <span class="path">/health</span>
              <span class="method get">GET</span>
            </div>
            <div class="desc">System health check and live status ping.</div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="path">/api/agent/match</span>
              <span class="method post">POST</span>
            </div>
            <div class="desc">Upload resume (PDF/text) & discover ranked 1-Click ATS jobs.</div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="path">/api/agent/apply</span>
              <span class="method post">POST</span>
            </div>
            <div class="desc">Autonomous Puppeteer batch auto-apply with screenshot proof.</div>
          </div>
        </div>

        <div class="footer">
          Job Agentic AI &bull; Production Engine
        </div>
      </div>
    </body>
    </html>
  `)
})

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
