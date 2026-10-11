import sqlite3
import json
from pathlib import Path
from typing import Optional, Dict, Any, List

DB_PATH = Path(__file__).resolve().parent / "hirelens.db"

def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recruiter_sessions (
        session_id TEXT PRIMARY KEY,
        recruiter_name TEXT NOT NULL,
        recruiter_email TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS job_descriptions (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        title TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        role TEXT,
        required_skills TEXT, -- JSON array
        preferred_skills TEXT, -- JSON array
        experience_min REAL,
        experience_max REAL,
        location TEXT,
        work_mode TEXT,
        parsed_json TEXT, -- Full JSON
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        jd_id TEXT,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_path TEXT,
        raw_text TEXT NOT NULL,
        raw_markdown TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'parsed', -- 'pending', 'parsed', 'failed'
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS candidate_evaluations (
        id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL,
        jd_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        match_level TEXT NOT NULL,
        matched_skills TEXT, -- JSON array
        missing_skills TEXT, -- JSON array
        evidence_reasons TEXT, -- JSON array of strings
        unsupported_claims TEXT, -- JSON array of strings (AI flagged discrepancies)
        original_score INTEGER,
        original_matched_skills TEXT, -- JSON array
        original_missing_skills TEXT, -- JSON array
        original_evidence_reasons TEXT, -- JSON array
        is_corrected INTEGER DEFAULT 0,
        correction_comment TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates (id),
        FOREIGN KEY (jd_id) REFERENCES job_descriptions (id)
    )
    """)

    try:
        cursor.execute("ALTER TABLE job_descriptions ADD COLUMN user_id TEXT")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE candidates ADD COLUMN user_id TEXT")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE candidates ADD COLUMN raw_markdown TEXT")
    except Exception:
        pass

    try:
        cursor.execute("ALTER TABLE candidate_evaluations ADD COLUMN unsupported_claims TEXT")
    except Exception:
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS screening_questions (
        id TEXT PRIMARY KEY,
        jd_id TEXT NOT NULL,
        questions_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jd_id) REFERENCES job_descriptions (id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS market_insights (
        id TEXT PRIMARY KEY,
        jd_id TEXT NOT NULL,
        insights_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jd_id) REFERENCES job_descriptions (id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS search_strings (
        id TEXT PRIMARY KEY,
        jd_id TEXT NOT NULL,
        search_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jd_id) REFERENCES job_descriptions (id)
    )
    """)

    conn.commit()
    conn.close()

    seed_default_users()

def seed_default_users():
    import hashlib
    salt = "hirelens_secure_salt_2026"
    def h(pw: str) -> str:
        return hashlib.sha256(f"{pw}:{salt}".encode("utf-8")).hexdigest()

    default_users = [
        ("usr_sarah_connor", "Sarah Connor", "sarah.connor@talent.ai", h("password123")),
        ("usr_nithin_recruiter", "Nithin Recruiter", "nithin@hirelens.ai", h("recruiter123")),
    ]

    conn = get_connection()
    cursor = conn.cursor()
    for uid, name, email, pw_hash in default_users:
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        if not row:
            cursor.execute(
                "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
                (uid, name, email, pw_hash)
            )
        else:
            cursor.execute(
                "UPDATE users SET password_hash = ?, name = ? WHERE email = ?",
                (pw_hash, name, email)
            )
    conn.commit()
    conn.close()

init_db()

