# 🤖 Job Agentic AI

An autonomous, multi-agent AI framework for automated resume parsing, real-time ATS job matching, and reliable 1-click job application submissions with zero-tolerance anti-false verification.

---

## 🌟 Key Capabilities

- **📄 Smart Resume Parsing**: Extracts structured skills, experience level, contact information, and target roles from PDF/DOCX or text.
- **⚡ Direct Public ATS Scraping**: Queries **27+ live Greenhouse & Lever company boards** (Stripe, Airbnb, Figma, Anthropic, Scale AI, Cloudflare, Discord, etc.) in parallel.
- **🎯 Multi-Factor Match Scoring**: Ranks job listings based on title relevance, skill overlap, and experience criteria.
- **🤖 Autonomous Browser Agent (Puppeteer)**: Auto-fills forms, maps inputs (First/Last name, email, phone, custom role fields), attaches resumes, and clicks submit.
- **🛡️ Portal Guards & Anti-False Confirmation**:
  - Automatically identifies enterprise login portals (Workday, MyGwork, etc.) and tags them as `manual_required` instead of crashing.
  - Verifies DOM/URL confirmation signals and captures screenshot evidence upon completion.
- **💻 Dual Interface**: Run as a standalone **REST API (Express)** or an interactive **CLI**.

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/your-username/job-agentic-ai.git
cd job-agentic-ai
npm install
```

### 2. Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Optional settings in `.env`:
```env
PORT=5050
GROQ_API_KEY=your_groq_key_here     # For LLM resume skill extraction
ADZUNA_APP_ID=your_id_here          # Optional fallback aggregation
ADZUNA_APP_KEY=your_key_here
```

### 3. Running the Agent

#### Interactive CLI Mode:
```bash
npm run cli
```

#### REST API Server:
```bash
npm start
```

---

## 📡 API Reference

### `POST /api/agent/match`
Uploads a resume file or text and returns ranked job matches.

**Request:**
- Multipart Form: `resume` (PDF file) or JSON: `{ "resumeText": "...", "topN": 10 }`

**Response:**
```json
{
  "success": true,
  "profile": {
    "name": "Alex Smith",
    "targetRole": "Software Engineer",
    "skills": ["JavaScript", "React", "Node.js", "Python"],
    "yearsExperience": 3
  },
  "totalDiscovered": 5600,
  "matchedCount": 10,
  "jobs": [
    {
      "title": "Full Stack Engineer",
      "company": "Figma",
      "location": "Remote",
      "url": "https://job-boards.greenhouse.io/figma/jobs/12345",
      "tier": 1,
      "score": 88
    }
  ]
}
```

### `POST /api/agent/apply`
Launches the autonomous browser agent for a batch of jobs.

**Request:**
```json
{
  "jobs": [ ... ],
  "profile": {
    "fullName": "Alex Smith",
    "email": "alex@example.com",
    "phone": "+15555550100"
  },
  "resumePath": "/path/to/resume.pdf"
}
```

---

## 🧪 Testing

Run the automated test suite:
```bash
npm test
```

---

## 📄 License
MIT License. Created by Anshu Pal.
