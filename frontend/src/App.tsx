import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { JobsPage } from '@/pages/JobsPage';
import { JobDetailsPage } from '@/pages/JobDetailsPage';
import { CandidatesPage } from '@/pages/CandidatesPage';
import { Skeleton } from '@/components/ui/skeleton';
import { GooeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-heading font-black text-base shadow-sm animate-pulse">
          HL
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/dashboard/jobs" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <GooeyToaster position="top-center" preset="bouncy" />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <LoginPage />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard/jobs" replace />} />
            <Route path="scheduled" element={<Navigate to="/dashboard/jobs" replace />} />
            <Route path="sent" element={<Navigate to="/dashboard/jobs" replace />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="job/:jobId" element={<JobDetailsPage />} />
            <Route path="candidates" element={<CandidatesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard/jobs" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
