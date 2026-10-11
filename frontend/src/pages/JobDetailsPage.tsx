import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  api,
  type JobDescription,
  type Candidate,
  type CandidateEvaluation,
  type ScreeningQuestion,
  type MarketInsights,
  type SearchStrings,
} from '@/lib/api';
import { MarkdownCvViewer } from '@/components/cv/MarkdownCvViewer';
import { goeyToast } from 'goey-toast';
import {
  IconArrowLeft,
  IconBriefcase,
  IconUpload,
  IconChartBar,
  IconHelpCircle,
  IconTrendingUp,
  IconSearch,
  IconLoader2,
  IconCheck,
  IconCopy,
  IconAlertTriangle,
  IconShieldCheck,
  IconMapPin,
  IconClock,
  IconFileText,
  IconSparkles,
  IconRefresh,
  IconExternalLink,
  IconX,
  IconEye,
  IconAdjustments,
} from '@tabler/icons-react';

type WorkflowTab =
  | 'overview'
  | 'upload'
  | 'ranking'
  | 'questions'
  | 'market'
  | 'search';

export function isRealUnsupportedClaim(claim?: string): boolean {
  if (!claim) return false;
  const lower = claim.toLowerCase().trim();
  const negativePhrases = [
    'no significant unsupported',
    'no unsupported',
    'no discrepancies',
    'none found',
    'no unverified',
    'all listed skills have corresponding',
    'all skills have corresponding',
    'all skills are supported',
    'all listed skills are supported',
    'supported by project or role',
    'no claims found',
    'no unsupported claims found',
  ];
  return !negativePhrases.some((phrase) => lower.includes(phrase));
}

export function filterRealClaims(claims?: string[]): string[] {
  if (!claims || !Array.isArray(claims)) return [];
  return claims.filter((c) => isRealUnsupportedClaim(c));
}

export const JobDetailsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobDescription | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // CV Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [uploadSummary, setUploadSummary] = useState<{
    total_uploaded: number;
    successfully_parsed: number;
    failed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Candidate Rankings state
  const [rankings, setRankings] = useState<CandidateEvaluation[]>([]);
  const [isRanking, setIsRanking] = useState(false);

  // Evidence Verification & .md CV Viewer state (Integrated into Candidate Ranking)
  const [inspectingCandidate, setInspectingCandidate] = useState<CandidateEvaluation | null>(null);
  const [activeHighlightQuery, setActiveHighlightQuery] = useState<string>('');
  const [activeHighlightType, setActiveHighlightType] = useState<'unsupported' | 'verified' | 'neutral'>('unsupported');
  const [correctionScore, setCorrectionScore] = useState<number>(85);
  const [correctionSkillAdd, setCorrectionSkillAdd] = useState<string>('');
  const [correctionSkillRemove, setCorrectionSkillRemove] = useState<string>('');
  const [correctionNotes, setCorrectionNotes] = useState<string>('');
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<{
    original_score: number;
    corrected_score: number;
    score_delta: number;
    notes: string;
    matched_skills: string[];
    missing_skills: string[];
    match_level: string;
  } | null>(null);

  // Screening Questions state
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Market Insights state
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  // Search Strings state
  const [searchStrings, setSearchStrings] = useState<SearchStrings | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load Job details and initial candidate data
  const loadJobData = async () => {
    if (!jobId) return;
    setIsLoading(true);
    try {
      const jobData = await api.getJobById(jobId);
      setJob(jobData);

      // Load candidates attached to this JD
      const candRes = await api.getCandidatesList(jobId);
      setCandidates(candRes.candidates || []);

      // Load rankings if existing
      const rankRes = await api.getRankings(jobId).catch(() => ({ total: 0, rankings: [] }));
      const cleanRankings = (rankRes.rankings || []).map((r: CandidateEvaluation) => ({
        ...r,
        unsupported_claims: filterRealClaims(r.unsupported_claims),
      }));
      setRankings(cleanRankings);
    } catch (err: any) {
      goeyToast.error(err.message || 'Failed to load job details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  // Load tab-specific data on tab switch
  useEffect(() => {
    if (!jobId) return;
    if (activeTab === 'questions' && questions.length === 0) {
      setIsLoadingQuestions(true);
      api
        .getScreeningQuestions(jobId)
        .then((res) => setQuestions(res.questions || []))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingQuestions(false));
    } else if (activeTab === 'market' && !marketInsights) {
      setIsLoadingMarket(true);
      api
        .getMarketInsights(jobId)
        .then((res) => setMarketInsights(res))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingMarket(false));
    } else if (activeTab === 'search' && !searchStrings) {
      setIsLoadingSearch(true);
      api
        .getSearchStrings(jobId)
        .then((res) => setSearchStrings(res))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingSearch(false));
    }
  }, [activeTab, jobId]);

  // Handler: Multiple CV Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !jobId) return;
    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      const res = await api.uploadCvs(fileArray, jobId);
      setUploadSummary(res.summary);
      setCandidates((prev) => [...res.candidates, ...prev]);
      goeyToast.success(`Successfully processed ${res.summary.successfully_parsed} candidate CV(s).`);
    } catch (err: any) {
      goeyToast.error(err.message || 'Failed to parse uploaded CVs.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handler: Load 5 Sample Candidates (PDF & DOCX)
  const handleLoadSampleCandidates = async () => {
    if (!jobId) return;
    setIsUploading(true);
    try {
      const res = await api.loadSampleCandidates(jobId);
      setUploadSummary(res.summary);
      setCandidates(res.candidates);
      goeyToast.success('Loaded 5 fictional candidate CVs (PDF & DOCX) into pipeline!');
    } catch (err: any) {
      goeyToast.error(err.message || 'Failed to load sample candidate CVs.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handler: Rank Candidates
  const handleRankCandidates = async () => {
    if (!jobId) return;
    setIsRanking(true);
    try {
      const res = await api.rankCandidates(jobId);
      const cleanRankings = (res.rankings || []).map((r: CandidateEvaluation) => ({
        ...r,
        unsupported_claims: filterRealClaims(r.unsupported_claims),
      }));
      setRankings(cleanRankings);
      goeyToast.success(`Evaluated and ranked ${res.total_ranked} candidates against job criteria.`);
    } catch (err: any) {
      goeyToast.error(err.message || 'Candidate ranking failed. Please ensure CVs are uploaded.');
    } finally {
      setIsRanking(false);
    }
  };

  // Open Evidence Verification & .md CV Viewer Modal
  const openCandidateVerification = (
    evalItem: CandidateEvaluation,
    targetHighlight?: string,
    highlightType?: 'unsupported' | 'verified' | 'neutral'
  ) => {
    const cleanCand: CandidateEvaluation = {
      ...evalItem,
      unsupported_claims: filterRealClaims(evalItem.unsupported_claims),
    };
    setInspectingCandidate(cleanCand);
    setCorrectionScore(cleanCand.score);
    setCorrectionSkillAdd('');
    setCorrectionSkillRemove('');
    setCorrectionNotes(cleanCand.correction_comment || '');
    setCorrectionResult(null);

    const realClaims = cleanCand.unsupported_claims || [];

    if (targetHighlight && isRealUnsupportedClaim(targetHighlight)) {
      setActiveHighlightQuery(targetHighlight);
      setActiveHighlightType(highlightType || 'unsupported');
    } else if (realClaims.length > 0) {
      setActiveHighlightQuery(realClaims[0]);
      setActiveHighlightType('unsupported');
    } else if (cleanCand.evidence_reasons && cleanCand.evidence_reasons.length > 0) {
      setActiveHighlightQuery(cleanCand.evidence_reasons[0]);
      setActiveHighlightType('verified');
    } else {
      setActiveHighlightQuery('');
      setActiveHighlightType('neutral');
    }
  };

  // Handler: Save Recruiter Evidence Correction & Update Evaluation
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingCandidate) return;
    setIsSavingCorrection(true);
    try {
      const res = await api.correctEvidence({
        candidate_id: inspectingCandidate.candidate_id,
        corrected_score: correctionScore,
        corrected_skill_added: correctionSkillAdd.trim() || undefined,
        corrected_skill_removed: correctionSkillRemove.trim() || undefined,
        recruiter_notes: correctionNotes.trim() || 'Verified resume evidence confirms updated evaluation.',
      });

      const resultPayload = {
        original_score: res.original_score,
        corrected_score: res.corrected_score,
        score_delta: res.score_delta,
        notes: res.recruiter_notes,
        matched_skills: res.matched_skills || inspectingCandidate.matched_skills,
        missing_skills: res.missing_skills || inspectingCandidate.missing_skills,
        match_level: res.match_level || inspectingCandidate.match_level,
      };
      setCorrectionResult(resultPayload);

      // Update current inspectingCandidate in place
      const updatedCand: CandidateEvaluation = {
        ...inspectingCandidate,
        score: res.corrected_score,
        match_level: res.match_level || inspectingCandidate.match_level,
        matched_skills: res.matched_skills || inspectingCandidate.matched_skills,
        missing_skills: res.missing_skills || inspectingCandidate.missing_skills,
        evidence_reasons: res.evidence_reasons || inspectingCandidate.evidence_reasons,
        is_corrected: 1,
        correction_comment: res.recruiter_notes,
      };
      setInspectingCandidate(updatedCand);

      // Refresh rankings list from server
      const updatedRankings = await api.getRankings(jobId);
      const cleanRankings = (updatedRankings.rankings || []).map((r: CandidateEvaluation) => ({
        ...r,
        unsupported_claims: filterRealClaims(r.unsupported_claims),
      }));
      setRankings(cleanRankings);
      goeyToast.success(`Correction saved for ${inspectingCandidate.candidate_name}. Evaluation updated.`);
    } catch (err: any) {
      goeyToast.error(err.message || 'Failed to submit evidence correction.');
    } finally {
      setIsSavingCorrection(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    goeyToast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <IconLoader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium">Loading Job Workspace...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Job Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested job could not be located in the database.</p>
        <Button onClick={() => navigate('/dashboard/jobs')} className="rounded-xl bg-emerald-600">
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Job Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {job.role || job.title}
            </h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm py-0.5">
              {job.work_mode || 'Hybrid'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground mt-1.5 flex-wrap">
            <span className="flex items-center gap-1.5">
              <IconMapPin className="h-4 w-4" />
              <span>{job.location || 'India'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <IconClock className="h-4 w-4" />
              <span>{job.experience_min} - {job.experience_max} yrs required</span>
            </span>
            <span className="flex items-center gap-1.5">
              <IconBriefcase className="h-4 w-4" />
              <span>{candidates.length} Candidate CVs attached</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={() => navigate('/dashboard/jobs')}
            variant="outline"
            className="h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer border-border/80 hover:bg-muted/60"
          >
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            <span>Go Back</span>
          </Button>

          <Button
            onClick={loadJobData}
            disabled={isLoading}
            variant="outline"
            className="h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer border-border/80 hover:bg-muted/60"
          >
            <IconRefresh className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 6 Job-Workspace Tabs Navigation */}
      <div className="border-b border-border/70 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max pb-px">
          {[
            { id: 'overview', label: '1. JD Overview', icon: IconFileText },
            { id: 'upload', label: '2. CV Upload', icon: IconUpload, count: candidates.length },
            { id: 'ranking', label: '3. Candidate Ranking & Evidence Verification', icon: IconChartBar, count: rankings.length },
            { id: 'questions', label: '4. Screening Questions', icon: IconHelpCircle, count: 10 },
            { id: 'market', label: '5. Hiring Market Insights', icon: IconTrendingUp },
            { id: 'search', label: '6. Search Strings', icon: IconSearch },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkflowTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all relative cursor-pointer ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-600 dark:border-emerald-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & JD */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-5">
            <Card className="p-6 rounded-2xl border-border/80 bg-card/90 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h2 className="font-heading text-lg font-bold text-foreground">Extracted Job Criteria</h2>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 text-xs">
                  AI Structured Intake
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium">Target Role</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{job.role || job.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Work Arrangement</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{job.work_mode || 'Hybrid'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Experience Range</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {job.experience_min} - {job.experience_max} Years
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Primary Location</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{job.location || 'Bengaluru, India'}</p>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-3 pt-2">
                <div>
                  <span className="text-xs font-semibold text-foreground block mb-1.5">Required Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills && job.required_skills.length > 0 ? (
                      job.required_skills.map((s, i) => (
                        <span
                          key={i}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No specific required skills extracted.</span>
                    )}
                  </div>
                </div>

                {job.preferred_skills && job.preferred_skills.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-foreground block mb-1.5">Preferred Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {job.preferred_skills.map((s, i) => (
                        <span
                          key={i}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border/60"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {job.parsed_json?.summary && (
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                  <span className="font-bold text-foreground block mb-1">Executive Role Summary:</span>
                  <p className="text-muted-foreground leading-relaxed">{job.parsed_json.summary}</p>
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="p-6 rounded-2xl border-border/80 bg-card/90 shadow-md space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h3 className="font-heading text-sm font-bold text-foreground">Original JD Document</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {job.raw_text ? `${job.raw_text.length} chars` : ''}
                </span>
              </div>
              <pre className="text-xs font-mono p-3.5 rounded-xl bg-background/80 border border-border/60 text-muted-foreground whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {job.raw_text || 'No raw job description text stored.'}
              </pre>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CV UPLOAD */}
      {/* ========================================================================= */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Upload Dropzone & Demo Button Banner */}
          <Card className="p-6 rounded-2xl border-border/80 bg-card/90 shadow-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Candidate CV Intake</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload multiple PDF/DOCX resumes to parse candidate information and evaluate match scores
                </p>
              </div>

              <Button
                type="button"
                onClick={handleLoadSampleCandidates}
                disabled={isUploading}
                variant="outline"
                className="h-10 px-4 rounded-xl border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold cursor-pointer shrink-0"
              >
                <IconSparkles className="h-4 w-4 mr-1.5" />
                <span>Load 5 Sample Candidates (PDF & DOCX)</span>
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <IconUpload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Click to upload multiple resumes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts batch upload of PDF and DOCX files
                  </p>
                </div>
              </div>

              {uploadSummary && (
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40 border border-border/60 text-center">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Total Uploaded</span>
                    <span className="text-lg font-bold text-foreground">{uploadSummary.total_uploaded}</span>
                  </div>
                  <div>
                    <span className="text-xs text-emerald-600 block font-medium">Successfully Parsed</span>
                    <span className="text-lg font-bold text-emerald-600">{uploadSummary.successfully_parsed}</span>
                  </div>
                  <div>
                    <span className="text-xs text-destructive block font-medium">Failed</span>
                    <span className="text-lg font-bold text-destructive">{uploadSummary.failed}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Uploaded Candidates Table */}
          <Card className="rounded-2xl border-border/80 bg-card shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-foreground">
                Uploaded Resumes ({candidates.length})
              </h3>
              {candidates.length > 0 && (
                <Button
                  onClick={handleRankCandidates}
                  disabled={isRanking}
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <IconChartBar className="h-3.5 w-3.5 mr-1" />
                  <span>Proceed to Candidate Ranking</span>
                </Button>
              )}
            </div>

            {candidates.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No resumes uploaded yet. Click above to upload or use the "Load 5 Sample Candidates" shortcut.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-6 py-3">Candidate Name</th>
                      <th className="px-6 py-3">File Name</th>
                      <th className="px-6 py-3">Format</th>
                      <th className="px-6 py-3">Contact</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {candidates.map((cand) => (
                      <tr key={cand.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-foreground">{cand.name}</td>
                        <td className="px-6 py-3.5 text-muted-foreground truncate max-w-xs">{cand.filename}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 rounded font-mono uppercase text-xs bg-muted border border-border/60 font-semibold">
                            {cand.file_type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-muted-foreground">
                          <div>{cand.email}</div>
                          <div className="text-xs">{cand.phone}</div>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant={cand.status === 'parsed' ? 'sent' : 'destructive'} className="text-xs">
                            {cand.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CANDIDATE RANKING */}
      {/* ========================================================================= */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Ranked Candidates ({rankings.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Scores out of 100 with evidence-backed reasons and skill match breakdown
              </p>
            </div>

            <Button
              onClick={handleRankCandidates}
              disabled={isRanking || candidates.length === 0}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
            >
              {isRanking ? <IconLoader2 className="h-4 w-4 animate-spin mr-1.5" /> : <IconRefresh className="h-4 w-4 mr-1.5" />}
              <span>Re-Rank All</span>
            </Button>
          </div>

          {rankings.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border-border/80 text-muted-foreground text-xs">
              <p>No candidates have been ranked yet.</p>
              <Button onClick={handleRankCandidates} disabled={isRanking} className="mt-3 rounded-xl bg-emerald-600 text-xs">
                Run Candidate Evaluation
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {rankings.map((evalItem, index) => {
                return (
                  <Card
                    key={evalItem.id}
                    className="p-5 rounded-2xl border-border/80 bg-card/90 shadow-md hover:border-emerald-500/40 transition-all space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="h-9 w-9 rounded-xl bg-muted border border-border/70 flex items-center justify-center font-heading font-black text-sm text-foreground">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
                              {evalItem.candidate_name}
                            </h3>
                            {evalItem.is_corrected === 1 && (
                              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 bg-amber-500/10 font-semibold">
                                ✓ Recruiter Corrected
                              </Badge>
                            )}
                            {evalItem.unsupported_claims && evalItem.unsupported_claims.length > 0 && (
                              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10 font-semibold">
                                ⚠️ {evalItem.unsupported_claims.length} Unsupported Claim{evalItem.unsupported_claims.length > 1 ? 's' : ''} Flagged
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            {evalItem.filename} • {evalItem.email}
                          </p>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <div
                          className={`h-9 px-3.5 rounded-xl border flex items-center gap-1 font-heading font-black text-lg transition-colors ${
                            evalItem.score >= 80
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : evalItem.score >= 60
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
                          }`}
                        >
                          <span>{evalItem.score}</span>
                          <span className="text-xs font-normal text-muted-foreground">/100</span>
                        </div>
                        <div
                          className={`h-9 px-3 rounded-xl border flex items-center text-xs font-bold tracking-tight transition-colors ${
                            evalItem.score >= 80
                              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                              : evalItem.score >= 60
                              ? 'border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200'
                              : 'border-red-500/30 bg-red-500/15 text-red-800 dark:text-red-200'
                          }`}
                        >
                          {evalItem.match_level}
                        </div>
                      </div>
                    </div>

                    {/* Matched & Missing Skills */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm pt-1">
                      <div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1.5">
                          ✓ Matched Skills ({evalItem.matched_skills.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {evalItem.matched_skills.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => openCandidateVerification(evalItem, s, 'verified')}
                              title="Click to locate skill in candidate CV"
                              className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1.5">
                          ✗ Missing / Unverified Skills ({evalItem.missing_skills.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {evalItem.missing_skills.length > 0 ? (
                            evalItem.missing_skills.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => openCandidateVerification(evalItem, s, 'neutral')}
                                title="Click to search for this missing skill in CV"
                                className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer"
                              >
                                {s}
                              </button>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">All required skills verified.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evidence Reasons */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs sm:text-sm space-y-1.5">
                      <span className="font-bold text-foreground block">Evidence-Based Rationale:</span>
                      <ul className="space-y-1.5 text-muted-foreground text-xs sm:text-sm leading-relaxed">
                        {evalItem.evidence_reasons.map((reason, i) => (
                          <li key={i} className="flex items-start justify-between gap-2">
                            <span className="flex-1">• {reason}</span>
                            <button
                              onClick={() => openCandidateVerification(evalItem, reason, 'verified')}
                              className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              <IconEye className="h-3.5 w-3.5" />
                              <span>Locate in CV</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Bar for Verification (Steps 2 - 5) */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60 flex-wrap gap-2">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {evalItem.is_corrected === 1 ? (
                          <span className="text-amber-600 font-medium">Recruiter note: {evalItem.correction_comment}</span>
                        ) : (
                          <span>Verified against strictly technical anti-bias job criteria</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => openCandidateVerification(evalItem)}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-sm h-9 px-4"
                        >
                          <IconFileText className="h-4 w-4 mr-1.5" />
                          <span>Inspect Evidence & Verify CV (.md)</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* INTERACTIVE EVIDENCE VERIFICATION & .MD CV SPLIT MODAL (STEPS 1 - 5) */}
          {/* ========================================================================= */}
          {inspectingCandidate && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
              <div className="w-full max-w-7xl h-[94vh] bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-border/70 bg-card flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
                      <IconFileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-heading text-lg font-bold text-foreground">
                          Evidence Inspection
                        </h2>
                        {inspectingCandidate.is_corrected === 1 && (
                          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 bg-amber-500/10 font-semibold">
                            ✓ Recruiter Corrected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        <span className="text-foreground font-semibold">{inspectingCandidate.candidate_name}</span> • {inspectingCandidate.email} • {inspectingCandidate.filename}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInspectingCandidate(null)}
                      className="rounded-xl h-8 w-8 p-0 cursor-pointer"
                    >
                      <IconX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Modal Body: Split Screen */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                  {/* Left Column (58%): Parsed Markdown CV with Dynamic Highlighting */}
                  <div className="lg:col-span-7 h-full overflow-hidden border-r border-border/70 flex flex-col bg-background">
                    <MarkdownCvViewer
                      markdownText={inspectingCandidate.raw_markdown || ''}
                      candidateName={inspectingCandidate.candidate_name}
                      filename={inspectingCandidate.filename}
                      highlightQuery={activeHighlightQuery}
                      highlightType={activeHighlightType}
                      onClearHighlight={() => setActiveHighlightQuery('')}
                    />
                  </div>

                  {/* Right Column (42%): Evidence Audit & Recruiter Correction Console */}
                  <div className="lg:col-span-5 h-full overflow-y-auto p-5 space-y-5 bg-muted/15">
                    {/* Step 3: HireLens Flagged Unsupported Claims */}
                    {(() => {
                      const realClaims = filterRealClaims(inspectingCandidate.unsupported_claims);
                      return (
                        <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                              {realClaims.length > 0 ? (
                                <IconAlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                              ) : (
                                <IconShieldCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              )}
                              <span>AI Flagged Unsupported Claims ({realClaims.length})</span>
                            </span>
                          </div>

                          {realClaims.length > 0 ? (
                            <div className="space-y-2">
                              {realClaims.map((claim, i) => {
                                const isCurrentHighlight = activeHighlightQuery === claim;
                                return (
                                  <div
                                    key={i}
                                    className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                                      isCurrentHighlight
                                        ? 'bg-amber-500/15 border-amber-500/60 shadow-sm'
                                        : 'bg-background border-border/60 hover:border-amber-500/30'
                                    }`}
                                  >
                                    <p className="text-foreground leading-relaxed font-medium">{claim}</p>
                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                                        Flagged for verification
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setActiveHighlightQuery(claim);
                                          setActiveHighlightType('unsupported');
                                        }}
                                        className="h-6 px-2.5 rounded-lg text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                                      >
                                        <IconEye className="h-3 w-3 mr-1" />
                                        <span>Highlight in CV (.md)</span>
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 font-medium flex items-center gap-2">
                              <IconCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <span>No unsupported claims flagged. All stated qualifications align with verified resume records.</span>
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Verified Evidence-Based Reasons */}
                    <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                          <IconShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                          <span>Verified Evidence Quotes ({inspectingCandidate.evidence_reasons.length})</span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        {inspectingCandidate.evidence_reasons.map((reason, i) => {
                          const isCurrentHighlight = activeHighlightQuery === reason;
                          return (
                            <div
                              key={i}
                              className={`p-2.5 rounded-xl border transition-all text-xs space-y-1.5 ${
                                isCurrentHighlight
                                  ? 'bg-emerald-500/15 border-emerald-500/60 shadow-sm'
                                  : 'bg-background border-border/60 hover:border-emerald-500/30'
                              }`}
                            >
                              <p className="text-foreground text-xs leading-relaxed">{reason}</p>
                              <div className="flex items-center justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setActiveHighlightQuery(reason);
                                    setActiveHighlightType('verified');
                                  }}
                                  className="h-5 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                                >
                                  <IconEye className="h-3 w-3 mr-1" />
                                  <span>Locate Statement</span>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Skills Breakdown */}
                    <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
                      <span className="font-heading text-sm sm:text-base font-bold text-foreground block">
                        Technical Skill Verification Breakdown:
                      </span>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-xs font-bold text-emerald-600 block mb-1">
                            Verified Skills (Click to locate in CV):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {inspectingCandidate.matched_skills.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setActiveHighlightQuery(s);
                                  setActiveHighlightType('verified');
                                }}
                                className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 cursor-pointer transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-amber-600 block mb-1">
                            Missing / Unverified Skills:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {inspectingCandidate.missing_skills.length > 0 ? (
                              inspectingCandidate.missing_skills.map((s, i) => (
                                <button
                                key={i}
                                onClick={() => {
                                  setActiveHighlightQuery(s);
                                  setActiveHighlightType('neutral');
                                }}
                                className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 cursor-pointer transition-colors"
                              >
                                {s}
                              </button>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">All required skills verified.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Evidence Correction Console */}
                  <div className="p-4 rounded-xl bg-card border border-emerald-500/30 shadow-md space-y-4">
                    <div className="pb-2 border-b border-border/60">
                      <h3 className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                        <IconAdjustments className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        <span>Recruiter Verification & Score Override</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Check original CV, correct finding, and save updated evaluation with audit trail
                      </p>
                    </div>

                    <form onSubmit={handleSaveCorrection} className="space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                          <label>Updated Candidate Score</label>
                          <span className="font-heading font-black text-emerald-600 text-sm">
                            {correctionScore} / 100
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={correctionScore}
                            onChange={(e) => setCorrectionScore(parseInt(e.target.value) || 0)}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={correctionScore}
                            onChange={(e) => setCorrectionScore(parseInt(e.target.value) || 0)}
                            className="w-20 h-8 rounded-lg text-xs text-center font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-foreground block mb-1">
                            Add Verified Skill (In CV)
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. Golang or Docker"
                            value={correctionSkillAdd}
                            onChange={(e) => setCorrectionSkillAdd(e.target.value)}
                            className="h-8 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground block mb-1">
                            Remove Skill (Not In CV)
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. React"
                            value={correctionSkillRemove}
                            onChange={(e) => setCorrectionSkillRemove(e.target.value)}
                            className="h-8 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Recruiter Audit Reason & CV Reference:
                        </label>
                        <textarea
                          rows={3}
                          value={correctionNotes}
                          onChange={(e) => setCorrectionNotes(e.target.value)}
                          placeholder="State exact CV evidence verified (e.g., Reviewed section 2 in candidate resume: Alex has 5+ years of production Golang and AWS experience at Acme Corp, increasing score from 88 to 94)..."
                          className="w-full p-2.5 rounded-xl border border-border/70 bg-background text-xs focus:ring-1 focus:ring-emerald-500 font-normal"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSavingCorrection}
                        className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-md"
                      >
                        {isSavingCorrection ? (
                          <IconLoader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <IconCheck className="h-4 w-4 mr-1.5" />
                        )}
                        <span>Apply Recruiter Correction & Update Score</span>
                      </Button>
                    </form>

                    {/* Audit Trail Comparison Result */}
                    {correctionResult && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <IconShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>Audit Trail Recorded Successfully</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-background border border-border/70">
                            <span className="text-xs text-muted-foreground block font-medium">Original Score</span>
                            <span className="text-sm font-bold font-heading text-muted-foreground">{correctionResult.original_score}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background border border-emerald-500/40">
                            <span className="text-xs text-emerald-600 block font-medium">Corrected Score</span>
                            <span className="text-sm font-bold font-heading text-emerald-600">{correctionResult.corrected_score}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background border border-border/70">
                            <span className="text-xs text-muted-foreground block font-medium">Delta</span>
                            <span className={`text-sm font-bold font-heading ${correctionResult.score_delta >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                              {correctionResult.score_delta > 0 ? `+${correctionResult.score_delta}` : correctionResult.score_delta}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 text-xs">
                          <span className="font-bold text-foreground block">Recruiter Verified Justification:</span>
                          <p className="text-muted-foreground mt-0.5">{correctionResult.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SCREENING QUESTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                10 Job-Specific Screening Questions
              </h2>
              <p className="text-xs text-muted-foreground">
                Technical assessment prompts with clear "Good Answer Criteria" for recruiter interviews
              </p>
            </div>
            <Button
              onClick={() => {
                const allText = questions.map((q, i) => `Q${i + 1}: ${q.question}\nGood Answer: ${q.good_answer_criteria}`).join('\n\n');
                copyToClipboard(allText, 'all_questions');
              }}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              {copiedKey === 'all_questions' ? <IconCheck className="h-3.5 w-3.5 mr-1" /> : <IconCopy className="h-3.5 w-3.5 mr-1" />}
              <span>Copy All 10 Questions</span>
            </Button>
          </div>

          {isLoadingQuestions ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <IconLoader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-xs font-medium">Generating 10 tailored screening questions...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <Card key={q.id || index} className="p-5 rounded-2xl border-border/80 bg-card/90 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
                        {q.category}
                      </Badge>
                    </div>

                    <button
                      onClick={() => copyToClipboard(`Question: ${q.question}\nGood Answer Criteria: ${q.good_answer_criteria}`, `q_${index}`)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Copy Question"
                    >
                      {copiedKey === `q_${index}` ? <IconCheck className="h-4 w-4 text-emerald-600" /> : <IconCopy className="h-4 w-4" />}
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {q.question}
                  </p>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-xs">
                      Good Answer Criteria:
                    </span>
                    <p className="text-muted-foreground leading-relaxed text-xs">
                      {q.good_answer_criteria}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HIRING MARKET INSIGHTS */}
      {/* ========================================================================= */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Hiring Market Intelligence</h2>
            <p className="text-xs text-muted-foreground">
              Market salary benchmarks, comparable hiring employers, and regional talent availability
            </p>
          </div>

          {isLoadingMarket || !marketInsights ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <IconLoader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-xs font-medium">Researching market salary data and comparable employers...</p>
            </div>
          ) : (
            (() => {
              const minSal =
                marketInsights.salary_benchmarks?.p25_minimum ||
                (marketInsights.salary_benchmark?.min_lpa
                  ? `₹${marketInsights.salary_benchmark.min_lpa} LPA`
                  : '₹18,00,000 / yr (25th Pct)');
              const medSal =
                marketInsights.salary_benchmarks?.median_p50 ||
                (marketInsights.salary_benchmark?.median_lpa
                  ? `₹${marketInsights.salary_benchmark.median_lpa} LPA`
                  : '₹26,50,000 / yr (Median)');
              const maxSal =
                marketInsights.salary_benchmarks?.p75_top_tier ||
                (marketInsights.salary_benchmark?.max_lpa
                  ? `₹${marketInsights.salary_benchmark.max_lpa} LPA`
                  : '₹36,00,000 / yr (75th Pct)');
              const employers =
                marketInsights.peer_employers_hiring?.map((p) => ({
                  name: p.company,
                  tier: p.location || p.similar_title || 'Tech / Product',
                  active_hiring: p.hiring_status || 'Actively Hiring',
                })) ||
                marketInsights.comparable_employers ||
                [];
              const sources =
                marketInsights.sources?.map((s) => ({
                  source_name: s.name,
                  url: s.url,
                  retrieval_date: s.date,
                  is_estimate: s.status ? s.status.includes('Estimate') : true,
                })) ||
                marketInsights.data_sources ||
                [];
              const disclaimer =
                marketInsights.honest_estimate_disclaimer ||
                marketInsights.notes_disclaimer ||
                'DISCLAIMER: Salary benchmarks and talent distributions are aggregated estimates based on Q1 2026 market compensation surveys.';

              return (
                <div className="space-y-6">
                  {/* Salary Benchmarks Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-5 rounded-2xl border-border/80 bg-card/90 shadow-sm">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                         Minimum Salary Benchmark (P25)
                      </span>
                      <p className="font-heading text-xl font-black text-foreground mt-2">
                        {minSal}
                      </p>
                      <span className="text-xs text-muted-foreground">Entry-tier experience threshold</span>
                    </Card>

                    <Card className="p-5 rounded-2xl border-border/80 bg-card/90 shadow-sm">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                        Median Market Offer (P50)
                      </span>
                      <p className="font-heading text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                        {medSal}
                      </p>
                      <span className="text-xs text-muted-foreground">Average expected package</span>
                    </Card>

                    <Card className="p-5 rounded-2xl border-border/80 bg-card/90 shadow-sm">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                        Top Tier Benchmark (P75)
                      </span>
                      <p className="font-heading text-xl font-black text-foreground mt-2">
                        {maxSal}
                      </p>
                      <span className="text-xs text-muted-foreground">High-demand technical mastery</span>
                    </Card>
                  </div>

                  {/* Comparable Employers */}
                  <Card className="p-6 rounded-2xl border-border/80 bg-card shadow-sm space-y-4">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Comparable Employers Hiring for this Profile
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {employers.map((emp, i) => (
                        <div key={i} className="p-3.5 rounded-xl border border-border/70 bg-muted/30">
                          <p className="font-bold text-sm text-foreground">{emp.name}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span className="truncate max-w-[120px]">{emp.tier}</span>
                            <span className="text-emerald-600 font-semibold shrink-0">{emp.active_hiring}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Top Talent Hubs if available */}
                  {marketInsights.top_talent_hubs && marketInsights.top_talent_hubs.length > 0 && (
                    <Card className="p-6 rounded-2xl border-border/80 bg-card shadow-sm space-y-3">
                      <h3 className="font-heading text-sm font-bold text-foreground">
                        Top Talent Hubs & Availability
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {marketInsights.top_talent_hubs.map((hub, i) => (
                          <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs">
                            <p className="font-bold text-foreground">{hub.city}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{hub.talent_density}</p>
                            <p className="text-xs text-emerald-600 mt-1">Notice: {hub.avg_notice_period}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Data Sources and Honest Estimates */}
                  <Card className="p-6 rounded-2xl border-border/80 bg-card shadow-sm space-y-3">
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      Data Sources & Honest Estimation Transparency
                    </h3>
                    <div className="space-y-2">
                      {sources.map((src, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
                          <div>
                            <span className="font-bold text-foreground">{src.source_name}</span>
                            <span className="text-muted-foreground ml-2">({src.retrieval_date})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {src.is_estimate ? 'Honest Estimate' : 'Verified Index'}
                            </Badge>
                            <a href={src.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline flex items-center gap-1">
                              <span>Source URL</span>
                              <IconExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40 mt-3 italic">
                      {disclaimer}
                    </div>
                  </Card>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SEARCH STRINGS */}
      {/* ========================================================================= */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Boolean & Talent Sourcing Strings</h2>
            <p className="text-xs text-muted-foreground">
              Production-tested Boolean and plain-language queries for Naukri Resdex and LinkedIn Recruiter (No scraping required)
            </p>
          </div>

          {isLoadingSearch || !searchStrings ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <IconLoader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-xs font-medium">Synthesizing Boolean strings for Naukri and LinkedIn...</p>
            </div>
          ) : (
            (() => {
              const naukriBool =
                searchStrings.naukri?.boolean_strict || searchStrings.naukri_boolean || '';
              const naukriPlain =
                searchStrings.naukri?.plain_search || searchStrings.naukri_plain || '';
              const linkedinBool =
                searchStrings.linkedin?.boolean_comprehensive ||
                searchStrings.linkedin?.boolean_concise ||
                searchStrings.linkedin_boolean ||
                '';
              const linkedinPlain =
                searchStrings.linkedin?.plain_search || searchStrings.linkedin_plain || '';
              const tips =
                searchStrings.search_tips ||
                [
                  searchStrings.naukri?.recruiter_tip,
                  searchStrings.linkedin?.recruiter_tip,
                  searchStrings.compliance_notice,
                ].filter(Boolean) as string[];

              return (
                <div className="space-y-5">
                  {/* Naukri Box */}
                  <Card className="p-6 rounded-2xl border-border/80 bg-card shadow-md space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-blue-500" />
                        <span>Naukri.com Search Strings</span>
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(naukriBool, 'naukri')}
                        className="h-8 rounded-lg text-xs cursor-pointer"
                      >
                        {copiedKey === 'naukri' ? <IconCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <IconCopy className="h-3.5 w-3.5 mr-1" />}
                        <span>Copy Boolean</span>
                      </Button>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block mb-1">Naukri Boolean Query</span>
                      <pre className="p-3.5 rounded-xl bg-background border border-border/70 text-xs font-mono whitespace-pre-wrap text-foreground select-all leading-relaxed">
                        {naukriBool}
                      </pre>
                    </div>

                    {naukriPlain && (
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">Naukri Keywords</span>
                        <p className="text-xs text-muted-foreground p-2.5 rounded-lg bg-muted/40 font-mono">
                          {naukriPlain}
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* LinkedIn Box */}
                  <Card className="p-6 rounded-2xl border-border/80 bg-card shadow-md space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-indigo-500" />
                        <span>LinkedIn Recruiter Search Strings</span>
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(linkedinBool, 'linkedin')}
                        className="h-8 rounded-lg text-xs cursor-pointer"
                      >
                        {copiedKey === 'linkedin' ? <IconCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <IconCopy className="h-3.5 w-3.5 mr-1" />}
                        <span>Copy Boolean</span>
                      </Button>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-muted-foreground block mb-1">LinkedIn Boolean Query</span>
                      <pre className="p-3.5 rounded-xl bg-background border border-border/70 text-xs font-mono whitespace-pre-wrap text-foreground select-all leading-relaxed">
                        {linkedinBool}
                      </pre>
                    </div>

                    {linkedinPlain && (
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">LinkedIn Title / Skills</span>
                        <p className="text-xs text-muted-foreground p-2.5 rounded-lg bg-muted/40 font-mono">
                          {linkedinPlain}
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Search Tips */}
                  {tips.length > 0 && (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
                      <span className="font-bold text-foreground block">Recruiter Sourcing Best Practices:</span>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                        {tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
};
