import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api, type JobDescription } from '@/lib/api';
import {
  IconX,
  IconUpload,
  IconFileText,
  IconLoader2,
  IconSparkles,
  IconAlertCircle,
  IconFileSpreadsheet,
} from '@tabler/icons-react';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (job: JobDescription) => void;
}

const SAMPLE_JD_TEXT = `Job Title: Senior Full Stack Engineer (React + Python)
Location: Bengaluru, India (Hybrid)
Experience Required: 4 - 7 years
Employment Type: Full-time

About the Role:
We are looking for a Senior Full Stack Engineer to build and scale our modern enterprise cloud applications. You will collaborate closely with product management and engineering leads to design performant web architectures, robust RESTful APIs, and responsive user interfaces.

Key Responsibilities:
- Design and develop scalable web applications using React, TypeScript, and modern state management.
- Build high-throughput REST APIs and microservices using Python (FastAPI / Django).
- Architect relational database schemas using PostgreSQL or MySQL, optimizing complex queries.
- Containerize services using Docker and manage CI/CD pipelines (GitHub Actions).
- Collaborate with cloud teams to deploy applications on AWS (EC2, S3, ECS, Lambda).
- Participate in code reviews, automated unit testing, and maintain clean code standards.

Required Qualifications & Skills:
- 4+ years of professional software engineering experience.
- Strong proficiency in modern JavaScript/TypeScript and React.
- Solid backend development experience in Python (FastAPI, Flask, or Django).
- Hands-on experience with SQL databases (PostgreSQL or MySQL) and ORMs.
- Proven knowledge of Docker containerization and CI/CD pipelines.
- Experience with cloud providers, preferably AWS.
- Strong problem-solving, clean code design, and cross-functional communication skills.

Preferred Skills:
- Experience with Redis caching and asynchronous messaging (Celery, Kafka).
- Familiarity with AI/LLM integrations or vector databases.
- Go language and worked on backend projects with Golang`;

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
        setErrorMessage('Unsupported file format. Please upload a PDF, DOCX, or TXT file.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
        setErrorMessage('Unsupported file format. Please upload a PDF, DOCX, or TXT file.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleAnalyze = async () => {
    setErrorMessage(null);

    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMessage('Please select a PDF or DOCX file to analyze.');
        return;
      }
      setIsAnalyzing(true);
      try {
        const job = await api.parseJdFile(selectedFile);
        onSuccess(job);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to analyze Job Description file.');
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      if (!pastedText.trim()) {
        setErrorMessage('Please paste the Job Description text.');
        return;
      }
      if (pastedText.trim().length < 50) {
        setErrorMessage('Job Description text is too short. Please provide at least 50 characters.');
        return;
      }
      setIsAnalyzing(true);
      try {
        const job = await api.parseJdText(pastedText.trim());
        onSuccess(job);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to analyze Job Description text.');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const wordCount = pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-card border-border/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <IconSparkles className="h-5 w-5 text-emerald-500" />
              <span>Create New Job</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a JD document or paste requirements to extract skills and initiate screening
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-border/60 flex items-center gap-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setErrorMessage(null);
            }}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <IconUpload className="h-4 w-4" />
            <span>Upload File (PDF / DOCX)</span>
            {activeTab === 'upload' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('text');
              setErrorMessage(null);
            }}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 ${
              activeTab === 'text'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <IconFileText className="h-4 w-4" />
            <span>Paste Text</span>
            {activeTab === 'text' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <IconAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-border/80 hover:border-emerald-500/40 hover:bg-muted/30'
                }`}
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <IconUpload className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground">
                    {selectedFile ? 'File Ready for Analysis' : 'Click to upload or drag & drop Job Description'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts PDF, DOCX, DOC, or TXT (up to 10 MB)
                  </p>
                </div>
              </div>

              {selectedFile && (
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-emerald-600/10 border border-emerald-600/20 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      {selectedFile.name.split('.').pop() || 'FILE'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Ready to extract
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Job Description Content
                </label>
                <button
                  type="button"
                  onClick={() => setPastedText(SAMPLE_JD_TEXT)}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <IconFileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Insert Sample Senior FullStack JD</span>
                </button>
              </div>

              <textarea
                rows={9}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the complete job description here, including role overview, required technical skills, experience requirements, and preferred qualifications..."
                className="w-full rounded-xl border border-border/80 bg-background/60 p-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs leading-relaxed"
              />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{wordCount} words • {pastedText.length} characters</span>
                <span>Minimum recommended: 50+ words</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border/70 flex items-center justify-between bg-muted/20">
          <Button
            type="button"
            variant="outline"
            disabled={isAnalyzing}
            onClick={onClose}
            className="rounded-xl text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={isAnalyzing || (activeTab === 'upload' ? !selectedFile : !pastedText.trim())}
            onClick={handleAnalyze}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 px-5 h-10 shadow-md cursor-pointer transition-all"
          >
            {isAnalyzing ? (
              <>
                <IconLoader2 className="h-4 w-4 animate-spin" />
                <span>Extracting Role & Skills...</span>
              </>
            ) : (
              <>
                <IconSparkles className="h-4 w-4" />
                <span>Analyze JD</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
