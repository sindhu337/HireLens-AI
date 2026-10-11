# HireLens AI — Enterprise Talent Acquisition & Recruitment Intelligence

HireLens AI is an AI-powered talent acquisition platform designed for technical recruiters and hiring managers. It streamlines end-to-end requisition intelligence across a structured 6-tab workspace: automated JD extraction, multi-format CV parsing (PDF & DOCX), evidence-backed candidate ranking with side-by-side markdown resume inspection and anti-bias auditing, 10 role-specific screening interview questions, real-time hiring market intelligence, and platform-tailored Boolean search strings for Naukri and LinkedIn.

---

## 🌟 Core Modules & 6-Tab Workspace Architecture

### 1. Requisition Library & Candidate Hub
- **Jobs Directory (`/dashboard/jobs`)**: View and manage all active job requisitions created by recruiters, with candidate counts and direct access to workspaces.
- **Candidate Hub (`/dashboard/candidates`)**: Unified card grid of all evaluated candidates across requisitions with a dropdown filter to inspect specific requisitions.

---

### 2. The 6-Tab Job Workspace (`/dashboard/job/:id`)

#### Tab 1: JD Overview & Extraction
- **Flexible Intake**: Upload PDF/DOCX job descriptions or paste raw JD text.
- **Structured Extraction**: AI extracts target role, required core skills, preferred skills, experience bracket, location, and work mode.
- **1-Click Preload**: Quick-load sample production JDs (e.g., Full Stack Engineer, Data Analyst).

#### Tab 2: Multi-Format CV Ingestion & Parsing
- **Native Document Parsers**: High-fidelity text and layout extraction using **PyMuPDF** (`fitz`) for PDF and **python-docx** for DOCX files.
- **Processing Verification**: Real-time counters showing Total Uploaded, Successfully Parsed, and Failed.
- **Sample Candidate Pack**: 1-click loader for 5 realistic test candidate CVs (3 PDF + 2 DOCX) covering senior, mid, junior, and domain-transition profiles.

#### Tab 3: Candidate Ranking & Evidence Verification
- **Objective 0–100 Matching**: Ranks candidates based strictly on demonstrated skills, verified experience depth, and project impact.
- **Anti-Bias Compliance**: Evaluator deliberately excludes demographic attributes (age, gender, ethnicity, marital status, photo).
- **Interactive Markdown CV Viewer**: Displays the candidate's parsed resume in structured markdown with live evidence highlighting:
  - **Unsupported Claim Flags**: Inspect highlighted statements in context to verify whether claims are backed by project accomplishments.
  - **In-App Resume Search**: Real-time search with case-insensitive jump navigation.
- **Recruiter Correction Audit**: Recruiters can review flagged claims, adjust scores, add/remove verified skills, and store permanent audit logs of original vs. corrected scores.
- **Promise Toast Feedback**: Clicking **"Re-Rank All"** triggers an interactive promise toast with live loading and success states.

#### Tab 4: 10 Structured Screening Interview Questions
- Exactly **10 role-tailored technical, architectural, and behavioral screening questions**.
- Includes concrete **Good-Answer Criteria** rubrics detailing what interviewers should listen for.
- Category filtering and 1-click clipboard copy for applicant tracking systems (ATS).

#### Tab 5: Real-Time Hiring Market Intelligence
- **Role-Calibrated Compensation Benchmarks**: P25 entry baseline, P50 market median, and P75 top-tier salary benchmarks dynamically calibrated to the requisition's exact domain, experience bracket, and location.
- **Active Peer Employers**: Real-time identification of companies actively hiring for the profile (e.g. Fractal, Tiger Analytics, Swiggy, Flipkart for Data Analyst; Razorpay, Atlassian, Postman for Full Stack).
  - Clickable **"View Postings"** and **"Careers"** direct portal links.
- **Live Job Board Deep Searches**: 1-click deep queries targeted to the role and location on **LinkedIn Jobs**, **Naukri India**, **Indeed**, and **Google Jobs**.
- **Live Active Job Feed**: Samples live open job postings from public employment feeds (ArbeitNow API).
- **On-Demand Refresh**: Interactive **"Refresh Live Market Data"** button with automatic cache invalidation.

#### Tab 6: Boolean & Talent Sourcing Strings
- **Platform-Tailored Queries**: Formatted specifically for **Naukri Resdex** and **LinkedIn Recruiter**.
- Strict Boolean, broad Boolean, and plain-language queries with negative keywords and recommended filter settings.
- **Compliance Guarantee**: Generated strictly for copy-paste sourcing—zero credential bypass or scraping.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS v4, Radix UI, Tabler Icons, `goey-toast` |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, SQLite (`hirelens.db`), Pydantic |
| **Document Processing** | `pymupdf` (PyMuPDF) for PDF extraction, `python-docx` for DOCX parsing |
| **AI Synthesis** | Google Gemini API (`gemini-2.5-flash`), Groq API, Intelligent Fallback Heuristics |
| **Live Feeds** | ArbeitNow public job feeds, LinkedIn/Naukri/Indeed/Google Jobs deep-query generators |
| **Authentication** | Dual-mode: JWT Bearer Authorization headers + Cross-site SameSite=None secure cookies |

---

## 🌐 Production Deployment Architecture

- **Frontend**: Hosted on **Vercel** (`https://hire-lens-ai-ten.vercel.app`)
- **Backend**: Hosted on **Render** (`https://hirelens-ai-lsc4.onrender.com`)

### Cross-Origin (CORS) & Authentication
- FastAPI backend configured with CORS support for `https://hire-lens-ai-ten.vercel.app` and regex matching `https://.*\.vercel\.app` for preview deployments.
- Cross-origin credentials supported via:
  1. `Authorization: Bearer <token>` automatically attached to all API requests and stored in `localStorage`.
  2. `SameSite=None; Secure=True` cookies for HTTPS environments.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create & activate virtual environment
# Windows:
python -m venv .venv
.\.venv\Scripts\activate
# Linux/macOS:
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install fastapi uvicorn python-multipart pymupdf python-docx pydantic google-genai aiofiles pyjwt

# (Optional) Set your API keys in backend/.env:
# GEMINI_API_KEY=your_gemini_key
# GROQ_API_KEY=your_groq_key
# CORS_ORIGINS=http://localhost:5173,https://hire-lens-ai-ten.vercel.app

# Start the FastAPI server on port 8001
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### 3. Frontend Setup
```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server on port 5173
npm run dev
```

### 4. Open in Browser
Visit **`http://localhost:5173`** (or `http://127.0.0.1:5173`).

---

## 🧪 Testing the Recruiter Pipeline

1. **Sign In**: Use the pre-configured demo account (Sarah Connor, Senior Tech Recruiter) or create a new account.
2. **Select or Create a Job**:
   - Navigate to **Jobs** &rarr; Select an existing requisition (e.g. *Data Analyst* or *Senior Full Stack Engineer*), or click **"Create New Job"** to paste or upload a JD.
3. **Upload or Preload Candidate CVs**:
   - In **Tab 2 (CV Upload)**, click **"Load 5 Fictional Test Candidates (3 PDF + 2 DOCX)"** to ingest sample multi-format resumes.
4. **Candidate Evaluation & Markdown Evidence Review**:
   - In **Tab 3 (Candidate Ranking & Evidence Verification)**, review scores and flagged unsupported claims.
   - Click **"Evidence Inspection"** to view the candidate's parsed resume in formatted Markdown with highlighted claim statements.
   - Adjust scores and record recruiter correction notes to update the evaluation audit trail.
   - Click **"Re-Rank All"** to test the live promise toast.
5. **Explore Intelligence**:
   - **Tab 4**: Review the 10 role-specific screening interview questions and rubrics.
   - **Tab 5**: Inspect real-time market intelligence, salary benchmarks, active peer employers, and live job board links. Click **"Refresh Live Market Data"** to refresh on demand.
   - **Tab 6**: Copy production-tested Boolean search strings for Naukri Resdex and LinkedIn Recruiter.
