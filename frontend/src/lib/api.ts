const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  senderAccounts: SenderAccount[];
  slackIntegration?: SlackIntegration | null;
}

export interface SenderAccount {
  id: string;
  email: string;
  name?: string | null;
  hourlyLimit: number;
}

export interface SlackIntegration {
  id: string;
  teamId: string;
  teamName?: string | null;
  channelId: string;
  channelName?: string | null;
  isConnected: boolean;
}

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType?: string;
  size?: number;
}

export interface EmailItem {
  id: string;
  campaignId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[] | null;
  status: 'SCHEDULED' | 'SENDING' | 'SENT' | 'RESCHEDULED' | 'FAILED';
  scheduledFor: string;
  sentAt?: string | null;
  rescheduledAt?: string | null;
  isStarred: boolean;
  etherealPreviewUrl?: string | null;
  lastError?: string | null;
  createdAt: string;
  campaign?: {
    id: string;
    name: string;
  };
}

export interface DashboardMetrics {
  scheduledCount: number;
  sentCount: number;
  sentThisHour?: number;
  hourlyLimit?: number;
  sentWeekCount?: number;
  sentMonthCount?: number;
}

export interface ScheduleCampaignPayload {
  name?: string;
  subject: string;
  body: string;
  recipients: string[];
  attachments?: EmailAttachment[];
  senderAccountId?: string;
  scheduledStartTime?: string;
  delayBetweenEmailsSeconds?: number;
  hourlyLimit?: number;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure cookies are sent
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export interface JobDescription {
  id: string;
  title: string;
  role: string;
  raw_text?: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_min: number;
  experience_max: number;
  location: string;
  work_mode: string;
  candidate_count?: number;
  ranked_count?: number;
  created_at: string;
  parsed_json?: {
    summary?: string;
    role?: string;
    required_skills?: string[];
    preferred_skills?: string[];
    experience_min?: number;
    experience_max?: number;
    location?: string;
    work_mode?: string;
  };
}

export interface Candidate {
  id: string;
  jd_id?: string | null;
  filename: string;
  file_type: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  char_count?: number;
  raw_markdown?: string;
  raw_text?: string;
  error_message?: string | null;
  created_at: string;
  job_title?: string | null;
  job_role?: string | null;
  score?: number | null;
  match_level?: string | null;
  matched_skills?: string[];
  missing_skills?: string[];
  is_corrected?: number;
  evidence_reasons?: string[];
  unsupported_claims?: string[];
}

export interface CandidateEvaluation {
  id: string;
  candidate_id: string;
  candidate_name: string;
  filename: string;
  file_type: string;
  email: string;
  raw_markdown?: string;
  raw_text?: string;
  score: number;
  match_level: 'High Match' | 'Moderate Match' | 'Low Match' | string;
  matched_skills: string[];
  missing_skills: string[];
  evidence_reasons: string[];
  unsupported_claims?: string[];
  original_score: number;
  is_corrected: number;
  correction_comment?: string | null;
  strengths_summary?: string;
  anti_bias_certified?: boolean;
}

export interface ScreeningQuestion {
  id: number;
  category: string;
  question: string;
  rationale: string;
  good_answer_criteria: string;
}

export interface MarketInsights {
  role_title?: string;
  role?: string;
  target_location?: string;
  location?: string;
  experience_bracket?: string;
  experience_range?: string;
  market_competitiveness?: string;
  salary_benchmarks?: {
    currency?: string;
    p25_minimum?: string;
    median_p50?: string;
    p75_top_tier?: string;
    notes?: string;
  };
  salary_benchmark?: {
    currency?: string;
    min_lpa?: number;
    median_lpa?: number;
    max_lpa?: number;
    market_trend?: string;
  };
  peer_employers_hiring?: Array<{
    company: string;
    hiring_status: string;
    similar_title: string;
    location: string;
    typical_stack: string;
    direct_job_url?: string;
    career_url?: string;
  }>;
  live_job_searches?: Array<{
    board: string;
    label: string;
    url: string;
    icon_name?: string;
    badge?: string;
  }>;
  live_openings_sample?: Array<{
    title: string;
    company: string;
    location: string;
    url: string;
    source: string;
  }>;
  comparable_employers?: Array<{
    name: string;
    tier: string;
    active_hiring: string;
  }>;
  top_talent_hubs?: Array<{
    city: string;
    talent_density: string;
    avg_notice_period: string;
  }>;
  recruiter_recommendations?: string[];
  sources?: Array<{
    name: string;
    url: string;
    date: string;
    status: string;
  }>;
  data_sources?: Array<{
    source_name: string;
    url: string;
    retrieval_date: string;
    is_estimate: boolean;
  }>;
  honest_estimate_disclaimer?: string;
  notes_disclaimer?: string;
}

export interface SearchStrings {
  role_target?: string;
  role?: string;
  naukri?: {
    platform_name?: string;
    boolean_strict?: string;
    boolean_broad?: string;
    plain_search?: string;
    negative_keywords?: string;
    recommended_filters?: {
      experience?: string;
      location?: string;
      functional_area?: string;
      notice_period?: string;
    };
    recruiter_tip?: string;
  };
  linkedin?: {
    platform_name?: string;
    boolean_comprehensive?: string;
    boolean_concise?: string;
    plain_search?: string;
    negative_keywords?: string;
    recommended_filters?: {
      title?: string;
      current_company_type?: string;
      location?: string;
      open_to_work?: string;
    };
    recruiter_tip?: string;
  };
  naukri_boolean?: string;
  naukri_plain?: string;
  linkedin_boolean?: string;
  linkedin_plain?: string;
  search_tips?: string[];
  compliance_notice?: string;
}

export const api = {
  // Auth
  getMe: () => request<{ user: User }>('/auth/me'),
  getGoogleAuthUrl: () => request<{ url: string }>('/auth/google/url'),
  devLogin: () => request<{ user: User }>('/auth/dev-login', { method: 'POST' }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  // HireLens Jobs
  getJobs: (userId?: string) => {
    const q = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return request<{ total: number; jobs: JobDescription[] }>(`/jobs${q}`);
  },
  getJobById: (jobId: string) => request<JobDescription>(`/jobs/${jobId}`),
  parseJdFile: async (file: File, userId: string = 'default_user') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    const res = await fetch(`${API_BASE_URL}/jd/parse-file`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Failed to parse Job Description file.');
    }
    return res.json() as Promise<JobDescription>;
  },
  parseJdText: (text: string, userId: string = 'default_user') =>
    request<JobDescription>('/jd/parse-text', {
      method: 'POST',
      body: JSON.stringify({ text, user_id: userId }),
    }),
  getActiveJd: () => request<JobDescription & { active: boolean }>('/jd/active'),

  // HireLens Candidates
  uploadCvs: async (files: File[], jdId?: string) => {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    if (jdId) {
      formData.append('jd_id', jdId);
    }
    const res = await fetch(`${API_BASE_URL}/cv/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Failed to upload candidates.');
    }
    return res.json() as Promise<{
      summary: { total_uploaded: number; successfully_parsed: number; failed: number };
      candidates: Candidate[];
    }>;
  },
  loadSampleCandidates: async (jdId?: string) => {
    const formData = new FormData();
    if (jdId) {
      formData.append('jd_id', jdId);
    }
    const res = await fetch(`${API_BASE_URL}/candidates/load-sample`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Failed to load sample candidate CVs.');
    }
    return res.json() as Promise<{
      summary: { total_uploaded: number; successfully_parsed: number; failed: number };
      candidates: Candidate[];
    }>;
  },
  getCandidatesList: (jdId?: string) => {
    const q = jdId ? `?jd_id=${encodeURIComponent(jdId)}` : '';
    return request<{ total: number; candidates: Candidate[] }>(`/cv/list${q}`);
  },
  getCandidatesOverview: (jdId?: string) => {
    const q = jdId ? `?jd_id=${encodeURIComponent(jdId)}` : '';
    return request<{ total: number; candidates: Candidate[] }>(`/candidates/overview${q}`);
  },

  // HireLens Candidate Ranking & Evidence Correction
  rankCandidates: (jdId?: string) =>
    request<{ jd_id?: string; jd_title: string; total_ranked: number; rankings: CandidateEvaluation[] }>(
      '/candidates/rank',
      {
        method: 'POST',
        body: JSON.stringify({ jd_id: jdId }),
      }
    ),
  getRankings: (jdId?: string) => {
    const q = jdId ? `?jd_id=${encodeURIComponent(jdId)}` : '';
    return request<{ total: number; rankings: CandidateEvaluation[] }>(`/candidates/rankings${q}`);
  },
  correctEvidence: (data: {
    candidate_id: string;
    corrected_score: number;
    corrected_skill_added?: string;
    corrected_skill_removed?: string;
    recruiter_notes: string;
  }) =>
    request<{
      success: boolean;
      candidate_id: string;
      original_score: number;
      corrected_score: number;
      score_delta: number;
      recruiter_notes: string;
      match_level?: string;
      matched_skills?: string[];
      missing_skills?: string[];
      evidence_reasons?: string[];
    }>('/candidates/correct', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // HireLens Screening Questions, Market Insights, Search Strings
  getScreeningQuestions: (jdId?: string) => {
    const q = jdId ? `?jd_id=${encodeURIComponent(jdId)}` : '';
    return request<{ role: string; total_questions: number; questions: ScreeningQuestion[] }>(
      `/screening/questions${q}`
    );
  },
  getMarketInsights: (jdId?: string, refresh?: boolean) => {
    const params = new URLSearchParams();
    if (jdId) params.set('jd_id', jdId);
    if (refresh) params.set('refresh', 'true');
    const q = params.toString() ? `?${params.toString()}` : '';
    return request<MarketInsights>(`/market/insights${q}`);
  },
  getSearchStrings: (jdId?: string) => {
    const q = jdId ? `?jd_id=${encodeURIComponent(jdId)}` : '';
    return request<SearchStrings>(`/search-strings${q}`);
  },

  // Legacy Email methods (for backwards compatibility)
  getScheduledEmails: () => request<{ items: EmailItem[]; source: string | null }>('/emails/scheduled').catch(() => ({ items: [] as EmailItem[], source: null })),
  getSentEmails: () => request<{ items: EmailItem[]; source: string | null }>('/emails/sent').catch(() => ({ items: [] as EmailItem[], source: null })),
  searchEmails: (_query: string, _status?: string) => request<{ items: EmailItem[]; source: string | null }>('/emails/search').catch(() => ({ items: [] as EmailItem[], source: null })),
  getEmailDetail: (emailId: string) => request<{ email: EmailItem }>(`/emails/${emailId}`).catch(() => ({ email: null as any })),
  toggleStar: (emailId: string) => request<{ email: { isStarred: boolean } }>(`/emails/${emailId}/star`, { method: 'POST' }).catch(() => ({ email: { isStarred: false } })),
  scheduleCampaign: (payload: ScheduleCampaignPayload) => request<{ campaign: any }>('/emails/schedule', { method: 'POST', body: JSON.stringify(payload) }),

  // Legacy fallback metrics
  getMetrics: () => request<DashboardMetrics>('/emails/metrics').catch(() => ({ scheduledCount: 0, sentCount: 0 })),
};

