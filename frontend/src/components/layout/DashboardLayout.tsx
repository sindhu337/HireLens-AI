import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { api, type DashboardMetrics } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { CreateJobModal } from '@/components/modals/CreateJobModal';
import { AlertModal } from '@/components/modals/AlertModal';

export interface DashboardContextType {
  metrics: DashboardMetrics;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchSource: string | null;
  setSearchSource: (s: string | null) => void;
  refreshAll: () => void;
  openCompose: () => void;
  showModal: (config: {
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }) => void;
}

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({ scheduledCount: 0, sentCount: 0 });
  const [jobsCount, setJobsCount] = useState(0);
  const [candidatesCount, setCandidatesCount] = useState(0);

  // Determine active tab from pathname
  const activeTab: 'scheduled' | 'sent' | 'candidates' =
    location.pathname.includes('/dashboard/candidates')
      ? 'candidates'
      : 'sent';

  // Alert & Confirmation Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  const showModal = (config: Omit<typeof modalConfig, 'isOpen'>) => {
    setModalConfig({ ...config, isOpen: true });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // Fetch metrics & counts
  const loadMetadata = useCallback(async () => {
    try {
      const [mRes, jobsRes, candRes] = await Promise.allSettled([
        api.getMetrics(),
        api.getJobs(),
        api.getCandidatesOverview(),
      ]);
      if (mRes.status === 'fulfilled') {
        setMetrics(mRes.value);
      }
      if (jobsRes.status === 'fulfilled') {
        setJobsCount(jobsRes.value.total ?? jobsRes.value.jobs?.length ?? 0);
      }
      if (candRes.status === 'fulfilled') {
        setCandidatesCount(candRes.value.total ?? candRes.value.candidates?.length ?? 0);
      }
    } catch (err) {
      console.error('Error fetching metadata', err);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const handleTabChange = (newTab: 'scheduled' | 'sent' | 'candidates') => {
    setSearchQuery('');
    if (newTab === 'candidates') {
      navigate('/dashboard/candidates');
    } else if (newTab === 'sent') {
      navigate('/dashboard/jobs');
    } else {
      navigate('/dashboard/jobs');
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground font-sans antialiased overflow-hidden selection:bg-emerald-500/20">
      {/* Fixed Header at Top */}
      <Header
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={loadMetadata}
        onLogout={logout}
      />

      {/* Main Container: Fixed Sidebar + Scrollable Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Fixed Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenCompose={() => setComposeOpen(true)}
          scheduledCount={jobsCount}
          sentCount={jobsCount}
          candidatesCount={candidatesCount}
        />

        {/* Scrollable Page Content Area */}
        <main className="flex-1 h-full overflow-y-auto p-6 bg-background">
          <Outlet
            context={{
              metrics,
              searchQuery,
              setSearchQuery,
              searchSource,
              setSearchSource,
              refreshAll: loadMetadata,
              openCompose: () => setComposeOpen(true),
              showModal,
            }}
          />
        </main>
      </div>

      {/* Create Job / Analyze JD Modal */}
      <CreateJobModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSuccess={(job) => {
          setComposeOpen(false);
          loadMetadata();
          navigate(`/dashboard/job/${job.id}`);
        }}
      />

      {/* Alert & Confirmation Modal */}
      <AlertModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        description={modalConfig.description}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        onConfirm={modalConfig.onConfirm}
        onClose={closeModal}
      />
    </div>
  );
};
