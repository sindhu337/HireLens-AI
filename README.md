# HireLens AI — Talent Acquisition Recruitment Suite

HireLens AI is an AI-powered talent acquisition application designed to guide recruiters through a rigorous, objective 7-stage hiring workflow: recruiter authentication, job requisition intake, multi-format CV ingestion (PDF & DOCX), evidence-backed candidate ranking with strict anti-bias compliance and recruiter correction audits, 10 role-specific screening interview questions, hiring market intelligence benchmarks, and platform-tailored Boolean search query generators for Naukri and LinkedIn.

---

## 🌟 Key Features Across the 7 Workflow Stages

1. **Stage 1: Recruiter Demo Authentication**
   - Recruiter profile selection (e.g. Alex Vance, Senior Technical Recruiter) or custom login.
   - Session persistence and recruiter badge visible across all views and audit logs.
2. **Stage 2: Job Description Intake & Parsing**
   - Upload PDF/DOCX job descriptions or paste raw text.
   - Extracts target role, required core skills, preferred skills, experience range, location, and work mode.
   - Includes 1-click sample JD loader.
3. **Stage 3: Multi-Format CV Ingestion & Processing Verification**
   - Native document extraction with **PyMuPDF** (`fitz`) for PDF files and **python-docx** for DOCX files.
   - Real-time processing counts: Total Uploaded, Successfully Parsed, and Failed.
   - Includes 1-click loader for **5 realistic test candidates** (3 PDF and 2 DOCX).
4. **Stage 4: Candidate Ranking & Recruiter Evidence-Review**
   - Objective 0–100 matching score based exclusively on verified skills, experience depth, and project accomplishments.
   - **Strict Anti-Bias Compliance**: Excludes age, gender, names, photographs, and marital status from candidate scoring.
   - **Evidence Review & Correction Audit**: Recruiter can review documented resume quotes, recover incorrectly penalized skills, adjust scores, and preserve a side-by-side audit of original vs. corrected evaluations.
5. **Stage 5: 10 Structured Screening Interview Questions**
   - Exactly 10 role-tailored technical, architectural, and behavioral questions.
   - Concrete **Good-Answer Criteria** (rubrics explaining what recruiters should listen for).
   - Category filtering and 1-click clipboard copy.
6. **Stage 6: Talent Market & Compensation Benchmarks**
   - Salary ranges with percentiles (25th entry baseline, 50th market median, 75th product tier).
   - Comparable peer employers actively hiring (e.g., Razorpay, Swiggy, PhonePe).
   - Talent density distribution across key hubs (Bengaluru, Hyderabad, Pune, NCR).
   - Transparent citation of public benchmark sources with publication dates (Q1 2026) and honest estimate disclosures.
7. **Stage 7: Naukri & LinkedIn Boolean Search Strings**
   - Strict and broad Boolean search strings, plain-language queries, and recommended filters.
   - Formatted specifically for **Naukri Resdex** and **LinkedIn Recruiter**.
   - **Compliance Guarantee**: Strings are generated for manual copy-paste; zero scraping or credential bypass.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS v4, ShadCN UI components (`radix-ui`), Tabler Icons.
- **Backend**: Python FastAPI, Uvicorn, SQLite (`hirelens.db`).
- **Document Extractors**:
  - `pymupdf` (PyMuPDF): High-fidelity PDF layout and text parsing.
  - `python-docx`: DOCX paragraph and table parsing.
- **AI Engine**:
  - Google Gemini API (`google-genai` / `gemini-2.5-flash`), configurable via `GEMINI_API_KEY`.
  - **Graceful Deterministic Offline Fallback**: In the absence of an API key or when offline, an intelligent heuristic rule-based engine operates seamlessly so the recruiter demo never breaks.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Activate the virtual environment
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies (already pre-installed in the workspace)
pip install fastapi uvicorn python-multipart pymupdf python-docx pydantic google-genai aiofiles

# (Optional) Set your Gemini API key for online AI mode
# Windows PowerShell:
$env:GEMINI_API_KEY="your_api_key_here"
# Linux/macOS:
export GEMINI_API_KEY="your_api_key_here"

# Start the FastAPI server on port 8001
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### 3. Frontend Setup
```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies (already installed)
npm install

# Start the Vite development server on port 5173
npm run dev
```

### 4. Open in Browser
Visit **`http://127.0.0.1:5173`** in your browser.

---

## 🧪 Testing the 5 Fictional Candidates

To test the application with pre-generated multi-format test resumes:
1. In Stage 2, click **"Load Sample Full-Stack JD"** and then **"Analyze & Extract Skills"**.
2. In Stage 3, click **"Load 5 Fictional Test Candidates (3 PDF + 2 DOCX)"**.
   - The system immediately parses:
     - `Alex_Rivera_Senior_FullStack.pdf` (Senior match, ~91-95%)
     - `Priya_Sharma_FullStack_Dev.docx` (Strong match, ~86%)
     - `David_Chen_Frontend_Engineer.pdf` (Frontend transition, ~72%)
     - `Amina_Mansoor_Backend_Data.docx` (Backend/Data, ~86%)
     - `Marcus_Vance_Junior_WebDev.pdf` (Junior profile, ~36%)
3. In Stage 4, click **"Rank All Uploaded Candidates"** to view rankings, inspect quotes, and test the **"Review Evidence"** modal to adjust scores and save recruiter notes.
4. Proceed through Stages 5, 6, and 7 to explore the complete talent acquisition pipeline.
