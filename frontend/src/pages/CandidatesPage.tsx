import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  api,
  type Candidate,
  type JobDescription,
} from '@/lib/api';
import {
  IconUsers,
  IconSearch,
  IconRefresh,
  IconBriefcase,
  IconMail,
  IconPhone,
  IconCheck,
  IconX,
  IconArrowRight,
  IconLoader2,
  IconSparkles,
  IconShieldCheck,
} from '@tabler/icons-react';

export const CandidatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchFilter, setMatchFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [fileFilter, setFileFilter] = useState<'all' | 'pdf' | 'docx'>('all');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [candRes, jobRes] = await Promise.all([
        api.getCandidatesOverview(),
        api.getJobs(),
      ]);
      setCandidates(candRes.candidates || []);
      setJobs(jobRes.jobs || []);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCandidates = candidates.filter((c) => {
    // Search query
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q);
    const jobMatch = (c.job_role || c.job_title || '').toLowerCase().includes(q);
    const skillMatch =
      c.matched_skills?.some((s) => s.toLowerCase().includes(q)) ||
      c.missing_skills?.some((s) => s.toLowerCase().includes(q));
    const passesSearch = !q || nameMatch || emailMatch || jobMatch || skillMatch;

    // Match filter
    let passesMatch = true;
    if (matchFilter === 'high') {
      passesMatch = (c.score || 0) >= 80 || c.match_level === 'High Match';
    } else if (matchFilter === 'moderate') {
      passesMatch =
        ((c.score || 0) >= 50 && (c.score || 0) < 80) ||
        c.match_level === 'Moderate Match';
    } else if (matchFilter === 'low') {
      passesMatch = (c.score || 0) < 50 || c.match_level === 'Low Match';
    }

    // Job filter
    let passesJob = true;
    if (jobFilter !== 'all') {
      passesJob = c.jd_id === jobFilter;
    }

    // File filter
    let passesFile = true;
    if (fileFilter !== 'all') {
      passesFile = c.file_type?.toLowerCase() === fileFilter;
    }

    return passesSearch && passesMatch && passesJob && passesFile;
  });

  // Analytics metrics
  const totalCandidates = candidates.length;
  const highMatchesCount = candidates.filter(
    (c) => (c.score || 0) >= 80 || c.match_level === 'High Match'
  ).length;
  const scoredCandidates = candidates.filter((c) => typeof c.score === 'number' && c.score !== null);
  const avgScore =
    scoredCandidates.length > 0
      ? Math.round(
          scoredCandidates.reduce((acc, c) => acc + (c.score || 0), 0) /
            scoredCandidates.length
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <IconUsers className="h-7 w-7 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
            <span>Candidate Talent Pool</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and compare all candidates across your active jobs, with AI-driven evidence scores and skill profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
            className="h-10 px-3.5 rounded-xl border-border/80 hover:bg-muted font-semibold text-xs sm:text-sm shadow-xs cursor-pointer flex items-center gap-2"
          >
            <IconRefresh
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => navigate('/dashboard/jobs')}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2 transition-all"
          >
            <IconBriefcase className="h-4 w-4" />
            <span>View Jobs</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <IconUsers className="h-5 w-5 stroke-[2]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Candidates
            </div>
            <div className="text-2xl font-black font-heading text-foreground mt-0.5">
              {totalCandidates}
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <IconSparkles className="h-5 w-5 stroke-[2]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              High Match Rate
            </div>
            <div className="text-2xl font-black font-heading text-foreground mt-0.5">
              {highMatchesCount}{' '}
              <span className="text-xs font-medium text-muted-foreground">
                ({totalCandidates > 0 ? Math.round((highMatchesCount / totalCandidates) * 100) : 0}%)
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <IconShieldCheck className="h-5 w-5 stroke-[2]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg. Evaluation Score
            </div>
            <div className="text-2xl font-black font-heading text-foreground mt-0.5">
              {avgScore !== null ? `${avgScore}/100` : '—'}
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <IconBriefcase className="h-5 w-5 stroke-[2]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Job Roles
            </div>
            <div className="text-2xl font-black font-heading text-foreground mt-0.5">
              {jobs.length}
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <Card className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3 overflow-hidden max-w-full">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 min-w-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, skill, email, or role..."
              className="pl-9 pr-4 h-10 rounded-xl bg-muted/30 border-border/70 text-sm focus-visible:ring-emerald-500 w-full"
            />
          </div>

          {/* Filter Dropdowns using Select component */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter by Job */}
            {jobs.length > 0 && (
              <Select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="w-full sm:w-48 text-xs font-semibold"
                aria-label="Filter by Job Requisition"
              >
                <option value="all">All Jobs ({jobs.length})</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.role || job.title}
                  </option>
                ))}
              </Select>
            )}

            {/* Filter by Match Score */}
            <Select
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value as any)}
              className="w-full sm:w-44 text-xs font-semibold"
              aria-label="Filter by Match Score"
            >
              <option value="all">All Match Scores</option>
              <option value="high">High Match (80+)</option>
              <option value="moderate">Moderate Match (50-79)</option>
              <option value="low">Low Match (&lt;50)</option>
            </Select>

            {/* Filter by Resume Format */}
            <Select
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value as any)}
              className="w-full sm:w-36 text-xs font-semibold"
              aria-label="Filter by Resume Format"
            >
              <option value="all">All Formats</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </Select>

            {/* Reset Button */}
            {(searchQuery || jobFilter !== 'all' || matchFilter !== 'all' || fileFilter !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setJobFilter('all');
                  setMatchFilter('all');
                  setFileFilter('all');
                }}
                className="h-10 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer rounded-xl"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Candidate Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <IconLoader2 className="h-8 w-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Loading candidate profiles and evaluations...
          </p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl bg-card border border-dashed border-border/80">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <IconUsers className="h-8 w-8 stroke-[1.8]" />
          </div>
          <h3 className="font-heading text-lg font-bold text-foreground">
            {candidates.length === 0 ? 'No candidates uploaded yet' : 'No candidates match your filters'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
            {candidates.length === 0
              ? 'Create a job or open an existing job to upload candidate CVs (PDF & DOCX) or load sample candidate resumes.'
              : 'Try clearing your search query or selecting a different match score filter.'}
          </p>
          {candidates.length === 0 ? (
            <Button
              onClick={() => navigate('/dashboard/jobs')}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 shadow-sm cursor-pointer"
            >
              <IconBriefcase className="h-4 w-4 mr-2" />
              Go to Jobs Workspace
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setMatchFilter('all');
                setJobFilter('all');
                setFileFilter('all');
              }}
              className="rounded-xl cursor-pointer"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCandidates.map((candidate) => {
            const hasScore = typeof candidate.score === 'number' && candidate.score !== null;
            const scoreVal = candidate.score || 0;
            const isHigh = scoreVal >= 80;
            const isMod = scoreVal >= 50 && scoreVal < 80;

            return (
              <Card
                key={candidate.id}
                className="rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top / Header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Candidate Name & File */}
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold font-heading flex items-center justify-center shrink-0 border border-emerald-500/20 text-base shadow-xs">
                        {candidate.name
                          ? candidate.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          : 'CV'}
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-base text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {candidate.name || 'Unnamed Candidate'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-xs uppercase font-bold px-1.5 py-0.5 rounded ${
                              candidate.file_type?.toLowerCase() === 'docx'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                : 'bg-red-500/15 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {candidate.file_type || 'PDF'}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={candidate.filename}>
                            {candidate.filename}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score Badge */}
                    {hasScore ? (
                      <div
                        className={`text-right shrink-0 px-2.5 py-1.5 rounded-xl border ${
                          isHigh
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : isMod
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        <div className="text-lg font-black font-heading leading-tight">
                          {scoreVal}
                          <span className="text-xs font-medium text-muted-foreground">/100</span>
                        </div>
                        <div className="text-xs font-semibold">
                          {candidate.match_level || (isHigh ? 'High Match' : isMod ? 'Moderate' : 'Low Match')}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs shrink-0 font-medium text-muted-foreground">
                        Parsed
                      </Badge>
                    )}
                  </div>

                  {/* Associated Job Role */}
                  {(candidate.job_role || candidate.job_title) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-xl border border-border/50">
                      <IconBriefcase className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate font-medium text-foreground">
                        {candidate.job_role || candidate.job_title}
                      </span>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {candidate.email && (
                      <div className="flex items-center gap-2 truncate">
                        <IconMail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                        <span className="truncate">{candidate.email}</span>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <IconPhone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                        <span className="truncate">{candidate.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Matched Skills */}
                  {candidate.matched_skills && candidate.matched_skills.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <IconCheck className="h-3 w-3 stroke-[2.5]" /> Matched Skills ({candidate.matched_skills.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {candidate.matched_skills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-medium px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.matched_skills.length > 5 && (
                          <span className="text-xs font-medium text-muted-foreground self-center">
                            +{candidate.matched_skills.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {candidate.missing_skills && candidate.missing_skills.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <IconX className="h-3 w-3 stroke-[2.5]" /> Missing Skills
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {candidate.missing_skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-medium px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matched Skills */}
                </div>

                {/* Card Footer / Action */}
                <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Anti-Bias Verified</span>
                  </div>

                  {candidate.jd_id ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/dashboard/job/${candidate.jd_id}?tab=ranking`)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10 h-8 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <span>View in Job</span>
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">General Pool</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
