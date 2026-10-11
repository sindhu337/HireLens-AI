import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconUser,
  IconArrowRight,
  IconLoader2,
  IconShieldCheck,
  IconUserCheck,
} from '@tabler/icons-react';
import { goeyToast } from 'goey-toast';
import GradientWaves from '@/components/LoginBG';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const DEMO_ACCOUNTS = [
  {
    id: 'sarah',
    name: 'Sarah Connor',
    role: 'Senior Tech Recruiter',
    department: 'Engineering Hiring',
    email: 'sarah.connor@talent.ai',
    password: 'password123',
    description: 'Candidate screening pipeline, JD intake, and AI resume match scoring',
    badgeVariant: 'sent' as const,
    avatarBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'nithin',
    name: 'Nithin Recruiter',
    role: 'Talent Acquisition Lead',
    department: 'Leadership & Audit',
    email: 'nithin@hirelens.ai',
    password: 'recruiter123',
    description: 'Executive oversight, recruiter scoring audit overrides & market analytics',
    badgeVariant: 'scheduled' as const,
    avatarBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      goeyToast.error('Please provide both your email address and password.');
      return;
    }

    if (isRegister && !name.trim()) {
      goeyToast.error('Please enter your full name to create an account.');
      return;
    }

    if (isRegister && password.length < 6) {
      goeyToast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isRegister ? `${API_BASE_URL}/auth/signup` : `${API_BASE_URL}/auth/login`;
      const body = isRegister
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || data.message || 'Authentication failed. Please verify your credentials.');
      }

      goeyToast.success(isRegister ? 'Account created! Redirecting to dashboard...' : 'Login successful! Redirecting...');
      await refreshUser();
      navigate('/dashboard/scheduled');
    } catch (err: any) {
      goeyToast.error(err.message || 'Unable to connect to authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOneClickLogin = async (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setActiveDemoId(account.id);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          password: account.password,
        }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || data.message || `Failed to sign in as ${account.name}.`);
      }

      goeyToast.success(`Signed in as ${account.name}! Redirecting...`);
      await refreshUser();
      navigate('/dashboard/scheduled');
    } catch (err: any) {
      goeyToast.error(err.message || 'One-click login failed. Please try again.');
    } finally {
      setIsLoading(false);
      setActiveDemoId(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Top-Right Theme Switcher */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle className="bg-card/85 backdrop-blur-md border-border/80 shadow-md" />
      </div>

      {/* Background WebGL Shader Waves */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <GradientWaves
          horizonColor="#10B981"
          waveColor="#047857"
          crestColor="#18181b"
          speed={0.35}
          amplitude={2.5}
          waveScale={0.6}
          waveRatio={0.9}
          swell={35}
          turbulence={20}
          tilt={1.11}
          zoom={1}
          height={5.5}
          fogDepth={15}
          detail="medium"
          brightness={1}
          opacity={0.85}
          mouseInteraction
          parallaxStrength={0.5}
          grain
          grainIntensity={0.025}
        />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto space-y-5">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-1 mb-8">
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
              HireLens AI
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-lg">
              Precision Resume Screening, Evidence-Backed Candidate Scoring & Bias-Free Talent Intelligence
            </p>
          </div>

          {/* Main Grid: Login Form Card + 2 One-Click Login Cards Beside It */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left Card: Email/Password Form */}
            <div className="lg:col-span-7">
              <Card className="h-auto border-border/80 bg-card/90 dark:bg-card/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl rounded-2xl">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
                    <div>
                      <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                        {isRegister ? 'Create an Account' : 'Sign In'}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isRegister
                          ? 'Set up your recruiter profile and get started in seconds'
                          : 'Enter your credentials to access your candidate pipeline'}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs py-0.5 px-2 font-medium">
                      JWT 1h Session
                    </Badge>
                  </div>

                  {/* Auth Form */}
                  <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3.5">
                    {isRegister && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <IconUser className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Full Name</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. Sarah Jenkins"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={isLoading}
                          required={isRegister}
                          className="h-9.5 rounded-xl bg-background/60 border-border/70 focus-visible:ring-emerald-500 text-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <IconMail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Work Email</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="recruiter@hirelens.ai"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        required
                        className="h-9.5 rounded-xl bg-background/60 border-border/70 focus-visible:ring-emerald-500 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <IconLock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Password</span>
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          required
                          className="h-9.5 pr-10 rounded-xl bg-background/60 border-border/70 focus-visible:ring-emerald-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer mt-1"
                    >
                      {isLoading && !activeDemoId ? (
                        <>
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                          <span>{isRegister ? 'Creating Account...' : 'Authenticating...'}</span>
                        </>
                      ) : (
                        <>
                          <span>{isRegister ? 'Create Account & Sign In' : 'Sign In to HireLens'}</span>
                          <IconArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </div>

                {/* Switch between Sign In and Create Account */}
                <div className="pt-3.5 mt-3.5 border-t border-border/50 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(!isRegister);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    {isRegister ? (
                      <>
                        Already have an account?{' '}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 underline">
                          Sign in
                        </span>
                      </>
                    ) : (
                      <>
                        Don't have an account?{' '}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 underline">
                          Create new account
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </Card>
            </div>

            {/* Right Side: 2 Cards for 1-Click Login in 2 Different Accounts */}
            <div className="lg:col-span-5 flex flex-col justify-center gap-3 self-center">
              <div className="px-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <IconShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Instant 1-Click Access</span>
                </div>
                <span className="text-xs text-muted-foreground/80">Pre-seeded Personas</span>
              </div>

              {DEMO_ACCOUNTS.map((account) => {
                const isCurrentLoggingIn = isLoading && activeDemoId === account.id;

                return (
                  <Card
                    key={account.id}
                    onClick={() => !isLoading && handleOneClickLogin(account)}
                    className="relative border-border/80 bg-card/90 dark:bg-card/80 backdrop-blur-xl p-3.5 sm:p-4 shadow-md rounded-2xl transition-all duration-200 hover:shadow-lg hover:border-emerald-500/50 hover:bg-card/95 cursor-pointer group"
                  >
                    {/* Top Row: User Avatar & Name/Email */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-9 w-9 rounded-xl border flex items-center justify-center font-heading font-black text-xs shrink-0 ${account.avatarBg}`}>
                          {account.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-heading text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            {account.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <IconMail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                            <span className="truncate">{account.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <IconUserCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Ready to authenticate</span>
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOneClickLogin(account);
                        }}
                        className="h-7.5 px-3 rounded-lg bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-600/25 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {isCurrentLoggingIn ? (
                          <>
                            <IconLoader2 className="h-3 w-3 animate-spin" />
                            <span>Signing In...</span>
                          </>
                        ) : (
                          <>
                            <span>1-Click Sign In</span>
                            <IconArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


