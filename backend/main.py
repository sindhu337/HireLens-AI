import os
import shutil
import uuid
import json
import hashlib
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jwt
from datetime import datetime, timedelta, timezone

import database
import file_parser
import ai_service

app = FastAPI(title="HireLens AI Backend", version="2.0.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "https://hire-lens-ai-ten.vercel.app",
    "https://hirelens-ai-ten.vercel.app",
    "https://hire-lens-ai.vercel.app",
    "https://hirelens-ai.vercel.app",
    "https://hirelens-ai-lsc4.onrender.com",
]

# Allow additional origins from environment variable (comma-separated)
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    for o in extra_origins.split(","):
        o_clean = o.strip()
        if o_clean and o_clean not in origins:
            origins.append(o_clean)

frontend_url = os.getenv("FRONTEND_URL", "")
if frontend_url and frontend_url.strip() not in origins:
    origins.append(frontend_url.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# PASSWORD & ACCESS TOKEN UTILITIES
# -------------------------------------------------------------

JWT_SECRET = os.getenv("JWT_SECRET", "hirelens_jwt_secret_key_2026_super_secure")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # Valid up to 24 hours

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with a project salt."""
    salt = "hirelens_secure_salt_2026"
    return hashlib.sha256(f"{password}:{salt}".encode("utf-8")).hexdigest()

def create_access_token(user_id: str, email: str, name: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None

def set_auth_cookie(response: Response, token: str, request: Optional[Request] = None):
    """Set cross-site compliant cookie for web clients."""
    is_https = False
    if request:
        proto = request.headers.get("x-forwarded-proto", "")
        origin = request.headers.get("origin", "")
        is_https = (request.url.scheme == "https") or (proto == "https") or origin.startswith("https://")
    if os.getenv("RENDER") or os.getenv("ENVIRONMENT") == "production":
        is_https = True

    response.set_cookie(
        key="access_token",
        value=token,
        max_age=3600 * 24,  # 24 hours
        httponly=False,
        samesite="none" if is_https else "lax",
        secure=True if is_https else False,
        path="/"
    )

# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------

class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class JDTextRequest(BaseModel):
    text: str
    user_id: Optional[str] = "default_user"

class EvidenceCorrectionRequest(BaseModel):
    candidate_id: str
    corrected_score: int
    corrected_skill_added: Optional[str] = None
    corrected_skill_removed: Optional[str] = None
    recruiter_notes: str

# -------------------------------------------------------------
# SYSTEM & HEALTH STATUS
# -------------------------------------------------------------

@app.get("/api/status")
def get_system_status():
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as count FROM candidates")
    total_cvs = c.fetchone()["count"]
    c.execute("SELECT id, title, role, location FROM job_descriptions ORDER BY created_at DESC LIMIT 1")
    active_jd = c.fetchone()
    conn.close()

    is_ai_ready = ai_service.is_ai_configured()
    model_name = ai_service.get_active_model_name()

    return {
        "status": "healthy",
        "service": "HireLens AI Engine",
        "ai_engine_configured": is_ai_ready,
        "ai_engine_active": f"Groq ({model_name})" if is_ai_ready else "HireLens Deterministic Engine",
        "model": model_name,
        "total_candidates_stored": total_cvs,
        "active_jd": dict(active_jd) if active_jd else None,
        "anti_bias_enforcement": "Strict (Job-evidence only; demographic attributes excluded)"
    }

# -------------------------------------------------------------
# AUTHENTICATION (SIGN UP & LOGIN)
# -------------------------------------------------------------

@app.post("/api/auth/signup")
def signup_user(req: SignUpRequest, response: Response, request: Request):
    name = req.name.strip()
    email = req.email.strip().lower()
    password = req.password

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Name, email, and password are all required.")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    existing = c.fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

    user_id = f"usr_{uuid.uuid4().hex[:10]}"
    pw_hash = hash_password(password)

    c.execute(
        "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
        (user_id, name, email, pw_hash)
    )
    conn.commit()
    conn.close()

    token = create_access_token(user_id, email, name)
    set_auth_cookie(response, token, request)

    user_data = {
        "id": user_id,
        "name": name,
        "email": email,
        "avatarUrl": f"https://api.dicebear.com/7.x/avataaars/svg?seed={name}",
        "senderAccounts": [],
        "slackIntegration": None
    }

    return {
        "id": user_id,
        "name": name,
        "email": email,
        "token": token,
        "token_type": "bearer",
        "expires_in": 3600 * 24,
        "user": user_data,
        "message": "Account created successfully."
    }

@app.post("/api/auth/login")
def login_user(req: LoginRequest, response: Response, request: Request):
    email = req.email.strip().lower()
    password = req.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    pw_hash = hash_password(password)
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (email,))
    user = c.fetchone()
    conn.close()

    if not user or user["password_hash"] != pw_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user["id"], user["email"], user["name"])
    set_auth_cookie(response, token, request)

    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "avatarUrl": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user['name']}",
        "senderAccounts": [],
        "slackIntegration": None
    }

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "token": token,
        "token_type": "bearer",
        "expires_in": 3600 * 24,
        "user": user_data,
        "message": f"Welcome back, {user['name']}!"
    }

@app.post("/api/auth/dev-login")
def dev_login_user(response: Response, request: Request):
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, email FROM users WHERE email = ? LIMIT 1", ("sarah.connor@talent.ai",))
    user = c.fetchone()
    if not user:
        c.execute("SELECT id, name, email FROM users LIMIT 1")
        user = c.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="No users found in database.")

    token = create_access_token(user["id"], user["email"], user["name"])
    set_auth_cookie(response, token, request)

    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "avatarUrl": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user['name']}",
        "senderAccounts": [],
        "slackIntegration": None
    }

    return {
        "id": user["id"],
        "token": token,
        "token_type": "bearer",
        "expires_in": 3600 * 24,
        "user": user_data,
        "message": "Dev login successful."
    }

@app.post("/api/auth/logout")
def logout_user(response: Response, request: Request):
    is_https = False
    proto = request.headers.get("x-forwarded-proto", "")
    origin = request.headers.get("origin", "")
    if (request.url.scheme == "https") or (proto == "https") or origin.startswith("https://") or os.getenv("RENDER"):
        is_https = True
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite="none" if is_https else "lax",
        secure=True if is_https else False
    )
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    user_id: Optional[str] = None
):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    if not token:
        token = request.cookies.get("access_token")

    resolved_user_id = None
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            resolved_user_id = payload["sub"]

    if not resolved_user_id:
        resolved_user_id = user_id

    if not resolved_user_id:
        return {"authenticated": False, "user": None}

    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT id, name, email FROM users WHERE id = ?", (resolved_user_id,))
    user = c.fetchone()
    conn.close()

    if not user:
        return {"authenticated": False, "user": None}

    user_data = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "avatarUrl": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user['name']}",
        "senderAccounts": [],
        "slackIntegration": None
    }

    return {
        "authenticated": True,
        "user": user_data
    }

# -------------------------------------------------------------
# JOB DESCRIPTION INTAKE
# -------------------------------------------------------------

@app.post("/api/jd/parse-file")
async def parse_jd_file(file: UploadFile = File(...), user_id: str = Form("default_user")):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".pdf", ".docx", ".doc", ".txt"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Upload PDF, DOCX, or TXT.")

    file_id = f"jd_{uuid.uuid4().hex[:8]}"
    saved_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        extracted_text, _ = file_parser.extract_text_from_file(saved_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Uploaded file contains no readable text.")

    parsed = ai_service.extract_jd_details(extracted_text)

    conn = database.get_connection()
    c = conn.cursor()
    c.execute(
        """INSERT INTO job_descriptions (id, session_id, title, raw_text, role, required_skills, preferred_skills, experience_min, experience_max, location, work_mode, parsed_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            file_id, user_id, parsed.get("role", "Software Role"), extracted_text,
            parsed.get("role"), json.dumps(parsed.get("required_skills", [])),
            json.dumps(parsed.get("preferred_skills", [])),
            parsed.get("experience_min", 3.0), parsed.get("experience_max", 7.0),
            parsed.get("location", "Bengaluru"), parsed.get("work_mode", "Hybrid"),
            json.dumps(parsed)
        )
    )
    conn.commit()
    conn.close()

    parsed["id"] = file_id
    parsed["filename"] = file.filename
    parsed["raw_text"] = extracted_text
    return parsed

@app.post("/api/jd/parse-text")
def parse_jd_text(req: JDTextRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty.")

    file_id = f"jd_{uuid.uuid4().hex[:8]}"
    parsed = ai_service.extract_jd_details(req.text)

    conn = database.get_connection()
    c = conn.cursor()
    c.execute(
        """INSERT INTO job_descriptions (id, session_id, title, raw_text, role, required_skills, preferred_skills, experience_min, experience_max, location, work_mode, parsed_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            file_id, req.user_id, parsed.get("role", "Software Role"), req.text,
            parsed.get("role"), json.dumps(parsed.get("required_skills", [])),
            json.dumps(parsed.get("preferred_skills", [])),
            parsed.get("experience_min", 3.0), parsed.get("experience_max", 7.0),
            parsed.get("location", "Bengaluru"), parsed.get("work_mode", "Hybrid"),
            json.dumps(parsed)
        )
    )
    conn.commit()
    conn.close()

    parsed["id"] = file_id
    parsed["filename"] = "Pasted_JD.txt"
    parsed["raw_text"] = req.text
    return parsed

@app.get("/api/jd/active")
def get_active_jd():
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM job_descriptions ORDER BY created_at DESC LIMIT 1")
    row = c.fetchone()
    conn.close()

    if not row:
        return {"active": False, "message": "No job description uploaded yet."}

    data = dict(row)
    data["required_skills"] = json.loads(data["required_skills"]) if data["required_skills"] else []
    data["preferred_skills"] = json.loads(data["preferred_skills"]) if data["preferred_skills"] else []
    data["parsed_json"] = json.loads(data["parsed_json"]) if data["parsed_json"] else {}
    data["active"] = True
    return data

@app.get("/api/jobs")
def list_all_jobs(user_id: Optional[str] = None):
    conn = database.get_connection()
    c = conn.cursor()
    if user_id:
        c.execute("SELECT * FROM job_descriptions WHERE session_id = ? ORDER BY created_at DESC", (user_id,))
    else:
        c.execute("SELECT * FROM job_descriptions ORDER BY created_at DESC")
    rows = c.fetchall()

    jobs = []
    for r in rows:
        j = dict(r)
        j["required_skills"] = json.loads(j["required_skills"]) if j["required_skills"] else []
        j["preferred_skills"] = json.loads(j["preferred_skills"]) if j["preferred_skills"] else []
        j["parsed_json"] = json.loads(j["parsed_json"]) if j["parsed_json"] else {}
        
        # Candidate counts
        c.execute("SELECT COUNT(*) as count FROM candidates WHERE jd_id = ?", (j["id"],))
        j["candidate_count"] = c.fetchone()["count"]
        c.execute("SELECT COUNT(*) as count FROM candidate_evaluations WHERE jd_id = ?", (j["id"],))
        j["ranked_count"] = c.fetchone()["count"]
        jobs.append(j)

    conn.close()
    return {"total": len(jobs), "jobs": jobs}

@app.get("/api/jobs/{job_id}")
def get_job_by_id(job_id: str):
    conn = database.get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM job_descriptions WHERE id = ?", (job_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Job description not found.")

    job = dict(row)
    job["required_skills"] = json.loads(job["required_skills"]) if job["required_skills"] else []
    job["preferred_skills"] = json.loads(job["preferred_skills"]) if job["preferred_skills"] else []
    job["parsed_json"] = json.loads(job["parsed_json"]) if job["parsed_json"] else {}

    c.execute("SELECT COUNT(*) as count FROM candidates WHERE jd_id = ?", (job_id,))
    job["candidate_count"] = c.fetchone()["count"]
    c.execute("SELECT COUNT(*) as count FROM candidate_evaluations WHERE jd_id = ?", (job_id,))
    job["ranked_count"] = c.fetchone()["count"]
    conn.close()
    return job

@app.post("/api/candidates/load-sample")
def load_sample_candidates(jd_id: Optional[str] = Form(None)):
    sample_dir = Path(__file__).resolve().parent.parent / "sample_data"
    sample_files = [
        "Alex_Rivera_Senior_FullStack.pdf",
        "Amina_Mansoor_Backend_Data.docx",
        "David_Chen_Frontend_Engineer.pdf",
        "Marcus_Vance_Junior_WebDev.pdf",
        "Priya_Sharma_FullStack_Dev.docx",
    ]

    conn = database.get_connection()
    c = conn.cursor()

    if not jd_id:
        c.execute("SELECT id FROM job_descriptions ORDER BY created_at DESC LIMIT 1")
        latest = c.fetchone()
        if latest:
            jd_id = latest["id"]

    processed = []
    successful = 0

    for fname in sample_files:
        fpath = sample_dir / fname
        if not fpath.exists():
            continue

        cand_id = f"cand_{uuid.uuid4().hex[:8]}"
        try:
            extracted_text, file_type = file_parser.extract_text_from_file(fpath)
            info = file_parser.parse_basic_candidate_info(extracted_text, fname)
            raw_markdown = info.get("markdown") or file_parser.parse_resume_to_markdown(extracted_text, fname)

            c.execute(
                """INSERT INTO candidates (id, jd_id, filename, file_type, file_path, raw_text, raw_markdown, name, email, phone, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    cand_id, jd_id, fname, file_type, str(fpath),
                    extracted_text, raw_markdown, info["name"], info["email"], info["phone"], "parsed"
                )
            )
            successful += 1
            processed.append({
                "id": cand_id,
                "filename": fname,
                "file_type": file_type,
                "name": info["name"],
                "email": info["email"],
                "phone": info["phone"],
                "raw_markdown": raw_markdown,
                "char_count": len(extracted_text),
                "status": "parsed"
            })
        except Exception as e:
            c.execute(
                """INSERT INTO candidates (id, jd_id, filename, file_type, file_path, raw_text, raw_markdown, name, status, error_message)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (cand_id, jd_id, fname, "unknown", "", "", "", Path(fname).stem, "failed", str(e))
            )
            processed.append({
                "id": cand_id,
                "filename": fname,
                "file_type": "unknown",
                "name": Path(fname).stem,
                "status": "failed",
                "error": str(e)
            })

    conn.commit()
    conn.close()

    return {
        "summary": {
            "total_uploaded": len(sample_files),
            "successfully_parsed": successful,
            "failed": len(sample_files) - successful,
        },
        "candidates": processed
    }

# -------------------------------------------------------------
# CANDIDATE CV UPLOAD & PARSING
# -------------------------------------------------------------

@app.post("/api/cv/upload")
async def upload_candidate_cvs(files: List[UploadFile] = File(...), jd_id: Optional[str] = Form(None)):
    total_received = len(files)
    successful_count = 0
    failed_count = 0
    processed_candidates = []

    conn = database.get_connection()
    c = conn.cursor()

    for file in files:
        cand_id = f"cand_{uuid.uuid4().hex[:8]}"
        saved_path = UPLOAD_DIR / f"{cand_id}_{file.filename}"
        
        try:
            with open(saved_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            extracted_text, file_type = file_parser.extract_text_from_file(saved_path)
            if not extracted_text.strip():
                raise ValueError("Parsed file contained zero readable characters.")

            info = file_parser.parse_basic_candidate_info(extracted_text, file.filename)
            raw_markdown = info.get("markdown") or file_parser.parse_resume_to_markdown(extracted_text, file.filename)
            
            c.execute(
                """INSERT INTO candidates (id, jd_id, filename, file_type, file_path, raw_text, raw_markdown, name, email, phone, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    cand_id, jd_id, file.filename, file_type, str(saved_path),
                    extracted_text, raw_markdown, info["name"], info["email"], info["phone"], "parsed"
                )
            )
            successful_count += 1
            processed_candidates.append({
                "id": cand_id,
                "filename": file.filename,
                "file_type": file_type,
                "name": info["name"],
                "email": info["email"],
                "phone": info["phone"],
                "raw_markdown": raw_markdown,
                "char_count": len(extracted_text),
                "status": "parsed"
            })
        except Exception as e:
            failed_count += 1
            c.execute(
                """INSERT INTO candidates (id, jd_id, filename, file_type, file_path, raw_text, raw_markdown, name, status, error_message)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (cand_id, jd_id, file.filename, "unknown", "", "", "", Path(file.filename).stem, "failed", str(e))
            )
            processed_candidates.append({
                "id": cand_id,
                "filename": file.filename,
                "file_type": "unknown",
                "name": Path(file.filename).stem,
                "status": "failed",
                "error": str(e)
            })

    conn.commit()
    conn.close()

    return {
        "summary": {
            "total_uploaded": total_received,
            "successfully_parsed": successful_count,
            "failed": failed_count,
        },
        "candidates": processed_candidates
    }

@app.get("/api/cv/list")
def list_candidates(jd_id: Optional[str] = None):
    conn = database.get_connection()
    c = conn.cursor()
    if jd_id:
        c.execute(
            "SELECT id, filename, file_type, name, email, phone, status, error_message, created_at, jd_id, raw_markdown, raw_text FROM candidates WHERE jd_id = ? ORDER BY created_at DESC",
            (jd_id,)
        )
    else:
        c.execute("SELECT id, filename, file_type, name, email, phone, status, error_message, created_at, jd_id, raw_markdown, raw_text FROM candidates ORDER BY created_at DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for item in rows:
        if not item.get("raw_markdown") and item.get("raw_text"):
            item["raw_markdown"] = file_parser.parse_resume_to_markdown(item["raw_text"], item["filename"])
    return {"total": len(rows), "candidates": rows}

@app.get("/api/candidates/overview")
def get_candidates_overview(jd_id: Optional[str] = None):
    conn = database.get_connection()
    c = conn.cursor()
    query = """
        SELECT c.*, j.title as job_title, j.role as job_role,
               e.score, e.match_level, e.matched_skills, e.missing_skills, e.is_corrected, e.evidence_reasons, e.unsupported_claims
        FROM candidates c
        LEFT JOIN job_descriptions j ON c.jd_id = j.id
        LEFT JOIN candidate_evaluations e ON (c.id = e.candidate_id AND (c.jd_id = e.jd_id OR e.jd_id IS NULL))
    """
    params = []
    if jd_id:
        query += " WHERE c.jd_id = ?"
        params.append(jd_id)
    query += " ORDER BY COALESCE(e.score, 0) DESC, c.created_at DESC"
    c.execute(query, tuple(params))
    rows = c.fetchall()
    conn.close()

    results = []
    for r in rows:
        item = dict(r)
        item["matched_skills"] = json.loads(item["matched_skills"]) if item.get("matched_skills") else []
        item["missing_skills"] = json.loads(item["missing_skills"]) if item.get("missing_skills") else []
        item["evidence_reasons"] = json.loads(item["evidence_reasons"]) if item.get("evidence_reasons") else []
        item["unsupported_claims"] = json.loads(item["unsupported_claims"]) if item.get("unsupported_claims") else []
        if not item.get("raw_markdown") and item.get("raw_text"):
            item["raw_markdown"] = file_parser.parse_resume_to_markdown(item["raw_text"], item["filename"])
        results.append(item)
    return {"total": len(results), "candidates": results}

# -------------------------------------------------------------
# CANDIDATE RANKING & EVIDENCE CORRECTION
# -------------------------------------------------------------

def clean_unsupported_claims(raw_claims):
    if not isinstance(raw_claims, list):
        return []
    clean = []
    for c in raw_claims:
        if not isinstance(c, str):
            continue
        c_str = c.strip()
        c_low = c_str.lower()
        if not c_str:
            continue
        if any(neg in c_low for neg in [
            "no significant unsupported", "no unsupported claim", "no unsupported claims",
            "none found", "no discrepancies", "no discrepancy",
            "all listed skills have corresponding", "all skills verified",
            "none", "n/a", "nil", "zero unsupported", "no claims flagged",
            "matched skills list", "matched skills"
        ]):
            continue
        clean.append(c_str)
    return clean

class CandidateRankRequest(BaseModel):
    jd_id: Optional[str] = None

@app.post("/api/candidates/rank")
def rank_candidates(body: Optional[CandidateRankRequest] = None, jd_id: Optional[str] = None):
    effective_jd_id = (body.jd_id if body and body.jd_id else None) or jd_id
    conn = database.get_connection()
    c = conn.cursor()

    if effective_jd_id:
        c.execute("SELECT * FROM job_descriptions WHERE id = ?", (effective_jd_id,))
    else:
        c.execute("SELECT * FROM job_descriptions ORDER BY created_at DESC LIMIT 1")
    jd_row = c.fetchone()

    if not jd_row:
        conn.close()
        raise HTTPException(status_code=400, detail="No active Job Description found. Please upload a JD first.")

    jd_data = dict(jd_row)
    jd_data["required_skills"] = json.loads(jd_data["required_skills"]) if jd_data["required_skills"] else []
    jd_data["preferred_skills"] = json.loads(jd_data["preferred_skills"]) if jd_data["preferred_skills"] else []

    if effective_jd_id:
        c.execute("SELECT * FROM candidates WHERE status = 'parsed' AND (jd_id = ? OR jd_id IS NULL)", (effective_jd_id,))
    else:
        c.execute("SELECT * FROM candidates WHERE status = 'parsed'")
    candidates = [dict(r) for r in c.fetchall()]

    if not candidates:
        conn.close()
        raise HTTPException(status_code=400, detail="No parsed candidates found for this job. Please upload candidate CVs first.")

    evaluations = []
    for cand in candidates:
        c.execute("SELECT * FROM candidate_evaluations WHERE candidate_id = ? AND jd_id = ?", (cand["id"], jd_data["id"]))
        existing_eval = c.fetchone()

        cand_markdown = cand.get("raw_markdown") or file_parser.parse_resume_to_markdown(cand.get("raw_text", ""), cand.get("filename", ""))

        # If recruiter has manually corrected this candidate, preserve their manual audit override
        if existing_eval and existing_eval["is_corrected"] == 1:
            eval_data = dict(existing_eval)
            eval_data["matched_skills"] = json.loads(eval_data["matched_skills"]) if eval_data["matched_skills"] else []
            eval_data["missing_skills"] = json.loads(eval_data["missing_skills"]) if eval_data["missing_skills"] else []
            eval_data["evidence_reasons"] = json.loads(eval_data["evidence_reasons"]) if eval_data["evidence_reasons"] else []
            eval_data["unsupported_claims"] = clean_unsupported_claims(json.loads(eval_data["unsupported_claims"]) if eval_data.get("unsupported_claims") else [])
            eval_data["candidate_name"] = cand["name"]
            eval_data["filename"] = cand["filename"]
            eval_data["file_type"] = cand["file_type"]
            eval_data["email"] = cand["email"]
            eval_data["raw_markdown"] = cand_markdown
            eval_data["raw_text"] = cand.get("raw_text", "")
            evaluations.append(eval_data)
        else:
            # Evaluate/Re-evaluate candidate against active JD with markdown resume and weighted 70/20/10 scoring
            ai_eval = ai_service.evaluate_candidate(cand["name"], cand_markdown, jd_data)
            clean_claims = clean_unsupported_claims(ai_eval.get("unsupported_claims", []))
            eval_id = existing_eval["id"] if existing_eval else f"eval_{uuid.uuid4().hex[:8]}"

            if existing_eval:
                c.execute(
                    """UPDATE candidate_evaluations SET
                        score = ?, match_level = ?, matched_skills = ?, missing_skills = ?,
                        evidence_reasons = ?, unsupported_claims = ?, original_score = ?,
                        original_matched_skills = ?, original_missing_skills = ?, original_evidence_reasons = ?
                    WHERE id = ?""",
                    (
                        ai_eval["score"], ai_eval["match_level"],
                        json.dumps(ai_eval["matched_skills"]), json.dumps(ai_eval["missing_skills"]),
                        json.dumps(ai_eval["evidence_reasons"]), json.dumps(clean_claims),
                        ai_eval["score"], json.dumps(ai_eval["matched_skills"]),
                        json.dumps(ai_eval["missing_skills"]), json.dumps(ai_eval["evidence_reasons"]),
                        eval_id
                    )
                )
            else:
                c.execute(
                    """INSERT INTO candidate_evaluations (
                        id, candidate_id, jd_id, score, match_level, matched_skills, missing_skills, evidence_reasons, unsupported_claims,
                        original_score, original_matched_skills, original_missing_skills, original_evidence_reasons, is_corrected
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)""",
                    (
                        eval_id, cand["id"], jd_data["id"], ai_eval["score"], ai_eval["match_level"],
                        json.dumps(ai_eval["matched_skills"]), json.dumps(ai_eval["missing_skills"]),
                        json.dumps(ai_eval["evidence_reasons"]), json.dumps(clean_claims),
                        ai_eval["score"], json.dumps(ai_eval["matched_skills"]),
                        json.dumps(ai_eval["missing_skills"]), json.dumps(ai_eval["evidence_reasons"])
                    )
                )

            eval_item = {
                "id": eval_id,
                "candidate_id": cand["id"],
                "candidate_name": cand["name"],
                "filename": cand["filename"],
                "file_type": cand["file_type"],
                "email": cand["email"],
                "raw_markdown": cand_markdown,
                "raw_text": cand.get("raw_text", ""),
                "score": ai_eval["score"],
                "match_level": ai_eval["match_level"],
                "matched_skills": ai_eval["matched_skills"],
                "missing_skills": ai_eval["missing_skills"],
                "evidence_reasons": ai_eval["evidence_reasons"],
                "unsupported_claims": clean_claims,
                "original_score": ai_eval["score"],
                "is_corrected": 0,
                "strengths_summary": ai_eval.get("strengths_summary", ""),
                "anti_bias_certified": True
            }
            evaluations.append(eval_item)

    conn.commit()
    conn.close()

    evaluations.sort(key=lambda x: x["score"], reverse=True)

    return {
        "jd_id": jd_data["id"],
        "jd_title": jd_data["title"],
        "total_ranked": len(evaluations),
        "rankings": evaluations
    }

@app.get("/api/candidates/rankings")
def get_current_rankings(jd_id: Optional[str] = None):
    conn = database.get_connection()
    c = conn.cursor()
    if jd_id:
        c.execute("""
            SELECT e.*, c.name as candidate_name, c.filename, c.file_type, c.email, c.raw_markdown, c.raw_text
            FROM candidate_evaluations e
            JOIN candidates c ON e.candidate_id = c.id
            WHERE e.jd_id = ?
            ORDER BY e.score DESC
        """, (jd_id,))
    else:
        c.execute("""
            SELECT e.*, c.name as candidate_name, c.filename, c.file_type, c.email, c.raw_markdown, c.raw_text
            FROM candidate_evaluations e
            JOIN candidates c ON e.candidate_id = c.id
            ORDER BY e.score DESC
        """)
    rows = c.fetchall()
    conn.close()

    results = []
    for r in rows:
        item = dict(r)
        item["matched_skills"] = json.loads(item["matched_skills"]) if item["matched_skills"] else []
        item["missing_skills"] = json.loads(item["missing_skills"]) if item["missing_skills"] else []
        item["evidence_reasons"] = json.loads(item["evidence_reasons"]) if item["evidence_reasons"] else []
        item["unsupported_claims"] = clean_unsupported_claims(json.loads(item["unsupported_claims"]) if item.get("unsupported_claims") else [])
        if item.get("raw_text"):
            item["raw_markdown"] = file_parser.parse_resume_to_markdown(item["raw_text"], item["filename"])
            cv_lower = item["raw_text"].lower()
            clean_matched = []
            for s in item["matched_skills"]:
                s_low = s.lower()
                if "clean code" in s_low and "clean code" not in cv_lower:
                    if s not in item["missing_skills"]:
                        item["missing_skills"].append(s)
                    continue
                if "code review" in s_low and "code review" not in cv_lower:
                    if s not in item["missing_skills"]:
                        item["missing_skills"].append(s)
                    continue
                clean_matched.append(s)
            item["matched_skills"] = clean_matched
        if item.get("original_matched_skills"):
            item["original_matched_skills"] = json.loads(item["original_matched_skills"])
        if item.get("original_missing_skills"):
            item["original_missing_skills"] = json.loads(item["original_missing_skills"])
        if item.get("original_evidence_reasons"):
            item["original_evidence_reasons"] = json.loads(item["original_evidence_reasons"])
        results.append(item)

    return {"total": len(results), "rankings": results}

@app.post("/api/candidates/correct")
def correct_candidate_evidence(req: EvidenceCorrectionRequest):
    conn = database.get_connection()
    c = conn.cursor()

    c.execute("SELECT * FROM candidate_evaluations WHERE candidate_id = ?", (req.candidate_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Candidate evaluation not found.")

    current_eval = dict(row)
    matched = json.loads(current_eval["matched_skills"]) if current_eval["matched_skills"] else []
    missing = json.loads(current_eval["missing_skills"]) if current_eval["missing_skills"] else []
    evidence = json.loads(current_eval["evidence_reasons"]) if current_eval["evidence_reasons"] else []

    if req.corrected_skill_added and req.corrected_skill_added not in matched:
        matched.append(req.corrected_skill_added)
        if req.corrected_skill_added in missing:
            missing.remove(req.corrected_skill_added)
        evidence.append(f"Recruiter Correction: Verified evidence for {req.corrected_skill_added} present in resume.")

    if req.corrected_skill_removed and req.corrected_skill_removed in matched:
        matched.remove(req.corrected_skill_removed)
        if req.corrected_skill_removed not in missing:
            missing.append(req.corrected_skill_removed)

    new_match_level = "High Match" if req.corrected_score >= 80 else ("Moderate Match" if req.corrected_score >= 60 else "Low Match")

    c.execute(
        """UPDATE candidate_evaluations
           SET score = ?, match_level = ?, matched_skills = ?, missing_skills = ?, evidence_reasons = ?,
               is_corrected = 1, correction_comment = ?, updated_at = CURRENT_TIMESTAMP
           WHERE candidate_id = ?""",
        (
            req.corrected_score, new_match_level, json.dumps(matched), json.dumps(missing),
            json.dumps(evidence), req.recruiter_notes, req.candidate_id
        )
    )
    conn.commit()
    conn.close()

    return {
        "success": True,
        "candidate_id": req.candidate_id,
        "original_score": current_eval["original_score"],
        "corrected_score": req.corrected_score,
        "score_delta": req.corrected_score - current_eval["original_score"],
        "recruiter_notes": req.recruiter_notes,
        "match_level": new_match_level,
        "matched_skills": matched,
        "missing_skills": missing,
        "evidence_reasons": evidence,
    }

# -------------------------------------------------------------
# SCREENING QUESTIONS (EXACTLY 10)
# -------------------------------------------------------------

@app.get("/api/screening/questions")
def get_screening_questions(jd_id: Optional[str] = None):
    conn = database.get_connection()
    c = conn.cursor()

    if jd_id:
        c.execute("SELECT * FROM job_descriptions WHERE id = ?", (jd_id,))
    else:
        c.execute("SELECT * FROM job_descriptions ORDER BY created_at DESC LIMIT 1")
    jd_row = c.fetchone()

    if not jd_row:
        conn.close()
        raise HTTPException(status_code=400, detail="No active Job Description found. Please upload a JD first.")

    jd_data = dict(jd_row)
    jd_data["required_skills"] = json.loads(jd_data["required_skills"]) if jd_data["required_skills"] else []

    c.execute("SELECT * FROM screening_questions WHERE jd_id = ?", (jd_data["id"],))
    cached = c.fetchone()

    if cached:
        questions = json.loads(cached["questions_json"])
    else:
        questions = ai_service.generate_screening_questions(jd_data)
        q_id = f"q_{uuid.uuid4().hex[:8]}"
        c.execute(
            "INSERT INTO screening_questions (id, jd_id, questions_json) VALUES (?, ?, ?)",
            (q_id, jd_data["id"], json.dumps(questions))
        )
        conn.commit()

    conn.close()
    return {
        "role": jd_data["role"],
        "jd_id": jd_data["id"],
        "total_questions": len(questions),
        "questions": questions
    }

# -------------------------------------------------------------
# HIRING MARKET INSIGHTS
# -------------------------------------------------------------

@app.get("/api/market/insights")
def get_market_insights(jd_id: Optional[str] = None, refresh: Optional[bool] = False):
    conn = database.get_connection()
    c = conn.cursor()

    if jd_id:
        c.execute("SELECT * FROM job_descriptions WHERE id = ?", (jd_id,))
    else:
        c.execute("SELECT * FROM job_descriptions ORDER BY created_at DESC LIMIT 1")
    jd_row = c.fetchone()

    if not jd_row:
        conn.close()
        raise HTTPException(status_code=400, detail="No active Job Description found. Please upload a JD first.")

    jd_data = dict(jd_row)
    jd_data["required_skills"] = json.loads(jd_data["required_skills"]) if jd_data["required_skills"] else []

    if refresh:
        c.execute("DELETE FROM market_insights WHERE jd_id = ?", (jd_data["id"],))
        conn.commit()
        cached = None
    else:
        c.execute("SELECT * FROM market_insights WHERE jd_id = ?", (jd_data["id"],))
        cached = c.fetchone()

    if cached:
        insights = json.loads(cached["insights_json"])
    else:
        insights = ai_service.generate_market_insights(jd_data, force_refresh=bool(refresh))
        m_id = f"mi_{uuid.uuid4().hex[:8]}"
        c.execute(
            "INSERT OR REPLACE INTO market_insights (id, jd_id, insights_json) VALUES (?, ?, ?)",
            (m_id, jd_data["id"], json.dumps(insights))
        )
        conn.commit()

    conn.close()
    insights["jd_id"] = jd_data["id"]
    return insights

@app.post("/api/market/insights/refresh")
def refresh_market_insights(jd_id: Optional[str] = None):
    return get_market_insights(jd_id=jd_id, refresh=True)

# -------------------------------------------------------------
# SEARCH STRINGS GENERATOR (NAUKRI & LINKEDIN)
# -------------------------------------------------------------

@app.get("/api/search-strings")
def get_search_strings(jd_id: Optional[str] = None):
    conn = database.get_connection()
    c = conn.cursor()

    if jd_id:
        c.execute("SELECT * FROM job_descriptions WHERE id = ?", (jd_id,))
    else:
        c.execute("SELECT * FROM job_descriptions ORDER BY created_at DESC LIMIT 1")
    jd_row = c.fetchone()

    if not jd_row:
        conn.close()
        raise HTTPException(status_code=400, detail="No active Job Description found. Please upload a JD first.")

    jd_data = dict(jd_row)
    jd_data["required_skills"] = json.loads(jd_data["required_skills"]) if jd_data["required_skills"] else []

    c.execute("SELECT * FROM search_strings WHERE jd_id = ?", (jd_data["id"],))
    cached = c.fetchone()

    if cached:
        search_data = json.loads(cached["search_json"])
    else:
        search_data = ai_service.generate_search_strings(jd_data)
        s_id = f"ss_{uuid.uuid4().hex[:8]}"
        c.execute(
            "INSERT INTO search_strings (id, jd_id, search_json) VALUES (?, ?, ?)",
            (s_id, jd_data["id"], json.dumps(search_data))
        )
        conn.commit()

    conn.close()
    search_data["jd_id"] = jd_data["id"]
    return search_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
