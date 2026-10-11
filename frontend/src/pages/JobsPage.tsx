import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, type JobDescription } from '@/lib/api';
import { CreateJobModal } from '@/components/modals/CreateJobModal';
import {
  IconPlus,
  IconBriefcase,
  IconMapPin,
  IconClock,
  IconUsers,
  IconArrowRight,
  IconSearch,
  IconRefresh,
  IconLoader2,
  IconSparkles,
  IconBuildingSkyscraper,
} from '@tabler/icons-react';

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getJobs();
      setJobs(res.jobs || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((j) => {
    const q = searchQuery.toLowerCase();
    const roleMatch = j.role?.toLowerCase().includes(q) || j.title?.toLowerCase().includes(q);
    const locMatch = j.location?.toLowerCase().includes(q);
    const skillMatch = j.required_skills?.some((s) => s.toLowerCase().includes(q));
    return roleMatch || locMatch || skillMatch;
  });

  const totalCandidates = jobs.reduce((acc, j) => acc + (j.candidate_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <IconBriefcase className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            <span>Recruitment Jobs</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your active job requisitions, candidate screening pipelines, and evaluation workflows
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            <IconPlus className="h-4 w-4 stroke-[2.5]" />
            <span>Create new Job</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 rounded-2xl border-border/80 bg-card/80 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Jobs
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <IconBriefcase className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black font-heading mt-2 text-foreground">{jobs.length}</p>
          <span className="text-xs text-muted-foreground">Requisitions analyzed in database</span>
        </Card>

        <Card className="p-4 rounded-2xl border-border/80 bg-card/80 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Candidates
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <IconUsers className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-2xl font-black font-heading mt-2 text-foreground">{totalCandidates}</p>
          <span className="text-xs text-muted-foreground">Resumes attached across all JDs</span>
        </Card>

        <Card className="p-4 rounded-2xl border-border/80 bg-card/80 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI Engine Status
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <IconSparkles className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-bold text-foreground">Active & Bias-Free</p>
          </div>
          <span className="text-xs text-muted-foreground">Qwen 3.8B + Deterministic Fallback</span>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by job title, location, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-xs sm:text-sm rounded-xl border border-border/70 bg-card/70 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground placeholder:text-muted-foreground/60 transition-all shadow-2xs"
          />
        </div>

        <button
          onClick={fetchJobs}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer self-end sm:self-center"
        >
          <IconRefresh className="h-3.5 w-3.5" />
          <span>Refresh Jobs</span>
        </button>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Loading stored jobs from database...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-border/80 bg-card/50 flex flex-col items-center justify-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
            <IconBriefcase className="h-7 w-7" />
          </div>
          <h3 className="font-heading text-lg font-bold text-foreground">No Jobs Found</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            {searchQuery
              ? 'No jobs match your current search query. Try clearing the filter.'
              : 'You have not uploaded or analyzed any job descriptions yet. Create your first job requisition to get started.'}
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
          >
            <IconPlus className="h-3.5 w-3.5 mr-1.5" />
            <span>Create new Job</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              onClick={() => navigate(`/dashboard/job/${job.id}`)}
              className="p-5 rounded-2xl border-border/80 bg-card/90 dark:bg-card/80 backdrop-blur-md hover:border-emerald-500/60 hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Top Row: Role Title & Work Mode */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {job.role || job.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <IconBuildingSkyscraper className="h-3 w-3 shrink-0" />
                      <span>{job.title}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold uppercase shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    {job.work_mode || 'Hybrid'}
                  </Badge>
                </div>

                {/* Metadata Pills */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <IconMapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
                    <span>{job.location || 'India'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <IconClock className="h-3.5 w-3.5 text-muted-foreground/80" />
                    <span>{job.experience_min} - {job.experience_max} yrs</span>
                  </span>
                </div>

                {/* Required Skills Tags */}
                {job.required_skills && job.required_skills.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {job.required_skills.slice(0, 4).map((skill, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted/80 text-foreground border border-border/60"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.required_skills.length > 4 && (
                      <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5">
                        +{job.required_skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Candidate Count & Workspace Link */}
              <div className="mt-4 pt-3.5 border-t border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <IconUsers className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{job.candidate_count || 0} Candidates</span>
                </div>

                <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Workspace</span>
                  <IconArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal to Create / Analyze JD */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(job) => {
          navigate(`/dashboard/job/${job.id}`);
        }}
      />
    </div>
  );
};
